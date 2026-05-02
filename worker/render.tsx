import { renderToReadableStream } from 'react-dom/server';
import { waitUntil } from 'cloudflare:workers';

import Document from '@/app/document';
import R2Cache from '@/worker/r2-cache';
import context from '@/worker/context';
import matchRoute from '@/worker/routes';
import { CACHE_ENABLED } from '@/constants';

import type { Route } from '@/libs/router';

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

	context.store.pathParams = route.pathParams;
	context.store.searchParams = url.searchParams;

	const data = route.loader ? await route.loader() : null;
	const hydration: Route.Hydration = {
		data,
		page: route.page,
		pathParams: route.pathParams,
		searchParams: url.searchParams.toString()
	};

	const stream = await renderToReadableStream(
		<Document hydration={hydration}>
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
