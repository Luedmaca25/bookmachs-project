using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Domain.Services;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Services;

public interface ITransactionService
{
    Task<IEnumerable<MatchTransactionDto>> GetMyMatchesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<FeeEstimationDto> EstimateFeeAsync(Guid bookId, Guid requesterUserId, CancellationToken cancellationToken = default);
    Task<CheckoutResultDto> CheckoutCardAsync(Guid matchTransactionId, string cardToken, Guid requesterUserId, bool acceptCrossBorder, CancellationToken cancellationToken = default);
    Task<WebpayStartResultDto> WebpayStartAsync(Guid matchTransactionId, Guid requesterUserId, string returnUrl, bool acceptCrossBorder, CancellationToken cancellationToken = default);
    Task<WebpayConfirmResultDto> WebpayConfirmAsync(string token, CancellationToken cancellationToken = default);
    Task<LogisticsResultDto> UpdateLogisticsAsync(Guid matchTransactionId, Guid requesterUserId, string logisticsMethod, string? trackingNumber, string? evidencePhotoBase64, CancellationToken cancellationToken = default);
    Task<WebhookProcessResultDto> ProcessMercadoPagoWebhookAsync(string type, string action, string dataId, CancellationToken cancellationToken = default);
}

public class TransactionService : ITransactionService
{
    private readonly BookmachsDbContext _dbContext;
    private readonly EcolecturaDbContext _ecolecturaDbContext;
    private readonly IPaymentGatewayService _paymentService;

    public TransactionService(
        BookmachsDbContext dbContext,
        EcolecturaDbContext ecolecturaDbContext,
        IPaymentGatewayService paymentService)
    {
        _dbContext = dbContext;
        _ecolecturaDbContext = ecolecturaDbContext;
        _paymentService = paymentService;
    }

