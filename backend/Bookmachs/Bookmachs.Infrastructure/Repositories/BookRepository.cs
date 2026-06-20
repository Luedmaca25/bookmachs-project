using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Repositories;

public class BookRepository : IBookRepository
{
    private readonly BookmachsDbContext _context;

    public BookRepository(BookmachsDbContext context)
    {
        _context = context;
    }

    public async Task<Book?> GetByIdAsync(Guid id)
    {
        return await _context.Books
            .Include(b => b.Owner)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task<IEnumerable<Book>> GetAvailableBooksAsync()
    {
        return await _context.Books
            .Where(b => b.IsAvailable && (!b.IsReserved || b.ReservedUntil < DateTime.UtcNow))
            .Include(b => b.Owner)
            .ToListAsync();
    }

    public async Task<IEnumerable<Book>> GetBooksByOwnerIdAsync(Guid ownerId)
    {
        return await _context.Books
            .Where(b => b.OwnerId == ownerId)
            .ToListAsync();
    }

    public async Task AddAsync(Book book)
    {
        await _context.Books.AddAsync(book);
    }

    public void Update(Book book)
    {
        _context.Books.Update(book);
    }

    public void Delete(Book book)
    {
        _context.Books.Remove(book);
    }
}
