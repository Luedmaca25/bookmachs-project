using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Books.Commands;
using Bookmachs.Domain.Entities;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Bookmachs.Tests;

public class ReservationTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    [Fact]
    public async Task ReserveBook_ShouldThrowUnauthorizedAccessException_WhenUserIsNotPremium()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var freeUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "free@example.com",
            Name = "Free User",
            IsPremium = false
        };
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            Author = "Tolkien",
            IsAvailable = true
        };
        await context.Users.AddAsync(freeUser);
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var command = new ReserveBookCommand(book.Id, freeUser.Id);
        var handler = new ReserveBookCommandHandler(unitOfWork);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task ReserveBook_ShouldReserveSuccessfully_WhenUserIsPremiumAndBookIsAvailable()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "premium@example.com",
            Name = "Premium User",
            IsPremium = true
        };
        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "other@example.com"
        };
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            Author = "Tolkien",
            IsAvailable = true,
            OwnerId = otherUser.Id
        };
        await context.Users.AddRangeAsync(premiumUser, otherUser);
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var command = new ReserveBookCommand(book.Id, premiumUser.Id);
        var handler = new ReserveBookCommandHandler(unitOfWork);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(book.Id, result.BookId);
        Assert.Equal(premiumUser.Id, result.ReservedByUserId);
        Assert.True((result.ReservedUntil - DateTime.UtcNow).TotalHours > 47);

        // Validar DB
        var dbBook = await context.Books.FindAsync(book.Id);
        Assert.NotNull(dbBook);
        Assert.True(dbBook.IsReserved);
        Assert.Equal(premiumUser.Id, dbBook.ReservedByUserId);
        Assert.NotNull(dbBook.ReservedUntil);
    }

    [Fact]
    public async Task ReserveBook_ShouldThrowInvalidOperationException_WhenBookIsOwn()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            IsAvailable = true,
            OwnerId = premiumUser.Id
        };
        await context.Users.AddAsync(premiumUser);
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var command = new ReserveBookCommand(book.Id, premiumUser.Id);
        var handler = new ReserveBookCommandHandler(unitOfWork);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task ReserveBook_ShouldThrowInvalidOperationException_WhenBookIsAlreadyReserved()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser1 = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        var premiumUser2 = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        var otherUser = new User
        {
            Id = Guid.NewGuid()
        };
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            IsAvailable = true,
            OwnerId = otherUser.Id,
            IsReserved = true,
            ReservedByUserId = premiumUser1.Id,
            ReservedUntil = DateTime.UtcNow.AddHours(2)
        };
        await context.Users.AddRangeAsync(premiumUser1, premiumUser2, otherUser);
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var command = new ReserveBookCommand(book.Id, premiumUser2.Id);
        var handler = new ReserveBookCommandHandler(unitOfWork);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task CancelReservation_ShouldCancelSuccessfully_WhenRequestedByReservingUser()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            IsAvailable = true,
            IsReserved = true,
            ReservedByUserId = premiumUser.Id,
            ReservedUntil = DateTime.UtcNow.AddHours(24)
        };
        await context.Users.AddAsync(premiumUser);
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var command = new CancelReservationCommand(book.Id, premiumUser.Id);
        var handler = new CancelReservationCommandHandler(unitOfWork);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);

        // Validar DB
        var dbBook = await context.Books.FindAsync(book.Id);
        Assert.NotNull(dbBook);
        Assert.False(dbBook.IsReserved);
        Assert.Null(dbBook.ReservedByUserId);
        Assert.Null(dbBook.ReservedUntil);
    }

    [Fact]
    public async Task CancelReservation_ShouldThrowInvalidOperationException_WhenRequestedByOtherUser()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser1 = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            IsAvailable = true,
            IsReserved = true,
            ReservedByUserId = premiumUser1.Id,
            ReservedUntil = DateTime.UtcNow.AddHours(24)
        };
        await context.Users.AddRangeAsync(premiumUser1, otherUser);
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var command = new CancelReservationCommand(book.Id, otherUser.Id);
        var handler = new CancelReservationCommandHandler(unitOfWork);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(command, CancellationToken.None));
    }
}
