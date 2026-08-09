using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Domain.Services;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Bookmachs.Refactored.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Bookmachs.Refactored.Api.Jobs;

public interface IExchangeFulfillmentJob
{
    Task ProcessDailyFulfillmentRemindersAsync(CancellationToken cancellationToken = default);
}

public class ExchangeFulfillmentJob : IExchangeFulfillmentJob
{
    private readonly BookmachsDbContext _dbContext;
    private readonly IPaymentGatewayService _paymentGatewayService;
    private readonly ISendGridEmailService _emailService;
    private readonly ILogger<ExchangeFulfillmentJob> _logger;

    public const int MaxFulfillmentDays = 5;

    public ExchangeFulfillmentJob(
        BookmachsDbContext dbContext,
        IPaymentGatewayService paymentGatewayService,
        ISendGridEmailService emailService,
        ILogger<ExchangeFulfillmentJob> logger)
    {
        _dbContext = dbContext;
        _paymentGatewayService = paymentGatewayService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task ProcessDailyFulfillmentRemindersAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Iniciando tarea programada diaria de revisión de entregas e intercambio...");

        // Buscar transacciones con retención activa (Hold) pendientes de entrega
        var pendingTransactions = await _dbContext.MatchTransactions
            .Include(t => t.Book)
            .Include(t => t.RequesterUser)
            .Include(t => t.OwnerUser)
            .Where(t => t.PaymentStatus == "Hold" && t.LogisticsStatus != "Completed" && t.LogisticsStatus != "Delivered")
            .ToListAsync(cancellationToken);

        _logger.LogInformation("Se encontraron {Count} transacciones en estado Hold pendientes de entrega.", pendingTransactions.Count);

        foreach (var tx in pendingTransactions)
        {
            var elapsedDays = (DateTime.UtcNow - tx.CreatedAt).Days;
            var daysRemaining = MaxFulfillmentDays - elapsedDays;

            if (daysRemaining > 0)
            {
                // Enviar correo de recordatorio diario con todo el detalle del intercambio
                var deadlineDate = tx.CreatedAt.AddDays(MaxFulfillmentDays).ToString("dd/MM/yyyy HH:mm UTC");

                var offeredBook = await _dbContext.Books
                    .FirstOrDefaultAsync(b => b.OwnerId == tx.RequesterUserId, cancellationToken);

                var emailData = new ExchangeReminderEmailData
                {
                    UserName = tx.RequesterUser?.Name ?? "Lector Bookmachs",
                    DaysRemaining = daysRemaining,
                    FulfillmentDeadlineDate = deadlineDate,
                    
                    // Libro a recibir
                    BookToReceiveTitle = tx.Book?.Title ?? "Libro Solicitado",
                    BookToReceiveAuthor = tx.Book?.Author ?? "Desconocido",
                    BookToReceiveImageUrl = tx.Book?.ImageUrl ?? string.Empty,
                    BookToReceiveCondition = tx.Book?.Condition ?? "Bueno",
                    
                    // Libro a entregar
                    BookToOfferTitle = offeredBook?.Title ?? "Libro en Tu Libreta",
                    BookToOfferAuthor = offeredBook?.Author ?? "Desconocido",
                    BookToOfferImageUrl = offeredBook?.ImageUrl ?? string.Empty,
                    BookToOfferCondition = offeredBook?.Condition ?? "Bueno",
                    
                    // Logística y Pago
                    LogisticsMethodName = tx.LogisticsMethod ?? "Presencial",
                    LogisticsInstructions = GetLogisticsInstructions(tx.LogisticsMethod),
                    FeeAmount = tx.FeeAmount,
                    PaymentStatus = "Retenido en Webpay Plus (Hold)",
                    TransactionId = tx.BuyOrder ?? tx.Id.ToString("N")[..8]
                };

                if (tx.RequesterUser?.Email != null)
                {
                    await _emailService.SendFulfillmentReminderEmailAsync(tx.RequesterUser.Email, emailData);
                }
            }
            else
            {
                // Plazo vencido (>= 5 días): Anular retención en Transbank Webpay Plus y cancelar la transacción
                _logger.LogWarning("Transacción {TxId} superó el plazo de {MaxDays} días. Anulando Hold en Transbank...", tx.Id, MaxFulfillmentDays);

                if (!string.IsNullOrEmpty(tx.PaymentHoldId))
                {
                    var refundResult = await _paymentGatewayService.RefundTransbankHoldAsync(tx.PaymentHoldId, tx.FeeAmount);
                    _logger.LogInformation("Resultado de anulación en Transbank para {TxId}: Success={Success}, RefundId={RefundId}", tx.Id, refundResult.Success, refundResult.RefundId);
                }

                tx.PaymentStatus = "Cancelled";
                tx.LogisticsStatus = "Expired";
                tx.StatusUpdatedAt = DateTime.UtcNow;

                _dbContext.MatchTransactions.Update(tx);

                // Registrar evento en la línea de tiempo
                var timelineEvent = new TimelineEvent
                {
                    Id = Guid.NewGuid(),
                    MatchTransactionId = tx.Id,
                    EventType = "FulfillmentExpired",
                    Title = "Transacción Cancelada por Vencimiento de Plazo",
                    Description = $"El intercambio expiró por superar el límite de {MaxFulfillmentDays} días para la entrega. La retención de fondos en Transbank Webpay Plus fue liberada automáticamente.",
                    CreatedAt = DateTime.UtcNow
                };

                await _dbContext.TimelineEvents.AddAsync(timelineEvent, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        _logger.LogInformation("Procesamiento diario de entregas finalizado con éxito.");
    }

    private static string GetLogisticsInstructions(string? method) => (method?.ToLowerInvariant()) switch
    {
        "donacion" => "Sube la fotografía del lugar comunitario o colegio donde realizaste la donación de tu ejemplar para validación previa.",
        "envio" => "Carga el número de orden de seguimiento o voucher de la encomienda enviada a Patronato 447, Recoleta, Santiago, Chile.",
        _ => "Coordina la entrega presencial de tu ejemplar en la dirección Patronato 447, Recoleta, Santiago, Chile."
    };
}
