using System;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using Microsoft.Extensions.Logging;

namespace Bookmachs.Application.Books.Jobs;

public class CleanupBooksJob
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CleanupBooksJob> _logger;

    public CleanupBooksJob(IUnitOfWork unitOfWork, ILogger<CleanupBooksJob> logger)
    {
        _unitOfWork = unitOfWork;
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
            var availableBooks = await _unitOfWork.Books.GetAvailableBooksAsync();
            var expiredReservedBooks = availableBooks
                .Where(b => b.IsReserved && b.ReservedUntil < DateTime.UtcNow)
                .ToList();

            foreach (var book in expiredReservedBooks)
            {
                book.IsReserved = false;
                book.ReservedUntil = null;
                book.ReservedByUserId = null;
                
                _unitOfWork.Books.Update(book);
                expiredReservationsReleased++;
                _logger.LogInformation("Reserva del libro '{BookTitle}' ({BookId}) ha expirado y fue liberada.", book.Title, book.Id);
            }

            // 2. Anular transacciones pendientes de pago pasadas las 48 horas
            var pendingTransactions = await _unitOfWork.MatchTransactions.GetPendingTransactionsAsync();
            var expiredTransactions = pendingTransactions
                .Where(t => t.CreatedAt < DateTime.UtcNow.AddHours(-48))
                .ToList();

            foreach (var tx in expiredTransactions)
            {
                tx.PaymentStatus = "Failed";
                tx.LogisticsStatus = "Cancelled";
                tx.StatusUpdatedAt = DateTime.UtcNow;

                _unitOfWork.MatchTransactions.Update(tx);
                expiredTransactionsCancelled++;
                _logger.LogInformation("Transacción {TransactionId} anulada por falta de pago pasadas las 48 horas.", tx.Id);

                // Liberar el libro asociado a la transacción fallida
                var book = await _unitOfWork.Books.GetByIdAsync(tx.BookId);
                if (book != null)
                {
                    book.IsAvailable = true;
                    book.IsReserved = false;
                    book.ReservedUntil = null;
                    book.ReservedByUserId = null;
                    _unitOfWork.Books.Update(book);
                    _logger.LogInformation("Libro '{BookTitle}' ({BookId}) de la transacción anulada ha sido retornado al stock disponible.", book.Title, book.Id);
                }
            }

            // 3. Confirmar cambios en la base de datos
            if (expiredReservationsReleased > 0 || expiredTransactionsCancelled > 0)
            {
                await _unitOfWork.SaveChangesAsync();
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
