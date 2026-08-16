using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Bookmachs.Refactored.Api.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Services;

public interface IBookService
{
    Task<BookDto> GetGuestRandomAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<BookDto>> GetMyInventoryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<BookDto> UploadBookAsync(Guid userId, string title, string author, string description, string condition, string? category, decimal baseValue, Stream fileStream, string fileName, CancellationToken cancellationToken = default);
    Task<IEnumerable<BookDto>> GetRecommendationsAsync(Guid userId, int limit, CancellationToken cancellationToken = default);
    Task<SwipeStatusDto> GetSwipeStatusAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<SwipeResultDto> SwipeBookAsync(Guid bookId, Guid userId, string action, CancellationToken cancellationToken = default);
    Task<PaginatedListDto<BookDto>> GetCatalogAsync(Guid userId, string? searchTerm, string? category, string? condition, int pageNumber, int pageSize, string? sortBy, CancellationToken cancellationToken = default);
    Task<ReservationResultDto> ReserveBookAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default);
    Task<ReservationResultDto> CancelReservationAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default);
}

public class BookService : IBookService
{
    private readonly BookmachsDbContext _dbContext;
    private readonly EcolecturaDbContext _ecolecturaDbContext;
    private readonly IFileStorageService _fileStorageService;
    private readonly ICacheService _cacheService;
    private readonly ICategoryHomologationService _homologationService;

    public BookService(
        BookmachsDbContext dbContext,
        EcolecturaDbContext ecolecturaDbContext,
        IFileStorageService fileStorageService,
        ICacheService cacheService,
        ICategoryHomologationService homologationService)
    {
        _dbContext = dbContext;
        _ecolecturaDbContext = ecolecturaDbContext;
        _fileStorageService = fileStorageService;
        _cacheService = cacheService;
        _homologationService = homologationService;
    }

    public async Task<BookDto> GetGuestRandomAsync(CancellationToken cancellationToken = default)
    {
        var productList = await _ecolecturaDbContext.Productos
            .AsNoTracking()
            .Where(p => p.Activo && p.Stock > 0)
            .Include(p => p.Imagenes)
            .Take(50)
            .ToListAsync(cancellationToken);

        if (!productList.Any())
        {
            return new BookDto
            {
                Id = Guid.NewGuid(),
                Title = "Sin libros disponibles",
                Author = "Ecolectura",
                Description = "No hay libros cargados en la base de datos de Ecolectura en este momento.",
                Condition = "Excelente",
                ImageUrl = null,
                BaseValue = 0.00m,
                IsInternalStock = true,
                IsAvailable = false,
                CreatedAt = DateTime.UtcNow
            };
        }

        var random = new Random();
        var product = productList[random.Next(productList.Count)];

        return MapEcolecturaProductToBookDto(product);
    }

    public async Task<IEnumerable<BookDto>> GetMyInventoryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var books = await _dbContext.Books
            .Where(b => b.OwnerId == userId)
            .ToListAsync(cancellationToken);

