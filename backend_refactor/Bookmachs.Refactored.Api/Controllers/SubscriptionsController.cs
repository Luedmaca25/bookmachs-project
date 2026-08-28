using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Domain.Services;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
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

            if (user.IsPremium)
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

            var tbResult = await _paymentService.CreateTransbankHoldAsync(amount, buyOrder, sessionId, request.ReturnUrl);

            if (tbResult.Success)
            {
                var subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    PlanName = "Premium",
                    Price = amount,
                    StartDate = DateTime.UtcNow,
                    EndDate = DateTime.UtcNow.AddDays(30),
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
            var tbResult = await _paymentService.CommitTransbankHoldAsync(token);

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
                    user.SubscriptionEndDate = DateTime.UtcNow.AddDays(30);
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
}

public class SubscriptionWebpayStartRequest
{
    public string ReturnUrl { get; set; } = string.Empty;
}
