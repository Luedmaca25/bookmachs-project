using System;
using System.Collections.Generic;
using System.Linq;
using Bookmachs.Refactored.Api.Dtos;

namespace Bookmachs.Refactored.Api.Services;

public class RawCategoryItem
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? SubcategoryId { get; set; }
    public string? SubcategoryName { get; set; }
}

public class ConceptHomologation
{
    public int Id { get; set; }
    public string ConceptName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<RawCategoryItem> MappedItems { get; set; } = new();
}

public interface ICategoryHomologationService
{
    IReadOnlyList<ConceptHomologation> GetAllConcepts();
    IEnumerable<MasterPreferenceTagDto> GetPreferenceTagDtos();
    List<RawCategoryItem> GetMappedItemsForConcepts(IEnumerable<string> concepts);
    bool MatchesConcept(string conceptName, int? categoryId, int? subcategoryId);
    string? GetConceptNameForProduct(int? categoryId, int? subcategoryId);
}

public class CategoryHomologationService : ICategoryHomologationService
{
    private static readonly List<ConceptHomologation> Concepts = new()
    {
        new ConceptHomologation
        {
            Id = 1,
            ConceptName = "Arte, Cultura y Estilo de Vida",
            Description = "Arte, música, arquitectura, diseño, cocina, manualidades, turismo, viajes y deportes.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 15, SubcategoryName = "Arte, música y cultura" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 43, SubcategoryName = "Arquitectura, Decoración y Diseño" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 9, SubcategoryName = "Cocina y Alimentación" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 14, SubcategoryName = "Manualidades" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 26, SubcategoryName = "Ocio, Turismo y Viaje" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 53, SubcategoryName = "Deporte" }
            }
        },
        new ConceptHomologation
        {
            Id = 2,
            ConceptName = "Ciencia, Tecnología y Medicina",
            Description = "Ingeniería, ciencias exactas, informática, tecnología, medicina y ciencias médicas de la salud.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 8, SubcategoryName = "Ciencias Médicas y Salud" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 16, SubcategoryName = "Medicina" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 48, SubcategoryName = "Ingeniería y Ciencias Exactas" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 54, SubcategoryName = "Informática y Tecnología" },
                new RawCategoryItem { CategoryId = 21, CategoryName = "Medicina y Salud", SubcategoryId = null, SubcategoryName = null }
            }
        },
        new ConceptHomologation
        {
            Id = 3,
            ConceptName = "Desarrollo Personal y Bienestar",
            Description = "Autoayuda, psicología, espiritualidad, tarot, esoterismo, medicina natural y ciencias alternativas.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 18, SubcategoryName = "Autoayuda" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 21, SubcategoryName = "Psicología" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 38, SubcategoryName = "Espiritualidad, Tarot y Esoterismo" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 24, SubcategoryName = "Ciencias alternativas" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 42, SubcategoryName = "Medicina Natural" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 34, SubcategoryName = "Sexualidad y erotismo" }
            }
        },
        new ConceptHomologation
        {
            Id = 4,
            ConceptName = "Educación, Aprendizaje y Consulta",
            Description = "Educación, preparación PAES, ciencias básicas, diccionarios, obras de referencia y misceláneos.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 22, SubcategoryName = "Educación, PAES, Física, Química, Matemáticas y Biología" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 12, SubcategoryName = "Diccionarios" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 30, SubcategoryName = "Misceláneos" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 13, SubcategoryName = "Grandes selecciones" },
                new RawCategoryItem { CategoryId = 23, CategoryName = "Educación, PAES, Física, Química, Matemáticas y Biología", SubcategoryId = null, SubcategoryName = null },
                new RawCategoryItem { CategoryId = 26, CategoryName = "Misceláneos", SubcategoryId = null, SubcategoryName = null }
            }
        },
        new ConceptHomologation
        {
            Id = 5,
            ConceptName = "Ficción, Novelas y Relatos",
            Description = "Novelas de ficción, histórica, ciencia ficción, misterio, thriller, romance, poesía y literatura general.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 33, SubcategoryName = "Ficción, ficción histórica, ciencia ficción" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 35, SubcategoryName = "Novela" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 17, SubcategoryName = "Novela - Novela Histórica" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 28, SubcategoryName = "Thriller y misterio" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 19, SubcategoryName = "Romance" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 23, SubcategoryName = "Poesía" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 44, SubcategoryName = "Literatura" },
                new RawCategoryItem { CategoryId = 27, CategoryName = "Novela - Novela Histórica", SubcategoryId = null, SubcategoryName = null }
            }
        },
        new ConceptHomologation
        {
            Id = 6,
            ConceptName = "Historia, Humanidades y Sociedad",
            Description = "Historia, filosofía, política, periodismo, biografías, ciencias sociales y religión.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 29, SubcategoryName = "Historia y Ciencias sociales" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 25, SubcategoryName = "Filosofía" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 45, SubcategoryName = "Filosofía" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 32, SubcategoryName = "Política" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 37, SubcategoryName = "Periodismo" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 36, SubcategoryName = "Autobiografía, biografía" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 20, SubcategoryName = "Religión y teología" }
            }
        },
        new ConceptHomologation
        {
            Id = 7,
            ConceptName = "Idiomas, Colecciones y Packs",
            Description = "Narrativa y textos en otros idiomas, packs literarios y colecciones especiales de legados.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 27, SubcategoryName = "Narrativa en otros idiomas" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 31, SubcategoryName = "Otros idiomas" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 39, SubcategoryName = "Packs Literarios." },
                new RawCategoryItem { CategoryId = 28, CategoryName = "Legados 2", SubcategoryId = 51, SubcategoryName = "Español" },
                new RawCategoryItem { CategoryId = 28, CategoryName = "Legados 2", SubcategoryId = 52, SubcategoryName = "Otros idiomas" },
                new RawCategoryItem { CategoryId = 20, CategoryName = "Legados Literarios", SubcategoryId = 49, SubcategoryName = "Español" },
                new RawCategoryItem { CategoryId = 20, CategoryName = "Legados Literarios", SubcategoryId = 50, SubcategoryName = "Otros idiomas" },
                new RawCategoryItem { CategoryId = 25, CategoryName = "Otros Idiomas", SubcategoryId = null, SubcategoryName = null },
                new RawCategoryItem { CategoryId = 19, CategoryName = "Packs Literarios", SubcategoryId = null, SubcategoryName = null }
            }
        },
        new ConceptHomologation
        {
            Id = 8,
            ConceptName = "Infantil, Juvenil y Cómics",
            Description = "Cómics, novelas gráficas, literatura infantil y narrativa juvenil.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 10, SubcategoryName = "Comics" },
                new RawCategoryItem { CategoryId = 3, CategoryName = "Infantil", SubcategoryId = 41, SubcategoryName = "Packs Literarios." },
                new RawCategoryItem { CategoryId = 2, CategoryName = "Juvenil", SubcategoryId = 40, SubcategoryName = "Packs Literarios." }
            }
        },
        new ConceptHomologation
        {
            Id = 9,
            ConceptName = "Negocios, Economía y Derecho",
            Description = "Economía, contabilidad, administración, negocios, inversiones, marketing, publicidad y leyes.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 7, SubcategoryName = "Economía, Contabilidad y Administración" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 47, SubcategoryName = "Negocios e Inversiones" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 46, SubcategoryName = "Marketing y Publicidad" },
                new RawCategoryItem { CategoryId = 1, CategoryName = "Adulto", SubcategoryId = 11, SubcategoryName = "Leyes" },
                new RawCategoryItem { CategoryId = 24, CategoryName = "Derecho y Leyes", SubcategoryId = null, SubcategoryName = null },
                new RawCategoryItem { CategoryId = 22, CategoryName = "Economía, Contabilidad y Administración", SubcategoryId = null, SubcategoryName = null }
            }
        },
        new ConceptHomologation
        {
            Id = 10,
            ConceptName = "Oportunidades y Novedades",
            Description = "Libros en oferta especial, gift cards e ítems de precio reducido.",
            MappedItems = new()
            {
                new RawCategoryItem { CategoryId = 16, CategoryName = "Gift Card", SubcategoryId = null, SubcategoryName = null },
                new RawCategoryItem { CategoryId = 13, CategoryName = "Hasta $5.990", SubcategoryId = null, SubcategoryName = null }
            }
        }
    };

    public IReadOnlyList<ConceptHomologation> GetAllConcepts() => Concepts;

    public IEnumerable<MasterPreferenceTagDto> GetPreferenceTagDtos()
    {
        return Concepts.Select(c => new MasterPreferenceTagDto
        {
            Id = c.Id,
            Name = c.ConceptName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
    }

    public List<RawCategoryItem> GetMappedItemsForConcepts(IEnumerable<string> concepts)
    {
        var conceptSet = concepts.Select(c => c.Trim().ToLowerInvariant()).ToHashSet();
        var result = new List<RawCategoryItem>();

        foreach (var concept in Concepts)
        {
            if (conceptSet.Contains(concept.ConceptName.ToLowerInvariant()))
            {
                result.AddRange(concept.MappedItems);
            }
        }

        return result;
    }

    public bool MatchesConcept(string conceptName, int? categoryId, int? subcategoryId)
    {
        if (string.IsNullOrWhiteSpace(conceptName) || !categoryId.HasValue)
            return false;

        var concept = Concepts.FirstOrDefault(c => string.Equals(c.ConceptName, conceptName, StringComparison.OrdinalIgnoreCase));
        if (concept == null)
            return false;

        foreach (var item in concept.MappedItems)
        {
            if (item.CategoryId == categoryId.Value)
            {
                if (item.SubcategoryId == null) return true;
                if (subcategoryId.HasValue && item.SubcategoryId.Value == subcategoryId.Value) return true;
            }
        }

        return false;
    }

    public string? GetConceptNameForProduct(int? categoryId, int? subcategoryId)
    {
        if (!categoryId.HasValue) return null;

        // 1. Coincidencia exacta con SubcategoryId
        if (subcategoryId.HasValue)
        {
            var matchWithSubcategory = Concepts.FirstOrDefault(c =>
                c.MappedItems.Any(i => i.CategoryId == categoryId.Value && i.SubcategoryId == subcategoryId.Value)
            );
            if (matchWithSubcategory != null)
            {
                return matchWithSubcategory.ConceptName;
            }
        }

        // 2. Coincidencia por solo CategoryId
        var matchWithCategoryOnly = Concepts.FirstOrDefault(c =>
            c.MappedItems.Any(i => i.CategoryId == categoryId.Value && i.SubcategoryId == null)
        );
        if (matchWithCategoryOnly != null)
        {
            return matchWithCategoryOnly.ConceptName;
        }

        return null;
    }
}
