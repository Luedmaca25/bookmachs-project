using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Queries;

public record GetBookRecommendationsQuery(Guid UserId, int Limit = 20) : IRequest<IEnumerable<BookDto>>;

public class GetBookRecommendationsQueryHandler : IRequestHandler<GetBookRecommendationsQuery, IEnumerable<BookDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetBookRecommendationsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<BookDto>> Handle(GetBookRecommendationsQuery request, CancellationToken cancellationToken)
    {
        // 1. Obtener al usuario con sus preferencias
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var userPreferenceTags = user.Preferences
            .Select(p => p.PreferenceTag)
            .Where(t => !string.IsNullOrEmpty(t))
            .ToList();

        // 2. Obtener todos los libros disponibles
        var availableBooks = await _unitOfWork.Books.GetAvailableBooksAsync();

        // 3. Filtrar: Excluir libros propios del usuario
        var filteredBooks = availableBooks
            .Where(b => b.OwnerId != request.UserId)
            .ToList();

        // 4. Calcular Score de Coincidencia por etiquetas
        var scoredBooks = filteredBooks.Select(book =>
        {
            int score = 0;
            
            foreach (var tag in userPreferenceTags)
            {
                // Coincidencia en el Título (5 puntos)
                if (book.Title.Contains(tag, StringComparison.OrdinalIgnoreCase))
                {
                    score += 5;
                }
                
                // Coincidencia en la Descripción / Sinopsis (2 puntos)
                if (!string.IsNullOrEmpty(book.Description) && 
                    book.Description.Contains(tag, StringComparison.OrdinalIgnoreCase))
                {
                    score += 2;
                }
                
                // Coincidencia en el Autor (1 punto)
                if (book.Author.Contains(tag, StringComparison.OrdinalIgnoreCase))
                {
                    score += 1;
                }
            }

            return new { Book = book, Score = score };
        });

        // 5. Ordenar por score descendente y luego por novedad (CreatedAt) descendente
        var recommendedBooks = scoredBooks
            .OrderByDescending(sb => sb.Score)
            .ThenByDescending(sb => sb.Book.CreatedAt)
            .Take(request.Limit)
            .Select(sb => sb.Book)
            .ToList();

        return recommendedBooks.Select(b => new BookDto
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
