import { renderToReadableStream } from 'react-dom/server';
import { waitUntil } from 'cloudflare:workers';

import Document from '@/app/document';
import R2Cache from '@/worker/r2-cache';
import { CACHE_ENABLED } from '@/constants';
import { matchRoute } from '@/app/routes';

const r2cache = new R2Cache({ prefix: 'pages' });

const buildHeaders = () => {
	const headers = new Headers({
		'cache-control': 'public, max-age=300',
		'content-type': 'text/html; charset=utf-8'
	});

	return headers;
};

const renderStream = async (url: URL): Promise<ReadableStream<Uint8Array>> => {
	const { Component, pathParams } = matchRoute(url.pathname);

	const stream = await renderToReadableStream(
		<Document>
			<Component
				pathParams={pathParams}
				searchParams={url.searchParams}
			/>
		</Document>,
		{
			onError: err => {
				console.error('SSR render error:', err);
			}
		}
	);

	return stream;
};

const renderWithCache = async (url: URL, cache: R2Cache): Promise<Response> => {
	const cacheKey = url.toString();
	const cached = await cache.match(cacheKey);

	if (cached) {
		return cached;
	}

	const stream = await renderStream(url);
	const [bodyForClient, bodyForCache] = stream.tee();

	waitUntil(
		(async () => {
			const bytes = await new Response(bodyForCache).arrayBuffer();

			await cache.put(
				cacheKey,
				new Response(bytes, { headers: buildHeaders() })
			);
		})()
	);

	return new Response(bodyForClient, { headers: buildHeaders() });
};

const renderHtml = async (url: URL): Promise<Response> => {
	if (!CACHE_ENABLED) {
		const stream = await renderStream(url);

		return new Response(stream, { headers: buildHeaders() });
	}

	return renderWithCache(url, r2cache);
};

export { renderStream, renderWithCache };
export default renderHtml;
