import type { KeksmeisterTranslations } from '../core/types.js';

export const es: KeksmeisterTranslations = {
  banner: {
    title: 'Configuración de cookies',
    description:
      'Utilizamos cookies para ofrecerle la mejor experiencia posible en nuestro sitio web. Algunas cookies son esenciales para el funcionamiento del sitio, mientras que otras nos ayudan a mejorarlo y a mostrarle contenido relevante.',
    acceptAll: 'Aceptar todo',
    rejectAll: 'Rechazar todo',
    settings: 'Configuración',
  },
  modal: {
    title: 'Configuración de cookies',
    description:
      'Aquí puede elegir en detalle qué cookies desea permitir. Las cookies esenciales no se pueden desactivar, ya que son necesarias para el funcionamiento del sitio web.',
    save: 'Guardar selección',
    acceptAll: 'Aceptar todo',
    rejectAll: 'Rechazar todo',
    alwaysActive: 'Siempre activo',
  },
  privacyLink: 'Política de privacidad',
  trigger: { label: 'Configuración de cookies' },
  categories: {
    essential: {
      label: 'Esenciales',
      description:
        'Estas cookies son estrictamente necesarias para el funcionamiento del sitio web y no se pueden desactivar.',
    },
    functional: {
      label: 'Funcionales',
      description:
        'Estas cookies permiten funcionalidades avanzadas y personalización, como la configuración del idioma.',
    },
    analytics: {
      label: 'Analíticas',
      description:
        'Estas cookies nos ayudan a entender cómo los visitantes interactúan con el sitio web, lo que nos permite mejorar la experiencia del usuario.',
    },
    marketing: {
      label: 'Marketing',
      description:
        'Estas cookies se utilizan para mostrar a los visitantes publicidad y campañas de marketing relevantes.',
    },
  },
};
