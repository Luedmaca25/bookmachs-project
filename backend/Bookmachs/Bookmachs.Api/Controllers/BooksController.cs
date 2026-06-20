using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Bookmachs.Application.Books;
using Bookmachs.Application.Books.Commands;
using Bookmachs.Application.Books.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private readonly ISender _mediator;

    public BooksController(ISender mediator)
    {
        _mediator = mediator;
    }

    [AllowAnonymous]
    [HttpGet("guest-random")]
    public async Task<ActionResult<BookDto>> GetGuestRandom()
    {
        var result = await _mediator.Send(new GetGuestRandomBookQuery());
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

        var result = await _mediator.Send(new GetMyInventoryQuery(userId));
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

        // Early validation
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
            
            var command = new UploadBookCommand
            {
                UserId = userId,
                Title = request.Title,
                Author = request.Author,
                Description = request.Description,
                Condition = request.Condition,
                FileStream = fileStream,
                FileName = request.CoverImage.FileName
            };

            var result = await _mediator.Send(command);
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
            var result = await _mediator.Send(new GetBookRecommendationsQuery(userId, limit));
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
            var command = new RegisterSwipeCommand
            {
                UserId = userId,
                BookId = id,
                Action = action
            };

            var result = await _mediator.Send(command);
            
            if (!result.Success)
            {
                // Devolvemos 403 Forbidden cuando el límite diario es sobrepasado
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
}

public class UploadBookRequest
{
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Condition { get; set; } = "Excelente";
    public IFormFile CoverImage { get; set; } = null!;
}

public class SwipeBookRequest
{
    public string Action { get; set; } = string.Empty;
}
