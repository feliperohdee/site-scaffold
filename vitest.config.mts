import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	define: {
		__BUILD_TIME__: JSON.stringify('test')
	},
	resolve: {
		alias: {
			'@': __dirname
		}
	},
	test: {
		poolOptions: {
			workers: {
				singleWorker: true,
				wrangler: {
					configPath: './wrangler.test.jsonc'
				}
			}
		}
	}
});
