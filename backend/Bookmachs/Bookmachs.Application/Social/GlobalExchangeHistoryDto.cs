using System;

namespace Bookmachs.Application.Social;

public class GlobalExchangeHistoryDto
{
    public Guid Id { get; set; }
    public string RequesterName { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string BookTitle { get; set; } = string.Empty;
    public string BookAuthor { get; set; } = string.Empty;
    public string BookImageUrl { get; set; } = string.Empty;
    public string LogisticsMethod { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; }
}
