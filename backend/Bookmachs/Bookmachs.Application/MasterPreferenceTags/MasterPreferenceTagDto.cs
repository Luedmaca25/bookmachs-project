using System;

namespace Bookmachs.Application.MasterPreferenceTags;

public class MasterPreferenceTagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
