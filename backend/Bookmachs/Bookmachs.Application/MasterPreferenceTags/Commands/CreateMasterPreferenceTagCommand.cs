using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.MasterPreferenceTags.Commands;

public record CreateMasterPreferenceTagCommand : IRequest<MasterPreferenceTagDto>
{
    public string Name { get; init; } = string.Empty;
    public bool IsActive { get; init; } = true;
}

public class CreateMasterPreferenceTagCommandHandler : IRequestHandler<CreateMasterPreferenceTagCommand, MasterPreferenceTagDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateMasterPreferenceTagCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<MasterPreferenceTagDto> Handle(CreateMasterPreferenceTagCommand request, CancellationToken cancellationToken)
    {
        var tag = new MasterPreferenceTag
        {
            Name = request.Name,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.MasterPreferenceTags.AddAsync(tag);
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
