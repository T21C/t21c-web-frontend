module.exports = {
  root: true,
  env: { 
    browser: true, 
    es2020: true,
    node: true
  },
  extends: [
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:react/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.js'],
  parser: '@babel/eslint-parser',
  parserOptions: { 
    ecmaVersion: 'latest', 
    sourceType: 'module',
    requireConfigFile: false,
    babelOptions: {
      presets: ['@babel/preset-react']
    }
  },
  settings: {
    'import/parsers': {
      '@babel/eslint-parser': ['.js', '.jsx']
    },
    'import/resolver': {
      node: {
        paths: ['src'],
        extensions: ['.js', '.jsx', '.json', '.d.ts']
      },
      alias: {
        map: [
          ['@', './src']
        ],
        extensions: ['.js', '.jsx', '.json', '.d.ts']
      }
    },
    react: {
      version: 'detect'
    }
  },
  plugins: ['import', 'react'],
  rules: {
    // Enable import resolution and named exports validation
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'error',
    'import/export': 'error',
    'import/no-self-import': 'error',
    'import/extensions': ['error', 'never', { json: 'always' }],
    
    // React specific rules
    'react/jsx-uses-react': 'off',
    'react/jsx-uses-vars': 'off',
    'react/jsx-no-target-blank': 'off',
    
    // Keep other rules disabled
    'import/no-cycle': 'off',
    'import/first': 'off',
    'import/no-duplicates': 'off',
    'import/order': 'off',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',
    'react/prop-types': 'off',
    'no-unused-vars': 'off',
    'react/display-name': 'off',
    'react/jsx-no-undef': 'off',
    'react/no-did-mount-set-state': 'off',
    'react/no-did-update-set-state': 'off',
    'react/no-unknown-property': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/self-closing-comp': 'off',
    'react/sort-comp': 'off',
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': 'off',
    'report-unused-disable-directives': 'off'
  },
  globals: {
    ImportMetaEnv: 'readonly',
    ImportMeta: 'readonly'
  }
}
