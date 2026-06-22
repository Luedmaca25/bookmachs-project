using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Bookmachs.Application.Social;
using Bookmachs.Application.Social.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SocialController : ControllerBase
{
    private readonly ISender _mediator;

    public SocialController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("my-impact")]
    public async Task<ActionResult<UserImpactMetricsDto>> GetMyImpact()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var query = new GetUserImpactMetricsQuery(userId);
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

    [AllowAnonymous]
    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<GlobalExchangeHistoryDto>>> GetGlobalHistory()
    {
        try
        {
            var query = new GetGlobalExchangeHistoryQuery();
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
