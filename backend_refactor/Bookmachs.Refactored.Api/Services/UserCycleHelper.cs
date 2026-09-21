using System;
using Bookmachs.Refactored.Api.Domain.Entities;

namespace Bookmachs.Refactored.Api.Services;

public static class UserCycleHelper
{
    /// <summary>
    /// Verifica si la membresía Premium del usuario ha expirado (SubscriptionEndDate <= now).
    /// Si ha expirado, degrada automáticamente al usuario al Plan Gratuito (Free).
    /// Devuelve true si la entidad fue modificada.
    /// </summary>
    public static bool CheckAndApplySubscriptionExpiration(User user, DateTime now)
    {
        if (user.IsPremium && user.SubscriptionEndDate.HasValue && user.SubscriptionEndDate.Value <= now)
        {
            user.IsPremium = false;
            user.SubscriptionPlan = "Free";
            user.SubscriptionEndDate = null;
            user.IsSubscriptionCancelled = false;
            return true;
        }
        return false;
    }

    /// <summary>
    /// Evalúa el ciclo mensual de swipes basado en mes corrido desde el registro del usuario (CreatedAt).
    /// Si la fecha actual ha alcanzado o superado el hito mensual, avanza LastSwipeResetDate al inicio
    /// del ciclo actual y reinicia DailySwipesConsumed y BonusSwipesGranted a 0.
    /// Devuelve true si se aplicó un reinicio de ciclo mensual.
    /// </summary>
    public static bool CheckAndApplyMonthlySwipeReset(User user, DateTime now)
    {
        var cycleStart = user.CreatedAt;
        while (cycleStart.AddMonths(1) <= now)
        {
            cycleStart = cycleStart.AddMonths(1);
        }

        if (user.LastSwipeResetDate < cycleStart)
        {
            user.DailySwipesConsumed = 0;
            user.BonusSwipesGranted = 0;
            user.LastBonusGrantedAt = null;
            user.LastSwipeResetDate = cycleStart;
            return true;
        }

        return false;
    }

    /// <summary>
    /// Calcula las fechas de inicio y fin del ciclo mensual actual para el usuario.
    /// Si el usuario es Premium, toma el periodo de facturación actual.
    /// Si el usuario es Free, toma el mes corrido desde su fecha de registro (CreatedAt).
    /// </summary>
    public static (DateTime cycleStart, DateTime cycleEnd) GetUserMonthlyCycle(User user, DateTime now)
    {
        if (user.IsPremium && user.SubscriptionEndDate.HasValue)
        {
            var end = user.SubscriptionEndDate.Value;
            var start = end.AddMonths(-1);
            if (start <= now && now <= end)
            {
                return (start, end);
            }
        }

        var cycleStart = user.CreatedAt;
        while (cycleStart.AddMonths(1) <= now)
        {
            cycleStart = cycleStart.AddMonths(1);
        }
        var cycleEnd = cycleStart.AddMonths(1);
        return (cycleStart, cycleEnd);
    }
}
