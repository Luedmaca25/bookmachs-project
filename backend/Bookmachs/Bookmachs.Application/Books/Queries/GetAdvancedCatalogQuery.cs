using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Models;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Queries;

public record GetAdvancedCatalogQuery(
    Guid UserId,
    string? SearchTerm = null,
    string? Category = null,
    string? Condition = null,
    int PageNumber = 1,
    int PageSize = 10,
    string? SortBy = "createdAt"
) : IRequest<PaginatedListDto<BookDto>>;

public class GetAdvancedCatalogQueryHandler : IRequestHandler<GetAdvancedCatalogQuery, PaginatedListDto<BookDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetAdvancedCatalogQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PaginatedListDto<BookDto>> Handle(GetAdvancedCatalogQuery request, CancellationToken cancellationToken)
    {
        // 1. Obtener el usuario para validar premium
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        // 2. Validar que sea un usuario premium
        if (!user.IsPremium)
        {
            throw new UnauthorizedAccessException("Se requiere una membresía Premium para acceder al catálogo avanzado.");
        }

        // 3. Obtener libros disponibles
        var availableBooks = await _unitOfWork.Books.GetAvailableBooksAsync();

        // 4. Filtrar: Excluir libros propios del usuario
        var query = availableBooks
            .Where(b => b.OwnerId != request.UserId);

        // 5. Aplicar Filtro de búsqueda (Título, Autor, Descripción)
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.Trim();
            query = query.Where(b => 
                b.Title.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                b.Author.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(b.Description) && b.Description.Contains(search, StringComparison.OrdinalIgnoreCase))
            );
        }

        // 6. Aplicar Filtro de categoría (Coincidencia con etiquetas)
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            var cat = request.Category.Trim();
            query = query.Where(b => 
                b.Title.Contains(cat, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(b.Description) && b.Description.Contains(cat, StringComparison.OrdinalIgnoreCase)) ||
                b.Author.Contains(cat, StringComparison.OrdinalIgnoreCase)
            );
        }

        // 7. Aplicar Filtro de estado físico (Condición)
        if (!string.IsNullOrWhiteSpace(request.Condition))
        {
            var cond = request.Condition.Trim();
            query = query.Where(b => b.Condition.Equals(cond, StringComparison.OrdinalIgnoreCase));
        }

        // 8. Ordenamiento
        var sortedList = request.SortBy?.ToLower() switch
        {
            "title" => query.OrderBy(b => b.Title),
            "basevalue" => query.OrderBy(b => b.BaseValue),
            "createdat" => query.OrderByDescending(b => b.CreatedAt),
            _ => query.OrderByDescending(b => b.CreatedAt) // Por defecto: recién llegados primero
        };

        var filteredList = sortedList.ToList();
        int totalCount = filteredList.Count;

        // 9. Paginación
        int pageNumber = request.PageNumber > 0 ? request.PageNumber : 1;
        int pageSize = request.PageSize > 0 ? request.PageSize : 10;

        var items = filteredList
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BookDto
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
            })
            .ToList();

        return new PaginatedListDto<BookDto>(items, pageNumber, pageSize, totalCount);
    }
}
