using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Repositories;

public class GlobalSettingsRepository : IGlobalSettingsRepository
{
    private readonly BookmachsDbContext _context;

    public GlobalSettingsRepository(BookmachsDbContext context)
    {
        _context = context;
    }

    public async Task<GlobalSettings?> GetSettingsAsync()
    {
        return await _context.GlobalSettings
            .OrderBy(g => g.Id)
            .FirstOrDefaultAsync();
    }

    public async Task AddAsync(GlobalSettings settings)
    {
        await _context.GlobalSettings.AddAsync(settings);
    }

    public void Update(GlobalSettings settings)
    {
        _context.GlobalSettings.Update(settings);
    }
}
