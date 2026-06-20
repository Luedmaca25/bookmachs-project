using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Transactions.Queries;

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
    public DateTime CreatedAt { get; set; }
}

public record GetMyMatchesQuery(Guid UserId) : IRequest<IEnumerable<MatchTransactionDto>>;

public class GetMyMatchesQueryHandler : IRequestHandler<GetMyMatchesQuery, IEnumerable<MatchTransactionDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetMyMatchesQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<MatchTransactionDto>> Handle(GetMyMatchesQuery request, CancellationToken cancellationToken)
    {
        var transactions = await _unitOfWork.MatchTransactions.GetTransactionsByUserIdAsync(request.UserId);

        return transactions.Select(t => new MatchTransactionDto
        {
            Id = t.Id,
            RequesterUserId = t.RequesterUserId,
            RequesterName = t.RequesterUser?.Name ?? "Desconocido",
            BookId = t.BookId,
            BookTitle = t.Book?.Title ?? "Libro no disponible",
            BookAuthor = t.Book?.Author ?? "Desconocido",
            BookImageUrl = t.Book?.ImageUrl ?? string.Empty,
            BookCondition = t.Book?.Condition ?? "Good",
            OwnerUserId = t.OwnerUserId,
            OwnerName = t.Book?.IsInternalStock == true ? "Bookmachs Store (Stock Interno)" : (t.OwnerUser?.Name ?? "Desconocido"),
            FeeAmount = t.FeeAmount,
            PaymentStatus = t.PaymentStatus,
            LogisticsStatus = t.LogisticsStatus,
            LogisticsMethod = t.LogisticsMethod,
            IsCrossBorder = t.IsCrossBorder,
            CreatedAt = t.CreatedAt
        }).ToList();
    }
}
