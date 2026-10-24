using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Bookmachs.Refactored.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize(Roles = "Admin")]
public class AdminDashboardController : ControllerBase
{
    private readonly BookmachsDbContext _dbContext;
    private readonly ISendGridEmailService _emailService;

    public AdminDashboardController(BookmachsDbContext dbContext, ISendGridEmailService emailService)
    {
        _dbContext = dbContext;
        _emailService = emailService;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<AdminDashboardStatsDto>> GetDashboardStats(
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        CancellationToken cancellationToken)
    {
        DateTime parsedStart;
        DateTime parsedEnd;

        // Si no se especifican fechas, rango por defecto: inicio del mes en curso hasta el final del día actual
        var now = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var s))
        {
            parsedStart = s;
        }
        else
        {
            parsedStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        }

        if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var e))
        {
            parsedEnd = e.Date.AddDays(1).AddTicks(-1);
        }
        else
        {
            parsedEnd = now.Date.AddDays(1).AddTicks(-1);
        }

        // 1. Métricas de Usuarios
        var totalUsers = await _dbContext.Users.CountAsync(cancellationToken);
        var premiumUsers = await _dbContext.Users.CountAsync(u => u.IsPremium, cancellationToken);
        var freeUsers = totalUsers - premiumUsers;
        var newUsersInPeriod = await _dbContext.Users
            .CountAsync(u => u.CreatedAt >= parsedStart && u.CreatedAt <= parsedEnd, cancellationToken);

        // 2. Venta Fee Intercambios (MatchTransactions pagadas/capturadas dentro del periodo)
        var feeTxs = await _dbContext.MatchTransactions
            .AsNoTracking()
            .Where(t => t.CreatedAt >= parsedStart && t.CreatedAt <= parsedEnd &&
                       (t.PaymentStatus == "Captured" || t.PaymentStatus == "Hold" || t.PaymentStatus == "Completed"))
            .ToListAsync(cancellationToken);

        decimal exchangeFeeSales = feeTxs.Sum(t => t.FeeAmount);

        // 3. Venta Upgrade Premium (Suscripciones generadas en el periodo)
        var premiumSubs = await _dbContext.Subscriptions
            .AsNoTracking()
            .Where(s => s.CreatedAt >= parsedStart && s.CreatedAt <= parsedEnd && (s.IsActive || s.Price > 0))
            .ToListAsync(cancellationToken);

        decimal premiumUpgradeSales = premiumSubs.Sum(s => s.Price);

        // 4. Venta Pack Swipes (Por ahora 0, preparado para cuando se compren paquetes de swipes adicionales)
        decimal swipePackSales = 0m;

        // 5. Venta Total
        decimal totalSales = exchangeFeeSales + premiumUpgradeSales + swipePackSales;

        // 6. Contadores de Intercambios en el periodo
        var periodTxs = await _dbContext.MatchTransactions
            .AsNoTracking()
            .Where(t => t.CreatedAt >= parsedStart && t.CreatedAt <= parsedEnd)
            .ToListAsync(cancellationToken);

        int totalOrdersCount = periodTxs.Count;
        int completedOrdersCount = periodTxs.Count(t => t.LogisticsStatus == "Delivered");
        int pendingOrdersCount = periodTxs.Count(t => t.LogisticsStatus != "Delivered" && t.LogisticsStatus != "Cancelled");

        // 7. Desglose Diario de Ventas para Gráfico / Reportes
        var salesByDayDict = new Dictionary<string, DailySalesItemDto>();
        for (var day = parsedStart.Date; day <= parsedEnd.Date; day = day.AddDays(1))
        {
            var key = day.ToString("yyyy-MM-dd");
            salesByDayDict[key] = new DailySalesItemDto
            {
                Date = key,
                FeeSales = 0m,
                SubscriptionSales = 0m,
                PackSales = 0m,
                TotalSales = 0m,
                OrderCount = 0
            };
        }

        foreach (var tx in feeTxs)
        {
            var dayKey = tx.CreatedAt.ToString("yyyy-MM-dd");
            if (salesByDayDict.TryGetValue(dayKey, out var item))
            {
                item.FeeSales += tx.FeeAmount;
                item.TotalSales += tx.FeeAmount;
                item.OrderCount++;
            }
        }

        foreach (var sub in premiumSubs)
        {
            var dayKey = sub.CreatedAt.ToString("yyyy-MM-dd");
            if (salesByDayDict.TryGetValue(dayKey, out var item))
            {
                item.SubscriptionSales += sub.Price;
                item.TotalSales += sub.Price;
            }
        }

        return Ok(new AdminDashboardStatsDto
        {
            TotalUsers = totalUsers,
            FreeUsers = freeUsers,
            PremiumUsers = premiumUsers,
            NewUsersInPeriod = newUsersInPeriod,
            ExchangeFeeSales = exchangeFeeSales,
            SwipePackSales = swipePackSales,
            PremiumUpgradeSales = premiumUpgradeSales,
            TotalSales = totalSales,
            TotalOrdersCount = totalOrdersCount,
            CompletedOrdersCount = completedOrdersCount,
            PendingOrdersCount = pendingOrdersCount,
            StartDate = parsedStart.ToString("yyyy-MM-dd"),
            EndDate = parsedEnd.ToString("yyyy-MM-dd"),
            SalesByDay = salesByDayDict.Values.OrderBy(v => v.Date).ToList()
        });
    }

    [HttpGet("orders")]
    public async Task<ActionResult<IEnumerable<AdminOrderDto>>> GetOrders(
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.MatchTransactions
            .Include(t => t.RequesterUser)
            .Include(t => t.OwnerUser)
            .Include(t => t.Book)
            .Include(t => t.OfferedBook)
            .AsNoTracking()
            .AsQueryable();

        // Filtro de Fechas
        if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var s))
        {
            query = query.Where(t => t.CreatedAt >= s);
        }
        if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal, out var e))
        {
            var endOfDay = e.Date.AddDays(1).AddTicks(-1);
            query = query.Where(t => t.CreatedAt <= endOfDay);
        }

        // Filtro por Estado
        if (!string.IsNullOrEmpty(status) && status.ToLower() != "all")
        {
            var sLower = status.ToLower();
            if (sLower == "delivered" || sLower == "completado")
                query = query.Where(t => t.LogisticsStatus == "Delivered");
            else if (sLower == "intransit" || sLower == "despachado")
                query = query.Where(t => t.LogisticsStatus == "InTransit" || t.LogisticsStatus == "Despachado");
            else if (sLower == "waiting" || sLower == "en espera")
                query = query.Where(t => t.LogisticsStatus == "En Espera" || t.LogisticsStatus == "Pendiente Comprobante");
            else if (sLower == "pending_payment" || sLower == "pendiente de pago")
                query = query.Where(t => t.PaymentStatus == "Pending");
            else if (sLower == "paid" || sLower == "pagado")
                query = query.Where(t => t.PaymentStatus == "Captured" || t.PaymentStatus == "Hold" || t.PaymentStatus == "Completed");
            else
                query = query.Where(t => t.LogisticsStatus == status);
        }

        // Búsqueda por texto (Nombre usuario, correo, RUT, teléfono, título libro, buyOrder)
        if (!string.IsNullOrEmpty(search))
        {
            var q = search.Trim().ToLower();
            query = query.Where(t =>
                (t.BuyOrder != null && t.BuyOrder.ToLower().Contains(q)) ||
                (t.RequesterUser.Name != null && t.RequesterUser.Name.ToLower().Contains(q)) ||
                (t.RequesterUser.Email != null && t.RequesterUser.Email.ToLower().Contains(q)) ||
                (t.RequesterUser.DocumentoIdentidad != null && t.RequesterUser.DocumentoIdentidad.ToLower().Contains(q)) ||
                (t.RequesterUser.Telefono != null && t.RequesterUser.Telefono.ToLower().Contains(q)) ||
                (t.Book.Title != null && t.Book.Title.ToLower().Contains(q)) ||
                (t.TrackingNumber != null && t.TrackingNumber.ToLower().Contains(q)) ||
                (t.ShippingCity != null && t.ShippingCity.ToLower().Contains(q))
            );
        }

        var list = await query
            .OrderByDescending(t => t.CreatedAt)
            .Take(150)
            .ToListAsync(cancellationToken);

        // Buscar reviews de TimelineEvent si existen
        var txIds = list.Select(t => t.Id).ToList();
        var reviews = await _dbContext.TimelineEvents
            .AsNoTracking()
            .Where(e => txIds.Contains(e.MatchTransactionId) && e.ReviewRating.HasValue)
            .ToDictionaryAsync(e => e.MatchTransactionId, e => new AdminOrderReviewDto
            {
                Rating = e.ReviewRating,
                Comment = e.ReviewComment,
                CreatedAt = e.CreatedAt
            }, cancellationToken);

        var result = list.Select(t =>
        {
            reviews.TryGetValue(t.Id, out var review);

            return new AdminOrderDto
            {
                Id = t.Id,
                BuyOrder = t.BuyOrder ?? t.Id.ToString()[..8].ToUpper(),
                CreatedAt = t.CreatedAt,
                StatusUpdatedAt = t.StatusUpdatedAt,
                FeeAmount = t.FeeAmount,
                PaymentStatus = t.PaymentStatus,
                LogisticsStatus = t.LogisticsStatus,
                LogisticsMethod = t.LogisticsMethod ?? "Presencial",
                ShippingAddress = t.ShippingAddress ?? (t.LogisticsMethod == "Presencial" ? "Patronato 447, Recoleta, Santiago, Chile" : "No especificada"),
                ShippingCity = t.ShippingCity ?? (t.LogisticsMethod == "Presencial" ? "Recoleta" : "Santiago"),
                ShippingRegion = t.ShippingRegion ?? "Región Metropolitana",
                TrackingNumber = t.TrackingNumber,
                CourierName = t.CourierName,
                AdminNotes = t.AdminNotes,
                PostSaleStatus = t.PostSaleStatus ?? (t.LogisticsStatus == "Delivered" ? "Completado Conforme" : "Pendiente"),
                PostSaleNotes = t.PostSaleNotes,
                Requester = new AdminOrderUserDto
                {
                    Id = t.RequesterUser?.Id ?? Guid.Empty,
                    Name = t.RequesterUser?.Name ?? "Desconocido",
                    Email = t.RequesterUser?.Email ?? "Sin correo",
                    Telefono = t.RequesterUser?.Telefono ?? "Sin teléfono",
                    DocumentoIdentidad = t.RequesterUser?.DocumentoIdentidad ?? "Sin RUT",
                    Pais = t.RequesterUser?.Pais ?? "Chile",
                    IsPremium = t.RequesterUser?.IsPremium ?? false
                },
                Owner = t.OwnerUser != null ? new AdminOrderUserDto
                {
                    Id = t.OwnerUser.Id,
                    Name = t.OwnerUser.Name,
                    Email = t.OwnerUser.Email,
                    Telefono = t.OwnerUser.Telefono ?? "Sin teléfono",
                    DocumentoIdentidad = t.OwnerUser.DocumentoIdentidad ?? "Sin RUT",
                    Pais = t.OwnerUser.Pais ?? "Chile",
                    IsPremium = t.OwnerUser.IsPremium
                } : null,
                RequestedBook = new AdminOrderBookDto
                {
                    Id = t.Book?.Id ?? Guid.Empty,
                    Title = t.Book?.Title ?? "Libro solicitado",
                    Author = t.Book?.Author ?? "Desconocido",
                    Condition = t.Book?.Condition ?? "Bueno",
                    ImageUrl = BookService.FormatImageUrl(t.Book?.ImageUrl) ?? string.Empty,
                    IsInternalStock = t.Book?.IsInternalStock ?? false
                },
                OfferedBook = t.OfferedBook != null ? new AdminOrderBookDto
                {
                    Id = t.OfferedBook.Id,
                    Title = t.OfferedBook.Title,
                    Author = t.OfferedBook.Author,
                    Condition = t.OfferedBook.Condition ?? "Bueno",
                    ImageUrl = BookService.FormatImageUrl(t.OfferedBook.ImageUrl) ?? string.Empty,
                    IsInternalStock = false
                } : null,
                Review = review
            };
        });

        return Ok(result);
    }

    [HttpPut("orders/{id}/process")]
    public async Task<ActionResult<AdminOrderDto>> ProcessOrder(
        Guid id,
        [FromBody] ProcessOrderRequest request,
        CancellationToken cancellationToken)
    {
        var tx = await _dbContext.MatchTransactions
            .Include(t => t.RequesterUser)
            .Include(t => t.Book)
            .Include(t => t.OfferedBook)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (tx == null)
        {
            return NotFound(new { message = $"Intercambio/Pedido #{id} no encontrado." });
        }

        if (!string.IsNullOrEmpty(request.LogisticsStatus))
        {
            tx.LogisticsStatus = request.LogisticsStatus;
        }

        if (request.TrackingNumber != null)
        {
            tx.TrackingNumber = request.TrackingNumber;
        }

        if (request.CourierName != null)
        {
            tx.CourierName = request.CourierName;
        }

        if (request.ShippingAddress != null)
        {
            tx.ShippingAddress = request.ShippingAddress;
        }

        if (request.ShippingCity != null)
        {
            tx.ShippingCity = request.ShippingCity;
        }

        if (request.ShippingRegion != null)
        {
            tx.ShippingRegion = request.ShippingRegion;
        }

        if (request.AdminNotes != null)
        {
            tx.AdminNotes = request.AdminNotes;
        }

        tx.StatusUpdatedAt = DateTime.UtcNow;

        // Si se marca como entregado/completado:
        if (request.LogisticsStatus == "Delivered")
        {
            if (tx.Book != null)
            {
                tx.Book.IsAvailable = false;
                _dbContext.Books.Update(tx.Book);
            }

            // Notificación por correo al usuario
            _ = Task.Run(async () =>
            {
                try
                {
                    if (tx.RequesterUser?.Email != null)
                    {
                        await _emailService.SendExchangeCompletedEmailAsync(tx.RequesterUser.Email, new ExchangeCompletedEmailData
                        {
                            UserName = tx.RequesterUser.Name ?? "Lector",
                            BookReceivedTitle = tx.Book?.Title ?? "Libro Seleccionado",
                            BookOfferedTitle = tx.OfferedBook?.Title ?? "Libro Ofrecido",
                            CompletedDate = DateTime.UtcNow.ToString("dd/MM/yyyy"),
                            SocialTimelineUrl = "https://www.intercambialibros.cl/social"
                        });
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AdminDashboardController] Error al enviar correo de entrega: {ex.Message}");
                }
            });
        }

        _dbContext.MatchTransactions.Update(tx);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "Pedido procesado y actualizado con éxito." });
    }

    [HttpPut("orders/{id}/post-sale")]
    public async Task<ActionResult> UpdatePostSale(
        Guid id,
        [FromBody] UpdatePostSaleRequest request,
        CancellationToken cancellationToken)
    {
        var tx = await _dbContext.MatchTransactions.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tx == null)
        {
            return NotFound(new { message = $"Pedido #{id} no encontrado." });
        }

        if (!string.IsNullOrEmpty(request.PostSaleStatus))
        {
            tx.PostSaleStatus = request.PostSaleStatus;
        }

        if (request.PostSaleNotes != null)
        {
            tx.PostSaleNotes = request.PostSaleNotes;
        }

        tx.StatusUpdatedAt = DateTime.UtcNow;
        _dbContext.MatchTransactions.Update(tx);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "Registro de post venta actualizado con éxito." });
    }
}

