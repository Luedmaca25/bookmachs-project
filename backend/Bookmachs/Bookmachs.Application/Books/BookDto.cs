using System;

namespace Bookmachs.Application.Books;

public class BookDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public decimal BaseValue { get; set; }
    public bool IsInternalStock { get; set; }
    public bool IsAvailable { get; set; }
    public Guid? OwnerId { get; set; }
    public DateTime CreatedAt { get; set; }
}
