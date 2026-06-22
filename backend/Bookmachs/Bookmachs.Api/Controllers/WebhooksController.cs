using System;
using System.Threading.Tasks;
using Bookmachs.Application.Subscriptions.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous] // Permitir llamadas sin autenticación JWT desde la pasarela de pagos
public class WebhooksController : ControllerBase
{
    private readonly ISender _mediator;

    public WebhooksController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("mercadopago")]
    public async Task<IActionResult> MercadoPagoWebhook([FromBody] MercadoPagoWebhookNotification notification)
    {
        if (notification == null || notification.Data == null || string.IsNullOrEmpty(notification.Data.Id))
        {
            return BadRequest(new { message = "El cuerpo de la notificación o el ID del recurso son inválidos." });
        }

        try
        {
            var command = new ProcessMercadoPagoWebhookCommand
            {
                Type = notification.Type,
                Action = notification.Action,
                DataId = notification.Data.Id
            };

            var result = await _mediator.Send(command);
            
            // Retornamos 200 siempre para confirmar recepción a la pasarela (regla de Mercado Pago para evitar loops de reintentos)
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, message = $"Error al procesar webhook: {ex.Message}" });
        }
    }

    /// <summary>
    /// Endpoint de utilidad para simular notificaciones de webhook de suscripción en desarrollo y QA local.
    /// </summary>
    [HttpPost("trigger-test")]
    public async Task<IActionResult> TriggerTestWebhook([FromBody] TriggerTestWebhookRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("El email del usuario es obligatorio para la simulación.");
        }

        try
        {
            // Codificamos el email en el ID para que el mock de pasarela lo extraiga y retorne
            var safeEmail = request.Email.Replace("@", "_");
            var mockSubId = $"mp_mock_sub_{Guid.NewGuid().ToString("N")[..8]}_email_{safeEmail}";

            var command = new ProcessMercadoPagoWebhookCommand
            {
                Type = "preapproval",
                Action = request.Action ?? "created",
                DataId = mockSubId
            };

            var result = await _mediator.Send(command);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class MercadoPagoWebhookNotification
{
    public string Type { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public MercadoPagoWebhookData Data { get; set; } = new();
}

public class MercadoPagoWebhookData
{
    public string Id { get; set; } = string.Empty;
}

public class TriggerTestWebhookRequest
{
    public string Email { get; set; } = string.Empty;
    public string? Action { get; set; }
}
