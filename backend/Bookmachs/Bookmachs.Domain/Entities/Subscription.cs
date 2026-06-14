using System;

namespace Bookmachs.Domain.Entities;

public class Subscription
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string PlanName { get; set; } = string.Empty; // Basic, Full
    public decimal Price { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    // Referencia de la suscripción recurrente en Mercado Pago u otra pasarela
    public string? ExternalSubscriptionId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
