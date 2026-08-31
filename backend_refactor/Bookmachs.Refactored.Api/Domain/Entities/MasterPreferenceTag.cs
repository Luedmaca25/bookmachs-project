using System;

namespace Bookmachs.Refactored.Api.Domain.Entities;

public class MasterPreferenceTag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PreferenceCategoryMapping> MappedCategories { get; set; } = new List<PreferenceCategoryMapping>();
}

