using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Bookmachs.Refactored.Api.Services;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class SupportController : ControllerBase
{
    private readonly BookmachsDbContext _dbContext;
    private readonly ISendGridEmailService _emailService;
    private readonly ILogger<SupportController> _logger;

    public SupportController(
        BookmachsDbContext dbContext,
        ISendGridEmailService emailService,
        ILogger<SupportController> logger)
    {
        _dbContext = dbContext;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpGet("status")]
    public IActionResult GetSystemStatus()
    {
        return Ok(new
        {
            status = "operational",
            systemTime = DateTime.UtcNow,
            services = new[]
            {
                new { name = "Motor de Intercambio (Intercambialibros)", status = "online", uptime = "99.9%" },
                new { name = "Pasarela de Pagos (Transbank Webpay)", status = "online", uptime = "99.9%" },
                new { name = "Catálogo e Inventario Ecolectura", status = "online", uptime = "99.8%" },
                new { name = "Canal de Soporte 24/7", status = "active", uptime = "100%" }
            }
        });
    }

    [HttpPost("ticket")]
    public async Task<ActionResult<SupportTicketResponseDto>> CreateTicket(
        [FromBody] CreateSupportTicketDto request,
        CancellationToken cancellationToken)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("El correo y el mensaje son campos obligatorios.");
        }

        bool isPremium = false;
        string userName = request.Name;

        // Verificar si el usuario está autenticado y si es Premium
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
        {
            var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            if (user != null)
            {
                isPremium = user.IsPremium;
                if (string.IsNullOrWhiteSpace(userName))
                {
                    userName = user.Name;
                }
            }
        }

        var randomCode = Random.Shared.Next(1000, 9999);
        var ticketId = $"BM-{(isPremium ? "PREM" : "STD")}-{DateTime.UtcNow:yyyyMMdd}-{randomCode}";

        _logger.LogInformation("Support ticket {TicketId} created by {Email} ({UserName}). IsPremium: {IsPremium}. Category: {Category}. Subject: {Subject}",
            ticketId, request.Email, userName, isPremium, request.Category, request.Subject);

        string whatsappUrl = string.Empty;
        if (isPremium)
        {
            var encodedGreeting = Uri.EscapeDataString(
                $"Hola equipo Intercambialibros. Soy usuario Premium ({userName} - {request.Email}). " +
                $"Mi ticket prioritario es #{ticketId}. Asunto: {request.Subject}. Detalle: {request.Message}");
            whatsappUrl = $"https://wa.me/56987654321?text={encodedGreeting}";
        }

        var response = new SupportTicketResponseDto
        {
            Success = true,
            TicketId = ticketId,
            Priority = isPremium ? "Alta (Soporte Prioritario 24/7)" : "Estándar",
            EstimatedResponseTime = isPremium ? "Menos de 15 minutos (24/7)" : "24 a 48 horas hábiles",
            Message = isPremium
                ? "¡Ticket prioritario 24/7 recibido! Tu consulta ha ingresado a la cola de atención preferencial."
                : "Hemos recibido tu consulta exitosamente. Te responderemos a tu correo a la brevedad.",
            HasWhatsAppAccess = isPremium,
            WhatsAppUrl = isPremium ? whatsappUrl : null
        };

        // Enviar correo de confirmación de ticket al usuario
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailService.SendSupportTicketConfirmationEmailAsync(request.Email, new SupportTicketEmailData
                {
                    UserName = userName,
                    TicketId = ticketId,
                    Subject = request.Subject,
                    Category = request.Category,
                    Priority = response.Priority,
                    EstimatedResponseTime = response.EstimatedResponseTime,
                    HasWhatsAppAccess = isPremium,
                    WhatsAppUrl = response.WhatsAppUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al enviar correo de confirmación de ticket de soporte #{TicketId}", ticketId);
            }
        });

        return Ok(response);
    }
}
