using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Authentication.Commands;

public record SaveUserPreferencesCommand : IRequest<bool>
{
    public Guid UserId { get; init; }
    public List<string> PreferenceTags { get; init; } = new();
}

public class SaveUserPreferencesCommandHandler : IRequestHandler<SaveUserPreferencesCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;

    public SaveUserPreferencesCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(SaveUserPreferencesCommand request, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        // Limpiar preferencias existentes
        user.Preferences.Clear();

        // Agregar nuevas preferencias
        foreach (var tag in request.PreferenceTags.Distinct())
        {
            user.Preferences.Add(new UserPreference
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                PreferenceTag = tag,
                CreatedAt = DateTime.UtcNow
            });
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return true;
    }
}
