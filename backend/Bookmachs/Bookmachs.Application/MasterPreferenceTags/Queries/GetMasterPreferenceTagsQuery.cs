using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.MasterPreferenceTags.Queries;

public record GetMasterPreferenceTagsQuery(bool OnlyActive = false) : IRequest<IEnumerable<MasterPreferenceTagDto>>;

public class GetMasterPreferenceTagsQueryHandler : IRequestHandler<GetMasterPreferenceTagsQuery, IEnumerable<MasterPreferenceTagDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetMasterPreferenceTagsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<MasterPreferenceTagDto>> Handle(GetMasterPreferenceTagsQuery request, CancellationToken cancellationToken)
    {
        var tags = await _unitOfWork.MasterPreferenceTags.GetAllAsync(request.OnlyActive);

        // Autosembrado de categorías iniciales si no existen
        if (!tags.Any() && !request.OnlyActive)
        {
            var defaultTags = new[]
            {
                "Ciencia Ficción", "Fantasía", "Novela Romántica", "Novela Histórica",
                "Terror", "Suspenso / Thriller", "Biografías", "Poesía",
                "Desarrollo Personal", "Medio Ambiente y Ecología", "Divulgación Científica",
                "Historia General", "Arte y Fotografía", "Infantil / Juvenil"
            };

            foreach (var name in defaultTags)
            {
                await _unitOfWork.MasterPreferenceTags.AddAsync(new Domain.Entities.MasterPreferenceTag
                {
                    Name = name,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            tags = await _unitOfWork.MasterPreferenceTags.GetAllAsync(request.OnlyActive);
        }

        return tags.Select(t => new MasterPreferenceTagDto
        {
            Id = t.Id,
            Name = t.Name,
            IsActive = t.IsActive,
            CreatedAt = t.CreatedAt
        });
    }
}
