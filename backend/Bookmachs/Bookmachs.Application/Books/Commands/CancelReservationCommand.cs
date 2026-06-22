using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Commands;

public record CancelReservationCommand(Guid BookId, Guid UserId) : IRequest<ReservationResultDto>;

public class CancelReservationCommandHandler : IRequestHandler<CancelReservationCommand, ReservationResultDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public CancelReservationCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ReservationResultDto> Handle(CancelReservationCommand request, CancellationToken cancellationToken)
    {
        // 1. Obtener el libro
        var book = await _unitOfWork.Books.GetByIdAsync(request.BookId);
        if (book == null)
        {
            throw new KeyNotFoundException("Libro no encontrado.");
        }

        // 2. Validar que esté reservado por este usuario
        if (!book.IsReserved || book.ReservedByUserId != request.UserId)
        {
            throw new InvalidOperationException("No tienes ninguna reserva activa sobre este libro.");
        }

        // 3. Liberar la reserva
        book.IsReserved = false;
        book.ReservedUntil = null;
        book.ReservedByUserId = null;

        _unitOfWork.Books.Update(book);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ReservationResultDto
        {
            BookId = book.Id,
            BookTitle = book.Title,
            Success = true,
            Message = "Reserva cancelada y libro liberado exitosamente."
        };
    }
}
