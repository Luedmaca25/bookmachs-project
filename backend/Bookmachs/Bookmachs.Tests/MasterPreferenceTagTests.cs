using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.MasterPreferenceTags.Commands;
using Bookmachs.Application.MasterPreferenceTags.Queries;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Bookmachs.Tests;

public class MasterPreferenceTagTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    [Fact]
    public async Task GetTags_ShouldSeedGenres_WhenDatabaseIsEmpty()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var queryHandler = new GetMasterPreferenceTagsQueryHandler(unitOfWork);

        // Act
        var result = await queryHandler.Handle(new GetMasterPreferenceTagsQuery(false), CancellationToken.None);

        // Assert
        Assert.NotEmpty(result);
        Assert.Contains(result, t => t.Name == "Ciencia Ficción");
        Assert.Contains(result, t => t.Name == "Medio Ambiente y Ecología");
    }

    [Fact]
    public async Task CRUD_ShouldManageTagsCorrectly()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        
        var queryHandler = new GetMasterPreferenceTagsQueryHandler(unitOfWork);
        var createHandler = new CreateMasterPreferenceTagCommandHandler(unitOfWork);
        var updateHandler = new UpdateMasterPreferenceTagCommandHandler(unitOfWork);
        var deleteHandler = new DeleteMasterPreferenceTagCommandHandler(unitOfWork);

        // 1. Crear etiqueta
        var createCommand = new CreateMasterPreferenceTagCommand
        {
            Name = "Filosofía",
            IsActive = true
        };
        var createResult = await createHandler.Handle(createCommand, CancellationToken.None);

        Assert.NotNull(createResult);
        Assert.True(createResult.Id > 0);
        Assert.Equal("Filosofía", createResult.Name);

        // 2. Actualizar y desactivar etiqueta
        var updateCommand = new UpdateMasterPreferenceTagCommand
        {
            Id = createResult.Id,
            Name = "Filosofía Clásica",
            IsActive = false
        };
        var updateResult = await updateHandler.Handle(updateCommand, CancellationToken.None);
        
        Assert.Equal("Filosofía Clásica", updateResult.Name);
        Assert.False(updateResult.IsActive);

        // 3. Verificar que no aparezca en las activas
        var activeTags = await queryHandler.Handle(new GetMasterPreferenceTagsQuery(true), CancellationToken.None);
        Assert.DoesNotContain(activeTags, t => t.Id == createResult.Id);

        // 4. Eliminar etiqueta
        var deleteResult = await deleteHandler.Handle(new DeleteMasterPreferenceTagCommand(createResult.Id), CancellationToken.None);
        Assert.True(deleteResult);

        // Verificar que no exista en absoluto
        var allTags = await queryHandler.Handle(new GetMasterPreferenceTagsQuery(false), CancellationToken.None);
        Assert.DoesNotContain(allTags, t => t.Id == createResult.Id);
    }
}
