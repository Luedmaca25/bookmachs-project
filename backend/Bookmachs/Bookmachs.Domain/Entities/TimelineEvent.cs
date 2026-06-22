using System;

namespace Bookmachs.Domain.Entities;

public class TimelineEvent
{
    public Guid Id { get; set; }
    public Guid MatchTransactionId { get; set; }
    public MatchTransaction MatchTransaction { get; set; } = null!;
    public string EventType { get; set; } = "Exchange"; // Exchange, Donation, etc.
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
