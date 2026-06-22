using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Books.Jobs;
using Bookmachs.Domain.Entities;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Bookmachs.Tests;

public class CleanupJobTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldReleaseExpiredBookReservations_AndKeepActiveReservations()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var logger = NullLogger<CleanupBooksJob>.Instance;

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "premium@example.com",
            Name = "Premium User",
            IsPremium = true
        };
        await context.Users.AddAsync(user);

        // Libro con reserva expirada (hace 1 hora)
        var expiredBook = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Libro Expirado",
            Author = "Autor A",
            IsAvailable = true,
            IsReserved = true,
            ReservedByUserId = user.Id,
            ReservedUntil = DateTime.UtcNow.AddHours(-1)
        };

        // Libro con reserva activa (expira en 24 horas)
        var activeBook = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Libro Activo",
            Author = "Autor B",
            IsAvailable = true,
            IsReserved = true,
            ReservedByUserId = user.Id,
            ReservedUntil = DateTime.UtcNow.AddHours(24)
        };

        await context.Books.AddRangeAsync(expiredBook, activeBook);
        await context.SaveChangesAsync();

        var job = new CleanupBooksJob(unitOfWork, logger);

        // Act
        await job.ExecuteAsync();

        // Assert
        var dbExpiredBook = await context.Books.FindAsync(expiredBook.Id);
        Assert.NotNull(dbExpiredBook);
        Assert.False(dbExpiredBook.IsReserved);
        Assert.Null(dbExpiredBook.ReservedByUserId);
        Assert.Null(dbExpiredBook.ReservedUntil);

        var dbActiveBook = await context.Books.FindAsync(activeBook.Id);
        Assert.NotNull(dbActiveBook);
        Assert.True(dbActiveBook.IsReserved);
        Assert.Equal(user.Id, dbActiveBook.ReservedByUserId);
        Assert.NotNull(dbActiveBook.ReservedUntil);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldCancelExpiredPendingTransactions_AndReleaseTheirBooks()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var logger = NullLogger<CleanupBooksJob>.Instance;

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            Name = "User"
        };
        await context.Users.AddAsync(user);

        var book1 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Libro Transaccion Expirada",
            Author = "Autor X",
            IsAvailable = false, // Reservado/bloqueado por la transacción
            OwnerId = user.Id
        };
        var book2 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Libro Transaccion Activa",
            Author = "Autor Y",
            IsAvailable = false,
            OwnerId = user.Id
        };
        await context.Books.AddRangeAsync(book1, book2);

        // Transacción expirada (hace 49 horas, sin pago - Pending)
        var expiredTx = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = user.Id,
            BookId = book1.Id,
            PaymentStatus = "Pending",
            LogisticsStatus = "Pending",
            CreatedAt = DateTime.UtcNow.AddHours(-49),
            StatusUpdatedAt = DateTime.UtcNow.AddHours(-49)
        };

        // Transacción activa (hace 2 horas, sin pago - Pending)
        var activeTx = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = user.Id,
            BookId = book2.Id,
            PaymentStatus = "Pending",
            LogisticsStatus = "Pending",
            CreatedAt = DateTime.UtcNow.AddHours(-2),
            StatusUpdatedAt = DateTime.UtcNow.AddHours(-2)
        };

        await context.MatchTransactions.AddRangeAsync(expiredTx, activeTx);
        await context.SaveChangesAsync();

        var job = new CleanupBooksJob(unitOfWork, logger);

        // Act
        await job.ExecuteAsync();

        // Assert
        // Transacción expirada debe anularse
        var dbExpiredTx = await context.MatchTransactions.FindAsync(expiredTx.Id);
        Assert.NotNull(dbExpiredTx);
        Assert.Equal("Failed", dbExpiredTx.PaymentStatus);
        Assert.Equal("Cancelled", dbExpiredTx.LogisticsStatus);

        // Libro de la transacción expirada debe liberarse
        var dbBook1 = await context.Books.FindAsync(book1.Id);
        Assert.NotNull(dbBook1);
        Assert.True(dbBook1.IsAvailable);
        Assert.False(dbBook1.IsReserved);

        // Transacción activa debe permanecer intacta
        var dbActiveTx = await context.MatchTransactions.FindAsync(activeTx.Id);
        Assert.NotNull(dbActiveTx);
        Assert.Equal("Pending", dbActiveTx.PaymentStatus);
        Assert.Equal("Pending", dbActiveTx.LogisticsStatus);

        // Libro de la transacción activa debe seguir no disponible
        var dbBook2 = await context.Books.FindAsync(book2.Id);
        Assert.NotNull(dbBook2);
        Assert.False(dbBook2.IsAvailable);
    }
}
