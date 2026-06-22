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
        var completedTransactions = await _unitOfWork.MatchTransactions.GetGlobalHistoryAsync();

        return completedTransactions.Select(t => new GlobalExchangeHistoryDto
        {
            Id = t.Id,
            RequesterName = t.RequesterUser?.Name ?? "Lector Anónimo",
            OwnerName = t.OwnerUser?.Name ?? (string.Equals(t.LogisticsMethod, "Donacion", StringComparison.OrdinalIgnoreCase) 
                ? "Bookmachs (Donación)" 
                : "Bookmachs"),
            BookTitle = t.Book?.Title ?? "Libro sin título",
            BookAuthor = t.Book?.Author ?? "Autor Desconocido",
            BookImageUrl = t.Book?.ImageUrl ?? string.Empty,
            LogisticsMethod = t.LogisticsMethod ?? "Intercambio",
            CompletedAt = t.StatusUpdatedAt
        }).ToList();
    }
}
