using System;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
[AllowAnonymous]
public class WebhooksController : ControllerBase
{
    private readonly BookmachsDbContext _dbContext;

    public WebhooksController(BookmachsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost("mercadopago")]
    public IActionResult MercadoPagoWebhook([FromBody] MercadoPagoWebhookNotification notification)
    {
        return Ok(new WebhookProcessResultDto
        {
            Success = true,
            Message = "Notificación procesada."
        });
    }

    [HttpPost("trigger-test")]
    public async Task<IActionResult> TriggerTestWebhook([FromBody] TriggerTestWebhookRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "El email del usuario es obligatorio para procesar la membresía." });
        }

        try
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
            if (user == null)
            {
                return NotFound(new { message = $"Usuario con email '{request.Email}' no encontrado." });
            }

            bool isCancellation = string.Equals(request.Action, "cancelled", StringComparison.OrdinalIgnoreCase);

            string responseMessage;
            if (isCancellation)
            {
                if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > DateTime.UtcNow)
                {
                    user.IsSubscriptionCancelled = true;
                    // Mantiene IsPremium = true hasta el fin de su periodo
                    responseMessage = $"Suscripción cancelada correctamente. Tu membresía y beneficios continuarán activos hasta el {user.SubscriptionEndDate.Value:dd/MM/yyyy}, cuando finalizará de forma automática.";
                }
                else
                {
                    user.IsPremium = false;
                    user.SubscriptionPlan = "Free";
                    user.SubscriptionEndDate = null;
                    user.IsSubscriptionCancelled = false;
                    responseMessage = "Suscripción cancelada correctamente. Tu cuenta ha vuelto al Plan Gratuito.";
                }
            }
            else
            {
                user.IsPremium = true;
                user.SubscriptionPlan = "Premium";
                user.SubscriptionEndDate = (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > DateTime.UtcNow)
                    ? user.SubscriptionEndDate.Value.AddMonths(1)
                    : DateTime.UtcNow.AddMonths(1);
                user.IsSubscriptionCancelled = false;
                responseMessage = "¡Pago procesado con éxito! Tu cuenta ha sido actualizada al Plan Premium.";
            }

            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync();

            return Ok(new WebhookProcessResultDto
            {
                Success = true,
                Message = responseMessage
            });
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
