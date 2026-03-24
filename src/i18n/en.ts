import type { KeksmeisterTranslations } from '../core/types.js';

export const en: KeksmeisterTranslations = {
  banner: {
    title: 'Cookie Settings',
    description:
      'We use cookies to provide you with the best possible experience on our website. Some cookies are essential for the site to function, while others help us improve the site and show you relevant content.',
    acceptAll: 'Accept all',
    rejectAll: 'Reject all',
    settings: 'Settings',
  },
  modal: {
    title: 'Cookie Settings',
    description:
      'Here you can choose in detail which cookies you want to allow. Essential cookies cannot be disabled as they are required for the website to function.',
    save: 'Save selection',
    acceptAll: 'Accept all',
    rejectAll: 'Reject all',
  },
  categories: {
    essential: {
      label: 'Essential',
      description:
        'These cookies are strictly necessary for the website to function and cannot be disabled.',
    },
    functional: {
      label: 'Functional',
      description:
        'These cookies enable enhanced functionality and personalization, such as language settings.',
    },
    analytics: {
      label: 'Analytics',
      description:
        'These cookies help us understand how visitors interact with the website, allowing us to improve the user experience.',
    },
    marketing: {
      label: 'Marketing',
      description:
        'These cookies are used to show visitors relevant advertising and marketing campaigns.',
    },
  },
};
