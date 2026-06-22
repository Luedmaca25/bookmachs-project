using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Social.Queries;

public record GetGlobalExchangeHistoryQuery : IRequest<IEnumerable<GlobalExchangeHistoryDto>>;

public class GetGlobalExchangeHistoryQueryHandler : IRequestHandler<GetGlobalExchangeHistoryQuery, IEnumerable<GlobalExchangeHistoryDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetGlobalExchangeHistoryQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<GlobalExchangeHistoryDto>> Handle(GetGlobalExchangeHistoryQuery request, CancellationToken cancellationToken)
    {
        var timelineEvents = await _unitOfWork.TimelineEvents.GetPublicEventsAsync(50);

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
}
