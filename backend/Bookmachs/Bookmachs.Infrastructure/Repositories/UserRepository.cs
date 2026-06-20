using System;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly BookmachsDbContext _context;

    public UserRepository(BookmachsDbContext context)
    {
        _context = context;
    }

    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await _context.Users
            .Include(u => u.Preferences)
            .Include(u => u.Books)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.Email == email);
    }

    public async Task<User?> GetByGoogleSubAsync(string googleSub)
    {
        return await _context.Users
            .Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.GoogleSub == googleSub);
    }

    public async Task AddAsync(User user)
    {
        await _context.Users.AddAsync(user);
    }

    public void Update(User user)
    {
        _context.Users.Update(user);
    }
}
