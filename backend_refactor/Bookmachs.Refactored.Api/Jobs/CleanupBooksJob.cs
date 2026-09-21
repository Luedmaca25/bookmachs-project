using System;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Bookmachs.Refactored.Api.Jobs;

public class CleanupBooksJob
{
    private readonly BookmachsDbContext _dbContext;
    private readonly EcolecturaDbContext _ecolecturaDbContext;
    private readonly ILogger<CleanupBooksJob> _logger;

    public CleanupBooksJob(
        BookmachsDbContext dbContext,
        EcolecturaDbContext ecolecturaDbContext,
        ILogger<CleanupBooksJob> logger)
    {
        _dbContext = dbContext;
        _ecolecturaDbContext = ecolecturaDbContext;
        _logger = logger;
    }

    public async Task ExecuteAsync()
    {
        _logger.LogInformation("Iniciando tarea de limpieza en segundo plano (Hangfire)...");

        int expiredReservationsReleased = 0;
        int expiredTransactionsCancelled = 0;

        try
        {
            // 1. Liberar reservas de libros expiradas (> 48 horas)
            var expiredReservedBooks = await _dbContext.Books
                .Where(b => b.IsReserved && b.ReservedUntil < DateTime.UtcNow)
                .ToListAsync();

            bool hasEcolecturaStockRestored = false;

            foreach (var book in expiredReservedBooks)
            {
                // Si el origen del libro es de Ecolectura, restituir stock y registrar AjusteInventario
                if (book.IsInternalStock)
                {
                    var product = await _ecolecturaDbContext.Productos
                        .FirstOrDefaultAsync(p => p.IdProducto == book.Id.ToString());

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
                            Justificacion = $"Restitución de stock por expiración de reserva (48 hrs) en Bookmachs. Libro ID: {book.Id}."
                        };

                        await _ecolecturaDbContext.AjustesInventario.AddAsync(adjustment);
                        hasEcolecturaStockRestored = true;
                        _logger.LogInformation("Stock de Ecolectura restituido (+1) para el producto {IdProducto} por expiración de reserva.", product.IdProducto);
                    }
                }

                book.IsReserved = false;
                book.ReservedUntil = null;
                book.ReservedByUserId = null;
                
                _dbContext.Books.Update(book);
                expiredReservationsReleased++;
                _logger.LogInformation("Reserva del libro '{BookTitle}' ({BookId}) ha expirado y fue liberada.", book.Title, book.Id);
            }

            if (hasEcolecturaStockRestored)
            {
                await _ecolecturaDbContext.SaveChangesAsync();
            }

            // 2. Anular transacciones pendientes de pago pasadas las 48 horas
            var expiredTransactions = await _dbContext.MatchTransactions
                .Where(t => t.PaymentStatus == "Pending" && t.CreatedAt < DateTime.UtcNow.AddHours(-48))
                .ToListAsync();

            foreach (var tx in expiredTransactions)
            {
                tx.PaymentStatus = "Failed";
                tx.LogisticsStatus = "Cancelled";
                tx.StatusUpdatedAt = DateTime.UtcNow;

                _dbContext.MatchTransactions.Update(tx);
                expiredTransactionsCancelled++;
                _logger.LogInformation("Transacción {TransactionId} anulada por falta de pago pasadas las 48 horas.", tx.Id);

                // Liberar el libro asociado a la transacción fallida
                var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == tx.BookId);
                if (book != null)
                {
                    book.IsAvailable = true;
                    book.IsReserved = false;
                    book.ReservedUntil = null;
                    book.ReservedByUserId = null;
                    _dbContext.Books.Update(book);
                    _logger.LogInformation("Libro '{BookTitle}' ({BookId}) de la transacción anulada ha sido retornado al stock disponible.", book.Title, book.Id);
                }
            }

            // 3. Expirar membresías Premium cuyo período de facturación haya finalizado
            int expiredSubscriptionsCount = 0;
            var expiredPremiumUsers = await _dbContext.Users
                .Where(u => u.IsPremium && u.SubscriptionEndDate != null && u.SubscriptionEndDate <= DateTime.UtcNow)
                .ToListAsync();

            foreach (var user in expiredPremiumUsers)
            {
                user.IsPremium = false;
                user.SubscriptionPlan = "Free";
                user.SubscriptionEndDate = null;
                user.IsSubscriptionCancelled = false;
                _dbContext.Users.Update(user);
                expiredSubscriptionsCount++;
                _logger.LogInformation("Membresía Premium del usuario {UserId} ({Email}) ha expirado al final del periodo de facturación y volvió a Plan Free.", user.Id, user.Email);
            }

            var expiredSubscriptions = await _dbContext.Subscriptions
                .Where(s => s.IsActive && s.EndDate <= DateTime.UtcNow)
                .ToListAsync();

            foreach (var sub in expiredSubscriptions)
            {
                sub.IsActive = false;
                _dbContext.Subscriptions.Update(sub);
            }

            // 4. Confirmar cambios en la base de datos
            if (expiredReservationsReleased > 0 || expiredTransactionsCancelled > 0 || expiredSubscriptionsCount > 0)
            {
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("Limpieza completada. Reservas liberadas: {ReservationsCount}, Transacciones anuladas: {TransactionsCount}, Membresías expiradas: {ExpiredSubscriptionsCount}", 
                    expiredReservationsReleased, expiredTransactionsCancelled, expiredSubscriptionsCount);
            }
            else
            {
                _logger.LogInformation("No se encontraron reservas expiradas, transacciones pendientes ni membresías vencidas.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ocurrió un error al ejecutar la tarea de limpieza en segundo plano.");
            throw;
        }
    }
}
