using System;
using System.Collections.Generic;

namespace Bookmachs.Refactored.Api.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? LastName { get; set; }
    
    // Datos demográficos y de registro (Onboarding)
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }

    // Verificación de Teléfono (WhatsApp / SMS con Twilio)
    public bool IsPhoneVerified { get; set; } = false;
    public string? PhoneVerificationChannel { get; set; } // "WhatsApp", "SMS"
    
    // Aceptación de Términos y Políticas
    public bool TermsAccepted { get; set; } = false;
    public DateTime? TermsAcceptedAt { get; set; }
    
    // Documento de identidad dinámico adaptable por país (ej. RUT en Chile, DNI en Argentina, etc.)
    public string? DocumentoIdentidad { get; set; }
    public string? Pais { get; set; }
    public string? Telefono { get; set; }
    public string? ProfileImageUrl { get; set; }
    
    // Control de cuota diaria de swipes
    public int DailySwipesConsumed { get; set; } = 0;
    public DateTime LastSwipeResetDate { get; set; } = DateTime.UtcNow;
    public int BonusSwipesGranted { get; set; } = 0;
    public DateTime? LastBonusGrantedAt { get; set; }

    // Estado de Suscripción
    public bool IsPremium { get; set; } = false;
    public string SubscriptionPlan { get; set; } = "Free"; // Free, Basic, Full
    public DateTime? SubscriptionEndDate { get; set; }
    public bool IsSubscriptionCancelled { get; set; } = false;

    // Identificador único de Google SSO
    public string? GoogleSub { get; set; }

    // Hash de contraseña para registro manual (nulo para usuarios de Google SSO)
    public string? PasswordHash { get; set; }
    
    public string Role { get; set; } = "User"; // User, Admin
    public bool IsBlocked { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Relaciones
    public ICollection<Book> Books { get; set; } = new List<Book>();
    public ICollection<UserPreference> Preferences { get; set; } = new List<UserPreference>();
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}

