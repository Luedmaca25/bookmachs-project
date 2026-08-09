using System;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
[AllowAnonymous]
public class WebhooksController : ControllerBase
{
    private readonly ITransactionService _transactionService;

    public WebhooksController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
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
            var result = await _transactionService.ProcessMercadoPagoWebhookAsync(
                notification.Type,
                notification.Action,
                notification.Data.Id);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, message = $"Error al procesar webhook: {ex.Message}" });
        }
    }

    [HttpPost("trigger-test")]
    public async Task<IActionResult> TriggerTestWebhook([FromBody] TriggerTestWebhookRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest("El email del usuario es obligatorio para la simulación.");
        }

        try
        {
            var safeEmail = request.Email.Replace("@", "_");
            var mockSubId = $"mp_mock_sub_{Guid.NewGuid().ToString("N")[..8]}_email_{safeEmail}";

            var result = await _transactionService.ProcessMercadoPagoWebhookAsync(
                "preapproval",
                request.Action ?? "created",
                mockSubId);

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
