using System;
using System.Collections.Generic;

namespace Bookmachs.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    
    // Documento de identidad dinámico adaptable por país (ej. RUT en Chile, DNI en Argentina, etc.)
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    
    // Control de cuota diaria de swipes
    public int DailySwipesConsumed { get; set; } = 0;
    public DateTime LastSwipeResetDate { get; set; } = DateTime.UtcNow;

    // Estado de Suscripción
    public bool IsPremium { get; set; } = false;
    public string SubscriptionPlan { get; set; } = "Free"; // Free, Basic, Full
    public DateTime? SubscriptionEndDate { get; set; }

    // Identificador único de Google SSO
    public string? GoogleSub { get; set; }
    
    public string Role { get; set; } = "User"; // User, Admin
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Relaciones
    public ICollection<Book> Books { get; set; } = new List<Book>();
    public ICollection<UserPreference> Preferences { get; set; } = new List<UserPreference>();
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
}
