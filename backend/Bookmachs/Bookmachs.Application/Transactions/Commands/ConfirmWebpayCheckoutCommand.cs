using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using Bookmachs.Domain.Services;
using MediatR;

namespace Bookmachs.Application.Transactions.Commands;

public class WebpayConfirmResultDto
{
    public bool Success { get; set; }
    public string? MatchTransactionId { get; set; }
    public string? PaymentStatus { get; set; }
    public string? Message { get; set; }
}

public record ConfirmWebpayCheckoutCommand : IRequest<WebpayConfirmResultDto>
{
    public string Token { get; init; } = string.Empty;
}

public class ConfirmWebpayCheckoutCommandHandler : IRequestHandler<ConfirmWebpayCheckoutCommand, WebpayConfirmResultDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPaymentGatewayService _paymentService;

    public ConfirmWebpayCheckoutCommandHandler(IUnitOfWork unitOfWork, IPaymentGatewayService paymentService)
    {
        _unitOfWork = unitOfWork;
        _paymentService = paymentService;
    }

    public async Task<WebpayConfirmResultDto> Handle(ConfirmWebpayCheckoutCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(request.Token))
        {
            throw new ArgumentException("El token de Webpay Plus es requerido.");
        }

        // 1. Confirmar/Commit con Transbank
        var tbResult = await _paymentService.CommitTransbankHoldAsync(request.Token);

        if (tbResult.Success && !string.IsNullOrEmpty(tbResult.BuyOrder))
        {
            // En nuestra implementación, la BuyOrder es el Id de la MatchTransaction (Guid)
            if (Guid.TryParse(tbResult.BuyOrder, out var transactionId))
            {
                var transaction = await _unitOfWork.MatchTransactions.GetByIdAsync(transactionId);
                if (transaction != null)
                {
                    // Actualizar el estado de la transacción a Hold
                    transaction.PaymentHoldId = request.Token; // Guardamos el token de Webpay como ID de retención
                    transaction.PaymentStatus = "Hold";
                    transaction.StatusUpdatedAt = DateTime.UtcNow;

                    _unitOfWork.MatchTransactions.Update(transaction);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);

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

        // Si falló el commit, buscar la transacción si se puede deducir de la respuesta para marcarla fallida
        if (!string.IsNullOrEmpty(tbResult.BuyOrder) && Guid.TryParse(tbResult.BuyOrder, out var failedTxId))
        {
            var transaction = await _unitOfWork.MatchTransactions.GetByIdAsync(failedTxId);
            if (transaction != null)
            {
                transaction.PaymentStatus = "Failed";
                transaction.StatusUpdatedAt = DateTime.UtcNow;
                _unitOfWork.MatchTransactions.Update(transaction);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

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
}
