using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Domain.Services;
using MediatR;

namespace Bookmachs.Application.Subscriptions.Commands;

public class WebhookProcessResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? UserId { get; set; }
    public string? SubscriptionPlan { get; set; }
}

public record ProcessMercadoPagoWebhookCommand : IRequest<WebhookProcessResultDto>
{
    public string Type { get; init; } = string.Empty;
    public string Action { get; init; } = string.Empty;
    public string DataId { get; init; } = string.Empty;
}

public class ProcessMercadoPagoWebhookCommandHandler : IRequestHandler<ProcessMercadoPagoWebhookCommand, WebhookProcessResultDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPaymentGatewayService _paymentService;

    public ProcessMercadoPagoWebhookCommandHandler(IUnitOfWork unitOfWork, IPaymentGatewayService paymentService)
    {
        _unitOfWork = unitOfWork;
        _paymentService = paymentService;
    }

    public async Task<WebhookProcessResultDto> Handle(ProcessMercadoPagoWebhookCommand request, CancellationToken cancellationToken)
    {
        // 1. Validar que el tipo de evento sea preapproval (suscripción recurrente)
        if (request.Type != "preapproval" && request.Type != "subscription")
        {
            return new WebhookProcessResultDto
            {
                Success = false,
                Message = $"Tipo de evento '{request.Type}' ignorado. Solo se procesan eventos de tipo 'preapproval' o 'subscription'."
            };
        }

        // 2. Obtener detalles de la suscripción de Mercado Pago
        var details = await _paymentService.GetSubscriptionDetailsAsync(request.DataId);
        if (!details.Success || string.IsNullOrEmpty(details.PayerEmail))
        {
            return new WebhookProcessResultDto
            {
                Success = false,
                Message = $"No se pudieron recuperar los detalles de la suscripción con ID '{request.DataId}': {details.ErrorMessage}"
            };
        }

        // 3. Buscar el usuario correspondiente por email
        var user = await _unitOfWork.Users.GetByEmailAsync(details.PayerEmail);
        if (user == null)
        {
            return new WebhookProcessResultDto
            {
                Success = false,
                Message = $"Usuario con email '{details.PayerEmail}' no encontrado en la plataforma."
            };
        }

        // 4. Procesar activación de suscripción si el estado es autorizado/activo
        var status = details.Status?.ToLowerInvariant();
        if (status == "authorized" || status == "active" || status == "approved")
        {
            // Actualizar estado del usuario a Premium
            user.IsPremium = true;
            user.SubscriptionPlan = "Premium";
            user.SubscriptionEndDate = DateTime.UtcNow.AddMonths(1);
            _unitOfWork.Users.Update(user);

            // Guardar registro de suscripción
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

            await _unitOfWork.Subscriptions.AddAsync(subscription);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

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
            // Cancelar suscripción
            user.IsPremium = false;
            user.SubscriptionPlan = "Free";
            _unitOfWork.Users.Update(user);

            // Actualizar la suscripción activa a inactiva
            var activeSub = await _unitOfWork.Subscriptions.GetActiveSubscriptionByUserIdAsync(user.Id);
            if (activeSub != null)
            {
                activeSub.IsActive = false;
                _unitOfWork.Subscriptions.Update(activeSub);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

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
}
