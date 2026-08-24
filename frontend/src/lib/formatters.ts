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
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5185';
  return `${baseUrl}${path}`;
};

/**
 * Obtiene el ícono de FontAwesome representativo para cada categoría / preferencia de lectura
 * basado en el catálogo maestro y la referencia visual del diseño.
 */
export const getPreferenceTagIcon = (tagName: string): string => {
  if (!tagName) return 'fa-book-open';
  const normalized = tagName.toLowerCase().trim();

  if (normalized.includes('arte') || normalized.includes('cultura') || normalized.includes('estilo')) {
    return 'fa-palette';
  }
  if (normalized.includes('ciencia') || normalized.includes('tecnología') || normalized.includes('medicina')) {
    return 'fa-atom';
  }
  if (normalized.includes('desarrollo') || normalized.includes('bienestar') || normalized.includes('autoayuda') || normalized.includes('espiritualidad')) {
    return 'fa-wand-magic-sparkles';
  }
  if (normalized.includes('educación') || normalized.includes('aprendizaje') || normalized.includes('consulta') || normalized.includes('paes')) {
    return 'fa-graduation-cap';
  }
  if (normalized.includes('ficción') || normalized.includes('novela') || normalized.includes('relato')) {
    return 'fa-masks-theater';
  }
  if (normalized.includes('historia') || normalized.includes('humanidades') || normalized.includes('sociedad') || normalized.includes('filosofía')) {
    return 'fa-landmark';
  }
  if (normalized.includes('idioma') || normalized.includes('colecciones') || normalized.includes('pack')) {
    return 'fa-language';
  }
  if (normalized.includes('infantil') || normalized.includes('juvenil') || normalized.includes('cómic')) {
    return 'fa-rocket';
  }
  if (normalized.includes('negocio') || normalized.includes('economía') || normalized.includes('derecho') || normalized.includes('inversiones')) {
    return 'fa-chart-line';
  }
  if (normalized.includes('oportunidad') || normalized.includes('novedad') || normalized.includes('oferta')) {
    return 'fa-star';
  }
  if (normalized.includes('terror') || normalized.includes('horror')) {
    return 'fa-ghost';
  }
  if (normalized.includes('misterio') || normalized.includes('thriller')) {
    return 'fa-magnifying-glass';
  }
  if (normalized.includes('romance') || normalized.includes('amor')) {
    return 'fa-heart';
  }
  if (normalized.includes('música') || normalized.includes('musical')) {
    return 'fa-music';
  }

  return 'fa-book-open';
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
