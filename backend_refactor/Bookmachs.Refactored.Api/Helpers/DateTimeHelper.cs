using System;

namespace Bookmachs.Refactored.Api.Helpers
{
    public static class DateTimeHelper
    {
        public static DateTime GetSantiagoTime()
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("Pacific SA Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            }
            catch (TimeZoneNotFoundException)
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Santiago");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            }
        }
    }
}
