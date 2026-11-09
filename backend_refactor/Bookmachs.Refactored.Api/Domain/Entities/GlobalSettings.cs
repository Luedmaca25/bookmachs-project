using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Bookmachs.Refactored.Api.Domain.Entities;

public class GlobalSettings
{
    public int Id { get; set; }
    
    // Límites de visualización de libros (swipes) diarios / mensuales
    public int DailySwipeLimitFree { get; set; } = 40;
    public int DailySwipeLimitPremium { get; set; } = 1000;

    // Límites de intercambios (matches) mensuales
    public int MonthlyMatchLimitFree { get; set; } = 2;
    public int MonthlyMatchLimitPremium { get; set; } = 5;

    // Costos de suscripciones mensuales (CLP / USD)
    public decimal BasicPlanPriceUsd { get; set; } = 0m;
    public decimal PremiumPlanPriceUsd { get; set; } = 9990.0m;

    // Límite de palabras clave de búsqueda para usuarios Premium
    public int SearchKeywordsLimitPremium { get; set; } = 10;

    // Límite de búsquedas permitidas en el catálogo para usuarios Premium
    public int CatalogSearchLimitPremium { get; set; } = 10;

    // Configuración del Fee de Intercambio
    public decimal FeePercentage { get; set; } = 0.30m; // 30%
    public decimal MinFeeAmount { get; set; } = 1000.0m; // CLP mínimo
    public decimal MaxFeeAmount { get; set; } = 9000.0m; // CLP máximo

    // Campaña promocional de Intercambio Doble (Exclusivo Premium)
    public bool EnableDoubleExchange { get; set; } = true;

    // Precios de Complementos y Pases Especiales (CLP)
    public decimal PricePremium24h { get; set; } = 2990.0m;
    public decimal PriceUnlimitedLikes24h { get; set; } = 1990.0m;
    public decimal PriceAuthorSearches10 { get; set; } = 990.0m;
    public decimal PriceBookBoost48h { get; set; } = 490.0m;
    public decimal PriceMatchPassWeek { get; set; } = 2990.0m;
    public decimal PriceMatchPassDayPromo { get; set; } = 990.0m;

    // Umbrales para Disparo de Pop-up Promocional Match Pass
    public int MatchPassPromoSwipesThreshold { get; set; } = 200;
    public int MatchPassPromoMinInterestedThreshold { get; set; } = 2;

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

