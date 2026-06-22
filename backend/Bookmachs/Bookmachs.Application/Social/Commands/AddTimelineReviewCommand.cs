using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Social.Commands;

public class TimelineReviewResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public record AddTimelineReviewCommand : IRequest<TimelineReviewResultDto>
{
    public Guid TimelineEventId { get; init; }
    public Guid UserId { get; init; }
    public string ReviewComment { get; init; } = string.Empty;
    public int ReviewRating { get; init; }
}

public class AddTimelineReviewCommandHandler : IRequestHandler<AddTimelineReviewCommand, TimelineReviewResultDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public AddTimelineReviewCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<TimelineReviewResultDto> Handle(AddTimelineReviewCommand request, CancellationToken cancellationToken)
    {
        var timelineEvent = await _unitOfWork.TimelineEvents.GetByIdAsync(request.TimelineEventId);
        if (timelineEvent == null)
        {
            throw new KeyNotFoundException($"El evento de timeline con ID {request.TimelineEventId} no existe.");
        }

        // Validar que el usuario que intenta calificar sea parte de la transacción original
        if (timelineEvent.MatchTransaction == null)
        {
            throw new InvalidOperationException("El evento de timeline no está vinculado a una transacción válida.");
        }

        if (timelineEvent.MatchTransaction.RequesterUserId != request.UserId && 
            timelineEvent.MatchTransaction.OwnerUserId != request.UserId)
        {
            throw new UnauthorizedAccessException("Solo los participantes de este intercambio pueden agregar notas o reseñas.");
        }

        // Validar rango de calificación
        if (request.ReviewRating < 1 || request.ReviewRating > 5)
        {
            throw new ArgumentException("La calificación debe estar entre 1 y 5 estrellas.");
        }

        // Asignar reseña
        timelineEvent.ReviewComment = request.ReviewComment;
        timelineEvent.ReviewRating = request.ReviewRating;

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new TimelineReviewResultDto
        {
            Success = true,
            Message = "Reseña y nota agregadas al timeline con éxito."
        };
    }
}
