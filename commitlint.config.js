export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      ['core', 'ui', 'adapters', 'i18n', 'demo', 'ci', 'build'],
    ],
  },
};
