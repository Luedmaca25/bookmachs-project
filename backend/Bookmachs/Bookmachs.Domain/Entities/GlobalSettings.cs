using System;

namespace Bookmachs.Domain.Entities;

public class GlobalSettings
{
    public int Id { get; set; }
    
    // Límites de visualización de libros (swipes) diarios
    public int DailySwipeLimitFree { get; set; } = 100;
    public int DailySwipeLimitPremium { get; set; } = 1000;

    // Costos de suscripciones mensuales
    public decimal BasicPlanPriceUsd { get; set; } = 2.0m;
    public decimal PremiumPlanPriceUsd { get; set; } = 5.0m;

    // Configuración del Fee de Intercambio
    public decimal FeePercentage { get; set; } = 0.30m; // 30%
    public decimal MinFeeAmount { get; set; } = 1000.0m; // CLP mínimo
    public decimal MaxFeeAmount { get; set; } = 9000.0m; // CLP máximo

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}
