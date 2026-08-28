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

    // Configuración del Fee de Intercambio
    public decimal FeePercentage { get; set; } = 0.30m; // 30%
    public decimal MinFeeAmount { get; set; } = 1000.0m; // CLP mínimo
    public decimal MaxFeeAmount { get; set; } = 9000.0m; // CLP máximo

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

