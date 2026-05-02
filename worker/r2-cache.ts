import { env, waitUntil } from 'cloudflare:workers';
import path from 'path';
import trimStart from 'lodash/trimStart';

import {
	CACHE_CREATED_AT_HEADER,
	CACHE_HEADER,
	CACHE_VERSION
} from '@/constants';

class R2Cache {
	readonly prefix: string;
	readonly volatile: boolean;

	constructor(options: { prefix: string; volatile?: boolean }) {
		this.prefix = options.prefix;
		this.volatile = options.volatile ?? true;
	}

	key(url: string): string {
		const parsed = new URL(url);
		parsed.searchParams.sort();

		return (
			trimStart(
				path.join(this.prefix, CACHE_VERSION, parsed.pathname),
				'/'
			) + parsed.search
		);
	}

	async match(url: string): Promise<Response | null> {
		const key = this.key(url);
		const cacheUrl = `https://r2-cache/${key}`;
		const volatileCache = this.volatile
			? await caches.open('r2-cache')
			: null;

		if (volatileCache) {
			const volatileHit = await volatileCache.match(cacheUrl);

			if (volatileHit) {
				const headers = new Headers(volatileHit.headers);
				headers.set(CACHE_HEADER, 'HIT');

				return new Response(volatileHit.body, { headers });
			}
		}

		const obj = await env.CACHE.get(key);

		if (!obj) {
			return null;
		}

		const headers = new Headers();
		obj.writeHttpMetadata(headers);
		headers.set(CACHE_HEADER, 'HIT');
		headers.set(CACHE_CREATED_AT_HEADER, obj.uploaded.toISOString());

		const response = new Response(obj.body, { headers });

		if (volatileCache) {
			waitUntil(volatileCache.put(cacheUrl, response.clone()));
		}

		return response;
	}

	async put(url: string, response: Response): Promise<void> {
		const key = this.key(url);
		const cacheUrl = `https://r2-cache/${key}`;
		const cacheControl = response.headers.get('cache-control') || '';
		const contentType =
			response.headers.get('content-type') || 'application/octet-stream';
		const volatileCache = this.volatile
			? await caches.open('r2-cache')
			: null;

		if (!volatileCache) {
			await env.CACHE.put(key, response.body, {
				httpMetadata: {
					cacheControl,
					contentType
				}
			});

			return;
		}

		const volatileHeaders = new Headers(response.headers);
		volatileHeaders.set(CACHE_CREATED_AT_HEADER, new Date().toISOString());

		const [body1, body2] = response.body
			? response.body.tee()
			: [null, null];

		await Promise.all([
			volatileCache.put(
				cacheUrl,
				new Response(body1, { headers: volatileHeaders })
			),
			env.CACHE.put(key, body2, {
				httpMetadata: {
					cacheControl,
					contentType
				}
			})
		]);
	}
}

export default R2Cache;
