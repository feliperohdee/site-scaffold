import { renderToReadableStream } from 'react-dom/server';
import { waitUntil } from 'cloudflare:workers';

import { CACHE_ENABLED } from '@/constants';
import Document from '@/app/document';
import matchRoute from '@/app/routes';
import R2Cache from '@/worker/r2-cache';

const r2cache = new R2Cache({ prefix: 'pages' });

const buildHeaders = () => {
	const headers = new Headers({
		'cache-control': 'public, max-age=300',
		'content-type': 'text/html; charset=utf-8'
	});

	return headers;
};

const renderStream = async (
	request: Request
): Promise<ReadableStream<Uint8Array>> => {
	const url = new URL(request.url);
	const route = matchRoute(url.pathname);

	const data = route.loader
		? await route.loader({
				pathParams: route.pathParams,
				request,
				searchParams: url.searchParams
			})
		: null;

	const stream = await renderToReadableStream(
		<Document data={data}>
			<route.Component
				data={data}
				pathParams={route.pathParams}
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

const renderWithCache = async (
	request: Request,
	cache: R2Cache
): Promise<Response> => {
	const url = new URL(request.url);
	const route = matchRoute(url.pathname);

	if (!route.cache) {
		const stream = await renderStream(request);

		return new Response(stream, { headers: buildHeaders() });
	}

	const cacheKey = url.toString();
	const cached = await cache.match(cacheKey);

	if (cached) {
		return cached;
	}

	const stream = await renderStream(request);
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

const renderHtml = async (request: Request): Promise<Response> => {
	if (!CACHE_ENABLED) {
		const stream = await renderStream(request);

		return new Response(stream, { headers: buildHeaders() });
	}

	return renderWithCache(request, r2cache);
};

export { renderStream, renderWithCache };
export default renderHtml;
