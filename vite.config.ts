import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The config is loaded once per build environment (the worker, then the client) in the same process: the first load
// fixes the build id and the next one reads it, since both bundles must print the same id or the page fails to hydrate.
process.env.BUILD_TIME ??= `${Date.now()}`;

export default defineConfig(() => {
	return {
		build: {
			minify: true,
			rollupOptions: {
				output: {
					assetFileNames: info => {
						const name = info.names?.[0] ?? info.name ?? '';

						if (name.endsWith('.css')) {
							return 'assets/client.css';
						}

						return 'assets/[name]-[hash].[ext]';
					},
					chunkFileNames: 'assets/[name]-[hash].js',
					entryFileNames: 'assets/client.js'
				}
			}
		},
		define: {
			__BUILD_TIME__: JSON.stringify(process.env.BUILD_TIME)
		},
		plugins: [
			cloudflare({
				configPath: './wrangler.jsonc'
			}),
			react(),
			tailwindcss()
		],
		resolve: {
			alias: {
				'@': __dirname
			}
		}
	};
});
