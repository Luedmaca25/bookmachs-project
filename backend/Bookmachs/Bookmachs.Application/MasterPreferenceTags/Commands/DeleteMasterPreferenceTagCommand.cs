using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.MasterPreferenceTags.Commands;

public record DeleteMasterPreferenceTagCommand(int Id) : IRequest<bool>;

public class DeleteMasterPreferenceTagCommandHandler : IRequestHandler<DeleteMasterPreferenceTagCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMasterPreferenceTagCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(DeleteMasterPreferenceTagCommand request, CancellationToken cancellationToken)
    {
        var tag = await _unitOfWork.MasterPreferenceTags.GetByIdAsync(request.Id);

        if (tag == null)
        {
            throw new KeyNotFoundException($"No se encontró la etiqueta con Id {request.Id}");
        }

        _unitOfWork.MasterPreferenceTags.Delete(tag);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}
