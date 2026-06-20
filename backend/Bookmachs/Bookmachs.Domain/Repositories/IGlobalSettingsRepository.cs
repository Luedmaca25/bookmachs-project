using System.Threading.Tasks;
using Bookmachs.Domain.Entities;

namespace Bookmachs.Domain.Repositories;

public interface IGlobalSettingsRepository
{
    Task<GlobalSettings?> GetSettingsAsync();
    void Update(GlobalSettings settings);
}
