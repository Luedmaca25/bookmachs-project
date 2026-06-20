using System;

namespace Bookmachs.Application.GlobalSettings;

public class GlobalSettingsDto
{
    public int Id { get; set; }
    public int DailySwipeLimitFree { get; set; }
    public int DailySwipeLimitPremium { get; set; }
    public decimal BasicPlanPriceUsd { get; set; }
    public decimal PremiumPlanPriceUsd { get; set; }
    public decimal FeePercentage { get; set; }
    public decimal MinFeeAmount { get; set; }
    public decimal MaxFeeAmount { get; set; }
    public DateTime LastUpdatedAt { get; set; }
}
