using System;

namespace Bookmachs.Refactored.Api.Domain.Entities;

public class UserBookInteraction
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // ID del producto o libro (puede ser un Guid o el IdProducto de Ecolectura)
    public string BookId { get; set; } = string.Empty;

    // Acción realizada: "like" o "dislike"
    public string Action { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
