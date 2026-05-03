import _ from 'lodash';
import RouterEngine from 'use-request-utils/router';
import type { ComponentType } from 'react';

import { isClientOnly } from '@/libs/client-only';

namespace Route {
	// Shape of <title>/<meta>/canonical/og:* tags emitted by <DocumentHead>.
	// Routes return this from `meta(data)` and the document shell renders it.
	export type Meta = {
		canonical?: string;
		description?: string;
		image?: string;
		ogType?: string;
		title: string;
	};

	// Route boundary: we lose per-route data typing when storing in the engine
	// (ComponentType is contravariant in props). `any` here is intentional —
	// each page narrows `data` against its own loader's return type.
	export type Data = any;

	// User-facing handler shape: just the Component (and optional loader/cache/SEO).
	// The page key is derived from the pages map via reverse-lookup, so the
	// caller doesn't have to declare it twice.
	export type Handler = {
		cache?: boolean;
		// Override the cache key's version segment. Returning a string opts
		// the route out of the global build-time CACHE_VERSION bust; null
		// keeps default behavior. See worker/r2-cache.ts.
		cacheScope?: (data: Data) => string | null;
		Component: PageComponent;
		// indexable === false → <meta name="robots" content="noindex,nofollow">
		// AND exclusion from sitemap (when the contributor's `indexable` checks).
		indexable?: (data: Data) => boolean;
		// schema.org payload(s) emitted as <script type="application/ld+json">.
		jsonLd?: (data: Data) => unknown;
		loader?: Loader;
		// title / description / canonical / og:* — emitted by <DocumentHead>.
		meta?: (data: Data) => Meta | null;
	};

	// Hydration meta the server embeds in __data and the client reads to
	// pick the matching Component via a simple page→Component switch.
	// `searchParams` is the serialized query string (e.g. "a=1&b=2") so it
	// round-trips through JSON; reconstruct via `new URLSearchParams(...)`.
	export type Hydration<T = Data> = Resolved<T> & {
		page: Page;
		pathParams: Record<string, unknown>;
		searchParams: string;
	};

	export type Instance = {
		add: (path: string, handler: Handler) => Instance;
		match: (pathname: string) => MatchResult;
		notFound: (handler: Handler) => Instance;
	};

	export type Loader<T = Data> = () => Promise<T> | T;

	export type MatchResult = {
		cache: boolean;
		cacheScope: ((data: Data) => string | null) | null;
		Component: PageComponent;
		indexable: ((data: Data) => boolean) | null;
		jsonLd: ((data: Data) => unknown) | null;
		loader: Loader | null;
		meta: ((data: Data) => Meta | null) | null;
		page: Page;
		pathParams: Record<string, unknown>;
	};

	// `page` is a string identifier the server emits in the hydration meta
	// so the client can pick the right Component without bundling the router.
	export type Page = string;

	export type PageComponent = ComponentType<PageProps<Data>>;

	export type PageProps<T = unknown> = {
		data: T;
		pathParams: Record<string, unknown>;
		searchParams: URLSearchParams;
	};

	// Resolved route output: loader data + the SEO/quality fields derived from
	// it. The render pipeline computes this once, hands it to the cache layer
	// and the document shell, and embeds it in the hydration payload.
	export type Resolved<T = Data> = {
		data: T;
		indexable: boolean;
		jsonLd: unknown;
		meta: Meta | null;
	};
}

const createRouter = (
	pages: Record<Route.Page, Route.PageComponent>
): Route.Instance => {
	const engine = new RouterEngine<Route.Handler>();
	const componentToPage = new Map<Route.PageComponent, Route.Page>(
		_.map(pages, (Component, page) => {
			return [Component, page];
		})
	);
	let notFoundHandler: Route.Handler | null = null;

	const buildNotFoundResult = (): Route.MatchResult => {
		if (_.isNull(notFoundHandler)) {
			throw new Error(
				'Router has no notFound handler; call .notFound(handler) before .match().'
			);
		}

		const Component = notFoundHandler.Component;
		const page = componentToPage.get(Component) ?? '';

		return {
			cache: notFoundHandler.cache ?? true,
			cacheScope: notFoundHandler.cacheScope ?? null,
			Component,
			indexable:
				notFoundHandler.indexable ??
				(() => {
					return false;
				}),
			jsonLd: notFoundHandler.jsonLd ?? null,
			loader: notFoundHandler.loader ?? null,
			meta: notFoundHandler.meta ?? null,
			page,
			pathParams: {}
		};
	};

	const router: Route.Instance = {
		add: (path, handler) => {
			if (
				import.meta.env.DEV &&
				!componentToPage.has(handler.Component)
			) {
				throw new Error(
					`Route '${path}' uses a component that is not registered in the pages map; make sure the component file lives in app/pages/.`
				);
			}

			engine.add('GET', path, handler);

			return router;
		},
		match: pathname => {
			const matches = engine.match('GET', pathname);
			const match = matches[0];

			if (!match) {
				return buildNotFoundResult();
			}

			if (isClientOnly(match.handler.Component)) {
				if (import.meta.env.DEV) {
					throw new Error(
						`Route '${pathname}' uses a client-only component as its page; client-only components must be children of a page, not pages themselves.`
					);
				}

				return buildNotFoundResult();
			}

			const result: Route.MatchResult = {
				cache: match.handler.cache ?? true,
				cacheScope: match.handler.cacheScope ?? null,
				Component: match.handler.Component,
				indexable: match.handler.indexable ?? null,
				jsonLd: match.handler.jsonLd ?? null,
				loader: match.handler.loader ?? null,
				meta: match.handler.meta ?? null,
				page: componentToPage.get(match.handler.Component) ?? '',
				pathParams: match.pathParams
			};

			return result;
		},
		notFound: handler => {
			if (
				import.meta.env.DEV &&
				!componentToPage.has(handler.Component)
			) {
				throw new Error(
					'notFound() uses a component that is not registered in the pages map; make sure the component file lives in app/pages/.'
				);
			}

			notFoundHandler = handler;

			return router;
		}
	};

	return router;
};

export type { Route };
export default createRouter;
