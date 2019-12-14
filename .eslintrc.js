module.exports = {
  root: true,
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'airbnb'],
  rules: {
    'import/no-unresolved': 'error', //maybe we do not need this
    'import/prefer-default-export': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'no-extra-semi': 0,
    semi: 2,
    indent: ['warn', 2],
    quotes: [
      'error',
      'single',
      {
        allowTemplateLiterals: false,
        avoidEscape: true
      }
    ],
    camelcase: 0, //'warn',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-plusplus': 0,
    'no-useless-constructor': 'off', // TS has some issues with this, so we use their check
    '@typescript-eslint/no-useless-constructor': 'error',
    'import/extensions':0
  },
  parser: '@typescript-eslint/parser',
  settings: {
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx']
    },
    'import/resolver': {
      // use <root>/tsconfig.json
      node: {},
      typescript: {}
    }
  }
};