        return books.Select(MapToBookDto);
    }

    public async Task<BookDto> UploadBookAsync(Guid userId, string title, string author, string description, string condition, string? category, decimal baseValue, Stream fileStream, string fileName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(author))
        {
            throw new ArgumentException("El título y el autor son obligatorios.");
        }

        string? imageUrl = null;
        if (fileStream != Stream.Null && !string.IsNullOrEmpty(fileName))
        {
            imageUrl = await _fileStorageService.SaveFileAsync(fileStream, fileName, "uploads");
        }

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = title,
            Author = author,
            Description = description,
            Condition = condition,
            Category = category,
            ImageUrl = imageUrl,
            BaseValue = baseValue,
            IsInternalStock = false,
            IsAvailable = true,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.Books.AddAsync(book, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToBookDto(book);
    }

    public async Task<IEnumerable<BookDto>> GetRecommendationsAsync(Guid userId, int limit, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users
            .Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var userPreferenceTags = user.Preferences
            .Select(p => p.PreferenceTag)
            .Where(t => !string.IsNullOrEmpty(t))
            .ToList();

        // Obtener los IDs de libros que el usuario ya deslizó (like o dislike) para no recomendarlos de nuevo
        var swipedBookIds = await _dbContext.UserBookInteractions
            .AsNoTracking()
            .Where(i => i.UserId == userId)
            .Select(i => i.BookId)
            .ToListAsync(cancellationToken);

        // 1. Limitar el universo de candidatos excluyendo interactuados
        IQueryable<EcolecturaProducto> baseQuery = _ecolecturaDbContext.Productos
            .AsNoTracking()
            .Where(p => p.Activo && p.Stock > 0 && !swipedBookIds.Contains(p.IdProducto));

        // Si el usuario tiene preferencias de conceptos homologados
        if (userPreferenceTags.Any())
        {
            var mappedItems = _homologationService.GetMappedItemsForConcepts(userPreferenceTags);
            if (mappedItems.Any())
            {
                var categoryOnlyIds = mappedItems
                    .Where(m => !m.SubcategoryId.HasValue)
                    .Select(m => m.CategoryId)
                    .Distinct()
                    .ToList();

                var subcategoryIds = mappedItems
                    .Where(m => m.SubcategoryId.HasValue)
                    .Select(m => m.SubcategoryId!.Value)
                    .Distinct()
                    .ToList();

                baseQuery = baseQuery.Where(p =>
                    (p.IdCategoriaProducto.HasValue && categoryOnlyIds.Contains(p.IdCategoriaProducto.Value)) ||
                    (p.IdSubcategoria.HasValue && subcategoryIds.Contains(p.IdSubcategoria.Value)));
            }
        }

        // Traemos de la base de datos ÚNICAMENTE un grupo pequeño (ej. 50 libros) ordenados por lo más reciente
        var candidateProducts = await baseQuery
            .OrderByDescending(p => p.FechaRegistro)
            .Take(limit * 5)
            .Select(p => new
            {
                IdProducto = p.IdProducto,
                NombreLibro = p.NombreLibro,
                Autor = p.Autor,
                Resena = p.Resena,
                Precio = p.Precio,
                Stock = p.Stock,
                Activo = p.Activo,
                FechaRegistro = p.FechaRegistro,
                NombreCategoria = p.Categoria != null ? p.Categoria.NombreCategoria : null
            })
            .ToListAsync(cancellationToken);

        // Si el usuario NO tiene preferencias especificadas y vinieron muy pocos, obtenemos un fallback rápido sin filtro de etiqueta (respetando exclusión)
        if (!userPreferenceTags.Any() && candidateProducts.Count < limit)
        {
            var fallbackProducts = await _ecolecturaDbContext.Productos
                .AsNoTracking()
                .Where(p => p.Activo && p.Stock > 0 && !swipedBookIds.Contains(p.IdProducto))
                .OrderByDescending(p => p.FechaRegistro)
                .Take(limit * 5)
                .Select(p => new
                {
                    IdProducto = p.IdProducto,
                    NombreLibro = p.NombreLibro,
                    Autor = p.Autor,
                    Resena = p.Resena,
                    Precio = p.Precio,
                    Stock = p.Stock,
                    Activo = p.Activo,
                    FechaRegistro = p.FechaRegistro,
                    NombreCategoria = p.Categoria != null ? p.Categoria.NombreCategoria : null
                })
                .ToListAsync(cancellationToken);

            candidateProducts = candidateProducts.UnionBy(fallbackProducts, p => p.IdProducto).ToList();
        }

        // 2. Obtener imágenes ÚNICAMENTE para los libros seleccionados (ej. 20-50 IDs)
        var selectedIds = candidateProducts.Select(p => p.IdProducto).ToList();
        var images = await _ecolecturaDbContext.ImagenProductos
            .AsNoTracking()
            .Where(img => selectedIds.Contains(img.IdProducto!))
            .Select(img => new { img.IdProducto, img.RutaImagen, img.Principal })
            .ToListAsync(cancellationToken);

        var imageMap = images
            .GroupBy(img => img.IdProducto!)
            .ToDictionary(
                g => g.Key,
                g => g.FirstOrDefault(i => i.Principal)?.RutaImagen ?? g.FirstOrDefault()?.RutaImagen
            );

        // 3. Puntuación en memoria solo sobre los 50 candidatos
        var scoredProducts = candidateProducts.Select(product =>
        {
            int score = 0;
            foreach (var tag in userPreferenceTags)
            {
                if (product.NombreLibro != null && product.NombreLibro.Contains(tag, StringComparison.OrdinalIgnoreCase)) score += 5;
                if (!string.IsNullOrEmpty(product.Resena) && product.Resena.Contains(tag, StringComparison.OrdinalIgnoreCase)) score += 2;
                if (!string.IsNullOrEmpty(product.Autor) && product.Autor.Contains(tag, StringComparison.OrdinalIgnoreCase)) score += 1;
                if (product.NombreCategoria != null && product.NombreCategoria.Contains(tag, StringComparison.OrdinalIgnoreCase)) score += 4;
            }
            return new { Product = product, Score = score };
        });

        var finalSelection = scoredProducts
            .OrderByDescending(sp => sp.Score)
            .ThenByDescending(sp => sp.Product.FechaRegistro)
            .Take(limit)
            .Select(sp => sp.Product)
            .ToList();

        return finalSelection.Select(p =>
        {
            Guid bookId = Guid.TryParse(p.IdProducto, out var parsedGuid) ? parsedGuid : Guid.Empty;
            imageMap.TryGetValue(p.IdProducto, out var rawImageUrl);

            return new BookDto
            {
                Id = bookId,
                Title = p.NombreLibro,
                Author = p.Autor ?? "Desconocido",
                Description = p.Resena,
                Condition = "Bueno",
                ImageUrl = FormatImageUrl(rawImageUrl),
                BaseValue = p.Precio ?? 0.00m,
                IsInternalStock = true,
                IsAvailable = p.Activo && (p.Stock > 0),
                CreatedAt = p.FechaRegistro ?? DateTime.UtcNow
            };
        });
    }

    public async Task<SwipeStatusDto> GetSwipeStatusAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int swipeLimit = user.IsPremium ? (settings?.DailySwipeLimitPremium ?? 1000) : (settings?.DailySwipeLimitFree ?? 100);

        var cacheKey = $"swipes_consumed_{user.Id}";
        int consumed = 0;
        var now = DateTime.UtcNow;
        bool isNewDay = now.Date > user.LastSwipeResetDate.Date;

        if (isNewDay)
        {
            consumed = 0;
            user.DailySwipesConsumed = 0;
            user.LastSwipeResetDate = now;
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
            _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
        }
        else
        {
            var cachedSwipes = _cacheService.Get<int?>(cacheKey);
            if (cachedSwipes.HasValue)
            {
                consumed = cachedSwipes.Value;
            }
            else
            {
                consumed = user.DailySwipesConsumed;
                _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
            }
        }

        return new SwipeStatusDto
        {
            SwipesConsumed = consumed,
            SwipeLimit = swipeLimit,
            LimitReached = consumed >= swipeLimit
        };
    }

    public async Task<SwipeResultDto> SwipeBookAsync(Guid bookId, Guid userId, string action, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int swipeLimit = 100;
        if (settings != null)
        {
            swipeLimit = user.IsPremium ? settings.DailySwipeLimitPremium : settings.DailySwipeLimitFree;
        }

        var cacheKey = $"swipes_consumed_{user.Id}";
        int consumed = 0;
        var now = DateTime.UtcNow;
        bool isNewDay = now.Date > user.LastSwipeResetDate.Date;

        if (isNewDay)
        {
            consumed = 0;
            user.DailySwipesConsumed = 0;
            user.LastSwipeResetDate = now;
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
            _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
        }
        else
        {
            var cachedSwipes = _cacheService.Get<int?>(cacheKey);
            if (cachedSwipes.HasValue)
            {
                consumed = cachedSwipes.Value;
            }
            else
            {
                consumed = user.DailySwipesConsumed;
                _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
            }
        }

        if (consumed >= swipeLimit)
        {
            return new SwipeResultDto
            {
                Success = false,
                SwipesConsumed = consumed,
                SwipeLimit = swipeLimit,
                ErrorCode = "DailyLimitExceeded",
                Message = $"Has alcanzado tu límite diario de {swipeLimit} swipes en la cuenta gratuita. Pásate a Premium para deslizar sin límites."
            };
        }

        consumed++;
        _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
        user.DailySwipesConsumed = consumed;
        _dbContext.Users.Update(user);

        bool isMatch = false;
        Guid? matchTransactionId = null;

        if (action.Equals("like", StringComparison.OrdinalIgnoreCase))
        {
            var book = await EnsureBookExistsLocallyAsync(bookId, cancellationToken);

            if (book != null && book.IsAvailable)
            {
                isMatch = book.IsInternalStock || (Random.Shared.NextDouble() < 0.35);

                if (isMatch)
                {
                    decimal feePercentage = settings?.FeePercentage ?? 0.30m;
                    decimal minFee = settings?.MinFeeAmount ?? 1000.0m;
                    decimal maxFee = settings?.MaxFeeAmount ?? 9000.0m;

                    decimal rawFee = book.BaseValue * feePercentage;
                    decimal finalFee = rawFee;

                    if (finalFee < minFee) finalFee = minFee;
                    else if (finalFee > maxFee) finalFee = maxFee;

                    finalFee = Math.Round(finalFee, 2);

                    bool isCrossBorder = false;
                    if (!book.IsInternalStock && book.OwnerId.HasValue)
                    {
                        var owner = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == book.OwnerId.Value, cancellationToken);
                        if (owner != null && !string.IsNullOrEmpty(user.Pais) && !string.IsNullOrEmpty(owner.Pais))
                        {
                            isCrossBorder = !string.Equals(user.Pais, owner.Pais, StringComparison.OrdinalIgnoreCase);
                        }
                    }

                    var transaction = new MatchTransaction
                    {
                        Id = Guid.NewGuid(),
                        RequesterUserId = user.Id,
                        BookId = book.Id,
                        OwnerUserId = book.IsInternalStock ? null : book.OwnerId,
                        FeeAmount = finalFee,
                        PaymentStatus = "Pending",
                        LogisticsStatus = "Pending",
                        IsCrossBorder = isCrossBorder,
                        CreatedAt = DateTime.UtcNow,
                        StatusUpdatedAt = DateTime.UtcNow
                    };

                    await _dbContext.MatchTransactions.AddAsync(transaction, cancellationToken);
                    book.IsAvailable = false;
                    _dbContext.Books.Update(book);

                    matchTransactionId = transaction.Id;
                }
            }
        }

        // Registrar la interacción (swipe like/dislike) para excluir este libro en futuras recomendaciones
        string bookIdStr = bookId.ToString();
        var existingInteraction = await _dbContext.UserBookInteractions
            .FirstOrDefaultAsync(i => i.UserId == user.Id && i.BookId == bookIdStr, cancellationToken);

        if (existingInteraction == null)
        {
            await _dbContext.UserBookInteractions.AddAsync(new UserBookInteraction
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                BookId = bookIdStr,
                Action = action.ToLower(),
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new SwipeResultDto
        {
            Success = true,
            SwipesConsumed = consumed,
            SwipeLimit = swipeLimit,
            Message = isMatch ? "¡Match logrado!" : "Swipe registrado con éxito.",
            IsMatch = isMatch,
            MatchTransactionId = matchTransactionId
        };
    }

    public async Task<PaginatedListDto<BookDto>> GetCatalogAsync(Guid userId, string? searchTerm, string? category, string? condition, int pageNumber, int pageSize, string? sortBy, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        if (!user.IsPremium)
        {
            throw new UnauthorizedAccessException("Se requiere una membresía Premium para acceder al catálogo avanzado.");
        }

        // Query Ecolectura Productos
        IQueryable<EcolecturaProducto> query = _ecolecturaDbContext.Productos
            .Include(p => p.Imagenes)
            .Include(p => p.Categoria)
            .Where(p => p.Activo && p.Stock > 0);

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var search = searchTerm.Trim();
            query = query.Where(p =>
                p.NombreLibro.Contains(search) ||
                (p.Autor != null && p.Autor.Contains(search)) ||
                p.Resena.Contains(search)
            );
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var cat = category.Trim();
            var mappedItems = _homologationService.GetMappedItemsForConcepts(new[] { cat });
            if (mappedItems.Any())
            {
                var categoryOnlyIds = mappedItems
                    .Where(m => !m.SubcategoryId.HasValue)
                    .Select(m => m.CategoryId)
                    .Distinct()
                    .ToList();

                var subcategoryIds = mappedItems
                    .Where(m => m.SubcategoryId.HasValue)
                    .Select(m => m.SubcategoryId!.Value)
                    .Distinct()
                    .ToList();

                query = query.Where(p =>
                    (p.IdCategoriaProducto.HasValue && categoryOnlyIds.Contains(p.IdCategoriaProducto.Value)) ||
                    (p.IdSubcategoria.HasValue && subcategoryIds.Contains(p.IdSubcategoria.Value)) ||
                    (p.Categoria != null && p.Categoria.NombreCategoria.Contains(cat)));
            }
            else
            {
                query = query.Where(p =>
                    p.Categoria != null && p.Categoria.NombreCategoria.Contains(cat)
                );
            }
        }

        query = sortBy?.ToLower() switch
        {
            "title" => query.OrderBy(p => p.NombreLibro),
            "basevalue" => query.OrderBy(p => p.Precio ?? 0),
            "createdat" => query.OrderByDescending(p => p.FechaRegistro),
            _ => query.OrderByDescending(p => p.FechaRegistro)
        };

        int totalCount = await query.CountAsync(cancellationToken);
        int page = pageNumber > 0 ? pageNumber : 1;
        int size = pageSize > 0 ? pageSize : 10;

        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapEcolecturaProductToBookDto).ToList();

        return new PaginatedListDto<BookDto>(dtos, page, size, totalCount);
    }

    public async Task<ReservationResultDto> ReserveBookAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        if (!user.IsPremium)
        {
            throw new UnauthorizedAccessException("Se requiere una membresía Premium para poder reservar libros.");
        }

        var book = await EnsureBookExistsLocallyAsync(bookId, cancellationToken);
        if (book == null)
        {
            throw new KeyNotFoundException("Libro no encontrado.");
        }

        if (book.OwnerId == userId)
        {
            throw new InvalidOperationException("No puedes reservar tu propio libro.");
        }

        if (!book.IsAvailable)
        {
            throw new InvalidOperationException("El libro no está disponible para intercambio.");
        }

        if (book.IsReserved && book.ReservedUntil >= DateTime.UtcNow)
        {
            if (book.ReservedByUserId == userId)
            {
                return new ReservationResultDto
                {
                    BookId = book.Id,
                    BookTitle = book.Title,
                    ReservedByUserId = book.ReservedByUserId.Value,
                    ReservedUntil = book.ReservedUntil.Value,
                    Success = true,
                    Message = "Ya tienes reservado este libro."
                };
            }

            throw new InvalidOperationException("El libro ya se encuentra reservado por otro usuario.");
        }

        book.IsReserved = true;
        book.ReservedUntil = DateTime.UtcNow.AddHours(48);
        book.ReservedByUserId = userId;

        _dbContext.Books.Update(book);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ReservationResultDto
        {
            BookId = book.Id,
            BookTitle = book.Title,
            ReservedByUserId = book.ReservedByUserId.Value,
            ReservedUntil = book.ReservedUntil.Value,
            Success = true,
            Message = "Libro reservado con éxito por 48 horas."
        };
    }

    public async Task<ReservationResultDto> CancelReservationAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default)
    {
        var book = await EnsureBookExistsLocallyAsync(bookId, cancellationToken);
        if (book == null)
        {
            throw new KeyNotFoundException("Libro no encontrado.");
        }

        if (!book.IsReserved || book.ReservedByUserId != userId)
        {
            throw new InvalidOperationException("No tienes ninguna reserva activa sobre este libro.");
        }

        book.IsReserved = false;
        book.ReservedUntil = null;
        book.ReservedByUserId = null;

        _dbContext.Books.Update(book);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ReservationResultDto
        {
            BookId = book.Id,
            BookTitle = book.Title,
            Success = true,
            Message = "Reserva cancelada y libro liberado exitosamente."
        };
    }

    private static BookDto MapToBookDto(Book b)
    {
        return new BookDto
        {
            Id = b.Id,
            Title = b.Title,
            Author = b.Author,
            Description = b.Description,
            Condition = b.Condition,
            Category = b.Category,
            ImageUrl = FormatImageUrl(b.ImageUrl),
            BaseValue = b.BaseValue,
            IsInternalStock = b.IsInternalStock,
            IsAvailable = b.IsAvailable,
            OwnerId = b.OwnerId,
            CreatedAt = b.CreatedAt
        };
    }

    private async Task<Book> EnsureBookExistsLocallyAsync(Guid bookId, CancellationToken cancellationToken)
    {
        var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId, cancellationToken);
        if (book != null)
        {
            if (string.IsNullOrEmpty(book.Category))
            {
                var productEco = await _ecolecturaDbContext.Productos
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.IdProducto == bookId.ToString(), cancellationToken);
                if (productEco != null)
                {
                    book.Category = _homologationService.GetConceptNameForProduct(
                        productEco.IdCategoriaProducto,
                        productEco.IdSubcategoria
                    );
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }
            return book;
        }

        // Buscar en Ecolectura
        var product = await _ecolecturaDbContext.Productos
            .Include(p => p.Imagenes)
            .FirstOrDefaultAsync(p => p.IdProducto == bookId.ToString(), cancellationToken);

        if (product == null)
        {
            throw new KeyNotFoundException($"No se encontró el producto/libro con ID {bookId} en la base de datos.");
        }

        string? rawImageUrl = product.Imagenes.FirstOrDefault(i => i.Principal)?.RutaImagen
                              ?? product.Imagenes.FirstOrDefault()?.RutaImagen;
        string? imageUrl = FormatImageUrl(rawImageUrl);

        string? categoryName = _homologationService.GetConceptNameForProduct(
            product.IdCategoriaProducto,
            product.IdSubcategoria
        );

        // Crear registro en la base de datos local
        book = new Book
        {
            Id = bookId,
            Title = product.NombreLibro,
            Author = product.Autor ?? "Desconocido",
            Description = product.Resena,
            Condition = "Bueno", // Por defecto para inventario de Ecolectura
            Category = categoryName,
            ImageUrl = imageUrl,
            BaseValue = product.Precio ?? 0.00m,
            IsInternalStock = true,
            IsAvailable = true,
            CreatedAt = product.FechaRegistro ?? DateTime.UtcNow
        };

        await _dbContext.Books.AddAsync(book, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return book;
    }

    private BookDto MapEcolecturaProductToBookDto(EcolecturaProducto product)
    {
        Guid bookId = Guid.TryParse(product.IdProducto, out var parsedGuid) ? parsedGuid : Guid.Empty;
        string? rawImageUrl = product.Imagenes.FirstOrDefault(i => i.Principal)?.RutaImagen
                              ?? product.Imagenes.FirstOrDefault()?.RutaImagen;
        string? imageUrl = FormatImageUrl(rawImageUrl);

        string? categoryName = _homologationService.GetConceptNameForProduct(
            product.IdCategoriaProducto,
            product.IdSubcategoria
        );

        return new BookDto
        {
            Id = bookId,
            Title = product.NombreLibro,
            Author = product.Autor ?? "Desconocido",
            Description = product.Resena,
            Condition = "Bueno",
            Category = categoryName,
            ImageUrl = imageUrl,
            BaseValue = product.Precio ?? 0.00m,
            IsInternalStock = true,
            IsAvailable = product.Activo && (product.Stock > 0),
            CreatedAt = product.FechaRegistro ?? DateTime.UtcNow
        };
    }

    private static string? FormatImageUrl(string? rutaImagen)
    {
        if (string.IsNullOrWhiteSpace(rutaImagen))
        {
            return null;
        }

        if (rutaImagen.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            rutaImagen.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return rutaImagen;
        }

        // Si es un archivo subido por un usuario en el backend local (ej: /uploads/xxx.jpg)
        if (rutaImagen.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) ||
            rutaImagen.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
        {
            var cleanUploadPath = rutaImagen.TrimStart('/');
            return $"http://localhost:5185/{cleanUploadPath}"; // URL de archivos estáticos del backend local
        }

        // Si es una ruta relativa de Ecolectura, anteponer el dominio www.ecolectura.cl
        var cleanPath = rutaImagen.TrimStart('~').TrimStart('/');
        return $"https://www.ecolectura.cl/{cleanPath}";
    }
}
