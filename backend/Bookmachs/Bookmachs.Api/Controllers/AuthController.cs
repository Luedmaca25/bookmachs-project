using System;
using System.Threading.Tasks;
using Bookmachs.Application.Authentication;
using Bookmachs.Application.Authentication.Commands;
using Google.Apis.Auth;
using MediatR;
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
}

public class GoogleLoginRequest
{
    public string IdToken { get; set; } = string.Empty;
}

