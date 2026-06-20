using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using Bookmachs.Domain.Services;
using MediatR;

namespace Bookmachs.Application.Transactions.Commands;

public class WebpayStartResultDto
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? RedirectUrl { get; set; }
    public string? Message { get; set; }
}

public record StartWebpayCheckoutCommand : IRequest<WebpayStartResultDto>
{
    public Guid MatchTransactionId { get; init; }
    public Guid RequesterUserId { get; init; }
    public string ReturnUrl { get; init; } = string.Empty;
}

public class StartWebpayCheckoutCommandHandler : IRequestHandler<StartWebpayCheckoutCommand, WebpayStartResultDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPaymentGatewayService _paymentService;

    public StartWebpayCheckoutCommandHandler(IUnitOfWork unitOfWork, IPaymentGatewayService paymentService)
    {
        _unitOfWork = unitOfWork;
        _paymentService = paymentService;
    }

    public async Task<WebpayStartResultDto> Handle(StartWebpayCheckoutCommand request, CancellationToken cancellationToken)
    {
        // 1. Obtener la transacción de Match
        var transaction = await _unitOfWork.MatchTransactions.GetByIdAsync(request.MatchTransactionId);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {request.MatchTransactionId} no existe.");
        }

        // 2. Validar permisos
        if (transaction.RequesterUserId != request.RequesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para pagar esta transacción.");
        }

        // 3. Validar estado actual
        if (transaction.PaymentStatus == "Hold" || transaction.PaymentStatus == "Captured")
        {
            return new WebpayStartResultDto
            {
                Success = false,
                Message = "La transacción ya cuenta con una retención o cobro procesado."
            };
        }

        // 4. Iniciar transacción diferida en Transbank Webpay Plus
        // Usamos el ID de la transacción como BuyOrder
        var buyOrder = transaction.Id.ToString();
        var sessionId = $"session_{request.RequesterUserId.ToString()[..8]}";

        var tbResult = await _paymentService.CreateTransbankHoldAsync(
            transaction.FeeAmount,
            buyOrder,
            sessionId,
            request.ReturnUrl
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
}
