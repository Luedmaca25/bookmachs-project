using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;

namespace Bookmachs.Domain.Repositories;

public interface IBookRepository
{
    Task<Book?> GetByIdAsync(Guid id);
    Task<IEnumerable<Book>> GetAvailableBooksAsync();
    Task<IEnumerable<Book>> GetBooksByOwnerIdAsync(Guid ownerId);
    Task AddAsync(Book book);
    void Update(Book book);
    void Delete(Book book);
}
