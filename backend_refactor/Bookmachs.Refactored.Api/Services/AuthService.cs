using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Bookmachs.Refactored.Api.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(string email, string password, string name, string documentoIdentidad, string pais, string telefono, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(string email, string password, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> GoogleLoginAsync(string googleSub, string email, string name, CancellationToken cancellationToken = default);
    Task<bool> SavePreferencesAsync(Guid userId, List<string> preferenceTags, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> UpdateProfileAsync(Guid userId, string documentoIdentidad, string pais, string telefono, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> UpdateAvatarAsync(Guid userId, string profileImageUrl, CancellationToken cancellationToken = default);
    Task<UserProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class AuthService : IAuthService
{
    private readonly BookmachsDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        BookmachsDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> RegisterAsync(string email, string password, string name, string documentoIdentidad, string pais, string telefono, CancellationToken cancellationToken = default)
    {
        var existingUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (existingUser != null)
        {
            throw new InvalidOperationException("El correo electrónico ya está registrado.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = name,
            DocumentoIdentidad = documentoIdentidad,
            Pais = pais,
            Telefono = telefono,
            PasswordHash = _passwordHasher.HashPassword(password),
            Role = "User",
            DailySwipesConsumed = 0,
            LastSwipeResetDate = DateTime.UtcNow,
            IsPremium = false,
            SubscriptionPlan = "Free",
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Users.AddAsync(user, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(user);

        return MapToAuthResponse(user, token);
    }

    public async Task<AuthResponseDto> LoginAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user == null || string.IsNullOrEmpty(user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Credenciales de inicio de sesión incorrectas.");
        }

        if (user.IsBlocked)
        {
            throw new InvalidOperationException("Tu cuenta ha sido bloqueada debido a políticas de uso de la plataforma. Si crees que se trata de un error, por favor ponte en contacto con nuestro equipo de soporte.");
        }

        var isPasswordValid = _passwordHasher.VerifyPassword(password, user.PasswordHash);
        if (!isPasswordValid)
        {
            throw new UnauthorizedAccessException("Credenciales de inicio de sesión incorrectas.");
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return MapToAuthResponse(user, token);
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(string googleSub, string email, string name, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(googleSub) || string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("El identificador de Google y el correo electrónico son obligatorios.");
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.GoogleSub == googleSub, cancellationToken);
        if (user != null && user.IsBlocked)
        {
            throw new InvalidOperationException("Tu cuenta ha sido bloqueada debido a políticas de uso de la plataforma. Si crees que se trata de un error, por favor ponte en contacto con nuestro equipo de soporte.");
        }

        if (user == null)
        {
            user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
            if (user != null && user.IsBlocked)
            {
                throw new InvalidOperationException("Tu cuenta ha sido bloqueada debido a políticas de uso de la plataforma. Si crees que se trata de un error, por favor ponte en contacto con nuestro equipo de soporte.");
            }

            if (user != null)
            {
                user.GoogleSub = googleSub;
                if (string.IsNullOrEmpty(user.Name) && !string.IsNullOrEmpty(name))
                {
                    user.Name = name;
                }

                _dbContext.Users.Update(user);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            else
            {
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Email = email,
                    Name = name,
                    DocumentoIdentidad = string.Empty,
                    Pais = string.Empty,
                    GoogleSub = googleSub,
                    PasswordHash = null,
                    Role = "User",
                    DailySwipesConsumed = 0,
                    LastSwipeResetDate = DateTime.UtcNow,
                    IsPremium = false,
                    SubscriptionPlan = "Free",
                    CreatedAt = DateTime.UtcNow
                };

                await _dbContext.Users.AddAsync(user, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return MapToAuthResponse(user, token);
    }

    public async Task<bool> SavePreferencesAsync(Guid userId, List<string> preferenceTags, CancellationToken cancellationToken = default)
    {
        var userExists = await _dbContext.Users.AnyAsync(u => u.Id == userId, cancellationToken);
        if (!userExists)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        // 1. Eliminar directamente desde la base de datos las preferencias anteriores de este usuario
        var existingPreferences = await _dbContext.UserPreferences
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        if (existingPreferences.Any())
        {
            _dbContext.UserPreferences.RemoveRange(existingPreferences);
        }

        // 2. Insertar las nuevas preferencias
        var newPreferences = preferenceTags.Distinct().Select(tag => new UserPreference
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PreferenceTag = tag,
            CreatedAt = DateTime.UtcNow
        });

        await _dbContext.UserPreferences.AddRangeAsync(newPreferences, cancellationToken);

        // 3. Guardar cambios de forma atómica
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<AuthResponseDto> UpdateProfileAsync(Guid userId, string documentoIdentidad, string pais, string telefono, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        user.DocumentoIdentidad = documentoIdentidad;
        user.Pais = pais;
        user.Telefono = telefono;

        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(user);

        return MapToAuthResponse(user, token);
    }

    public async Task<AuthResponseDto> UpdateAvatarAsync(Guid userId, string profileImageUrl, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        user.ProfileImageUrl = profileImageUrl;

        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(user);

        return MapToAuthResponse(user, token);
    }

    public async Task<UserProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException($"El usuario con ID {userId} no existe.");
        }

        var now = DateTime.UtcNow;
        bool isNewMonth = (now.Year > user.LastSwipeResetDate.Year) || 
                          (now.Year == user.LastSwipeResetDate.Year && now.Month > user.LastSwipeResetDate.Month);

        if (isNewMonth)
        {
            user.DailySwipesConsumed = 0;
            user.LastSwipeResetDate = now;
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int swipeLimit = user.IsPremium ? (settings?.DailySwipeLimitPremium ?? 1000) : (settings?.DailySwipeLimitFree ?? 40);

        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Telefono = user.Telefono,
            ProfileImageUrl = user.ProfileImageUrl,
            IsPremium = user.IsPremium,
            SubscriptionPlan = user.SubscriptionPlan,
            Role = user.Role,
            Preferences = user.Preferences.Select(p => p.PreferenceTag).ToList(),
            DailySwipesConsumed = user.DailySwipesConsumed,
            DailySwipeLimit = swipeLimit
        };
    }

    private static AuthResponseDto MapToAuthResponse(User user, string token)
    {
        return new AuthResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Telefono = user.Telefono,
            ProfileImageUrl = user.ProfileImageUrl,
            Role = user.Role,
            IsPremium = user.IsPremium,
            Token = token
        };
    }
}
