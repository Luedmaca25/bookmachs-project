using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Domain.Services;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly BookmachsDbContext _dbContext;
    private readonly IPaymentGatewayService _paymentService;

    public SubscriptionsController(BookmachsDbContext dbContext, IPaymentGatewayService paymentService)
    {
        _dbContext = dbContext;
        _paymentService = paymentService;
    }

    [Authorize]
    [HttpPost("webpay-start")]
    public async Task<ActionResult<WebpayStartResultDto>> WebpayStart([FromBody] SubscriptionWebpayStartRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || string.IsNullOrEmpty(request.ReturnUrl))
        {
            return BadRequest("La URL de retorno es requerida.");
        }

        try
        {
            var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return NotFound("Usuario no encontrado.");
            }

            if (user.IsPremium && !user.IsSubscriptionCancelled)
            {
                return BadRequest(new WebpayStartResultDto
                {
                    Success = false,
                    Message = "Ya cuentas con una suscripción Premium activa. No es necesario volver a procesar el pago."
                });
            }

            var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync();
            decimal amount = settings != null && settings.PremiumPlanPriceUsd > 0 
                ? settings.PremiumPlanPriceUsd 
                : 9990.0m;

            var buyOrder = $"SUB_{Guid.NewGuid().ToString("N")[..20]}";
            var sessionId = $"sub_sess_{userId.ToString("N")[..8]}";

            var tbResult = await _paymentService.CreateTransbankTransactionAsync(amount, buyOrder, sessionId, request.ReturnUrl);

            if (tbResult.Success)
            {
                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    PlanName = "Premium",
                    Price = amount,
                    StartDate = DateTime.UtcNow,
                    EndDate = DateTime.UtcNow.AddMonths(1),
                    IsActive = false,
                    ExternalSubscriptionId = buyOrder,
                    CreatedAt = DateTime.UtcNow
                };

                await _dbContext.Subscriptions.AddAsync(subscription);
                await _dbContext.SaveChangesAsync();

                return Ok(new WebpayStartResultDto
                {
                    Success = true,
                    Token = tbResult.Token,
                    RedirectUrl = tbResult.RedirectUrl,
                    Message = "Redirección a Transbank Webpay Plus iniciada con éxito."
                });
            }

            return BadRequest(new WebpayStartResultDto
            {
                Success = false,
                Message = $"Error al iniciar el pago en Webpay: {tbResult.ErrorMessage}"
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, (WebpayConfirmResultDto Result, bool IsSuccess)> _confirmedTokenCache = new();

    [HttpPost("webpay-confirm")]
    public async Task<ActionResult<WebpayConfirmResultDto>> WebpayConfirm([FromQuery] string? token_ws, [FromBody] WebpayConfirmRequest? body)
    {
        var token = token_ws ?? body?.Token;
        if (string.IsNullOrEmpty(token))
        {
            return BadRequest("El token de Webpay Plus (token_ws) es requerido.");
        }

        if (_confirmedTokenCache.TryGetValue(token, out var cached))
        {
            if (cached.IsSuccess)
            {
                return Ok(cached.Result);
            }
            return BadRequest(cached.Result);
        }

        try
        {
            var tbResult = await _paymentService.CommitTransbankTransactionAsync(token);

            if (tbResult.Success)
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                User? user = null;

                if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
                {
                    user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
                }

                if (user == null)
                {
                    var sub = await _dbContext.Subscriptions.OrderByDescending(s => s.CreatedAt).FirstOrDefaultAsync(s => !s.IsActive);
                    if (sub != null)
                    {
                        user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == sub.UserId);
                        sub.IsActive = true;
                        _dbContext.Subscriptions.Update(sub);
                    }
                }

                if (user != null)
                {
                    user.IsPremium = true;
                    user.SubscriptionPlan = "Premium";
                    user.SubscriptionEndDate = (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > DateTime.UtcNow)
                        ? user.SubscriptionEndDate.Value.AddMonths(1)
                        : DateTime.UtcNow.AddMonths(1);
                    user.IsSubscriptionCancelled = false;
                    _dbContext.Users.Update(user);
                    await _dbContext.SaveChangesAsync();
                }

                var successResult = new WebpayConfirmResultDto
                {
                    Success = true,
                    PaymentStatus = "Captured",
                    Message = "¡Pago de suscripción Premium confirmado exitosamente por Transbank Webpay Plus!"
                };

                _confirmedTokenCache[token] = (successResult, true);
                return Ok(successResult);
            }

            var failResult = new WebpayConfirmResultDto
            {
                Success = false,
                Message = $"Error al confirmar el pago en Webpay: {tbResult.ErrorMessage}"
            };

            _confirmedTokenCache[token] = (failResult, false);
            return BadRequest(failResult);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("cancel")]
    public async Task<ActionResult<SubscriptionCancelResultDto>> CancelSubscription(CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound("Usuario no encontrado.");
        }

        var now = DateTime.UtcNow;

        if (UserCycleHelper.CheckAndApplySubscriptionExpiration(user, now))
        {
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!user.IsPremium)
        {
            return BadRequest(new SubscriptionCancelResultDto
            {
                Success = false,
                Message = "No cuentas con una suscripción Premium activa para cancelar."
            });
        }

        if (user.IsSubscriptionCancelled)
        {
            var formattedDate = user.SubscriptionEndDate?.ToString("dd/MM/yyyy") ?? "el fin de tu periodo";
            return Ok(new SubscriptionCancelResultDto
            {
                Success = true,
                EndDate = user.SubscriptionEndDate,
                Message = $"Tu suscripción ya se encuentra cancelada. Podrás seguir usando todos los beneficios Premium hasta el final de tu período de facturación ({formattedDate}), momento en el cual la cuenta volverá automáticamente al Plan Gratuito."
            });
        }

        // Si aún queda tiempo del período de facturación:
        if (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now)
        {
            user.IsSubscriptionCancelled = true;
            // IMPORTANTE: user.IsPremium permanece true para que disfrute de los beneficios hasta el final del periodo
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var formattedDate = user.SubscriptionEndDate.Value.ToString("dd/MM/yyyy");
            return Ok(new SubscriptionCancelResultDto
            {
                Success = true,
                EndDate = user.SubscriptionEndDate,
                Message = $"Suscripción cancelada con éxito. Podrás usar tu membresía con todos los beneficios Premium hasta la cancelación automática al final de tu período de facturación el {formattedDate}."
            });
        }
        else
        {
            user.IsPremium = false;
            user.SubscriptionPlan = "Free";
            user.SubscriptionEndDate = null;
            user.IsSubscriptionCancelled = false;
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(new SubscriptionCancelResultDto
            {
                Success = true,
                EndDate = null,
                Message = "Tu suscripción ha finalizado y tu cuenta ha vuelto al Plan Gratuito."
            });
        }
    }
}

public class SubscriptionWebpayStartRequest
{
    public string ReturnUrl { get; set; } = string.Empty;
}
