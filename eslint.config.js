import globals from 'globals';
import imports from '@feliperohdee/eslint-plugin-imports';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['dist', '*.d.ts']
	},
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser
		},
		plugins: {
			'@feliperohdee/imports': imports,
			'react-hooks': reactHooks
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'@feliperohdee/imports/sort-imports-by-line': 'error',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-namespace': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'no-async-promise-executor': 'off',
			'no-case-declarations': 'off',
			'prefer-const': 'off',
			'prefer-spread': 'off'
		}
	}
);
