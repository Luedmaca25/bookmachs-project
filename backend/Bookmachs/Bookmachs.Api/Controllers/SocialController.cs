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

    [HttpPost("timeline/{id}/review")]
    public async Task<ActionResult<Bookmachs.Application.Social.Commands.TimelineReviewResultDto>> AddReview(Guid id, [FromBody] AddReviewRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || request.Rating < 1 || request.Rating > 5)
        {
            return BadRequest("La reseña y una calificación de 1 a 5 estrellas son requeridas.");
        }

        try
        {
            var command = new Bookmachs.Application.Social.Commands.AddTimelineReviewCommand
            {
                TimelineEventId = id,
                UserId = userId,
                ReviewComment = request.Comment ?? string.Empty,
                ReviewRating = request.Rating
            };

            var result = await _mediator.Send(command);
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
}

public class AddReviewRequest
{
    public string? Comment { get; set; }
    public int Rating { get; set; }
}
