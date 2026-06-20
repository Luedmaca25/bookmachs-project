using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.MasterPreferenceTags.Commands;

public record UpdateMasterPreferenceTagCommand : IRequest<MasterPreferenceTagDto>
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public bool IsActive { get; init; }
}

public class UpdateMasterPreferenceTagCommandHandler : IRequestHandler<UpdateMasterPreferenceTagCommand, MasterPreferenceTagDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateMasterPreferenceTagCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<MasterPreferenceTagDto> Handle(UpdateMasterPreferenceTagCommand request, CancellationToken cancellationToken)
    {
        var tag = await _unitOfWork.MasterPreferenceTags.GetByIdAsync(request.Id);

        if (tag == null)
        {
            throw new KeyNotFoundException($"No se encontró la etiqueta con Id {request.Id}");
        }

        tag.Name = request.Name;
        tag.IsActive = request.IsActive;

        _unitOfWork.MasterPreferenceTags.Update(tag);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new MasterPreferenceTagDto
        {
            Id = tag.Id,
            Name = tag.Name,
            IsActive = tag.IsActive,
            CreatedAt = tag.CreatedAt
        };
    }
}
