using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Commands;

public record ReserveBookCommand(Guid BookId, Guid UserId) : IRequest<ReservationResultDto>;

public class ReserveBookCommandHandler : IRequestHandler<ReserveBookCommand, ReservationResultDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public ReserveBookCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ReservationResultDto> Handle(ReserveBookCommand request, CancellationToken cancellationToken)
    {
        // 1. Obtener al usuario que reserva
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        // 2. Validar que el usuario sea premium
        if (!user.IsPremium)
        {
            throw new UnauthorizedAccessException("Se requiere una membresía Premium para poder reservar libros.");
        }

        // 3. Obtener el libro
        var book = await _unitOfWork.Books.GetByIdAsync(request.BookId);
        if (book == null)
        {
            throw new KeyNotFoundException("Libro no encontrado.");
        }

        // 4. Validar que el libro no sea propio
        if (book.OwnerId == request.UserId)
        {
            throw new InvalidOperationException("No puedes reservar tu propio libro.");
        }

        // 5. Validar disponibilidad general
        if (!book.IsAvailable)
        {
            throw new InvalidOperationException("El libro no está disponible para intercambio.");
        }

        // 6. Validar estado de reserva concurrente
        if (book.IsReserved && book.ReservedUntil >= DateTime.UtcNow)
        {
            // Validar si ya está reservado por el mismo usuario
            if (book.ReservedByUserId == request.UserId)
            {
                return new ReservationResultDto
                {
                    BookId = book.Id,
                    BookTitle = book.Title,
                    ReservedByUserId = book.ReservedByUserId.Value,
                    ReservedUntil = book.ReservedUntil.Value,
                    Success = true,
                    Message = "Ya tienes reservado este libro."
                };
            }

            throw new InvalidOperationException("El libro ya se encuentra reservado por otro usuario.");
        }

        // 7. Aplicar bloqueo y reserva por 48 horas
        book.IsReserved = true;
        book.ReservedUntil = DateTime.UtcNow.AddHours(48);
        book.ReservedByUserId = request.UserId;

        _unitOfWork.Books.Update(book);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new ReservationResultDto
        {
            BookId = book.Id,
            BookTitle = book.Title,
            ReservedByUserId = book.ReservedByUserId.Value,
            ReservedUntil = book.ReservedUntil.Value,
            Success = true,
            Message = "Libro reservado con éxito por 48 horas."
        };
    }
}

public class ReservationResultDto
{
    public Guid BookId { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public Guid ReservedByUserId { get; set; }
    public DateTime ReservedUntil { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}
