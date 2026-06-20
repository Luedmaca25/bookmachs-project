using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Commands;

public record UploadBookCommand : IRequest<BookDto>
{
    public Guid UserId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Author { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Condition { get; init; } = string.Empty;
    public Stream FileStream { get; init; } = Stream.Null;
    public string FileName { get; init; } = string.Empty;
}

public class UploadBookCommandHandler : IRequestHandler<UploadBookCommand, BookDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IFileStorageService _fileStorageService;

    public UploadBookCommandHandler(IUnitOfWork unitOfWork, IFileStorageService fileStorageService)
    {
        _unitOfWork = unitOfWork;
        _fileStorageService = fileStorageService;
    }

    public async Task<BookDto> Handle(UploadBookCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Author))
        {
            throw new ArgumentException("El título y el autor son obligatorios.");
        }

        // Subir la imagen de portada
        string? imageUrl = null;
        if (request.FileStream != Stream.Null && !string.IsNullOrEmpty(request.FileName))
        {
            imageUrl = await _fileStorageService.SaveFileAsync(request.FileStream, request.FileName, "uploads");
        }

        // Crear la entidad Book
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Author = request.Author,
            Description = request.Description,
            Condition = request.Condition,
            ImageUrl = imageUrl,
            BaseValue = 0.00m, // Por defecto para libros externos
            IsInternalStock = false, // Es stock externo de usuario
            IsAvailable = true,
            OwnerId = request.UserId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Books.AddAsync(book);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new BookDto
        {
            Id = book.Id,
            Title = book.Title,
            Author = book.Author,
            Description = book.Description,
            Condition = book.Condition,
            ImageUrl = book.ImageUrl,
            BaseValue = book.BaseValue,
            IsInternalStock = book.IsInternalStock,
            IsAvailable = book.IsAvailable,
            OwnerId = book.OwnerId,
            CreatedAt = book.CreatedAt
        };
    }
}
