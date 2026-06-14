using System;

namespace Bookmachs.Domain.Entities;

public class UserPreference
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Etiqueta de gusto/preferencia (ej. "Ciencia Ficción", "Medio Ambiente", "Novela Histórica")
    public string PreferenceTag { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
