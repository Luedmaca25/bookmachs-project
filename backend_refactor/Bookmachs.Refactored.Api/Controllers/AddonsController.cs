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
[Route("api/[controller]")]
public class AddonsController : ControllerBase
{
    private readonly BookmachsDbContext _dbContext;
    private readonly IPaymentGatewayService _paymentService;

    public AddonsController(BookmachsDbContext dbContext, IPaymentGatewayService paymentService)
    {
        _dbContext = dbContext;
        _paymentService = paymentService;
    }

    [Authorize]
    [HttpPost("webpay-start")]
    public async Task<ActionResult<AddonWebpayStartResultDto>> WebpayStart([FromBody] AddonWebpayStartRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || string.IsNullOrWhiteSpace(request.AddonType) || string.IsNullOrWhiteSpace(request.ReturnUrl))
        {
            return BadRequest("El tipo de complemento y la URL de retorno son requeridos.");
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
        {
            return NotFound("Usuario no encontrado.");
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync();

        decimal amount;
        DateTime? expiresAt = null;
        var now = DateTime.UtcNow;

        switch (request.AddonType.ToLowerInvariant())
        {
            case "premium24h":
                amount = (settings != null && settings.PricePremium24h > 0) ? settings.PricePremium24h : 2990m;
                expiresAt = now.AddHours(24);
                break;
            case "unlimitedlikes24h":
                amount = (settings != null && settings.PriceUnlimitedLikes24h > 0) ? settings.PriceUnlimitedLikes24h : 1990m;
                expiresAt = now.AddHours(24);
                break;
            case "authorsearches10":
                amount = (settings != null && settings.PriceAuthorSearches10 > 0) ? settings.PriceAuthorSearches10 : 990m;
                break;
            case "bookboost48h":
                amount = (settings != null && settings.PriceBookBoost48h > 0) ? settings.PriceBookBoost48h : 490m;
                expiresAt = now.AddHours(48);
                break;
            case "matchpassweek":
                amount = (settings != null && settings.PriceMatchPassWeek > 0) ? settings.PriceMatchPassWeek : 2990m;
                expiresAt = now.AddDays(7);
                break;
            case "matchpassdaypromo":
                amount = (settings != null && settings.PriceMatchPassDayPromo > 0) ? settings.PriceMatchPassDayPromo : 990m;
                expiresAt = now.AddHours(24);
                break;
            default:
                return BadRequest($"Tipo de complemento desconocido: '{request.AddonType}'");
        }

        if (amount <= 0)
        {
            return BadRequest("El monto del complemento debe ser mayor a cero.");
        }

        var buyOrder = $"ADD_{Guid.NewGuid().ToString("N")[..20]}";
        var sessionId = $"addon_sess_{userId.ToString("N")[..8]}";

        var tbResult = await _paymentService.CreateTransbankTransactionAsync(amount, buyOrder, sessionId, request.ReturnUrl);

        if (!tbResult.Success)
        {
            return BadRequest(new AddonWebpayStartResultDto
            {
                Success = false,
                Message = $"Error al iniciar el pago en Webpay: {tbResult.ErrorMessage}"
            });
        }

        var purchase = new UserAddonPurchase
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AddonType = request.AddonType,
            Price = amount,
            BuyOrder = buyOrder,
            PaymentStatus = "Pending",
            TargetBookId = request.TargetBookId,
            ExpiresAt = expiresAt,
            CreatedAt = now
        };

        await _dbContext.UserAddonPurchases.AddAsync(purchase);
        await _dbContext.SaveChangesAsync();

        return Ok(new AddonWebpayStartResultDto
        {
            Success = true,
            Token = tbResult.Token,
            RedirectUrl = tbResult.RedirectUrl,
            BuyOrder = buyOrder,
            Message = "Redirección a Transbank Webpay Plus iniciada con éxito."
        });
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

            if (!tbResult.Success)
            {
                var failResult = new WebpayConfirmResultDto
                {
                    Success = false,
                    Message = $"Error al confirmar el pago del complemento en Webpay: {tbResult.ErrorMessage}"
                };
                _confirmedTokenCache[token] = (failResult, false);
                return BadRequest(failResult);
            }

            var purchase = await _dbContext.UserAddonPurchases
                .Include(p => p.User)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(p => p.BuyOrder == tbResult.BuyOrder || p.PaymentStatus == "Pending");

            if (purchase != null && purchase.User != null)
            {
                var user = purchase.User;
                var now = DateTime.UtcNow;

                purchase.PaymentStatus = "Captured";

                switch (purchase.AddonType.ToLowerInvariant())
                {
                    case "premium24h":
                        user.IsPremium = true;
                        user.SubscriptionPlan = "Premium";
                        user.SubscriptionEndDate = (user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value > now)
                            ? user.SubscriptionEndDate.Value.AddHours(24)
                            : now.AddHours(24);
                        user.IsSubscriptionCancelled = false;
                        break;

                    case "unlimitedlikes24h":
                        user.UnlimitedLikesUntil = (user.UnlimitedLikesUntil.HasValue && user.UnlimitedLikesUntil.Value > now)
                            ? user.UnlimitedLikesUntil.Value.AddHours(24)
                            : now.AddHours(24);
                        break;

                    case "authorsearches10":
                        user.ExtraCatalogSearchesGranted += 10;
                        break;

                    case "bookboost48h":
                        user.BooksBoostedUntil = (user.BooksBoostedUntil.HasValue && user.BooksBoostedUntil.Value > now)
                            ? user.BooksBoostedUntil.Value.AddHours(48)
                            : now.AddHours(48);
                        if (purchase.TargetBookId.HasValue)
                        {
                            var targetBook = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == purchase.TargetBookId.Value);
                            if (targetBook != null)
                            {
                                targetBook.BoostedUntil = now.AddHours(48);
                                _dbContext.Books.Update(targetBook);
                            }
                        }
                        break;

                    case "matchpassweek":
                        user.MatchPassUntil = (user.MatchPassUntil.HasValue && user.MatchPassUntil.Value > now)
                            ? user.MatchPassUntil.Value.AddDays(7)
                            : now.AddDays(7);
                        break;

                    case "matchpassdaypromo":
                        user.MatchPassUntil = (user.MatchPassUntil.HasValue && user.MatchPassUntil.Value > now)
                            ? user.MatchPassUntil.Value.AddHours(24)
                            : now.AddHours(24);
                        break;
                }

                _dbContext.Users.Update(user);
                _dbContext.UserAddonPurchases.Update(purchase);
                await _dbContext.SaveChangesAsync();
            }

            var successResult = new WebpayConfirmResultDto
            {
                Success = true,
                PaymentStatus = "Captured",
                Message = "¡Pago de complemento confirmado exitosamente por Transbank Webpay Plus!"
            };

            _confirmedTokenCache[token] = (successResult, true);
            return Ok(successResult);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
