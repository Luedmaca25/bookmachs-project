using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Bookmachs.Refactored.Api.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;

namespace Bookmachs.Refactored.Api.Controllers;

[Authorize]
[ApiController]
[Route("[controller]")]
public class BooksController : ControllerBase
{
    private readonly IBookService _bookService;
    private readonly IFileStorageService _fileStorageService;
    private readonly IWebHostEnvironment _environment;

    public BooksController(IBookService bookService, IFileStorageService fileStorageService, IWebHostEnvironment environment)
    {
        _bookService = bookService;
        _fileStorageService = fileStorageService;
        _environment = environment;
    }

    [AllowAnonymous]
    [HttpGet("guest-random")]
    public async Task<ActionResult<IEnumerable<BookDto>>> GetGuestRandom([FromQuery] int count = 10)
    {
        var result = await _bookService.GetGuestBooksAsync(count);
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
                request.Category,
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
    public async Task<ActionResult<IEnumerable<BookDto>>> GetRecommendations([FromQuery] int limit = 100)
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

    [Authorize]
    [HttpGet("swipe-status")]
    public async Task<ActionResult<SwipeStatusDto>> GetSwipeStatus()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var status = await _bookService.GetSwipeStatusAsync(userId);
            return Ok(status);
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

    [HttpPost("sync-guest-likes")]
    public async Task<ActionResult> SyncGuestLikes([FromBody] List<Guid> bookIds)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (bookIds == null || !bookIds.Any())
        {
            return Ok(new { synced = 0 });
        }

        int count = 0;
        foreach (var bookId in bookIds.Distinct())
        {
            try
            {
                var result = await _bookService.SwipeBookAsync(bookId, userId, "like");
                if (result.Success) count++;
            }
            catch
            {
                // Ignorar errores individuales para asegurar sincronización parcial
            }
        }

        return Ok(new { synced = count });
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

    [HttpGet("my-reservations")]
    public async Task<ActionResult<IEnumerable<BookDto>>> GetMyReservations()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        var result = await _bookService.GetMyReservationsAsync(userId);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("cover/{userId}/{fileName}")]
    public IActionResult GetBookCover(Guid userId, string fileName)
    {
        var filePath = _fileStorageService.GetSecureUserBookImagePath(userId, fileName);
        if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
        {
            // Fallback para imágenes guardadas previamente en wwwroot/uploads
            var legacyPath = System.IO.Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads", fileName);
            if (System.IO.File.Exists(legacyPath))
            {
                filePath = legacyPath;
            }
            else
            {
                return NotFound(new { message = "Imagen de portada no encontrada." });
            }
        }

        var ext = System.IO.Path.GetExtension(filePath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream"
        };

        return PhysicalFile(filePath, contentType);
    }

    [AllowAnonymous]
    [HttpGet("/uploads/{fileName}")]
    public IActionResult GetLegacyUpload(string fileName)
    {
        var legacyPath = System.IO.Path.Combine(_environment.ContentRootPath, "wwwroot", "uploads", fileName);
        if (!System.IO.File.Exists(legacyPath))
        {
            // Buscar en App_Data/books/ si el nombre coincide
            var booksFolder = System.IO.Path.Combine(_environment.ContentRootPath, "App_Data", "books");
            if (System.IO.Directory.Exists(booksFolder))
            {
                var foundFile = System.IO.Directory.GetFiles(booksFolder, fileName, System.IO.SearchOption.AllDirectories).FirstOrDefault();
                if (!string.IsNullOrEmpty(foundFile))
                {
                    legacyPath = foundFile;
                }
            }
        }

        if (!System.IO.File.Exists(legacyPath))
        {
            return NotFound(new { message = "Archivo no encontrado." });
        }

        var ext = System.IO.Path.GetExtension(legacyPath).ToLowerInvariant();
        var contentType = ext switch
        {
            ".png" => "image/png",
            ".jpg" => "image/jpeg",
            ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",
            _ => "application/octet-stream"
        };

        return PhysicalFile(legacyPath, contentType);
    }
}

public class UploadBookRequest
{
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Condition { get; set; } = "Excelente";
    public string? Category { get; set; }
    public decimal BaseValue { get; set; } = 0.00m;
    public IFormFile CoverImage { get; set; } = null!;
}

public class SwipeBookRequest
{
    public string Action { get; set; } = string.Empty;
}
