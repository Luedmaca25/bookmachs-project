using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Queries;

public record GetMyInventoryQuery(Guid UserId) : IRequest<IEnumerable<BookDto>>;

public class GetMyInventoryQueryHandler : IRequestHandler<GetMyInventoryQuery, IEnumerable<BookDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetMyInventoryQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<BookDto>> Handle(GetMyInventoryQuery request, CancellationToken cancellationToken)
    {
        var books = await _unitOfWork.Books.GetBooksByOwnerIdAsync(request.UserId);

        return books.Select(b => new BookDto
        {
            Id = b.Id,
            Title = b.Title,
            Author = b.Author,
            Description = b.Description,
            Condition = b.Condition,
            ImageUrl = b.ImageUrl,
            BaseValue = b.BaseValue,
            IsInternalStock = b.IsInternalStock,
            IsAvailable = b.IsAvailable,
            OwnerId = b.OwnerId,
            CreatedAt = b.CreatedAt
        });
    }
}
