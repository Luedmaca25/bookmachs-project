using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.GlobalSettings.Commands;
using Bookmachs.Application.GlobalSettings.Queries;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Bookmachs.Tests;

public class GlobalSettingsTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString()) // Base de datos aislada por test
            .Options;

        return new BookmachsDbContext(options);
    }

    [Fact]
    public async Task GetSettings_ShouldSeedDefaultSettings_WhenTableIsEmpty()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var queryHandler = new GetGlobalSettingsQueryHandler(unitOfWork);

        // Act
        var result = await queryHandler.Handle(new GetGlobalSettingsQuery(), CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.DailySwipeLimitFree);
        Assert.Equal(1000, result.DailySwipeLimitPremium);
        Assert.Equal(2.0m, result.BasicPlanPriceUsd);
        Assert.Equal(5.0m, result.PremiumPlanPriceUsd);
        Assert.Equal(0.30m, result.FeePercentage);
        Assert.Equal(1000.0m, result.MinFeeAmount);
        Assert.Equal(9000.0m, result.MaxFeeAmount);
    }

    [Fact]
    public async Task UpdateSettings_ShouldModifySystemSettings_WhenCommandIsExecuted()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var queryHandler = new GetGlobalSettingsQueryHandler(unitOfWork);
        var commandHandler = new UpdateGlobalSettingsCommandHandler(unitOfWork);

        // Disparar autosembrado con Get
        await queryHandler.Handle(new GetGlobalSettingsQuery(), CancellationToken.None);

        var updateCommand = new UpdateGlobalSettingsCommand
        {
            DailySwipeLimitFree = 150,
            DailySwipeLimitPremium = 1500,
            BasicPlanPriceUsd = 3.99m,
            PremiumPlanPriceUsd = 7.99m,
            FeePercentage = 0.25m,
            MinFeeAmount = 2000.0m,
            MaxFeeAmount = 10000.0m
        };

        // Act
        var updateResult = await commandHandler.Handle(updateCommand, CancellationToken.None);
        var finalResult = await queryHandler.Handle(new GetGlobalSettingsQuery(), CancellationToken.None);

        // Assert
        Assert.NotNull(updateResult);
        Assert.Equal(150, finalResult.DailySwipeLimitFree);
        Assert.Equal(1500, finalResult.DailySwipeLimitPremium);
        Assert.Equal(3.99m, finalResult.BasicPlanPriceUsd);
        Assert.Equal(7.99m, finalResult.PremiumPlanPriceUsd);
        Assert.Equal(0.25m, finalResult.FeePercentage);
        Assert.Equal(2000.0m, finalResult.MinFeeAmount);
        Assert.Equal(10000.0m, finalResult.MaxFeeAmount);
    }
}
