using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Refactored.Api.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    private readonly Jobs.IExchangeFulfillmentJob _fulfillmentJob;

    public TransactionsController(ITransactionService transactionService, Jobs.IExchangeFulfillmentJob fulfillmentJob)
    {
        _transactionService = transactionService;
        _fulfillmentJob = fulfillmentJob;
    }

    [AllowAnonymous]
    [HttpPost("run-daily-fulfillment-job")]
    public async Task<IActionResult> RunDailyFulfillmentJob()
    {
        try
        {
            await _fulfillmentJob.ProcessDailyFulfillmentRemindersAsync();
            return Ok(new { message = "Tarea diaria de recordatorios de entrega y anulación de expirados ejecutada exitosamente." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Error al ejecutar tarea diaria: {ex.Message}" });
        }
    }

    [HttpGet("my-matches")]
    public async Task<ActionResult<IEnumerable<MatchTransactionDto>>> GetMyMatches()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var result = await _transactionService.GetMyMatchesAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("my-matches/{id}")]
    public async Task<ActionResult<bool>> DeleteMatch(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            await _transactionService.DeleteMatchAsync(id, userId);
            return Ok(new { message = "Libro eliminado de tus intereses exitosamente." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("estimate-fee/{bookId}")]
    public async Task<ActionResult<FeeEstimationDto>> EstimateFee(Guid bookId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var result = await _transactionService.EstimateFeeAsync(bookId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("checkout-card")]
    public async Task<ActionResult<CheckoutResultDto>> CheckoutCard([FromBody] CheckoutCardRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || string.IsNullOrEmpty(request.CardToken))
        {
            return BadRequest("El ID de la transacción y el token de la tarjeta son requeridos.");
        }

        try
        {
            var result = await _transactionService.CheckoutCardAsync(
                request.MatchTransactionId,
                request.CardToken,
                userId,
                request.AcceptCrossBorder);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("webpay-start")]
    public async Task<ActionResult<WebpayStartResultDto>> WebpayStart([FromBody] WebpayStartRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || string.IsNullOrEmpty(request.ReturnUrl))
        {
            return BadRequest("El ID de la transacción y la URL de retorno son requeridos.");
        }

        try
        {
            var result = await _transactionService.WebpayStartAsync(
                request.MatchTransactionId,
                userId,
                request.ReturnUrl,
                request.AcceptCrossBorder);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("webpay-confirm")]
    public async Task<ActionResult<WebpayConfirmResultDto>> WebpayConfirm([FromQuery] string? token_ws, [FromBody] WebpayConfirmRequest? body)
    {
        var token = token_ws ?? body?.Token;
        if (string.IsNullOrEmpty(token))
        {
            return BadRequest("El token de Webpay Plus (token_ws) es requerido.");
        }

        try
        {
            var result = await _transactionService.WebpayConfirmAsync(token);
            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("update-logistics")]
    public async Task<ActionResult<LogisticsResultDto>> UpdateLogistics([FromBody] UpdateLogisticsRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || string.IsNullOrEmpty(request.LogisticsMethod))
        {
            return BadRequest("El ID de la transacción y el método logístico son requeridos.");
        }

        try
        {
            var result = await _transactionService.UpdateLogisticsAsync(
                request.MatchTransactionId,
                userId,
                request.LogisticsMethod,
                request.TrackingNumber,
                request.EvidencePhotoBase64);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("confirm-receipt/{matchTransactionId}")]
    public async Task<ActionResult<LogisticsResultDto>> ConfirmAdminReceipt(Guid matchTransactionId)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var adminUserId))
        {
            return Unauthorized("Administrador no identificado.");
        }

        try
        {
            var result = await _transactionService.ConfirmAdminBookReceiptAsync(matchTransactionId, adminUserId);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("pending-admin")]
    public async Task<ActionResult<IEnumerable<MatchTransactionDto>>> GetPendingAdminLogistics()
    {
        try
        {
            var result = await _transactionService.GetPendingAdminLogisticsAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

public class UpdateLogisticsRequest
{
    public Guid MatchTransactionId { get; set; }
    public string LogisticsMethod { get; set; } = string.Empty;
    public string? TrackingNumber { get; set; }
    public string? EvidencePhotoBase64 { get; set; }
}

public class CheckoutCardRequest
{
    public Guid MatchTransactionId { get; set; }
    public string CardToken { get; set; } = string.Empty;
    public bool AcceptCrossBorder { get; set; }
}

public class WebpayStartRequest
{
    public Guid MatchTransactionId { get; set; }
    public string ReturnUrl { get; set; } = string.Empty;
    public bool AcceptCrossBorder { get; set; }
}

public class WebpayConfirmRequest
{
    public string Token { get; set; } = string.Empty;
}
