using System;

namespace Bookmachs.Application.Authentication;

public class AuthResponseDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsPremium { get; set; }
    public string Token { get; set; } = string.Empty;
}
