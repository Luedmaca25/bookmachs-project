using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using Bookmachs.Refactored.Api.Infrastructure.Services;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IFileStorageService _fileStorageService;

    public AuthController(IAuthService authService, IFileStorageService fileStorageService)
    {
        _authService = authService;
        _fileStorageService = fileStorageService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequest request)
    {
        if (request == null)
        {
            return BadRequest("Los datos de registro proporcionados no son válidos.");
        }

        if (string.IsNullOrWhiteSpace(request.Email) || 
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.DocumentoIdentidad) ||
            string.IsNullOrWhiteSpace(request.Pais))
        {
            return BadRequest("Todos los campos obligatorios del registro deben estar completos.");
        }

        try
        {
            var result = await _authService.RegisterAsync(
                request.Email, 
                request.Password, 
                request.Name, 
                request.DocumentoIdentidad, 
                request.Pais,
                request.Telefono ?? string.Empty);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Se requiere el correo electrónico y la contraseña para iniciar sesión.");
        }

        try
        {
            var result = await _authService.LoginAsync(request.Email, request.Password);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponseDto>> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.IdToken))
        {
            return BadRequest("Se requiere el token de Google para iniciar sesión.");
        }

        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings();
            var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);
            
            var result = await _authService.GoogleLoginAsync(
                payload.Subject,
                payload.Email,
                payload.Name ?? payload.Email);
            return Ok(result);
        }
        catch (InvalidJwtException ex)
        {
            return Unauthorized(new { message = "El token de Google no es válido o ha expirado.", details = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("preferences")]
    public async Task<ActionResult<bool>> SavePreferences([FromBody] List<string> preferenceTags)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (preferenceTags == null || !preferenceTags.Any())
        {
            return BadRequest("Se debe seleccionar al menos una preferencia de lectura.");
        }

        var result = await _authService.SavePreferencesAsync(userId, preferenceTags);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("update-profile")]
    public async Task<ActionResult<AuthResponseDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        if (request == null || string.IsNullOrWhiteSpace(request.DocumentoIdentidad) || string.IsNullOrWhiteSpace(request.Pais))
        {
            return BadRequest("El documento de identidad y el país son obligatorios.");
        }

        try
        {
            var result = await _authService.UpdateProfileAsync(userId, request.DocumentoIdentidad, request.Pais, request.Telefono ?? string.Empty);
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
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        try
        {
            var result = await _authService.GetProfileAsync(userId);
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

    [Authorize]
    [HttpPost("avatar")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<AuthResponseDto>> UpdateAvatar([FromForm] AvatarUploadRequest request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Usuario no identificado o no autenticado.");
        }

        string finalUrl = string.Empty;

        if (request != null && request.File != null && request.File.Length > 0)
        {
            using (var stream = request.File.OpenReadStream())
            {
                finalUrl = await _fileStorageService.SaveSecureUserAvatarAsync(userId, stream, request.File.FileName);
            }
        }
        else if (request != null && !string.IsNullOrWhiteSpace(request.ProfileImageUrl))
        {
            finalUrl = request.ProfileImageUrl;
        }
        else
        {
            return BadRequest("Debes proporcionar un archivo de imagen o una URL de avatar válida.");
        }

        try
        {
            var result = await _authService.UpdateAvatarAsync(userId, finalUrl);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("avatar/{userId}")]
    public IActionResult GetUserAvatar(Guid userId)
    {
        var filePath = _fileStorageService.GetSecureUserAvatarPath(userId);
        if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
        {
            return NotFound(new { message = "Avatar no encontrado." });
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
}

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
}

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class GoogleLoginRequest
{
    public string IdToken { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
}

public class AvatarUploadRequest
{
    public Microsoft.AspNetCore.Http.IFormFile? File { get; set; }
    public string? ProfileImageUrl { get; set; }
}
