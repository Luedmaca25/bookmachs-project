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
    Task<bool> IsPhoneAvailableAsync(string phone, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> RegisterOnboardingAsync(
        string email,
        string password,
        string firstName,
        string? lastName,
        DateTime? birthDate,
        string? gender,
        string phone,
        string? verificationCode,
        string? verificationChannel,
        bool termsAccepted,
        string? documentoIdentidad = null,
        string? pais = null,
        CancellationToken cancellationToken = default);
    Task<AuthResponseDto> CompleteOnboardingAsync(
        Guid userId,
        string phone,
        string? code,
        DateTime? birthDate,
        string? gender,
        string? documentoIdentidad,
        string? pais,
        CancellationToken cancellationToken = default);
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
    private readonly ITwilioVerifyService _twilioVerifyService;

    public AuthService(
        BookmachsDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        ITwilioVerifyService twilioVerifyService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _twilioVerifyService = twilioVerifyService;
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

    public async Task<bool> IsPhoneAvailableAsync(string phone, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return false;

        var normalized = _twilioVerifyService.NormalizePhoneNumber(phone);
        if (string.IsNullOrWhiteSpace(normalized))
            return false;

        var inUse = await _dbContext.Users.AnyAsync(u => u.Telefono == normalized, cancellationToken);
        return !inUse;
    }

    public async Task<AuthResponseDto> RegisterOnboardingAsync(
        string email,
        string password,
        string firstName,
        string? lastName,
        DateTime? birthDate,
        string? gender,
        string phone,
        string? verificationCode,
        string? verificationChannel,
        bool termsAccepted,
        string? documentoIdentidad = null,
        string? pais = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("El correo electrónico es requerido.");

        if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
            throw new ArgumentException("La contraseña debe tener al menos 6 caracteres.");

        if (string.IsNullOrWhiteSpace(firstName))
            throw new ArgumentException("El nombre es requerido.");

        if (string.IsNullOrWhiteSpace(phone))
            throw new ArgumentException("El número de teléfono móvil es requerido.");

        if (!termsAccepted)
            throw new InvalidOperationException("Debes aceptar las condiciones de uso y políticas de privacidad para continuar.");

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var existingEmail = await _dbContext.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (existingEmail)
            throw new InvalidOperationException("El correo electrónico ya está registrado.");

        var normalizedPhone = _twilioVerifyService.NormalizePhoneNumber(phone);
        var existingPhone = await _dbContext.Users.AnyAsync(u => u.Telefono == normalizedPhone, cancellationToken);
        if (existingPhone)
            throw new InvalidOperationException("Este número de teléfono ya está registrado en otra cuenta.");

        // Validar código si se especificó
        if (!string.IsNullOrWhiteSpace(verificationCode))
        {
            var verifyResult = await _twilioVerifyService.CheckVerificationCodeAsync(normalizedPhone, verificationCode, cancellationToken);
            if (!verifyResult.Verified)
            {
                throw new InvalidOperationException(verifyResult.Message);
            }
        }

        var fullName = string.IsNullOrWhiteSpace(lastName) 
            ? firstName.Trim() 
            : $"{firstName.Trim()} {lastName.Trim()}";

        var finalPais = !string.IsNullOrWhiteSpace(pais) ? pais : DetectCountryFromPhone(normalizedPhone);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            Name = fullName,
            LastName = lastName?.Trim(),
            BirthDate = birthDate,
            Gender = gender?.Trim(),
            Telefono = normalizedPhone,
            IsPhoneVerified = true,
            PhoneVerificationChannel = verificationChannel ?? "whatsapp",
            TermsAccepted = true,
            TermsAcceptedAt = DateTime.UtcNow,
            DocumentoIdentidad = documentoIdentidad?.Trim() ?? string.Empty,
            Pais = finalPais,
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

    public async Task<AuthResponseDto> CompleteOnboardingAsync(
        Guid userId,
        string phone,
        string? code,
        DateTime? birthDate,
        string? gender,
        string? documentoIdentidad,
        string? pais,
        CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
            throw new KeyNotFoundException("Usuario no encontrado.");

        var normalizedPhone = _twilioVerifyService.NormalizePhoneNumber(phone);
        if (string.IsNullOrWhiteSpace(normalizedPhone))
            throw new ArgumentException("Número de teléfono inválido.");

        var phoneInUse = await _dbContext.Users.AnyAsync(u => u.Id != userId && u.Telefono == normalizedPhone, cancellationToken);
        if (phoneInUse)
            throw new InvalidOperationException("Este número de teléfono ya está registrado en otra cuenta.");

        if (!string.IsNullOrWhiteSpace(code))
        {
            var verifyResult = await _twilioVerifyService.CheckVerificationCodeAsync(normalizedPhone, code, cancellationToken);
            if (!verifyResult.Verified)
                throw new InvalidOperationException(verifyResult.Message);
        }

        user.Telefono = normalizedPhone;
        user.IsPhoneVerified = true;
        if (birthDate.HasValue) user.BirthDate = birthDate;
        if (!string.IsNullOrWhiteSpace(gender)) user.Gender = gender;
        if (!string.IsNullOrWhiteSpace(documentoIdentidad)) user.DocumentoIdentidad = documentoIdentidad;
        if (!string.IsNullOrWhiteSpace(pais)) user.Pais = pais;
        else if (string.IsNullOrWhiteSpace(user.Pais)) user.Pais = DetectCountryFromPhone(normalizedPhone);

        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(user);
        return MapToAuthResponse(user, token);
    }

    private static string DetectCountryFromPhone(string phone)
    {
        if (phone.StartsWith("+56")) return "Chile";
        if (phone.StartsWith("+52")) return "México";
        if (phone.StartsWith("+57")) return "Colombia";
        if (phone.StartsWith("+54")) return "Argentina";
        if (phone.StartsWith("+51")) return "Perú";
        if (phone.StartsWith("+34")) return "España";
        if (phone.StartsWith("+1")) return "Estados Unidos";
        return "Chile";
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
        bool userModified = false;

        // 1. Validar y aplicar expiración automática de membresía Premium
        if (UserCycleHelper.CheckAndApplySubscriptionExpiration(user, now))
        {
            userModified = true;
        }

        // 2. Control de ciclo mensual de swipes basado en mes corrido desde el registro
        if (UserCycleHelper.CheckAndApplyMonthlySwipeReset(user, now))
        {
            userModified = true;
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int baseLimit = user.IsPremium ? (settings?.DailySwipeLimitPremium ?? 1000) : (settings?.DailySwipeLimitFree ?? 40);
        int effectiveLimit = baseLimit;

        if (!user.IsPremium)
        {
            effectiveLimit = baseLimit + user.BonusSwipesGranted;

            if (user.DailySwipesConsumed >= effectiveLimit && user.BonusSwipesGranted < 50)
            {
                if (user.LastBonusGrantedAt.HasValue && (now - user.LastBonusGrantedAt.Value).TotalHours >= 24)
                {
                    user.BonusSwipesGranted = Math.Min(50, user.BonusSwipesGranted + 10);
                    user.LastBonusGrantedAt = now;
                    effectiveLimit = baseLimit + user.BonusSwipesGranted;
                    userModified = true;
                }
            }
        }

        if (userModified)
        {
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            LastName = user.LastName,
            BirthDate = user.BirthDate,
            Gender = user.Gender,
            IsPhoneVerified = user.IsPhoneVerified,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Telefono = user.Telefono,
            ProfileImageUrl = user.ProfileImageUrl,
            IsPremium = user.IsPremium,
            SubscriptionPlan = user.SubscriptionPlan,
            SubscriptionEndDate = user.SubscriptionEndDate,
            IsSubscriptionCancelled = user.IsSubscriptionCancelled,
            Role = user.Role,
            Preferences = user.Preferences.Select(p => p.PreferenceTag).ToList(),
            DailySwipesConsumed = user.DailySwipesConsumed,
            DailySwipeLimit = effectiveLimit
        };
    }

    private static AuthResponseDto MapToAuthResponse(User user, string token)
    {
        return new AuthResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            LastName = user.LastName,
            BirthDate = user.BirthDate,
            Gender = user.Gender,
            IsPhoneVerified = user.IsPhoneVerified,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Telefono = user.Telefono,
            ProfileImageUrl = user.ProfileImageUrl,
            Role = user.Role,
            IsPremium = user.IsPremium,
            SubscriptionPlan = user.SubscriptionPlan,
            SubscriptionEndDate = user.SubscriptionEndDate,
            IsSubscriptionCancelled = user.IsSubscriptionCancelled,
            Token = token
        };
    }
}
