using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Social.Queries;

public record GetUserImpactMetricsQuery(Guid UserId) : IRequest<UserImpactMetricsDto>;

public class GetUserImpactMetricsQueryHandler : IRequestHandler<GetUserImpactMetricsQuery, UserImpactMetricsDto>
{
    private readonly IUnitOfWork _unitOfWork;
    
    // Constantes físicas para cálculo ambiental
    private const double AverageBookWeightKg = 0.4; // Peso promedio estándar de un libro (400 gramos)
    private const double Co2SavedPerKgOfPaper = 2.71; // 2.71 kg de CO2 evitado por kg de papel reutilizado/reciclado
    private const double AnnualTreeAbsorptionKg = 22.0; // Un árbol maduro absorbe ~22 kg de CO2 al año

    public GetUserImpactMetricsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<UserImpactMetricsDto> Handle(GetUserImpactMetricsQuery request, CancellationToken cancellationToken)
    {
        // 1. Validar existencia del usuario
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        // 2. Obtener todas las transacciones completadas de la comunidad
        var allCompletedTransactions = await _unitOfWork.MatchTransactions.GetAllCompletedTransactionsAsync();
        var allCompletedList = allCompletedTransactions.ToList();

        // 3. Filtrar transacciones del usuario actual (donde sea solicitante o dueño)
        var userCompletedTransactions = allCompletedList
            .Where(t => t.RequesterUserId == request.UserId || t.OwnerUserId == request.UserId)
            .ToList();

        // 4. Calcular métricas del usuario
        int userExchangedCount = userCompletedTransactions
            .Count(t => !string.Equals(t.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase));
        
        int userDonatedCount = userCompletedTransactions
            .Count(t => string.Equals(t.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase));

        int userTotalBooks = userExchangedCount + userDonatedCount;
        
        // Huella de Carbono = Peso promedio * Constante de CO2
        double userCo2Avoided = Math.Round(userTotalBooks * AverageBookWeightKg * Co2SavedPerKgOfPaper, 2);
        double userTreesEquivalent = Math.Round(userCo2Avoided / AnnualTreeAbsorptionKg, 2);

        // 5. Calcular métricas de la comunidad
        int communityTotalBooks = allCompletedList.Count;
        double communityCo2Avoided = Math.Round(communityTotalBooks * AverageBookWeightKg * Co2SavedPerKgOfPaper, 2);
        double communityTreesEquivalent = Math.Round(communityCo2Avoided / AnnualTreeAbsorptionKg, 2);

        return new UserImpactMetricsDto
        {
            UserBooksExchanged = userExchangedCount,
            UserBooksDonated = userDonatedCount,
            UserTotalBooks = userTotalBooks,
            UserCo2AvoidedKg = userCo2Avoided,
            UserEquivalentTrees = userTreesEquivalent,

            CommunityTotalBooks = communityTotalBooks,
            CommunityCo2AvoidedKg = communityCo2Avoided,
            CommunityEquivalentTrees = communityTreesEquivalent
        };
    }
}
