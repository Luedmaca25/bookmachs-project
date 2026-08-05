using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Services;

public interface ISocialService
{
    Task<IEnumerable<GlobalExchangeHistoryDto>> GetGlobalExchangeHistoryAsync(CancellationToken cancellationToken = default);
    Task<UserImpactMetricsDto> GetUserImpactMetricsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> AddTimelineReviewAsync(Guid timelineEventId, Guid userId, string reviewComment, int reviewRating, CancellationToken cancellationToken = default);
}

public class SocialService : ISocialService
{
    private readonly BookmachsDbContext _dbContext;

    // Constantes físicas para cálculo ambiental
    private const double AverageBookWeightKg = 0.4;
    private const double Co2SavedPerKgOfPaper = 2.71;
    private const double AnnualTreeAbsorptionKg = 22.0;

    public SocialService(BookmachsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IEnumerable<GlobalExchangeHistoryDto>> GetGlobalExchangeHistoryAsync(CancellationToken cancellationToken = default)
    {
        var timelineEvents = await _dbContext.TimelineEvents
            .Include(e => e.MatchTransaction)
                .ThenInclude(t => t!.Book)
            .Include(e => e.MatchTransaction)
                .ThenInclude(t => t!.RequesterUser)
            .Include(e => e.MatchTransaction)
                .ThenInclude(t => t!.OwnerUser)
            .OrderByDescending(e => e.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        return timelineEvents.Select(e => new GlobalExchangeHistoryDto
        {
            Id = e.Id,
            RequesterName = e.MatchTransaction?.RequesterUser?.Name ?? "Lector Anónimo",
            OwnerName = e.MatchTransaction?.OwnerUser?.Name ?? (string.Equals(e.MatchTransaction?.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase) 
                ? "Bookmachs (Donación)" 
                : "Bookmachs"),
            BookTitle = e.MatchTransaction?.Book?.Title ?? "Libro sin título",
            BookAuthor = e.MatchTransaction?.Book?.Author ?? "Autor Desconocido",
            BookImageUrl = e.MatchTransaction?.Book?.ImageUrl ?? string.Empty,
            LogisticsMethod = e.MatchTransaction?.LogisticsMethod ?? "Intercambio",
            ReviewComment = e.ReviewComment,
            ReviewRating = e.ReviewRating,
            CompletedAt = e.CreatedAt
        }).ToList();
    }

    public async Task<UserImpactMetricsDto> GetUserImpactMetricsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var allCompletedTransactions = await _dbContext.MatchTransactions
            .Where(t => t.LogisticsStatus == "Delivered")
            .ToListAsync(cancellationToken);

        var userCompletedTransactions = allCompletedTransactions
            .Where(t => t.RequesterUserId == userId || t.OwnerUserId == userId)
            .ToList();

        int userExchangedCount = userCompletedTransactions
            .Count(t => !string.Equals(t.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase));
        
        int userDonatedCount = userCompletedTransactions
            .Count(t => string.Equals(t.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase));

        int userTotalBooks = userExchangedCount + userDonatedCount;
        
        double userCo2Avoided = Math.Round(userTotalBooks * AverageBookWeightKg * Co2SavedPerKgOfPaper, 2);
        double userTreesEquivalent = Math.Round(userCo2Avoided / AnnualTreeAbsorptionKg, 2);

        int communityTotalBooks = allCompletedTransactions.Count;
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

    public async Task<bool> AddTimelineReviewAsync(Guid timelineEventId, Guid userId, string reviewComment, int reviewRating, CancellationToken cancellationToken = default)
    {
        var timelineEvent = await _dbContext.TimelineEvents
            .Include(e => e.MatchTransaction)
            .FirstOrDefaultAsync(e => e.Id == timelineEventId, cancellationToken);

        if (timelineEvent == null)
        {
            throw new KeyNotFoundException($"El evento de timeline con ID {timelineEventId} no existe.");
        }

        if (timelineEvent.MatchTransaction == null)
        {
            throw new InvalidOperationException("El evento de timeline no está vinculado a una transacción válida.");
        }

        if (timelineEvent.MatchTransaction.RequesterUserId != userId && 
            timelineEvent.MatchTransaction.OwnerUserId != userId)
        {
            throw new UnauthorizedAccessException("Solo los participantes de este intercambio pueden agregar notas o reseñas.");
        }

        if (reviewRating < 1 || reviewRating > 5)
        {
            throw new ArgumentException("La calificación debe estar entre 1 y 5 estrellas.");
        }

        timelineEvent.ReviewComment = reviewComment;
        timelineEvent.ReviewRating = reviewRating;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
