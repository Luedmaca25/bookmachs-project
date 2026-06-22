using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;

namespace Bookmachs.Domain.Repositories;

public interface ITimelineEventRepository
{
    Task AddAsync(TimelineEvent timelineEvent);
    Task<IEnumerable<TimelineEvent>> GetPublicEventsAsync(int limit);
}
