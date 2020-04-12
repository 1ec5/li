module.exports = {
  parserOptions: {
    ecmaVersion: 2018
  },
  env: {
    node: true,
    es6: true
  },
  extends: 'eslint:recommended',
  plugins: [
    'import'
  ],
  rules: {
    // Enable additional rules
    'linebreak-style': ['error', 'unix'],
    // Node specific
    'global-require': 'error',
    'handle-callback-err': 'error',
    // Override default options for rules from base configurations
    'no-cond-assign': ['error', 'always'],
    // Disable rules from base configurations
    'arrow-body-style': 'off',
    'no-console': 'off',
    'no-inner-declarations': 'off',
    'no-redeclare': 'off',
    'no-useless-escape': 'off',
    // Style specific
    'no-trailing-spaces': 'error',
    // Plugins
    'import/no-unresolved': [2, {commonjs: true, amd: true}]
  },
  ignorePatterns: [
    "scratch",
    "node_modules/"
  ]
}
