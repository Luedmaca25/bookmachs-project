using System;

namespace Bookmachs.Refactored.Api.Domain.Entities;

public class PreferenceCategoryMapping
{
    public int Id { get; set; }
    public int MasterPreferenceTagId { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? SubcategoryId { get; set; }
    public string? SubcategoryName { get; set; }

    public MasterPreferenceTag? MasterPreferenceTag { get; set; }
}
