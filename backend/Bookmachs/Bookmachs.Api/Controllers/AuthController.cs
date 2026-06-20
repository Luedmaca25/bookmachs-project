using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Application.Authentication;
using Bookmachs.Application.Authentication.Commands;
using Google.Apis.Auth;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Bookmachs.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ISender _mediator;

    public AuthController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterUserCommand command)
    {
        // Early returns for validation
        if (command == null)
        {
            return BadRequest("Los datos de registro proporcionados no son válidos.");
        }

        if (string.IsNullOrWhiteSpace(command.Email) || 
            string.IsNullOrWhiteSpace(command.Password) ||
            string.IsNullOrWhiteSpace(command.Name) ||
            string.IsNullOrWhiteSpace(command.DocumentoIdentidad) ||
            string.IsNullOrWhiteSpace(command.Pais))
        {
            return BadRequest("Todos los campos obligatorios del registro deben estar completos.");
        }

        try
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginUserCommand command)
    {
        // Early return for validation
        if (command == null || string.IsNullOrWhiteSpace(command.Email) || string.IsNullOrWhiteSpace(command.Password))
        {
            return BadRequest("Se requiere el correo electrónico y la contraseña para iniciar sesión.");
        }

        try
        {
            var result = await _mediator.Send(command);
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
            
            var command = new GoogleLoginCommand
            {
                GoogleSub = payload.Subject,
                Email = payload.Email,
                Name = payload.Name ?? payload.Email
            };

            var result = await _mediator.Send(command);
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

        var command = new SaveUserPreferencesCommand
        {
            UserId = userId,
            PreferenceTags = preferenceTags
        };

        var result = await _mediator.Send(command);
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
            var command = new UpdateProfileCommand
            {
                UserId = userId,
                DocumentoIdentidad = request.DocumentoIdentidad,
                Pais = request.Pais
            };

            var result = await _mediator.Send(command);
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

public class GoogleLoginRequest
{
    public string IdToken { get; set; } = string.Empty;
}

public class UpdateProfileRequest
{
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
}

