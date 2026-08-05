using System;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Bookmachs.Refactored.Api.Jobs;

public class CleanupBooksJob
{
    private readonly BookmachsDbContext _dbContext;
    private readonly ILogger<CleanupBooksJob> _logger;

    public CleanupBooksJob(BookmachsDbContext dbContext, ILogger<CleanupBooksJob> logger)
    {
        _dbContext = dbContext;
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

            foreach (var book in expiredReservedBooks)
            {
                book.IsReserved = false;
                book.ReservedUntil = null;
                book.ReservedByUserId = null;
                
                _dbContext.Books.Update(book);
                expiredReservationsReleased++;
                _logger.LogInformation("Reserva del libro '{BookTitle}' ({BookId}) ha expirado y fue liberada.", book.Title, book.Id);
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

            // 3. Confirmar cambios en la base de datos
            if (expiredReservationsReleased > 0 || expiredTransactionsCancelled > 0)
            {
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("Limpieza completada. Reservas liberadas: {ReservationsCount}, Transacciones anuladas: {TransactionsCount}", 
                    expiredReservationsReleased, expiredTransactionsCancelled);
            }
            else
            {
                _logger.LogInformation("No se encontraron reservas expiradas ni transacciones pendientes que requieran anulación.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ocurrió un error al ejecutar la tarea de limpieza en segundo plano.");
            throw;
        }
    }
}
