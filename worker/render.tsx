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

const renderHtml = async (request: Request): Promise<Response> => {
	if (!CACHE_ENABLED) {
		const stream = await renderStream(request);

		return new Response(stream, { headers: buildHeaders() });
	}

	return renderWithCache(request, r2cache);
};

const renderResolved = async (
	route: Route.MatchResult,
	resolved: Route.Resolved,
	searchParams: URLSearchParams
): Promise<ReadableStream<Uint8Array>> => {
	const hydration: Route.Hydration = {
		data: resolved.data,
		indexable: resolved.indexable,
		jsonLd: resolved.jsonLd,
		meta: resolved.meta,
		page: route.page,
		pathParams: route.pathParams,
		searchParams: searchParams.toString()
	};

	const stream = await renderToReadableStream(
		<Document hydration={hydration}>
			<route.Component
				data={resolved.data}
				pathParams={route.pathParams}
				searchParams={searchParams}
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

const renderStream = async (
	request: Request
): Promise<ReadableStream<Uint8Array>> => {
	const url = new URL(request.url);
	const route = matchRoute(url.pathname);

	context.store.setPathParams(route.pathParams);

	const resolved = await resolveRoute(route);

	return renderResolved(route, resolved, url.searchParams);
};

const renderWithCache = async (
	request: Request,
	cache: R2Cache
): Promise<Response> => {
	const url = new URL(request.url);
	const route = matchRoute(url.pathname);

	context.store.setPathParams(route.pathParams);

	if (!route.cache) {
		const resolved = await resolveRoute(route);
		const stream = await renderResolved(route, resolved, url.searchParams);

		return new Response(stream, { headers: buildHeaders() });
	}

	const cacheKey = url.toString();

	// Fast path: routes without cacheScope skip the loader on cache HIT,
	// preserving today's behavior where every code deploy busts the cache
	// (via CACHE_VERSION) but a hit avoids the loader entirely.
	if (!route.cacheScope) {
		const cached = await cache.match(cacheKey);

		if (cached) {
			return cached;
		}

		const resolved = await resolveRoute(route);
		const stream = await renderResolved(route, resolved, url.searchParams);
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
	}

	// Scoped path: must run the loader to compute the cache key's version
	// segment from `data`. Trade-off explicit in the plan — scoped routes
	// do the loader work on every request to gain deploy-decoupled caching.
	const resolved = await resolveRoute(route);
	const scope = route.cacheScope(resolved.data);
	const cached = await cache.match(cacheKey, scope);

	if (cached) {
		return cached;
	}

	const stream = await renderResolved(route, resolved, url.searchParams);
	const [bodyForClient, bodyForCache] = stream.tee();

	waitUntil(
		(async () => {
			const bytes = await new Response(bodyForCache).arrayBuffer();

			await cache.put(
				cacheKey,
				new Response(bytes, { headers: buildHeaders() }),
				scope
			);
		})()
	);

	return new Response(bodyForClient, { headers: buildHeaders() });
};

// Resolves loader + meta/jsonLd/indexable for a matched route. Pulled out so
// `renderWithCache` can compute cacheScope (which needs `data`) without
// re-running the loader for the actual render.
const resolveRoute = async (
	route: Route.MatchResult
): Promise<Route.Resolved> => {
	const data = route.loader ? await route.loader() : null;
	const meta = route.meta ? route.meta(data) : null;
	const jsonLd = route.jsonLd ? route.jsonLd(data) : null;
	const indexable = route.indexable ? route.indexable(data) : true;

	return { data, indexable, jsonLd, meta };
};

export { renderResolved, renderStream, renderWithCache, resolveRoute };
export default renderHtml;
