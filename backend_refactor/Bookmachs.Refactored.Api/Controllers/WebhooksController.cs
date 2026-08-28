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

            bool activate = !string.Equals(request.Action, "cancelled", StringComparison.OrdinalIgnoreCase);

            user.IsPremium = activate;
            user.SubscriptionPlan = activate ? "Premium" : "Free";
            user.SubscriptionEndDate = activate ? DateTime.UtcNow.AddDays(30) : null;

            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync();

            return Ok(new WebhookProcessResultDto
            {
                Success = true,
                Message = activate 
                    ? "¡Pago procesado con éxito! Tu cuenta ha sido actualizada al Plan Premium." 
                    : "Suscripción cancelada correctamente."
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
