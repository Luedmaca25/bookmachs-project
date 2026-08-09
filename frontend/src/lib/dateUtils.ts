// Helper para mapear países de registro a zonas horarias IANA
export const getTimeZoneForCountry = (country?: string): string => {
  if (!country) return Intl.DateTimeFormat().resolvedOptions().timeZone;

  const normalized = country.toLowerCase().trim();
  if (normalized.includes('chile')) return 'America/Santiago';
  if (normalized.includes('méxico') || normalized.includes('mexico')) return 'America/Mexico_City';
  if (normalized.includes('colombia')) return 'America/Bogota';
  if (normalized.includes('argentina')) return 'America/Argentina/Buenos_Aires';
  if (normalized.includes('españa') || normalized.includes('spain')) return 'Europe/Madrid';
  if (normalized.includes('perú') || normalized.includes('peru')) return 'America/Lima';
  if (normalized.includes('venezuela')) return 'America/Caracas';
  if (normalized.includes('ecuador')) return 'America/Guayaquil';

  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Parser de fechas UTC enviadas desde el servidor .NET
export const parseUtcDate = (dateStr?: string | Date): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  const str = dateStr.trim();
  if (!str) return new Date();

  // Si la cadena no especifica 'Z' ni zona horaria (+/-), se agrega 'Z' para forzar interpretación UTC
  let utcString = str;
  if (!str.endsWith('Z') && !str.includes('+') && !str.match(/-\d{2}:\d{2}$/)) {
    utcString = str.includes('T') ? `${str}Z` : `${str.replace(' ', 'T')}Z`;
  }

  const date = new Date(utcString);
  return isNaN(date.getTime()) ? new Date(dateStr) : date;
};

// Formateador de fecha en la zona horaria del país del usuario
export const formatDateInUserTimezone = (dateStr?: string | Date, userCountry?: string): string => {
  const date = parseUtcDate(dateStr);
  const timeZone = getTimeZoneForCountry(userCountry);

  try {
    return new Intl.DateTimeFormat('es-CL', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch {
    return date.toLocaleString('es-CL');
  }
};

// Cálculo exacto del plazo de 5 días de entrega (días y horas restantes)
export interface FulfillmentTiming {
  createdDate: Date;
  deadlineDate: Date;
  formattedCreatedDate: string;
  formattedDeadlineDate: string;
  totalHoursRemaining: number;
  daysRemaining: number;
  hoursRemainingMod: number;
  elapsedDays: number;
  isExpired: boolean;
  timeZoneLabel: string;
}

export const calculateFulfillmentTiming = (createdAtStr?: string, userCountry?: string): FulfillmentTiming => {
  const createdDate = parseUtcDate(createdAtStr);
  const deadlineDate = new Date(createdDate.getTime() + 5 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const totalMsRemaining = deadlineDate.getTime() - now.getTime();
  const totalHoursRemaining = Math.max(0, Math.floor(totalMsRemaining / (1000 * 60 * 60)));
  
  const daysRemaining = Math.min(5, Math.floor(totalHoursRemaining / 24));
  const hoursRemainingMod = totalHoursRemaining % 24;

  const msElapsed = Math.max(0, now.getTime() - createdDate.getTime());
  const elapsedDays = Math.min(5, Math.max(1, Math.floor(msElapsed / (1000 * 60 * 60 * 24)) + 1));

  const timeZone = getTimeZoneForCountry(userCountry);

  return {
    createdDate,
    deadlineDate,
    formattedCreatedDate: formatDateInUserTimezone(createdDate, userCountry),
    formattedDeadlineDate: formatDateInUserTimezone(deadlineDate, userCountry),
    totalHoursRemaining,
    daysRemaining,
    hoursRemainingMod,
    elapsedDays,
    isExpired: totalMsRemaining <= 0,
    timeZoneLabel: timeZone
  };
};
