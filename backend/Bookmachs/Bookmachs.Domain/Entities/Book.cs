using System;

namespace Bookmachs.Domain.Entities;

public class Book
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Condition { get; set; } = "Good"; // New, LikeNew, Good, Fair, Poor
    public string? ImageUrl { get; set; }
    
    // Valor estimado para calcular el 30% del Fee de intercambio
    public decimal BaseValue { get; set; }
    
    // Indica si es stock propio de Bookmachs (Fisico/Donado) o subido por un usuario
    public bool IsInternalStock { get; set; } = false;

    // Estado del libro para intercambio
    public bool IsAvailable { get; set; } = true;

    // Propietario del libro (nulo si es stock interno de la plataforma)
    public Guid? OwnerId { get; set; }
    public User? Owner { get; set; }

    // Sistema de reservas por 48 horas (exclusivo para usuarios premium/Full)
    public bool IsReserved { get; set; } = false;
    public DateTime? ReservedUntil { get; set; }
    public Guid? ReservedByUserId { get; set; }
    public User? ReservedByUser { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
