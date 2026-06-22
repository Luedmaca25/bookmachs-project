using System;

namespace Bookmachs.Application.Social;

public class UserImpactMetricsDto
{
    public int UserBooksExchanged { get; set; }
    public int UserBooksDonated { get; set; }
    public int UserTotalBooks { get; set; } // Exchanged + Donated
    public double UserCo2AvoidedKg { get; set; }
    public double UserEquivalentTrees { get; set; }

    public int CommunityTotalBooks { get; set; }
    public double CommunityCo2AvoidedKg { get; set; }
    public double CommunityEquivalentTrees { get; set; }
}
