using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Repositories;

public class TimelineEventRepository : ITimelineEventRepository
{
    private readonly BookmachsDbContext _context;

    public TimelineEventRepository(BookmachsDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(TimelineEvent timelineEvent)
    {
        await _context.TimelineEvents.AddAsync(timelineEvent);
    }

    public async Task<TimelineEvent?> GetByIdAsync(Guid id)
    {
        return await _context.TimelineEvents
            .Include(e => e.MatchTransaction)
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    public async Task<IEnumerable<TimelineEvent>> GetPublicEventsAsync(int limit)
    {
        return await _context.TimelineEvents
            .Include(e => e.MatchTransaction)
                .ThenInclude(t => t.Book)
            .Include(e => e.MatchTransaction)
                .ThenInclude(t => t.RequesterUser)
            .Include(e => e.MatchTransaction)
                .ThenInclude(t => t.OwnerUser)
            .OrderByDescending(e => e.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }
}