// DTOs
public class AdminDashboardStatsDto
{
    public int TotalUsers { get; set; }
    public int FreeUsers { get; set; }
    public int PremiumUsers { get; set; }
    public int NewUsersInPeriod { get; set; }
    public decimal ExchangeFeeSales { get; set; }
    public decimal SwipePackSales { get; set; }
    public decimal PremiumUpgradeSales { get; set; }
    public decimal TotalSales { get; set; }
    public int TotalOrdersCount { get; set; }
    public int CompletedOrdersCount { get; set; }
    public int PendingOrdersCount { get; set; }
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public List<DailySalesItemDto> SalesByDay { get; set; } = new();
}

public class DailySalesItemDto
{
    public string Date { get; set; } = string.Empty;
    public decimal FeeSales { get; set; }
    public decimal SubscriptionSales { get; set; }
    public decimal PackSales { get; set; }
    public decimal TotalSales { get; set; }
    public int OrderCount { get; set; }
}

public class AdminOrderDto
{
    public Guid Id { get; set; }
    public string BuyOrder { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime StatusUpdatedAt { get; set; }
    public decimal FeeAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string LogisticsStatus { get; set; } = string.Empty;
    public string LogisticsMethod { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;
    public string ShippingCity { get; set; } = string.Empty;
    public string ShippingRegion { get; set; } = string.Empty;
    public string? TrackingNumber { get; set; }
    public string? CourierName { get; set; }
    public string? AdminNotes { get; set; }
    public string PostSaleStatus { get; set; } = string.Empty;
    public string? PostSaleNotes { get; set; }
    public AdminOrderUserDto Requester { get; set; } = null!;
    public AdminOrderUserDto? Owner { get; set; }
    public AdminOrderBookDto RequestedBook { get; set; } = null!;
    public AdminOrderBookDto? OfferedBook { get; set; }
    public AdminOrderReviewDto? Review { get; set; }
}

public class AdminOrderUserDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Telefono { get; set; } = string.Empty;
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public bool IsPremium { get; set; }
}

public class AdminOrderBookDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string Condition { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsInternalStock { get; set; }
}

public class AdminOrderReviewDto
{
    public int? Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProcessOrderRequest
{
    public string LogisticsStatus { get; set; } = string.Empty;
    public string? TrackingNumber { get; set; }
    public string? CourierName { get; set; }
    public string? ShippingAddress { get; set; }
    public string? ShippingCity { get; set; }
    public string? ShippingRegion { get; set; }
    public string? AdminNotes { get; set; }
}

public class UpdatePostSaleRequest
{
    public string PostSaleStatus { get; set; } = string.Empty;
    public string? PostSaleNotes { get; set; }
}
