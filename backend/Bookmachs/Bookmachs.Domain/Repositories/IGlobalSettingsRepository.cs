using System.Threading.Tasks;
using Bookmachs.Domain.Entities;

namespace Bookmachs.Domain.Repositories;

public interface IGlobalSettingsRepository
{
    Task<GlobalSettings?> GetSettingsAsync();
    Task AddAsync(GlobalSettings settings);
    void Update(GlobalSettings settings);
}
