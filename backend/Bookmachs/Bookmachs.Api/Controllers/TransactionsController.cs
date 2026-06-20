using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Bookmachs.Application.Transactions.Commands;
using Bookmachs.Application.Transactions.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly ISender _mediator;

    public TransactionsController(ISender mediator)
    {
        _mediator = mediator;
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
            var query = new GetMyMatchesQuery(userId);
            var result = await _mediator.Send(query);
            return Ok(result);
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
            var query = new EstimateFeeQuery
            {
                BookId = bookId,
                RequesterUserId = userId
            };

            var result = await _mediator.Send(query);
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
            var command = new ConfirmCardCheckoutCommand
            {
                MatchTransactionId = request.MatchTransactionId,
                CardToken = request.CardToken,
                RequesterUserId = userId
            };

            var result = await _mediator.Send(command);
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
            var command = new StartWebpayCheckoutCommand
            {
                MatchTransactionId = request.MatchTransactionId,
                ReturnUrl = request.ReturnUrl,
                RequesterUserId = userId
            };

            var result = await _mediator.Send(command);
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
            var command = new ConfirmWebpayCheckoutCommand
            {
                Token = token
            };

            var result = await _mediator.Send(command);
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
}

public class CheckoutCardRequest
{
    public Guid MatchTransactionId { get; set; }
    public string CardToken { get; set; } = string.Empty;
}

public class WebpayStartRequest
{
    public Guid MatchTransactionId { get; set; }
    public string ReturnUrl { get; set; } = string.Empty;
}

public class WebpayConfirmRequest
{
    public string Token { get; set; } = string.Empty;
}