    public async Task<IEnumerable<MatchTransactionDto>> GetMyMatchesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var transactions = await _dbContext.MatchTransactions
            .Where(t => t.RequesterUserId == userId || t.OwnerUserId == userId)
            .Include(t => t.Book)
            .Include(t => t.RequesterUser)
            .Include(t => t.OwnerUser)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        return transactions.Select(t => new MatchTransactionDto
        {
            Id = t.Id,
            RequesterUserId = t.RequesterUserId,
            RequesterName = t.RequesterUser?.Name ?? "Desconocido",
            BookId = t.BookId,
            BookTitle = t.Book?.Title ?? "Libro no disponible",
            BookAuthor = t.Book?.Author ?? "Desconocido",
            BookImageUrl = t.Book?.ImageUrl ?? string.Empty,
            BookCondition = t.Book?.Condition ?? "Good",
            OwnerUserId = t.OwnerUserId,
            OwnerName = t.Book?.IsInternalStock == true ? "Bookmachs Store (Stock Interno)" : (t.OwnerUser?.Name ?? "Desconocido"),
            FeeAmount = t.FeeAmount,
            PaymentStatus = t.PaymentStatus,
            LogisticsStatus = t.LogisticsStatus,
            LogisticsMethod = t.LogisticsMethod,
            IsCrossBorder = t.IsCrossBorder,
            CreatedAt = t.CreatedAt
        }).ToList();
    }

    public async Task<FeeEstimationDto> EstimateFeeAsync(Guid bookId, Guid requesterUserId, CancellationToken cancellationToken = default)
    {
        var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId, cancellationToken);
        if (book == null)
        {
            throw new KeyNotFoundException($"El libro con ID {bookId} no existe.");
        }

        var requester = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == requesterUserId, cancellationToken);
        if (requester == null)
        {
            throw new KeyNotFoundException($"El usuario con ID {requesterUserId} no existe.");
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        decimal feePercentage = settings?.FeePercentage ?? 0.30m;
        decimal minFee = settings?.MinFeeAmount ?? 1000.0m;
        decimal maxFee = settings?.MaxFeeAmount ?? 9000.0m;

        decimal rawFee = book.BaseValue * feePercentage;
        decimal finalFee = rawFee;

        if (finalFee < minFee) finalFee = minFee;
        else if (finalFee > maxFee) finalFee = maxFee;

        finalFee = Math.Round(finalFee, 2);
        rawFee = Math.Round(rawFee, 2);

        bool isCrossBorder = false;
        string ownerCountry = string.Empty;

        if (!book.IsInternalStock && book.OwnerId.HasValue)
        {
            var owner = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == book.OwnerId.Value, cancellationToken);
            if (owner != null)
            {
                ownerCountry = owner.Pais;
                if (!string.IsNullOrEmpty(requester.Pais) && 
                    !string.IsNullOrEmpty(owner.Pais) && 
                    !string.Equals(requester.Pais, owner.Pais, StringComparison.OrdinalIgnoreCase))
                {
                    isCrossBorder = true;
                }
            }
        }

        return new FeeEstimationDto
        {
            BookId = book.Id,
            BookTitle = book.Title,
            BaseValue = book.BaseValue,
            FeePercentage = feePercentage,
            RawFee = rawFee,
            MinFeeAmount = minFee,
            MaxFeeAmount = maxFee,
            FinalFee = finalFee,
            IsCrossBorder = isCrossBorder,
            RequesterCountry = requester.Pais,
            OwnerCountry = ownerCountry
        };
    }

    public async Task<CheckoutResultDto> CheckoutCardAsync(Guid matchTransactionId, string cardToken, Guid requesterUserId, bool acceptCrossBorder, CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.MatchTransactions.FirstOrDefaultAsync(t => t.Id == matchTransactionId, cancellationToken);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {matchTransactionId} no existe.");
        }

        if (transaction.RequesterUserId != requesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para pagar esta transacción.");
        }

        if (transaction.IsCrossBorder && !acceptCrossBorder)
        {
            return new CheckoutResultDto
            {
                Success = false,
                Message = "Debe confirmar explícitamente que acepta los costos de envío internacional."
            };
        }

        if (transaction.PaymentStatus == "Hold" || transaction.PaymentStatus == "Captured")
        {
            return new CheckoutResultDto
            {
                Success = true,
                PaymentHoldId = transaction.PaymentHoldId,
                PaymentStatus = transaction.PaymentStatus,
                Message = "La transacción ya cuenta con una retención o cobro procesado."
            };
        }

        var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == transaction.BookId, cancellationToken);
        if (book == null)
        {
            throw new KeyNotFoundException("El libro asociado a la transacción no existe.");
        }

        var requester = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == transaction.RequesterUserId, cancellationToken);
        if (requester == null)
        {
            throw new KeyNotFoundException("El usuario solicitante no existe.");
        }

        var holdResult = await _paymentService.CreateHoldAsync(
            transaction.FeeAmount, 
            book.Title, 
            cardToken, 
            requester.Email
        );

        if (holdResult.Success)
        {
            transaction.PaymentHoldId = holdResult.PaymentHoldId;
            transaction.PaymentStatus = "Hold";
            transaction.StatusUpdatedAt = DateTime.UtcNow;

            _dbContext.MatchTransactions.Update(transaction);
            await _dbContext.SaveChangesAsync(cancellationToken);

            // Descontar stock y registrar el ajuste en Ecolectura
            await DeductStockAndLogAdjustmentAsync(transaction.BookId, transaction.Id, transaction.RequesterUserId, cancellationToken);

            return new CheckoutResultDto
            {
                Success = true,
                PaymentHoldId = transaction.PaymentHoldId,
                PaymentStatus = transaction.PaymentStatus,
                Message = "Retención de fondos (Hold) pre-autorizada con éxito."
            };
        }

        transaction.PaymentStatus = "Failed";
        transaction.StatusUpdatedAt = DateTime.UtcNow;
        _dbContext.MatchTransactions.Update(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new CheckoutResultDto
        {
            Success = false,
            PaymentStatus = "Failed",
            Message = $"Error al procesar el hold: {holdResult.ErrorMessage}"
        };
    }

    public async Task<WebpayStartResultDto> WebpayStartAsync(Guid matchTransactionId, Guid requesterUserId, string returnUrl, bool acceptCrossBorder, CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.MatchTransactions.FirstOrDefaultAsync(t => t.Id == matchTransactionId, cancellationToken);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {matchTransactionId} no existe.");
        }

        if (transaction.RequesterUserId != requesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para pagar esta transacción.");
        }

        if (transaction.IsCrossBorder && !acceptCrossBorder)
        {
            return new WebpayStartResultDto
            {
                Success = false,
                Message = "Debe confirmar explícitamente que acepta los costos de envío internacional."
            };
        }

        if (transaction.PaymentStatus == "Hold" || transaction.PaymentStatus == "Captured")
        {
            return new WebpayStartResultDto
            {
                Success = false,
                Message = "La transacción ya cuenta con una retención o cobro procesado."
            };
        }

        var buyOrder = transaction.Id.ToString();
        var sessionId = $"session_{requesterUserId.ToString()[..8]}";

        var tbResult = await _paymentService.CreateTransbankHoldAsync(
            transaction.FeeAmount,
            buyOrder,
            sessionId,
            returnUrl
        );

        if (tbResult.Success)
        {
            return new WebpayStartResultDto
            {
                Success = true,
                Token = tbResult.Token,
                RedirectUrl = tbResult.RedirectUrl,
                Message = "Redirección a Webpay Plus diferido generada con éxito."
            };
        }

        return new WebpayStartResultDto
        {
            Success = false,
            Message = $"Error al iniciar el pago en Webpay: {tbResult.ErrorMessage}"
        };
    }

    public async Task<WebpayConfirmResultDto> WebpayConfirmAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(token))
        {
            throw new ArgumentException("El token de Webpay Plus es requerido.");
        }

        var tbResult = await _paymentService.CommitTransbankHoldAsync(token);

        if (tbResult.Success && !string.IsNullOrEmpty(tbResult.BuyOrder))
        {
            if (Guid.TryParse(tbResult.BuyOrder, out var transactionId))
            {
                var transaction = await _dbContext.MatchTransactions.FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
                if (transaction != null)
                {
                    transaction.PaymentHoldId = token;
                    transaction.PaymentStatus = "Hold";
                    transaction.StatusUpdatedAt = DateTime.UtcNow;

                    _dbContext.MatchTransactions.Update(transaction);
                    await _dbContext.SaveChangesAsync(cancellationToken);

                    // Descontar stock y registrar el ajuste en Ecolectura
                    await DeductStockAndLogAdjustmentAsync(transaction.BookId, transaction.Id, transaction.RequesterUserId, cancellationToken);

                    return new WebpayConfirmResultDto
                    {
                        Success = true,
                        MatchTransactionId = transaction.Id.ToString(),
                        PaymentStatus = "Hold",
                        Message = "Transacción Webpay Plus diferida confirmada y retenida con éxito."
                    };
                }
            }

            return new WebpayConfirmResultDto
            {
                Success = false,
                Message = $"La orden de compra {tbResult.BuyOrder} devuelta por Webpay no corresponde a ninguna transacción válida."
            };
        }

        if (!string.IsNullOrEmpty(tbResult.BuyOrder) && Guid.TryParse(tbResult.BuyOrder, out var failedTxId))
        {
            var transaction = await _dbContext.MatchTransactions.FirstOrDefaultAsync(t => t.Id == failedTxId, cancellationToken);
            if (transaction != null)
            {
                transaction.PaymentStatus = "Failed";
                transaction.StatusUpdatedAt = DateTime.UtcNow;
                _dbContext.MatchTransactions.Update(transaction);
                await _dbContext.SaveChangesAsync(cancellationToken);

                return new WebpayConfirmResultDto
                {
                    Success = false,
                    MatchTransactionId = transaction.Id.ToString(),
                    PaymentStatus = "Failed",
                    Message = $"Transacción fallida o rechazada en Webpay. Estado Transbank: {tbResult.Status}. Detalle: {tbResult.ErrorMessage}"
                };
            }
        }

        return new WebpayConfirmResultDto
        {
            Success = false,
            Message = $"Error al confirmar pago con Transbank: {tbResult.ErrorMessage}"
        };
    }

    public async Task<LogisticsResultDto> UpdateLogisticsAsync(Guid matchTransactionId, Guid requesterUserId, string logisticsMethod, string? trackingNumber, string? evidencePhotoBase64, CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.MatchTransactions.FirstOrDefaultAsync(t => t.Id == matchTransactionId, cancellationToken);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {matchTransactionId} no existe.");
        }

        if (transaction.RequesterUserId != requesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para actualizar la logística de esta transacción.");
        }

        if (transaction.PaymentStatus != "Hold" && transaction.PaymentStatus != "Captured")
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Debe pre-autorizar (pagar) el Fee de intercambio antes de configurar la logística."
            };
        }

        var method = logisticsMethod.ToLowerInvariant();
        if (method != "presencial" && method != "bodega" && method != "p2p" && method != "donacion")
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Método logístico no válido. Use: Presencial, Bodega, P2P o Donacion."
            };
        }

        if (method == "donacion" && string.IsNullOrEmpty(evidencePhotoBase64))
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Para el método Donación, debe subir una foto de evidencia."
            };
        }

        if ((method == "bodega" || method == "p2p") && string.IsNullOrEmpty(trackingNumber))
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Para envíos P2P o Bodega, debe ingresar un número de seguimiento (tracking)."
            };
        }

        transaction.LogisticsMethod = logisticsMethod;
        transaction.LogisticsStatus = (method == "presencial" || method == "donacion") ? "Delivered" : "InTransit";
        transaction.StatusUpdatedAt = Bookmachs.Refactored.Api.Helpers.DateTimeHelper.GetSantiagoTime();

        _dbContext.MatchTransactions.Update(transaction);

        if (transaction.LogisticsStatus == "Delivered" && transaction.IsPublic)
        {
            var requester = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == transaction.RequesterUserId, cancellationToken);
            var owner = transaction.OwnerUserId.HasValue 
                ? await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == transaction.OwnerUserId.Value, cancellationToken) 
                : null;
            var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == transaction.BookId, cancellationToken);

            var requesterName = requester?.Name ?? "Lector Anónimo";
            var ownerName = owner?.Name ?? (string.Equals(transaction.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase) 
                ? "Bookmachs (Donación)" 
                : "Bookmachs");

            var timelineEvent = new TimelineEvent
            {
                Id = Guid.NewGuid(),
                MatchTransactionId = transaction.Id,
                EventType = string.Equals(transaction.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase) ? "Donation" : "Exchange",
                Title = string.Equals(transaction.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase) 
                    ? "¡Donación completada exitosamente!" 
                    : "¡Libro intercambiado con éxito!",
                Description = string.Equals(transaction.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase)
                    ? $"{requesterName} completó la donación del libro '{book?.Title}'."
                    : $"{requesterName} recibió '{book?.Title}' de {ownerName}.",
                CreatedAt = DateTime.UtcNow
            };

            await _dbContext.TimelineEvents.AddAsync(timelineEvent, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LogisticsResultDto
        {
            Success = true,
            LogisticsStatus = transaction.LogisticsStatus,
            LogisticsMethod = transaction.LogisticsMethod,
            Message = "Método de entrega e información logística actualizada con éxito."
        };
    }

    public async Task<WebhookProcessResultDto> ProcessMercadoPagoWebhookAsync(string type, string action, string dataId, CancellationToken cancellationToken = default)
    {
        if (type != "preapproval" && type != "subscription")
        {
            return new WebhookProcessResultDto
            {
                Success = false,
                Message = $"Tipo de evento '{type}' ignorado. Solo se procesan eventos de tipo 'preapproval' o 'subscription'."
            };
        }

        var details = await _paymentService.GetSubscriptionDetailsAsync(dataId);
        if (!details.Success || string.IsNullOrEmpty(details.PayerEmail))
        {
            return new WebhookProcessResultDto
            {
                Success = false,
                Message = $"No se pudieron recuperar los detalles de la suscripción con ID '{dataId}': {details.ErrorMessage}"
            };
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == details.PayerEmail, cancellationToken);
        if (user == null)
        {
            return new WebhookProcessResultDto
            {
                Success = false,
                Message = $"Usuario con email '{details.PayerEmail}' no encontrado en la plataforma."
            };
        }

        var status = details.Status?.ToLowerInvariant();
        if (status == "authorized" || status == "active" || status == "approved")
        {
            user.IsPremium = true;
            user.SubscriptionPlan = "Premium";
            user.SubscriptionEndDate = DateTime.UtcNow.AddMonths(1);
            _dbContext.Users.Update(user);

            var subscription = new Subscription
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                PlanName = "Premium",
                Price = details.Price > 0 ? details.Price : 9990m,
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddMonths(1),
                IsActive = true,
                ExternalSubscriptionId = details.SubscriptionId,
                CreatedAt = DateTime.UtcNow
            };

            await _dbContext.Subscriptions.AddAsync(subscription, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new WebhookProcessResultDto
            {
                Success = true,
                Message = $"Suscripción Premium activada exitosamente para el usuario '{user.Name}' ({user.Email}).",
                UserId = user.Id.ToString(),
                SubscriptionPlan = user.SubscriptionPlan
            };
        }
        else if (status == "cancelled" || status == "cancelled_by_payer" || status == "suspended")
        {
            user.IsPremium = false;
            user.SubscriptionPlan = "Free";
            _dbContext.Users.Update(user);

            var activeSub = await _dbContext.Subscriptions
                .FirstOrDefaultAsync(s => s.UserId == user.Id && s.IsActive, cancellationToken);
            if (activeSub != null)
            {
                activeSub.IsActive = false;
                _dbContext.Subscriptions.Update(activeSub);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new WebhookProcessResultDto
            {
                Success = true,
                Message = $"Suscripción cancelada para el usuario '{user.Name}' ({user.Email}).",
                UserId = user.Id.ToString(),
                SubscriptionPlan = user.SubscriptionPlan
            };
        }

        return new WebhookProcessResultDto
        {
            Success = false,
            Message = $"Estado de suscripción '{details.Status}' no requiere cambios en el sistema."
        };
    }

    private async Task DeductStockAndLogAdjustmentAsync(Guid bookId, Guid matchTransactionId, Guid requesterUserId, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Verificar si el libro es stock interno de Ecolectura
            var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId, cancellationToken);
            if (book == null || !book.IsInternalStock)
            {
                return; // No es un libro de Ecolectura
            }

            // 2. Buscar el producto en la base de datos de Ecolectura
            var product = await _ecolecturaDbContext.Productos
                .FirstOrDefaultAsync(p => p.IdProducto == bookId.ToString(), cancellationToken);

            if (product == null)
            {
                return; // No se encontró en Ecolectura
            }

            // Guardar valores anteriores para el historial
            decimal precioAnterior = product.Precio ?? 0.00m;
            int stockAnterior = product.Stock ?? 0;
            string ubicacionAnterior = product.Ubicacion ?? "No especificada";
            bool estadoAnterior = product.Activo;

            // 3. Descontar stock
            int nuevoStock = stockAnterior > 0 ? stockAnterior - 1 : 0;
            product.Stock = nuevoStock;
            
            // Si el stock llega a 0, desactivamos el producto para que no se muestre más en el e-commerce
            if (nuevoStock == 0)
            {
                product.Activo = false;
            }

            _ecolecturaDbContext.Productos.Update(product);

            // 4. Crear el registro en AjusteInventario
            var adjustment = new EcolecturaAjusteInventario
            {
                IdProducto = product.IdProducto,
                PrecioAnterior = precioAnterior,
                StockAnterior = stockAnterior,
                UbicacionAnterior = ubicacionAnterior.Length > 100 ? ubicacionAnterior[..100] : ubicacionAnterior,
                EstadoAnterior = estadoAnterior,
                PrecioActualizacion = product.Precio ?? 0.00m,
                StockActualizacion = nuevoStock,
                UbicacionActualizacion = (product.Ubicacion ?? "No especificada").Length > 100 
                    ? (product.Ubicacion ?? "No especificada")[..100] 
                    : (product.Ubicacion ?? "No especificada"),
                EstadoActual = product.Activo,
                IdUsuario = null, // Al ser a través de API externa, no se asocia un usuario AspNetUsers local
                FechaActualizacion = DateTime.UtcNow,
                Justificacion = $"Descuento por adquisición en Bookmachs. Match Transaction ID: {matchTransactionId}. Requester User ID: {requesterUserId}."
            };

            await _ecolecturaDbContext.AjustesInventario.AddAsync(adjustment, cancellationToken);

            // Guardar cambios en Ecolectura
            await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Registrar error pero no interrumpir la transacción local de Bookmachs
            Console.Error.WriteLine($"Error al descontar stock de Ecolectura o registrar el ajuste de inventario: {ex.Message}");
        }
    }
}
