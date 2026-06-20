using System;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Repositories;

public class SubscriptionRepository : ISubscriptionRepository
{
    private readonly BookmachsDbContext _context;

    public SubscriptionRepository(BookmachsDbContext context)
    {
        _context = context;
    }

    public async Task<Subscription?> GetByIdAsync(Guid id)
    {
        return await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<Subscription?> GetActiveSubscriptionByUserIdAsync(Guid userId)
    {
        return await _context.Subscriptions
            .Where(s => s.UserId == userId && s.IsActive && s.EndDate > DateTime.UtcNow)
            .OrderByDescending(s => s.EndDate)
            .FirstOrDefaultAsync();
    }

    public async Task AddAsync(Subscription subscription)
    {
        await _context.Subscriptions.AddAsync(subscription);
    }

    public void Update(Subscription subscription)
    {
        _context.Subscriptions.Update(subscription);
    }
}
