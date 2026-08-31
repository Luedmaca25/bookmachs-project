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
    Task<MasterPreferenceTagDto> CreateMasterPreferenceTagAsync(CreatePreferenceTagRequest request, CancellationToken cancellationToken = default);
    Task<MasterPreferenceTagDto> UpdateMasterPreferenceTagAsync(int id, UpdatePreferenceTagRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteMasterPreferenceTagAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<EcolecturaCategoryTreeDto>> GetEcolecturaCategoryTreeAsync(CancellationToken cancellationToken = default);
    Task SeedDefaultTagsAndMappingsAsync(CancellationToken cancellationToken = default);
}

public class SettingsService : ISettingsService
{
    private readonly BookmachsDbContext _dbContext;
    private readonly EcolecturaDbContext _ecolecturaDbContext;
    private readonly ICategoryHomologationService _homologationService;

    public SettingsService(BookmachsDbContext dbContext, EcolecturaDbContext ecolecturaDbContext, ICategoryHomologationService homologationService)
    {
        _dbContext = dbContext;
        _ecolecturaDbContext = ecolecturaDbContext;
        _homologationService = homologationService;
    }

    public async Task<GlobalSettingsDto> GetGlobalSettingsAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings == null)
        {
            settings = new GlobalSettings
            {
                DailySwipeLimitFree = 40,
                DailySwipeLimitPremium = 1000,
                MonthlyMatchLimitFree = 2,
                MonthlyMatchLimitPremium = 5,
                BasicPlanPriceUsd = 4.99m,
                PremiumPlanPriceUsd = 9.99m,
                SearchKeywordsLimitPremium = 10,
                FeePercentage = 0.30m,
                MinFeeAmount = 1000m,
                MaxFeeAmount = 9000m,
                LastUpdatedAt = DateTime.UtcNow
            };
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
        settings.MonthlyMatchLimitFree = updateDto.MonthlyMatchLimitFree;
        settings.MonthlyMatchLimitPremium = updateDto.MonthlyMatchLimitPremium;
        settings.BasicPlanPriceUsd = updateDto.BasicPlanPriceUsd;
        settings.PremiumPlanPriceUsd = updateDto.PremiumPlanPriceUsd;
        settings.SearchKeywordsLimitPremium = updateDto.SearchKeywordsLimitPremium > 0 ? updateDto.SearchKeywordsLimitPremium : 10;
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
        await SeedDefaultTagsAndMappingsAsync(cancellationToken);

        var query = _dbContext.MasterPreferenceTags
            .Include(t => t.MappedCategories)
            .AsQueryable();

        if (onlyActive)
        {
            query = query.Where(t => t.IsActive);
        }

        var tags = await query.OrderBy(t => t.Id).ToListAsync(cancellationToken);
        return tags.Select(MapToMasterPreferenceTagDto);
    }

    public async Task<IEnumerable<EcolecturaCategoryTreeDto>> GetEcolecturaCategoryTreeAsync(CancellationToken cancellationToken = default)
    {
        var categories = await _ecolecturaDbContext.CategoriaProductos
            .Where(c => c.Activo)
            .OrderBy(c => c.NombreCategoria)
            .ToListAsync(cancellationToken);

        var subcategories = await _ecolecturaDbContext.SubcategoriaProductos
            .Where(s => s.Activo)
            .OrderBy(s => s.NombreSubcategoria)
            .ToListAsync(cancellationToken);

        var result = categories.Select(c => new EcolecturaCategoryTreeDto
        {
            CategoryId = c.IdCategoriaProducto,
            CategoryName = c.NombreCategoria,
            Activo = c.Activo,
            Subcategories = subcategories
                .Where(s => s.IdCategoria == c.IdCategoriaProducto)
                .Select(s => new EcolecturaSubcategoryDto
                {
                    SubcategoryId = s.IdSubcategoria,
                    SubcategoryName = s.NombreSubcategoria,
                    Activo = s.Activo
                }).ToList()
        }).ToList();

        return result;
    }

    public async Task<MasterPreferenceTagDto> CreateMasterPreferenceTagAsync(CreatePreferenceTagRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("El nombre de la etiqueta es requerido.");
        }

        var tag = new MasterPreferenceTag
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            MappedCategories = request.MappedCategories.Select(m => new PreferenceCategoryMapping
            {
                CategoryId = m.CategoryId,
                CategoryName = m.CategoryName,
                SubcategoryId = m.SubcategoryId,
                SubcategoryName = m.SubcategoryName
            }).ToList()
        };

        await _dbContext.MasterPreferenceTags.AddAsync(tag, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToMasterPreferenceTagDto(tag);
    }

    public async Task<MasterPreferenceTagDto> UpdateMasterPreferenceTagAsync(int id, UpdatePreferenceTagRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("El nombre de la etiqueta es requerido.");
        }

        var tag = await _dbContext.MasterPreferenceTags
            .Include(t => t.MappedCategories)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (tag == null)
        {
            throw new KeyNotFoundException($"No se encontró la etiqueta con Id {id}");
        }

        tag.Name = request.Name.Trim();
        tag.Description = request.Description?.Trim() ?? string.Empty;
        tag.IsActive = request.IsActive;

        // Eliminar mapeos antiguos y agregar los nuevos
        _dbContext.PreferenceCategoryMappings.RemoveRange(tag.MappedCategories);
        tag.MappedCategories = request.MappedCategories.Select(m => new PreferenceCategoryMapping
        {
            MasterPreferenceTagId = id,
            CategoryId = m.CategoryId,
            CategoryName = m.CategoryName,
            SubcategoryId = m.SubcategoryId,
            SubcategoryName = m.SubcategoryName
        }).ToList();

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToMasterPreferenceTagDto(tag);
    }

    public async Task<bool> DeleteMasterPreferenceTagAsync(int id, CancellationToken cancellationToken = default)
    {
        var tag = await _dbContext.MasterPreferenceTags
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (tag == null)
        {
            throw new KeyNotFoundException($"No se encontró la etiqueta con Id {id}");
        }

        _dbContext.MasterPreferenceTags.Remove(tag);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task SeedDefaultTagsAndMappingsAsync(CancellationToken cancellationToken = default)
    {
        if (await _dbContext.MasterPreferenceTags.AnyAsync(cancellationToken))
        {
            return;
        }

        var defaultConcepts = _homologationService.GetAllConcepts();
        foreach (var c in defaultConcepts)
        {
            var tag = new MasterPreferenceTag
            {
                Name = c.ConceptName,
                Description = c.Description,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                MappedCategories = c.MappedItems.Select(m => new PreferenceCategoryMapping
                {
                    CategoryId = m.CategoryId,
                    CategoryName = m.CategoryName,
                    SubcategoryId = m.SubcategoryId,
                    SubcategoryName = m.SubcategoryName
                }).ToList()
            };
            await _dbContext.MasterPreferenceTags.AddAsync(tag, cancellationToken);
        }
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static GlobalSettingsDto MapToGlobalSettingsDto(GlobalSettings g)
    {
        return new GlobalSettingsDto
        {
            Id = g.Id,
            DailySwipeLimitFree = g.DailySwipeLimitFree,
            DailySwipeLimitPremium = g.DailySwipeLimitPremium,
            MonthlyMatchLimitFree = g.MonthlyMatchLimitFree,
            MonthlyMatchLimitPremium = g.MonthlyMatchLimitPremium,
            BasicPlanPriceUsd = g.BasicPlanPriceUsd,
            PremiumPlanPriceUsd = g.PremiumPlanPriceUsd,
            SearchKeywordsLimitPremium = g.SearchKeywordsLimitPremium > 0 ? g.SearchKeywordsLimitPremium : 10,
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
            Description = t.Description,
            IsActive = t.IsActive,
            CreatedAt = t.CreatedAt,
            MappedCategories = t.MappedCategories.Select(m => new PreferenceCategoryMappingDto
            {
                Id = m.Id,
                CategoryId = m.CategoryId,
                CategoryName = m.CategoryName,
                SubcategoryId = m.SubcategoryId,
                SubcategoryName = m.SubcategoryName
            }).ToList()
        };
    }
}
