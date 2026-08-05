using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Services;

public interface ISettingsService
{
    Task<GlobalSettingsDto> GetGlobalSettingsAsync(CancellationToken cancellationToken = default);
    Task<GlobalSettingsDto> UpdateGlobalSettingsAsync(GlobalSettingsDto updateDto, CancellationToken cancellationToken = default);
    Task<IEnumerable<MasterPreferenceTagDto>> GetMasterPreferenceTagsAsync(bool onlyActive, CancellationToken cancellationToken = default);
    Task<MasterPreferenceTagDto> CreateMasterPreferenceTagAsync(string name, bool isActive, CancellationToken cancellationToken = default);
    Task<MasterPreferenceTagDto> UpdateMasterPreferenceTagAsync(int id, string name, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeleteMasterPreferenceTagAsync(int id, CancellationToken cancellationToken = default);
}

public class SettingsService : ISettingsService
{
    private readonly BookmachsDbContext _dbContext;
    private readonly EcolecturaDbContext _ecolecturaDbContext;

    public SettingsService(BookmachsDbContext dbContext, EcolecturaDbContext ecolecturaDbContext)
    {
        _dbContext = dbContext;
        _ecolecturaDbContext = ecolecturaDbContext;
    }

    public async Task<GlobalSettingsDto> GetGlobalSettingsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings == null)
        {
            settings = new GlobalSettings();
            await _dbContext.GlobalSettings.AddAsync(settings, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return MapToGlobalSettingsDto(settings);
    }

    public async Task<GlobalSettingsDto> UpdateGlobalSettingsAsync(GlobalSettingsDto updateDto, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings == null)
        {
            settings = new GlobalSettings();
            await _dbContext.GlobalSettings.AddAsync(settings, cancellationToken);
        }

        settings.DailySwipeLimitFree = updateDto.DailySwipeLimitFree;
        settings.DailySwipeLimitPremium = updateDto.DailySwipeLimitPremium;
        settings.BasicPlanPriceUsd = updateDto.BasicPlanPriceUsd;
        settings.PremiumPlanPriceUsd = updateDto.PremiumPlanPriceUsd;
        settings.FeePercentage = updateDto.FeePercentage;
        settings.MinFeeAmount = updateDto.MinFeeAmount;
        settings.MaxFeeAmount = updateDto.MaxFeeAmount;
        settings.LastUpdatedAt = DateTime.UtcNow;

        _dbContext.GlobalSettings.Update(settings);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToGlobalSettingsDto(settings);
    }

    public async Task<IEnumerable<MasterPreferenceTagDto>> GetMasterPreferenceTagsAsync(bool onlyActive, CancellationToken cancellationToken = default)
    {
        IQueryable<EcolecturaCategoria> query = _ecolecturaDbContext.CategoriaProductos;
        if (onlyActive)
        {
            query = query.Where(t => t.Activo);
        }

        var tags = await query
            .OrderBy(t => t.NombreCategoria)
            .ToListAsync(cancellationToken);

        return tags.Select(t => new MasterPreferenceTagDto
        {
            Id = t.IdCategoriaProducto,
            Name = t.NombreCategoria,
            IsActive = t.Activo,
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<MasterPreferenceTagDto> CreateMasterPreferenceTagAsync(string name, bool isActive, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre de la etiqueta es requerido.");
        }

        var tag = new EcolecturaCategoria
        {
            NombreCategoria = name.Trim(),
            Activo = isActive,
            Orden = 0
        };

        await _ecolecturaDbContext.CategoriaProductos.AddAsync(tag, cancellationToken);
        await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);

        return new MasterPreferenceTagDto
        {
            Id = tag.IdCategoriaProducto,
            Name = tag.NombreCategoria,
            IsActive = tag.Activo,
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task<MasterPreferenceTagDto> UpdateMasterPreferenceTagAsync(int id, string name, bool isActive, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre de la etiqueta es requerido.");
        }

        var tag = await _ecolecturaDbContext.CategoriaProductos.FirstOrDefaultAsync(t => t.IdCategoriaProducto == id, cancellationToken);
        if (tag == null)
        {
            throw new KeyNotFoundException($"No se encontró la etiqueta con Id {id}");
        }

        tag.NombreCategoria = name.Trim();
        tag.Activo = isActive;

        _ecolecturaDbContext.CategoriaProductos.Update(tag);
        await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);

        return new MasterPreferenceTagDto
        {
            Id = tag.IdCategoriaProducto,
            Name = tag.NombreCategoria,
            IsActive = tag.Activo,
            CreatedAt = DateTime.UtcNow
        };
    }

    public async Task<bool> DeleteMasterPreferenceTagAsync(int id, CancellationToken cancellationToken = default)
    {
        var tag = await _ecolecturaDbContext.CategoriaProductos.FirstOrDefaultAsync(t => t.IdCategoriaProducto == id, cancellationToken);
        if (tag == null)
        {
            throw new KeyNotFoundException($"No se encontró la etiqueta con Id {id}");
        }

        _ecolecturaDbContext.CategoriaProductos.Remove(tag);
        await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static GlobalSettingsDto MapToGlobalSettingsDto(GlobalSettings g)
    {
        return new GlobalSettingsDto
        {
            Id = g.Id,
            DailySwipeLimitFree = g.DailySwipeLimitFree,
            DailySwipeLimitPremium = g.DailySwipeLimitPremium,
            BasicPlanPriceUsd = g.BasicPlanPriceUsd,
            PremiumPlanPriceUsd = g.PremiumPlanPriceUsd,
            FeePercentage = g.FeePercentage,
            MinFeeAmount = g.MinFeeAmount,
            MaxFeeAmount = g.MaxFeeAmount,
            LastUpdatedAt = g.LastUpdatedAt
        };
    }

    private static MasterPreferenceTagDto MapToMasterPreferenceTagDto(MasterPreferenceTag t)
    {
        return new MasterPreferenceTagDto
        {
            Id = t.Id,
            Name = t.Name,
            IsActive = t.IsActive,
            CreatedAt = t.CreatedAt
        };
    }
}
