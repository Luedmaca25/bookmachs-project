using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Queries;

public record GetGuestRandomBookQuery : IRequest<BookDto>;

public class GetGuestRandomBookQueryHandler : IRequestHandler<GetGuestRandomBookQuery, BookDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetGuestRandomBookQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<BookDto> Handle(GetGuestRandomBookQuery request, CancellationToken cancellationToken)
    {
        var availableBooks = await _unitOfWork.Books.GetAvailableBooksAsync();
        var bookList = availableBooks.ToList();

        Book book;
        if (bookList.Any())
        {
            var random = new Random();
            book = bookList[random.Next(bookList.Count)];
        }
        else
        {
            // Decoy book if database is empty to prevent crashes on landing page
            book = new Book
            {
                Id = Guid.NewGuid(),
                Title = "Cien años de soledad",
                Author = "Gabriel García Márquez",
                Description = "La obra maestra de la literatura hispanoamericana que narra la historia de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo.",
                Condition = "Excelente",
                ImageUrl = null,
                BaseValue = 15.00m,
                IsInternalStock = true,
                IsAvailable = true,
                CreatedAt = DateTime.UtcNow
            };

            // Seed it in the DB so next time it is retrieved from the DB
            await _unitOfWork.Books.AddAsync(book);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new BookDto
        {
            Id = book.Id,
            Title = book.Title,
            Author = book.Author,
            Description = book.Description,
            Condition = book.Condition,
            ImageUrl = book.ImageUrl,
            BaseValue = book.BaseValue,
            IsInternalStock = book.IsInternalStock,
            IsAvailable = book.IsAvailable,
            OwnerId = book.OwnerId,
            CreatedAt = book.CreatedAt
        };
    }
}
