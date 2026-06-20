using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using Bookmachs.Domain.Services;
using MediatR;

namespace Bookmachs.Application.Transactions.Commands;

public class CheckoutResultDto
{
    public bool Success { get; set; }
    public string? PaymentHoldId { get; set; }
    public string? PaymentStatus { get; set; }
    public string? Message { get; set; }
}

public record ConfirmCardCheckoutCommand : IRequest<CheckoutResultDto>
{
    public Guid MatchTransactionId { get; init; }
    public string CardToken { get; init; } = string.Empty;
    public Guid RequesterUserId { get; init; }
    public bool AcceptCrossBorder { get; init; }
}

public class ConfirmCardCheckoutCommandHandler : IRequestHandler<ConfirmCardCheckoutCommand, CheckoutResultDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPaymentGatewayService _paymentService;

    public ConfirmCardCheckoutCommandHandler(IUnitOfWork unitOfWork, IPaymentGatewayService paymentService)
    {
        _unitOfWork = unitOfWork;
        _paymentService = paymentService;
    }

    public async Task<CheckoutResultDto> Handle(ConfirmCardCheckoutCommand request, CancellationToken cancellationToken)
    {
        // 1. Obtener la transacción de Match
        var transaction = await _unitOfWork.MatchTransactions.GetByIdAsync(request.MatchTransactionId);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {request.MatchTransactionId} no existe.");
        }

        // 2. Validar que el solicitante sea el usuario correcto
        if (transaction.RequesterUserId != request.RequesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para pagar esta transacción.");
        }

        // 2.5 Validar confirmación geográfica para transacciones internacionales
        if (transaction.IsCrossBorder && !request.AcceptCrossBorder)
        {
            return new CheckoutResultDto
            {
                Success = false,
                Message = "Debe confirmar explícitamente que acepta los costos de envío internacional."
            };
        }

        // 3. Validar estado actual
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

        // 4. Obtener libro y usuario para descripción y email
        var book = await _unitOfWork.Books.GetByIdAsync(transaction.BookId);
        if (book == null)
        {
            throw new KeyNotFoundException("El libro asociado a la transacción no existe.");
        }

        var requester = await _unitOfWork.Users.GetByIdAsync(transaction.RequesterUserId);
        if (requester == null)
        {
            throw new KeyNotFoundException("El usuario solicitante no existe.");
        }

        // 5. Invocar la pasarela de pagos para el Hold (Pre-autorización)
        var holdResult = await _paymentService.CreateHoldAsync(
            transaction.FeeAmount, 
            book.Title, 
            request.CardToken, 
            requester.Email
        );

        if (holdResult.Success)
        {
            // Actualizar la transacción a estado Hold
            transaction.PaymentHoldId = holdResult.PaymentHoldId;
            transaction.PaymentStatus = "Hold";
            transaction.StatusUpdatedAt = DateTime.UtcNow;

            _unitOfWork.MatchTransactions.Update(transaction);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new CheckoutResultDto
            {
                Success = true,
                PaymentHoldId = transaction.PaymentHoldId,
                PaymentStatus = transaction.PaymentStatus,
                Message = "Retención de fondos (Hold) pre-autorizada con éxito."
            };
        }

        // En caso de fallo
        transaction.PaymentStatus = "Failed";
        transaction.StatusUpdatedAt = DateTime.UtcNow;
        _unitOfWork.MatchTransactions.Update(transaction);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new CheckoutResultDto
        {
            Success = false,
            PaymentStatus = "Failed",
            Message = $"Error al procesar el hold: {holdResult.ErrorMessage}"
        };
    }
}
