/**
 * Formateador de RUT Chileno (ej. 12.345.678-K)
 */
export const formatRut = (value: string): string => {
  // Limpiar caracteres no válidos (solo números y K/k)
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (!clean) return '';

  if (clean.length === 1) return clean;

  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);

  // Formatear cuerpo con puntos
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${dv}`;
};

/**
 * Obtiene la URL completa o relativa para servir archivos/avatares
 */
export const getFileUrl = (path: string | undefined | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}${path}`;
};

/**
 * Placeholder según país seleccionado
 */
export const getPhonePlaceholder = (country: string): string => {
  switch (country) {
    case 'Chile':
      return '+56 9 1234 5678';
    case 'Argentina':
      return '+54 9 11 1234 5678';
    case 'Colombia':
      return '+57 300 123 4567';
    case 'México':
      return '+52 55 1234 5678';
    case 'Perú':
      return '+51 912 345 678';
    default:
      return '+56 9 1234 5678';
  }
};

/**
 * Formateador dinámico de número telefónico según el país seleccionado
 */
export const formatPhoneByCountry = (value: string, country: string): string => {
  let digits = value.replace(/\D/g, '');

  switch (country) {
    case 'Chile': {
      if (digits.startsWith('56')) digits = digits.slice(2);
      if (digits.length > 0 && !digits.startsWith('9')) digits = '9' + digits;
      digits = digits.slice(0, 9);
      if (!digits) return '';

      let formatted = '+56 ' + digits[0];
      if (digits.length > 1) formatted += ' ' + digits.slice(1, 5);
      if (digits.length > 5) formatted += ' ' + digits.slice(5, 9);
      return formatted;
    }

    case 'Argentina': {
      if (digits.startsWith('549')) digits = digits.slice(3);
      else if (digits.startsWith('54')) digits = digits.slice(2);
      digits = digits.slice(0, 10);
      if (!digits) return '';

      let formatted = '+54 9 ' + digits.slice(0, 2);
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 10);
      return formatted;
    }

    case 'Colombia': {
      if (digits.startsWith('57')) digits = digits.slice(2);
      if (digits.length > 0 && !digits.startsWith('3')) digits = '3' + digits;
      digits = digits.slice(0, 10);
      if (!digits) return '';

      let formatted = '+57 ' + digits.slice(0, 3);
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 10);
      return formatted;
    }

    case 'México': {
      if (digits.startsWith('52')) digits = digits.slice(2);
      digits = digits.slice(0, 10);
      if (!digits) return '';

      let formatted = '+52 ' + digits.slice(0, 2);
      if (digits.length > 2) formatted += ' ' + digits.slice(2, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 10);
      return formatted;
    }

    case 'Perú': {
      if (digits.startsWith('51')) digits = digits.slice(2);
      if (digits.length > 0 && !digits.startsWith('9')) digits = '9' + digits;
      digits = digits.slice(0, 9);
      if (!digits) return '';

      let formatted = '+51 ' + digits.slice(0, 3);
      if (digits.length > 3) formatted += ' ' + digits.slice(3, 6);
      if (digits.length > 6) formatted += ' ' + digits.slice(6, 9);
      return formatted;
    }

    default: {
      digits = digits.slice(0, 12);
      if (!digits) return '';
      return '+' + digits;
    }
  }
};
