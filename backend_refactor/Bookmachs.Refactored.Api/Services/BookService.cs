using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Linq.Expressions;
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
    Task<IEnumerable<BookDto>> GetGuestBooksAsync(int count = 10, CancellationToken cancellationToken = default);
    Task<IEnumerable<BookDto>> GetMyInventoryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<BookDto> UploadBookAsync(Guid userId, string title, string author, string description, string condition, string? category, decimal baseValue, Stream fileStream, string fileName, CancellationToken cancellationToken = default);
    Task<IEnumerable<BookDto>> GetRecommendationsAsync(Guid userId, int limit, CancellationToken cancellationToken = default);
    Task<SwipeStatusDto> GetSwipeStatusAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<SwipeResultDto> SwipeBookAsync(Guid bookId, Guid userId, string action, CancellationToken cancellationToken = default);
    Task<SwipeStatusDto> UndoSwipeAsync(Guid userId, Guid? bookId = null, CancellationToken cancellationToken = default);
    Task<CatalogSearchStatusDto> GetCatalogSearchStatusAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PaginatedListDto<BookDto>> GetCatalogAsync(Guid userId, string? searchTerm, string? category, string? condition, int pageNumber, int pageSize, string? sortBy, bool isNewlyArrived = false, CancellationToken cancellationToken = default);
    Task<ReservationResultDto> ReserveBookAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default);
    Task<ReservationResultDto> CancelReservationAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default);
    Task<IEnumerable<BookDto>> GetMyReservationsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteBookAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default);
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
        var books = await GetGuestBooksAsync(1, cancellationToken);
        return books.FirstOrDefault() ?? new BookDto
        {
            Id = Guid.NewGuid(),
            Title = "Sin libros disponibles",
            Author = "Ecolectura",
            Description = "No hay libros cargados en la base de datos en este momento.",
            Condition = "Excelente",
            ImageUrl = null,
            BaseValue = 0.00m,
            IsInternalStock = true,
            IsAvailable = false,
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task<IEnumerable<BookDto>> GetGuestBooksAsync(int count = 10, CancellationToken cancellationToken = default)
    {
        // Consultar directamente a toda la base de datos (90.000+ libros con stock activo) con orden aleatorio real
        var productList = await _ecolecturaDbContext.Productos
            .AsNoTracking()
            .Where(p => p.Activo && p.Stock > 0)
            .OrderBy(p => Guid.NewGuid())
            .Take(count)
            .Select(p => new
            {
                p.IdProducto,
                p.NombreLibro,
                p.Autor,
                p.Resena,
                p.Precio,
                p.IdCategoriaProducto,
                p.IdSubcategoria,
                p.IdEstadoProducto,
                p.Activo,
                p.Stock,
                p.FechaRegistro,
                RutaImagen = p.Imagenes
                    .OrderByDescending(i => i.Principal)
                    .Select(i => i.RutaImagen)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        if (!productList.Any())
        {
            return new List<BookDto>();
        }

        return productList.Select(prod =>
        {
            Guid bookId = Guid.TryParse(prod.IdProducto, out var parsedGuid) ? parsedGuid : Guid.Empty;
            string? imageUrl = FormatImageUrl(prod.RutaImagen);
            string? categoryName = _homologationService.GetConceptNameForProduct(
                prod.IdCategoriaProducto,
                prod.IdSubcategoria
            );

            return new BookDto
            {
                Id = bookId,
                Title = prod.NombreLibro,
                Author = prod.Autor ?? "Desconocido",
                Description = prod.Resena,
                Condition = MapEstadoProducto(prod.IdEstadoProducto),
                Category = categoryName,
                ImageUrl = imageUrl,
                BaseValue = prod.Precio ?? 0.00m,
                IsInternalStock = true,
                IsAvailable = prod.Activo && (prod.Stock > 0),
                CreatedAt = prod.FechaRegistro ?? DateTime.UtcNow,
                IsFallbackCategory = false
            };
        }).ToList();
    }

    public async Task<IEnumerable<BookDto>> GetMyInventoryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var books = await _dbContext.Books
            .Where(b => b.OwnerId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync(cancellationToken);

        if (!books.Any())
        {
            return Enumerable.Empty<BookDto>();
        }

        var bookIds = books.Select(b => b.Id).ToList();

        // Buscar transacciones activas o finalizadas asociadas a estos libros
        var transactions = await _dbContext.MatchTransactions
            .Where(t => bookIds.Contains(t.BookId) && (t.PaymentStatus == "Captured" || t.PaymentStatus == "Hold" || t.LogisticsStatus == "Delivered" || t.LogisticsStatus == "Completed"))
            .ToListAsync(cancellationToken);

        var result = new List<BookDto>();

        foreach (var book in books)
        {
            var dto = MapToBookDto(book);

            var bookTx = transactions.FirstOrDefault(t => t.BookId == book.Id);
            if (bookTx != null)
            {
                if (bookTx.LogisticsStatus == "Delivered" || bookTx.LogisticsStatus == "Completed")
                {
                    dto.ExchangeStatus = "Exchanged";
                    dto.IsAvailable = false;
                }
                else if (bookTx.LogisticsStatus != "Cancelled" && bookTx.LogisticsStatus != "Expired")
                {
                    dto.ExchangeStatus = "InExchange";
                    dto.IsAvailable = false;
                }
            }
            else if (book.IsReserved && book.ReservedUntil > DateTime.UtcNow)
            {
                dto.ExchangeStatus = "Reserved";
                dto.IsAvailable = false;
            }
            else if (book.IsDoubleExchangeCommitment && book.DoubleExchangeCommitmentUntil.HasValue && book.DoubleExchangeCommitmentUntil.Value > DateTime.UtcNow)
            {
                dto.ExchangeStatus = "DoubleExchangeCommitment";
                dto.IsAvailable = true;
            }
            else
            {
                dto.ExchangeStatus = book.IsAvailable ? "Available" : "Unavailable";
            }

            result.Add(dto);
        }

        return result;
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
            imageUrl = await _fileStorageService.SaveSecureUserBookImageAsync(userId, fileStream, fileName);
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

    public async Task<IEnumerable<BookDto>> GetRecommendationsAsync(Guid userId, int limit = 100, CancellationToken cancellationToken = default)
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

        // Obtener los IDs de libros que el usuario ya deslizó (like o dislike) en UserBookInteractions
        var swipedBookGuids = await _dbContext.UserBookInteractions
            .AsNoTracking()
            .Where(i => i.UserId == userId)
            .Select(i => i.BookId)
            .ToListAsync(cancellationToken);

        // Obtener los IDs de libros propios creados por el usuario en Books
        var myBookGuids = await _dbContext.Books
            .AsNoTracking()
            .Where(b => b.OwnerId == userId)
            .Select(b => b.Id)
            .ToListAsync(cancellationToken);

        // Excluir libros que estén en proceso de intercambio o ya hayan sido intercambiados
        var unavailableBookIds = await _dbContext.MatchTransactions
            .AsNoTracking()
            .Where(t => (t.PaymentStatus == "Captured" || t.PaymentStatus == "Hold" || t.LogisticsStatus == "Delivered" || t.LogisticsStatus == "Completed")
                        && t.LogisticsStatus != "Cancelled" && t.LogisticsStatus != "Expired")
            .Select(t => t.BookId.ToString())
            .ToListAsync(cancellationToken);

        // Excluir libros reservados activamente por otros usuarios
        var reservedByOthersGuids = await _dbContext.Books
            .AsNoTracking()
            .Where(b => b.IsReserved && b.ReservedUntil >= DateTime.UtcNow && b.ReservedByUserId != userId)
            .Select(b => b.Id.ToString())
            .ToListAsync(cancellationToken);

        // Conjunto de IDs en formato string para rápida exclusión
        var excludedIds = new HashSet<string>(swipedBookGuids, StringComparer.OrdinalIgnoreCase);
        foreach (var myGuid in myBookGuids)
        {
            excludedIds.Add(myGuid.ToString("D"));
        }
        foreach (var unavId in unavailableBookIds)
        {
            excludedIds.Add(unavId);
        }
        foreach (var resId in reservedByOthersGuids)
        {
            excludedIds.Add(resId);
        }

        var resultList = new List<BookDto>();

        // ETAPA 1: Obtener libros que coinciden con las preferencias del usuario
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

                var prefCandidateLimit = Math.Max(limit * 2, 75);

                var prefProducts = await _ecolecturaDbContext.Productos
                    .AsNoTracking()
                    .Where(p => p.Activo && p.Stock > 0)
                    .Where(p => (p.IdCategoriaProducto.HasValue && categoryOnlyIds.Contains(p.IdCategoriaProducto.Value)) ||
                                (p.IdSubcategoria.HasValue && subcategoryIds.Contains(p.IdSubcategoria.Value)))
                    .OrderBy(p => Guid.NewGuid())
                    .Select(p => new
                    {
                        p.IdProducto,
                        p.NombreLibro,
                        p.Autor,
                        p.Resena,
                        p.Precio,
                        p.IdCategoriaProducto,
                        p.IdSubcategoria,
                        p.IdEstadoProducto,
                        p.Activo,
                        p.Stock,
                        p.FechaRegistro,
                        RutaImagen = p.Imagenes
                            .OrderByDescending(i => i.Principal)
                            .Select(i => i.RutaImagen)
                            .FirstOrDefault()
                    })
                    .Take(prefCandidateLimit)
                    .ToListAsync(cancellationToken);

                // Aleatorizar el orden del grupo de candidatos para asegurar que cada usuario vea una secuencia única y variada
                var randomizedPrefProducts = prefProducts.OrderBy(_ => Random.Shared.Next()).ToList();

                foreach (var prod in randomizedPrefProducts)
                {
                    if (excludedIds.Contains(prod.IdProducto)) continue;

                    Guid bookId = Guid.TryParse(prod.IdProducto, out var parsedGuid) ? parsedGuid : Guid.Empty;
                    string? imageUrl = FormatImageUrl(prod.RutaImagen);
                    string? categoryName = _homologationService.GetConceptNameForProduct(
                        prod.IdCategoriaProducto,
                        prod.IdSubcategoria
                    );

                    var dto = new BookDto
                    {
                        Id = bookId,
                        Title = prod.NombreLibro,
                        Author = prod.Autor ?? "Desconocido",
                        Description = prod.Resena,
                        Condition = MapEstadoProducto(prod.IdEstadoProducto),
                        Category = categoryName,
                        ImageUrl = imageUrl,
                        BaseValue = prod.Precio ?? 0.00m,
                        IsInternalStock = true,
                        IsAvailable = prod.Activo && (prod.Stock > 0),
                        CreatedAt = prod.FechaRegistro ?? DateTime.UtcNow,
                        IsFallbackCategory = false
                    };

                    resultList.Add(dto);
                    excludedIds.Add(prod.IdProducto);

                    if (resultList.Count >= limit) break;
                }
            }
        }

        // ETAPA 2: Fallback si la sección preferida no tiene suficientes libros
        // Cargar libros de OTRAS SECCIONES / CATEGORÍAS no interactuadas para garantizar el límite
        if (resultList.Count < limit)
        {
            var remaining = limit - resultList.Count;
            var fallbackCandidateLimit = Math.Max(remaining * 2, 50);

            var fallbackProducts = await _ecolecturaDbContext.Productos
                .AsNoTracking()
                .Where(p => p.Activo && p.Stock > 0)
                .OrderBy(p => Guid.NewGuid())
                .Select(p => new
                {
                    p.IdProducto,
                    p.NombreLibro,
                    p.Autor,
                    p.Resena,
                    p.Precio,
                    p.IdCategoriaProducto,
                    p.IdSubcategoria,
                    p.IdEstadoProducto,
                    p.Activo,
                    p.Stock,
                    p.FechaRegistro,
                    RutaImagen = p.Imagenes
                        .OrderByDescending(i => i.Principal)
                        .Select(i => i.RutaImagen)
                        .FirstOrDefault()
                })
                .Take(fallbackCandidateLimit)
                .ToListAsync(cancellationToken);

            var randomizedFallbackProducts = fallbackProducts.OrderBy(_ => Random.Shared.Next()).ToList();

            foreach (var prod in randomizedFallbackProducts)
            {
                if (excludedIds.Contains(prod.IdProducto)) continue;

                Guid bookId = Guid.TryParse(prod.IdProducto, out var parsedGuid) ? parsedGuid : Guid.Empty;
                string? imageUrl = FormatImageUrl(prod.RutaImagen);
                string? categoryName = _homologationService.GetConceptNameForProduct(
                    prod.IdCategoriaProducto,
                    prod.IdSubcategoria
                );

                var dto = new BookDto
                {
                    Id = bookId,
                    Title = prod.NombreLibro,
                    Author = prod.Autor ?? "Desconocido",
                    Description = prod.Resena,
                    Condition = MapEstadoProducto(prod.IdEstadoProducto),
                    Category = categoryName,
                    ImageUrl = imageUrl,
                    BaseValue = prod.Precio ?? 0.00m,
                    IsInternalStock = true,
                    IsAvailable = prod.Activo && (prod.Stock > 0),
                    CreatedAt = prod.FechaRegistro ?? DateTime.UtcNow,
                    IsFallbackCategory = userPreferenceTags.Any()
                };

                resultList.Add(dto);
                excludedIds.Add(prod.IdProducto);

                if (resultList.Count >= limit) break;
            }
        }

        // ETAPA 3: Incluir también libros de la red de usuarios de Bookmachs (si hiciera falta completar)
        if (resultList.Count < limit)
        {
            var remaining = limit - resultList.Count;

            var localUserBooks = await _dbContext.Books
                .AsNoTracking()
                .Where(b => b.IsAvailable && b.OwnerId != userId && (!b.IsReserved || b.ReservedUntil < DateTime.UtcNow))
                .OrderBy(b => Guid.NewGuid())
                .Take(Math.Max(remaining * 2, 20))
                .ToListAsync(cancellationToken);

            var randomizedLocalUserBooks = localUserBooks.OrderBy(_ => Random.Shared.Next()).ToList();

            foreach (var book in randomizedLocalUserBooks)
            {
                var bookIdStr = book.Id.ToString("D");
                if (excludedIds.Contains(bookIdStr)) continue;

                var dto = MapToBookDto(book);
                dto.IsFallbackCategory = userPreferenceTags.Any();
                resultList.Add(dto);
                excludedIds.Add(bookIdStr);

                if (resultList.Count >= limit) break;
            }
        }

        return resultList;
    }

    public async Task<SwipeStatusDto> GetSwipeStatusAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var now = DateTime.UtcNow;
        bool userModified = false;

        if (UserCycleHelper.CheckAndApplySubscriptionExpiration(user, now))
        {
            userModified = true;
        }

        var cacheKey = $"swipes_consumed_{user.Id}";
        int consumed = 0;

        if (UserCycleHelper.CheckAndApplyMonthlySwipeReset(user, now))
        {
            consumed = 0;
            userModified = true;
            _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(30));
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
                _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(30));
            }
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int baseLimit = user.IsPremium ? (settings?.DailySwipeLimitPremium ?? 1000) : (settings?.DailySwipeLimitFree ?? 40);
        int effectiveLimit = baseLimit;

        if (!user.IsPremium)
        {
            effectiveLimit = baseLimit + user.BonusSwipesGranted;

            // Si el usuario alcanzó o superó su límite actual y aún no ha recibido los 50 adicionales
            if (consumed >= effectiveLimit)
            {
                if (user.BonusSwipesGranted < 50)
                {
                    if (user.LastBonusGrantedAt == null)
                    {
                        // Se agotó el límite por primera vez: iniciar contador de 24 horas
                        user.LastBonusGrantedAt = now;
                        userModified = true;
                    }
                    else
                    {
                        var elapsedHours = (now - user.LastBonusGrantedAt.Value).TotalHours;
                        if (elapsedHours >= 24)
                        {
                            // Transcurrieron 24 horas: otorgar 10 me gusta adicionales (hasta 50 de bono máx)
                            user.BonusSwipesGranted = Math.Min(50, user.BonusSwipesGranted + 10);
                            user.LastBonusGrantedAt = now;
                            userModified = true;
                            effectiveLimit = baseLimit + user.BonusSwipesGranted;
                        }
                    }
                }
            }
        }

        if (userModified)
        {
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new SwipeStatusDto
        {
            SwipesConsumed = consumed,
            SwipeLimit = effectiveLimit,
            LimitReached = consumed >= effectiveLimit
        };
    }

    public async Task<SwipeResultDto> SwipeBookAsync(Guid bookId, Guid userId, string action, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var now = DateTime.UtcNow;
        bool userModified = false;

        if (UserCycleHelper.CheckAndApplySubscriptionExpiration(user, now))
        {
            userModified = true;
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int baseLimit = user.IsPremium ? 1000 : 40;
        if (settings != null)
        {
            baseLimit = user.IsPremium ? settings.DailySwipeLimitPremium : settings.DailySwipeLimitFree;
        }

        var cacheKey = $"swipes_consumed_{user.Id}";
        int consumed = 0;

        if (UserCycleHelper.CheckAndApplyMonthlySwipeReset(user, now))
        {
            consumed = 0;
            userModified = true;
            _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(30));
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
                _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(30));
            }
        }

        int effectiveLimit = baseLimit;

        if (!user.IsPremium)
        {
            effectiveLimit = baseLimit + user.BonusSwipesGranted;

            // Verificar si aplica bono de 24 horas si ya estaba en el límite
            if (consumed >= effectiveLimit)
            {
                if (user.BonusSwipesGranted < 50)
                {
                    if (user.LastBonusGrantedAt == null)
                    {
                        user.LastBonusGrantedAt = now;
                        userModified = true;
                    }
                    else
                    {
                        var elapsedHours = (now - user.LastBonusGrantedAt.Value).TotalHours;
                        if (elapsedHours >= 24)
                        {
                            user.BonusSwipesGranted = Math.Min(50, user.BonusSwipesGranted + 10);
                            user.LastBonusGrantedAt = now;
                            userModified = true;
                            effectiveLimit = baseLimit + user.BonusSwipesGranted;
                        }
                    }
                }
            }
        }

        bool isLikeAction = action.Equals("like", StringComparison.OrdinalIgnoreCase);

        // Los swipes se descuentan únicamente cuando el usuario da "like" (me gusta a la derecha).
        // Los swipes a la izquierda (dislike) son infinitos en todos los planes.
        if (isLikeAction)
        {
            if (consumed >= effectiveLimit)
            {
                if (user.LastBonusGrantedAt == null && !user.IsPremium)
                {
                    user.LastBonusGrantedAt = now;
                    userModified = true;
                }

                if (userModified)
                {
                    _dbContext.Users.Update(user);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                return new SwipeResultDto
                {
                    Success = false,
                    SwipesConsumed = consumed,
                    SwipeLimit = effectiveLimit,
                    ErrorCode = "MonthlyLimitExceeded",
                    Message = "Has alcanzado tu límite de me gusta en el plan gratuito. Pásate a Premium para continuar explorando sin límites."
                };
            }

            consumed++;
            _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(30));
            user.DailySwipesConsumed = consumed;

            // Si al dar este like se alcanzó el límite vigente, guardar marca para contar las próximas 24h
            if (!user.IsPremium && consumed >= effectiveLimit && user.BonusSwipesGranted < 50)
            {
                user.LastBonusGrantedAt = now;
            }

            userModified = true;
        }

        if (userModified)
        {
            _dbContext.Users.Update(user);
        }

        bool isMatch = false;
        Guid? matchTransactionId = null;

        if (isLikeAction)
        {
            var book = await EnsureBookExistsLocallyAsync(bookId, cancellationToken);
            bool isReservedByOther = book != null && book.IsReserved && book.ReservedUntil >= DateTime.UtcNow && book.ReservedByUserId != user.Id;

            if (book != null && book.IsAvailable && !isReservedByOther)
            {
                isMatch = true;

                var existingMatch = await _dbContext.MatchTransactions
                    .FirstOrDefaultAsync(t => t.RequesterUserId == user.Id && t.BookId == book.Id, cancellationToken);

                if (existingMatch != null)
                {
                    matchTransactionId = existingMatch.Id;
                }
                else
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
            SwipeLimit = effectiveLimit,
            Message = isMatch ? "¡Match logrado!" : "Swipe registrado con éxito.",
            IsMatch = isMatch,
            MatchTransactionId = matchTransactionId
        };
    }

    public async Task<SwipeStatusDto> UndoSwipeAsync(Guid userId, Guid? bookId = null, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        if (!user.IsPremium)
        {
            throw new InvalidOperationException("La opción de regresar al libro anterior es una funcionalidad exclusiva del Plan Premium.");
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int baseLimit = user.IsPremium ? 1000 : 40;
        if (settings != null)
        {
            baseLimit = user.IsPremium ? settings.DailySwipeLimitPremium : settings.DailySwipeLimitFree;
        }

        int effectiveLimit = baseLimit;
        if (!user.IsPremium)
        {
            effectiveLimit = baseLimit + user.BonusSwipesGranted;
        }

        // Buscar la interacción correspondiente
        UserBookInteraction? interaction = null;
        if (bookId.HasValue && bookId.Value != Guid.Empty)
        {
            string bookIdStr = bookId.Value.ToString();
            interaction = await _dbContext.UserBookInteractions
                .FirstOrDefaultAsync(i => i.UserId == userId && i.BookId == bookIdStr, cancellationToken);
        }

        if (interaction == null)
        {
            interaction = await _dbContext.UserBookInteractions
                .Where(i => i.UserId == userId)
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        int consumed = user.DailySwipesConsumed;
        var cacheKey = $"swipes_consumed_{user.Id}";
        var cachedSwipes = _cacheService.Get<int?>(cacheKey);
        if (cachedSwipes.HasValue)
        {
            consumed = cachedSwipes.Value;
        }

        if (interaction != null)
        {
            // Si la acción deshecha fue "like", decrementar el contador de swipes consumidos
            if (string.Equals(interaction.Action, "like", StringComparison.OrdinalIgnoreCase))
            {
                consumed = Math.Max(0, consumed - 1);
                user.DailySwipesConsumed = Math.Max(0, user.DailySwipesConsumed - 1);
                _dbContext.Users.Update(user);
                _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(30));

                // Cancelar/Eliminar transacción de match en estado pendiente si existía
                if (Guid.TryParse(interaction.BookId, out var targetBookId))
                {
                    var pendingMatch = await _dbContext.MatchTransactions
                        .FirstOrDefaultAsync(t => t.RequesterUserId == userId && t.BookId == targetBookId && t.PaymentStatus == "Pending", cancellationToken);
                    if (pendingMatch != null)
                    {
                        _dbContext.MatchTransactions.Remove(pendingMatch);
                    }
                }
            }

            // Eliminar la interacción de la BD para habilitar de nuevo el libro
            _dbContext.UserBookInteractions.Remove(interaction);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new SwipeStatusDto
        {
            SwipesConsumed = consumed,
            SwipeLimit = effectiveLimit,
            LimitReached = consumed >= effectiveLimit
        };
    }

    public async Task<CatalogSearchStatusDto> GetCatalogSearchStatusAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var now = DateTime.UtcNow;
        bool userModified = false;
        if (UserCycleHelper.CheckAndApplySubscriptionExpiration(user, now))
        {
            userModified = true;
        }
        if (UserCycleHelper.CheckAndApplyMonthlySwipeReset(user, now))
        {
            userModified = true;
        }
        if (userModified)
        {
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int searchLimit = (settings != null && settings.CatalogSearchLimitPremium > 0) ? settings.CatalogSearchLimitPremium : 10;

        return new CatalogSearchStatusDto
        {
            SearchesConsumed = user.CatalogSearchesConsumed,
            SearchLimit = searchLimit
        };
    }

    public async Task<PaginatedListDto<BookDto>> GetCatalogAsync(Guid userId, string? searchTerm, string? category, string? condition, int pageNumber, int pageSize, string? sortBy, bool isNewlyArrived = false, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var now = DateTime.UtcNow;
        bool userModified = false;
        if (UserCycleHelper.CheckAndApplySubscriptionExpiration(user, now))
        {
            userModified = true;
        }
        if (UserCycleHelper.CheckAndApplyMonthlySwipeReset(user, now))
        {
            userModified = true;
        }
        if (userModified)
        {
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (!user.IsPremium)
        {
            throw new UnauthorizedAccessException("Se requiere una membresía Premium para acceder al catálogo avanzado.");
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        int searchLimit = (settings != null && settings.CatalogSearchLimitPremium > 0) ? settings.CatalogSearchLimitPremium : 10;

        // Validar si el usuario alcanzó el límite de búsquedas configurado
        if (user.CatalogSearchesConsumed >= searchLimit)
        {
            throw new InvalidOperationException($"Has alcanzado el límite de {searchLimit} búsquedas en el catálogo para tu plan Premium en el periodo actual.");
        }

        // Si es una consulta de página 1 (nueva búsqueda/filtro), incrementar el contador
        if (pageNumber <= 1)
        {
            user.CatalogSearchesConsumed++;
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
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
            // Las categorías pueden venir separadas por '|' para evitar romper nombres que contienen comas (ej. "Ciencia, Tecnología y Medicina")
            string[] rawCategories;
            if (category.Contains('|'))
            {
                rawCategories = category.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            }
            else
            {
                // Si no contiene '|', verificar si la cadena completa coincide exactamente con un concepto conocido
                var allConcepts = _homologationService.GetAllConcepts();
                bool matchesExactConcept = allConcepts.Any(c => string.Equals(c.ConceptName, category.Trim(), StringComparison.OrdinalIgnoreCase));
                if (matchesExactConcept)
                {
                    rawCategories = new[] { category.Trim() };
                }
                else
                {
                    rawCategories = category.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                }
            }

            if (rawCategories.Length > 0)
            {
                var mappedItems = _homologationService.GetMappedItemsForConcepts(rawCategories);
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

                var parameter = Expression.Parameter(typeof(EcolecturaProducto), "p");
                Expression? combinedCategoryFilter = null;

                if (categoryOnlyIds.Count > 0)
                {
                    var idCatProp = Expression.Property(parameter, nameof(EcolecturaProducto.IdCategoriaProducto));
                    var hasValue = Expression.Property(idCatProp, "HasValue");
                    var val = Expression.Property(idCatProp, "Value");
                    var containsMethod = typeof(List<int>).GetMethod("Contains", new[] { typeof(int) })!;
                    var idsConst = Expression.Constant(categoryOnlyIds);
                    var containsExpr = Expression.Call(idsConst, containsMethod, val);
                    var catIdMatch = Expression.AndAlso(hasValue, containsExpr);

                    combinedCategoryFilter = catIdMatch;
                }

                if (subcategoryIds.Count > 0)
                {
                    var idSubProp = Expression.Property(parameter, nameof(EcolecturaProducto.IdSubcategoria));
                    var hasValue = Expression.Property(idSubProp, "HasValue");
                    var val = Expression.Property(idSubProp, "Value");
                    var containsMethod = typeof(List<int>).GetMethod("Contains", new[] { typeof(int) })!;
                    var idsConst = Expression.Constant(subcategoryIds);
                    var containsExpr = Expression.Call(idsConst, containsMethod, val);
                    var subIdMatch = Expression.AndAlso(hasValue, containsExpr);

                    combinedCategoryFilter = combinedCategoryFilter == null
                        ? subIdMatch
                        : Expression.OrElse(combinedCategoryFilter, subIdMatch);
                }

                if (combinedCategoryFilter != null)
                {
                    var lambda = Expression.Lambda<Func<EcolecturaProducto, bool>>(combinedCategoryFilter, parameter);
                    query = query.Where(lambda);
                }
                else
                {
                    // Si ninguna categoría seleccionada tiene mapeos válidos en la homologación dinámica, no devolver resultados
                    query = query.Where(p => false);
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(condition))
        {
            var conditionList = condition.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(c => c.ToLower())
                .ToList();

            var targetStateIds = new List<int>();
            foreach (var cond in conditionList)
            {
                if (cond == "excelente" || cond == "nuevo") targetStateIds.Add(4);
                else if (cond == "muy bueno") targetStateIds.Add(5);
                else if (cond == "bueno") targetStateIds.Add(1);
                else if (cond == "aceptable" || cond == "normal") targetStateIds.Add(2);
                else if (cond == "desgastado" || cond == "reliquia" || cond == "reliquias") targetStateIds.Add(7);
            }

            if (targetStateIds.Count > 0)
            {
                query = query.Where(p => p.IdEstadoProducto.HasValue && targetStateIds.Contains(p.IdEstadoProducto.Value));
            }
        }

        if (isNewlyArrived)
        {
            query = query.OrderByDescending(p => p.FechaRegistro).Take(200);
        }
        else
        {
            query = sortBy?.ToLower() switch
            {
                "title" => query.OrderBy(p => p.NombreLibro),
                "basevalue" => query.OrderBy(p => p.Precio ?? 0),
                "createdat" => query.OrderByDescending(p => p.FechaRegistro),
                _ => query.OrderByDescending(p => p.FechaRegistro)
            };
        }

        int totalCount = await query.CountAsync(cancellationToken);
        int page = pageNumber > 0 ? pageNumber : 1;
        int size = pageSize > 0 ? pageSize : 10;

        var items = await query
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapEcolecturaProductToBookDto).ToList();

        var response = new PaginatedListDto<BookDto>(dtos, page, size, totalCount)
        {
            SearchesConsumed = user.CatalogSearchesConsumed,
            SearchLimit = searchLimit
        };

        return response;
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

        // Si el origen del libro es de Ecolectura, descontar stock de la base de datos de Ecolectura y registrar AjusteInventario
        if (book.IsInternalStock)
        {
            var product = await _ecolecturaDbContext.Productos
                .FirstOrDefaultAsync(p => p.IdProducto == book.Id.ToString(), cancellationToken);

            if (product == null || (product.Stock ?? 0) <= 0)
            {
                throw new InvalidOperationException("El libro no cuenta con stock disponible en Ecolectura para ser reservado.");
            }

            int stockAnterior = product.Stock ?? 0;
            int nuevoStock = stockAnterior - 1;
            product.Stock = nuevoStock;

            // IMPORTANTE: Según instrucciones directas, no se modifica product.Activo
            _ecolecturaDbContext.Productos.Update(product);

            var adjustment = new EcolecturaAjusteInventario
            {
                IdProducto = product.IdProducto,
                PrecioAnterior = product.Precio ?? 0.00m,
                StockAnterior = stockAnterior,
                UbicacionAnterior = (product.Ubicacion ?? "No especificada").Length > 100 
                    ? (product.Ubicacion ?? "No especificada")[..100] 
                    : (product.Ubicacion ?? "No especificada"),
                EstadoAnterior = product.Activo,
                PrecioActualizacion = product.Precio ?? 0.00m,
                StockActualizacion = nuevoStock,
                UbicacionActualizacion = (product.Ubicacion ?? "No especificada").Length > 100 
                    ? (product.Ubicacion ?? "No especificada")[..100] 
                    : (product.Ubicacion ?? "No especificada"),
                EstadoActual = product.Activo,
                IdUsuario = null,
                FechaActualizacion = DateTime.UtcNow,
                Justificacion = $"Reserva de libro por 48 horas en Bookmachs. Usuario: {user.Email ?? userId.ToString()}. Libro ID: {book.Id}."
            };

            await _ecolecturaDbContext.AjustesInventario.AddAsync(adjustment, cancellationToken);
            await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);
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

        // Si es stock interno de Ecolectura, restituir stock a Ecolectura y registrar AjusteInventario
        if (book.IsInternalStock)
        {
            var product = await _ecolecturaDbContext.Productos
                .FirstOrDefaultAsync(p => p.IdProducto == book.Id.ToString(), cancellationToken);

            if (product != null)
            {
                int stockAnterior = product.Stock ?? 0;
                int nuevoStock = stockAnterior + 1;
                product.Stock = nuevoStock;

                // IMPORTANTE: Según instrucciones directas, no se modifica product.Activo
                _ecolecturaDbContext.Productos.Update(product);

                var adjustment = new EcolecturaAjusteInventario
                {
                    IdProducto = product.IdProducto,
                    PrecioAnterior = product.Precio ?? 0.00m,
                    StockAnterior = stockAnterior,
                    UbicacionAnterior = (product.Ubicacion ?? "No especificada").Length > 100 
                        ? (product.Ubicacion ?? "No especificada")[..100] 
                        : (product.Ubicacion ?? "No especificada"),
                    EstadoAnterior = product.Activo,
                    PrecioActualizacion = product.Precio ?? 0.00m,
                    StockActualizacion = nuevoStock,
                    UbicacionActualizacion = (product.Ubicacion ?? "No especificada").Length > 100 
                        ? (product.Ubicacion ?? "No especificada")[..100] 
                        : (product.Ubicacion ?? "No especificada"),
                    EstadoActual = product.Activo,
                    IdUsuario = null,
                    FechaActualizacion = DateTime.UtcNow,
                    Justificacion = $"Restitución de stock por cancelación voluntaria de reserva en Bookmachs. Usuario: {userId}. Libro ID: {book.Id}."
                };

                await _ecolecturaDbContext.AjustesInventario.AddAsync(adjustment, cancellationToken);
                await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);
            }
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

    public async Task<IEnumerable<BookDto>> GetMyReservationsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var activeReservations = await _dbContext.Books
            .Where(b => b.IsReserved && b.ReservedByUserId == userId && b.ReservedUntil > DateTime.UtcNow)
            .OrderByDescending(b => b.ReservedUntil)
            .ToListAsync(cancellationToken);

        return activeReservations.Select(MapToBookDto);
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
            ExchangeStatus = b.IsAvailable ? "Available" : "Unavailable",
            IsDoubleExchangeCommitment = b.IsDoubleExchangeCommitment,
            DoubleExchangeCommitmentUntil = b.DoubleExchangeCommitmentUntil,
            CreatedAt = b.CreatedAt
        };
    }

    public async Task<bool> DeleteBookAsync(Guid bookId, Guid userId, CancellationToken cancellationToken = default)
    {
        var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId && b.OwnerId == userId, cancellationToken);
        if (book == null)
        {
            throw new KeyNotFoundException("El libro no existe o no pertenece a tu libreta.");
        }

        if (book.IsDoubleExchangeCommitment && book.DoubleExchangeCommitmentUntil.HasValue && book.DoubleExchangeCommitmentUntil.Value > DateTime.UtcNow)
        {
            var unlockDate = book.DoubleExchangeCommitmentUntil.Value.ToString("dd/MM/yyyy");
            throw new InvalidOperationException($"Este libro está sujeto al compromiso de Intercambio Doble y no puede ser eliminado de tu libreta hasta el {unlockDate} (plazo mínimo de 6 meses).");
        }

        bool hasActiveTx = await _dbContext.MatchTransactions.AnyAsync(t => 
            (t.BookId == bookId || t.OfferedBookId == bookId) &&
            (t.PaymentStatus == "Hold" || t.PaymentStatus == "Captured" || t.LogisticsStatus == "En Espera" || t.LogisticsStatus == "InTransit" || t.LogisticsStatus == "Pendiente Comprobante"), 
            cancellationToken);

        if (hasActiveTx)
        {
            throw new InvalidOperationException("No puedes eliminar un libro que tiene un intercambio en proceso.");
        }

        _dbContext.Books.Remove(book);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
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
            Condition = MapEstadoProducto(product.IdEstadoProducto),
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
            Condition = MapEstadoProducto(product.IdEstadoProducto),
            Category = categoryName,
            ImageUrl = imageUrl,
            BaseValue = product.Precio ?? 0.00m,
            IsInternalStock = true,
            IsAvailable = product.Activo && (product.Stock > 0),
            ExchangeStatus = (product.Activo && (product.Stock > 0)) ? "Available" : "Unavailable",
            CreatedAt = product.FechaRegistro ?? DateTime.UtcNow
        };
    }

    public static string MapEstadoProducto(int? idEstadoProducto)
    {
        return idEstadoProducto switch
        {
            4 => "Excelente",   // Nuevo en Ecolectura
            5 => "Muy bueno",   // Muy bueno en Ecolectura
            1 => "Bueno",       // Bueno en Ecolectura
            2 => "Aceptable",   // Normal en Ecolectura
            7 => "Reliquia",    // Reliquias en Ecolectura
            _ => "Bueno"
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

        // Si es un archivo de portada o avatar subido localmente por el usuario (ej: /books/cover/... o /uploads/...)
        if (rutaImagen.StartsWith("/books/cover/", StringComparison.OrdinalIgnoreCase) ||
            rutaImagen.StartsWith("books/cover/", StringComparison.OrdinalIgnoreCase) ||
            rutaImagen.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) ||
            rutaImagen.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return "/" + rutaImagen.TrimStart('/');
        }

        // Si es una ruta relativa de Ecolectura, anteponer el dominio www.ecolectura.cl
        var cleanPath = rutaImagen.TrimStart('~').TrimStart('/');
        return $"https://www.ecolectura.cl/{cleanPath}";
    }
}
