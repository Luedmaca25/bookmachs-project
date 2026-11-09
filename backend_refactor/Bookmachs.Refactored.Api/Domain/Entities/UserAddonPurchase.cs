using System;

namespace Bookmachs.Refactored.Api.Domain.Entities;

public class UserAddonPurchase
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    // Tipo de complemento: Premium24h, UnlimitedLikes24h, AuthorSearches10, BookBoost48h, MatchPassWeek, MatchPassDayPromo
    public string AddonType { get; set; } = string.Empty;

    public decimal Price { get; set; }
    public string BuyOrder { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = "Pending"; // Pending, Captured, Failed

    // Libro asociado en caso de BookBoost48h
    public Guid? TargetBookId { get; set; }

    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
