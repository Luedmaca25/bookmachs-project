using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Authentication.Commands;

public record RegisterUserCommand : IRequest<AuthResponseDto>
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string DocumentoIdentidad { get; init; } = string.Empty;
    public string Pais { get; init; } = string.Empty;
}

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, AuthResponseDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public RegisterUserCommandHandler(
        IUnitOfWork unitOfWork,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _unitOfWork = unitOfWork;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        // Validar si el email ya existe
        var existingUser = await _unitOfWork.Users.GetByEmailAsync(request.Email);
        if (existingUser != null)
        {
            throw new InvalidOperationException("El correo electrónico ya está registrado.");
        }

        // Crear entidad de usuario
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email,
            Name = request.Name,
            DocumentoIdentidad = request.DocumentoIdentidad,
            Pais = request.Pais,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = "User",
            DailySwipesConsumed = 0,
            LastSwipeResetDate = DateTime.UtcNow,
            IsPremium = false,
            SubscriptionPlan = "Free",
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Users.AddAsync(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Generar token JWT
        var token = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Role = user.Role,
            IsPremium = user.IsPremium,
            Token = token
        };
    }
}
