using System;

namespace Bookmachs.Domain.Entities;

public class MatchTransaction
{
    public Guid Id { get; set; }

    // El usuario que inició el match (el solicitante)
    public Guid RequesterUserId { get; set; }
    public User RequesterUser { get; set; } = null!;

    // El libro que se está solicitando para intercambio
    public Guid BookId { get; set; }
    public Book Book { get; set; } = null!;

    // El propietario del libro solicitado (nulo si es stock de Bookmachs)
    public Guid? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }

    // Tarifa (Fee) calculada y bloqueada para la transacción
    public decimal FeeAmount { get; set; }

    // Referencia de la retención de pago en la pasarela (Holding / Pre-autorización)
    public string? PaymentHoldId { get; set; }
    public string PaymentStatus { get; set; } = "Pending"; // Pending, Hold, Captured, Refunded, Failed

    // Estado Logístico de la entrega
    public string LogisticsStatus { get; set; } = "Pending"; // Pending, InTransit, Delivered, Cancelled
    public string? LogisticsMethod { get; set; } // Presencial, Bodega, P2P, Donacion

    // Advertencia geográfica (si es transacción entre países diferentes)
    public bool IsCrossBorder { get; set; } = false;
    public bool IsPublic { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime StatusUpdatedAt { get; set; } = DateTime.UtcNow;
}
