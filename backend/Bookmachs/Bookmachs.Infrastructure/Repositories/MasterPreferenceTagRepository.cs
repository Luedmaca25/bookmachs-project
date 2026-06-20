using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Repositories;

public class MasterPreferenceTagRepository : IMasterPreferenceTagRepository
{
    private readonly BookmachsDbContext _context;

    public MasterPreferenceTagRepository(BookmachsDbContext context)
    {
        _context = context;
    }

    public async Task<MasterPreferenceTag?> GetByIdAsync(int id)
    {
        return await _context.MasterPreferenceTags
            .FirstOrDefaultAsync(m => m.Id == id);
    }

    public async Task<IEnumerable<MasterPreferenceTag>> GetAllAsync(bool onlyActive = false)
    {
        IQueryable<MasterPreferenceTag> query = _context.MasterPreferenceTags;
        
        if (onlyActive)
        {
            query = query.Where(m => m.IsActive);
        }

        return await query.OrderBy(m => m.Name).ToListAsync();
    }

    public async Task AddAsync(MasterPreferenceTag tag)
    {
        await _context.MasterPreferenceTags.AddAsync(tag);
    }

    public void Update(MasterPreferenceTag tag)
    {
        _context.MasterPreferenceTags.Update(tag);
    }

    public void Delete(MasterPreferenceTag tag)
    {
        _context.MasterPreferenceTags.Remove(tag);
    }
}
