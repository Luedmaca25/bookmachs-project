using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Transactions.Commands;

public class LogisticsResultDto
{
    public bool Success { get; set; }
    public string? LogisticsStatus { get; set; }
    public string? LogisticsMethod { get; set; }
    public string? Message { get; set; }
}

public record UpdateLogisticsCommand : IRequest<LogisticsResultDto>
{
    public Guid MatchTransactionId { get; init; }
    public Guid RequesterUserId { get; init; }
    public string LogisticsMethod { get; init; } = string.Empty;
    public string? TrackingNumber { get; init; }
    public string? EvidencePhotoBase64 { get; init; }
}

public class UpdateLogisticsCommandHandler : IRequestHandler<UpdateLogisticsCommand, LogisticsResultDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateLogisticsCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<LogisticsResultDto> Handle(UpdateLogisticsCommand request, CancellationToken cancellationToken)
    {
        var transaction = await _unitOfWork.MatchTransactions.GetByIdAsync(request.MatchTransactionId);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {request.MatchTransactionId} no existe.");
        }

        if (transaction.RequesterUserId != request.RequesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para actualizar la logística de esta transacción.");
        }

        // Validar que el pago ya haya sido retenido (Hold) o cobrado (Captured)
        if (transaction.PaymentStatus != "Hold" && transaction.PaymentStatus != "Captured")
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Debe pre-autorizar (pagar) el Fee de intercambio antes de configurar la logística."
            };
        }

        // Validar método
        var method = request.LogisticsMethod.ToLowerInvariant();
        if (method != "presencial" && method != "bodega" && method != "p2p" && method != "donacion")
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Método logístico no válido. Use: Presencial, Bodega, P2P o Donacion."
            };
        }

        // Si es donación, exigir evidencia
        if (method == "donacion" && string.IsNullOrEmpty(request.EvidencePhotoBase64))
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Para el método Donación, debe subir una foto de evidencia."
            };
        }

        // Si es Bodega o P2P, exigir tracking
        if ((method == "bodega" || method == "p2p") && string.IsNullOrEmpty(request.TrackingNumber))
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Para envíos P2P o Bodega, debe ingresar un número de seguimiento (tracking)."
            };
        }

        // Actualizar datos
        transaction.LogisticsMethod = request.LogisticsMethod;
        transaction.LogisticsStatus = (method == "presencial" || method == "donacion") ? "Delivered" : "InTransit";
        transaction.StatusUpdatedAt = DateTime.UtcNow;

        _unitOfWork.MatchTransactions.Update(transaction);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new LogisticsResultDto
        {
            Success = true,
            LogisticsStatus = transaction.LogisticsStatus,
            LogisticsMethod = transaction.LogisticsMethod,
            Message = "Método de entrega e información logística actualizada con éxito."
        };
    }
}
