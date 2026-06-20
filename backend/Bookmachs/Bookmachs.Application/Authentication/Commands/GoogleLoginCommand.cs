using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Authentication.Commands;

public record GoogleLoginCommand : IRequest<AuthResponseDto>
{
    public string GoogleSub { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
}

public class GoogleLoginCommandHandler : IRequestHandler<GoogleLoginCommand, AuthResponseDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public GoogleLoginCommandHandler(
        IUnitOfWork unitOfWork,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _unitOfWork = unitOfWork;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> Handle(GoogleLoginCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.GoogleSub) || string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("El identificador de Google y el correo electrónico son obligatorios.");
        }

        // Buscar por GoogleSub
        var user = await _unitOfWork.Users.GetByGoogleSubAsync(request.GoogleSub);

        if (user == null)
        {
            // Buscar por Email por si ya se registró manualmente antes
            user = await _unitOfWork.Users.GetByEmailAsync(request.Email);

            if (user != null)
            {
                // Enlazar GoogleSub si no lo tenía
                user.GoogleSub = request.GoogleSub;
                
                // Si el nombre no está configurado, asignamos el de Google
                if (string.IsNullOrEmpty(user.Name) && !string.IsNullOrEmpty(request.Name))
                {
                    user.Name = request.Name;
                }

                _unitOfWork.Users.Update(user);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
            else
            {
                // Crear nuevo usuario si no existe
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = request.Email,
                    Name = request.Name,
                    DocumentoIdentidad = string.Empty, // Se completará después
                    Pais = string.Empty,               // Se completará después
                    GoogleSub = request.GoogleSub,
                    PasswordHash = null,
                    Role = "User",
                    DailySwipesConsumed = 0,
                    LastSwipeResetDate = DateTime.UtcNow,
                    IsPremium = false,
                    SubscriptionPlan = "Free",
                    CreatedAt = DateTime.UtcNow
                };

                await _unitOfWork.Users.AddAsync(user);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }
        }

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
