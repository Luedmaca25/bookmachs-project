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
[Route("api/[controller]")]
public class SocialController : ControllerBase
{
    private readonly ISocialService _socialService;

    public SocialController(ISocialService socialService)
    {
        _socialService = socialService;
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
            var result = await _socialService.GetUserImpactMetricsAsync(userId);
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
            var result = await _socialService.GetGlobalExchangeHistoryAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("timeline/{id}/review")]
    public async Task<ActionResult<bool>> AddReview(Guid id, [FromBody] AddReviewRequest request)
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
            var result = await _socialService.AddTimelineReviewAsync(
                id, 
                userId, 
                request.Comment ?? string.Empty, 
                request.Rating);
            return Ok(new { success = result, message = "Reseña y nota agregadas al timeline con éxito." });
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
