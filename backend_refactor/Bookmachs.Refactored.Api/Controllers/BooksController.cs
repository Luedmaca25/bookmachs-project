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
public class BooksController : ControllerBase
{
    private readonly IBookService _bookService;

    public BooksController(IBookService bookService)
    {
        _bookService = bookService;
    }

    [AllowAnonymous]
    [HttpGet("guest-random")]
    public async Task<ActionResult<BookDto>> GetGuestRandom()
    {
        var result = await _bookService.GetGuestRandomAsync();
        return Ok(result);
    }

    [HttpGet("my-inventory")]
    public async Task<ActionResult<IEnumerable<BookDto>>> GetMyInventory()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        var result = await _bookService.GetMyInventoryAsync(userId);
        return Ok(result);
    }

    [HttpPost("upload")]
    public async Task<ActionResult<BookDto>> UploadBook([FromForm] UploadBookRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null)
        {
            return BadRequest("Los datos para la subida del libro no son válidos.");
        }

        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Author) || string.IsNullOrWhiteSpace(request.Condition))
        {
            return BadRequest("El título, el autor y el estado físico son obligatorios.");
        }

        if (request.CoverImage == null || request.CoverImage.Length == 0)
        {
            return BadRequest("La imagen de portada es requerida.");
        }

        try
        {
            using var fileStream = request.CoverImage.OpenReadStream();
            
            var result = await _bookService.UploadBookAsync(
                userId,
                request.Title,
                request.Author,
                request.Description ?? string.Empty,
                request.Condition,
                request.BaseValue,
                fileStream,
                request.CoverImage.FileName
            );
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, ex.Message);
        }
    }

    [HttpGet("recommendations")]
    public async Task<ActionResult<IEnumerable<BookDto>>> GetRecommendations([FromQuery] int limit = 20)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var result = await _bookService.GetRecommendationsAsync(userId, limit);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/swipe")]
    public async Task<ActionResult<SwipeResultDto>> SwipeBook(Guid id, [FromBody] SwipeBookRequest request)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Action))
        {
            return BadRequest("Se requiere la acción (like o dislike) para el swipe.");
        }

        var action = request.Action.ToLower();
        if (action != "like" && action != "dislike")
        {
            return BadRequest("La acción debe ser 'like' o 'dislike'.");
        }

        try
        {
            var result = await _bookService.SwipeBookAsync(id, userId, action);
            if (!result.Success)
            {
                return StatusCode(StatusCodes.Status403Forbidden, result);
            }

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("catalog")]
    public async Task<ActionResult<PaginatedListDto<BookDto>>> GetCatalog(
        [FromQuery] string? searchTerm,
        [FromQuery] string? category,
        [FromQuery] string? condition,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortBy = "createdAt")
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var result = await _bookService.GetCatalogAsync(
                userId,
                searchTerm,
                category,
                condition,
                pageNumber,
                pageSize,
                sortBy);
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

    [HttpPost("{id}/reserve")]
    public async Task<ActionResult<ReservationResultDto>> ReserveBook(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var result = await _bookService.ReserveBookAsync(id, userId);
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
    }

    [HttpPost("{id}/cancel-reservation")]
    public async Task<ActionResult<ReservationResultDto>> CancelReservation(Guid id)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var result = await _bookService.CancelReservationAsync(id, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
    }
}

public class UploadBookRequest
{
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Condition { get; set; } = "Excelente";
    public decimal BaseValue { get; set; } = 0.00m;
    public IFormFile CoverImage { get; set; } = null!;
}

public class SwipeBookRequest
{
    public string Action { get; set; } = string.Empty;
}
