import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const rootDir = import.meta.dirname;

// Suppress Wrangler's environment banner in test output.
process.env.WRANGLER_LOG ??= 'warn';

export default defineConfig({
	define: {
		__BUILD_TIME__: JSON.stringify('test')
	},
	plugins: [
		cloudflareTest({
			// Keep remote bindings local; tests must not reach real services.
			remoteBindings: false,
			// Disable verbose workerd logs for handled promise rejections.
			verbose: false,
			wrangler: { configPath: './wrangler.test.jsonc' }
		})
	],
	resolve: {
		alias: {
			'@': rootDir
		}
	},
	test: {
		fileParallelism: false
	}
});
