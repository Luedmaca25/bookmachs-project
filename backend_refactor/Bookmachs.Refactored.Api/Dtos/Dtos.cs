using System;

namespace Bookmachs.Refactored.Api.Dtos;

public class AuthResponseDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsPremium { get; set; }
    public string Token { get; set; } = string.Empty;
}

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public bool IsPremium { get; set; }
    public string SubscriptionPlan { get; set; } = "Free";
    public string Role { get; set; } = "User";
    public System.Collections.Generic.List<string> Preferences { get; set; } = new System.Collections.Generic.List<string>();
    public int DailySwipesConsumed { get; set; }
    public int DailySwipeLimit { get; set; }
}

public class AdminUserDetailDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public bool IsPremium { get; set; }
    public string SubscriptionPlan { get; set; } = "Free";
    public string Role { get; set; } = "User";
    public bool IsBlocked { get; set; }
    public DateTime CreatedAt { get; set; }
    public int BooksCount { get; set; }
    public System.Collections.Generic.List<string> Preferences { get; set; } = new System.Collections.Generic.List<string>();
}

public class SwipeStatusDto
{
    public int SwipesConsumed { get; set; }
    public int SwipeLimit { get; set; }
    public bool LimitReached { get; set; }
}

public class BookDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Condition { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? ImageUrl { get; set; }
    public decimal BaseValue { get; set; }
    public bool IsInternalStock { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsFallbackCategory { get; set; }
    public Guid? OwnerId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GlobalSettingsDto
{
    public int Id { get; set; }
    public int DailySwipeLimitFree { get; set; }
    public int DailySwipeLimitPremium { get; set; }
    public int MonthlyMatchLimitFree { get; set; } = 2;
    public int MonthlyMatchLimitPremium { get; set; } = 5;
    public decimal BasicPlanPriceUsd { get; set; }
    public decimal PremiumPlanPriceUsd { get; set; }
    public int SearchKeywordsLimitPremium { get; set; } = 10;
    public decimal FeePercentage { get; set; }
    public decimal MinFeeAmount { get; set; }
    public decimal MaxFeeAmount { get; set; }
    public DateTime LastUpdatedAt { get; set; }
}

public class PreferenceCategoryMappingDto
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? SubcategoryId { get; set; }
    public string? SubcategoryName { get; set; }
}

public class CreatePreferenceMappingRequest
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? SubcategoryId { get; set; }
    public string? SubcategoryName { get; set; }
}

public class MasterPreferenceTagDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PreferenceCategoryMappingDto> MappedCategories { get; set; } = new();
}

public class CreatePreferenceTagRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public List<CreatePreferenceMappingRequest> MappedCategories { get; set; } = new();
}

public class UpdatePreferenceTagRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public List<CreatePreferenceMappingRequest> MappedCategories { get; set; } = new();
}

public class EcolecturaSubcategoryDto
{
    public int SubcategoryId { get; set; }
    public string SubcategoryName { get; set; } = string.Empty;
    public bool Activo { get; set; }
}

public class EcolecturaCategoryTreeDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool Activo { get; set; }
    public List<EcolecturaSubcategoryDto> Subcategories { get; set; } = new();
}

public class GlobalExchangeHistoryDto
{
    public Guid Id { get; set; }
    public string RequesterName { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string BookTitle { get; set; } = string.Empty;
    public string BookAuthor { get; set; } = string.Empty;
    public string BookImageUrl { get; set; } = string.Empty;
    public string LogisticsMethod { get; set; } = string.Empty;
    public string? ReviewComment { get; set; }
    public int? ReviewRating { get; set; }
    public DateTime CompletedAt { get; set; }
}

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

public class SwipeResultDto
{
    public bool Success { get; set; }
    public int SwipesConsumed { get; set; }
    public int SwipeLimit { get; set; }
    public string? ErrorCode { get; set; }
    public string? Message { get; set; }
    public bool IsMatch { get; set; }
    public Guid? MatchTransactionId { get; set; }
}

public class ReservationResultDto
{
    public Guid BookId { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public Guid ReservedByUserId { get; set; }
    public DateTime ReservedUntil { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class CheckoutResultDto
{
    public bool Success { get; set; }
    public string? PaymentHoldId { get; set; }
    public string? PaymentStatus { get; set; }
    public string? Message { get; set; }
}

public class WebpayStartResultDto
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? RedirectUrl { get; set; }
    public string? Message { get; set; }
}

public class WebpayConfirmResultDto
{
    public bool Success { get; set; }
    public string? MatchTransactionId { get; set; }
    public string? PaymentStatus { get; set; }
    public string? Message { get; set; }
}

public class LogisticsResultDto
{
    public bool Success { get; set; }
    public string? LogisticsStatus { get; set; }
    public string? LogisticsMethod { get; set; }
    public string? Message { get; set; }
}

public class FeeEstimationDto
{
    public Guid BookId { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public decimal BaseValue { get; set; }
    public decimal FeePercentage { get; set; }
    public decimal RawFee { get; set; }
    public decimal MinFeeAmount { get; set; }
    public decimal MaxFeeAmount { get; set; }
    public decimal FinalFee { get; set; }
    public bool IsCrossBorder { get; set; }
    public string RequesterCountry { get; set; } = string.Empty;
    public string OwnerCountry { get; set; } = string.Empty;
}

public class MatchTransactionDto
{
    public Guid Id { get; set; }
    public Guid RequesterUserId { get; set; }
    public string RequesterName { get; set; } = string.Empty;
    public Guid BookId { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public string BookAuthor { get; set; } = string.Empty;
    public string BookImageUrl { get; set; } = string.Empty;
    public string BookCondition { get; set; } = string.Empty;
    public Guid? OwnerUserId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public decimal FeeAmount { get; set; }
    public string PaymentStatus { get; set; } = "Pending";
    public string LogisticsStatus { get; set; } = "Pending";
    public string? LogisticsMethod { get; set; }
    public bool IsCrossBorder { get; set; }
    public bool IsAvailable { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class WebhookProcessResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? UserId { get; set; }
    public string? SubscriptionPlan { get; set; }
}
