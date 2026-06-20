using System.Collections.Generic;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;

namespace Bookmachs.Domain.Repositories;

public interface IMasterPreferenceTagRepository
{
    Task<MasterPreferenceTag?> GetByIdAsync(int id);
    Task<IEnumerable<MasterPreferenceTag>> GetAllAsync(bool onlyActive = false);
    Task AddAsync(MasterPreferenceTag tag);
    void Update(MasterPreferenceTag tag);
    void Delete(MasterPreferenceTag tag);
}
