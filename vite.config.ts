import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
			__BUILD_TIME__: JSON.stringify(`${Date.now()}`)
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
