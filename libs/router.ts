import _ from 'lodash';
import RouterEngine from 'use-request-utils/router';

import { isClientOnly } from '@/libs/client-only';

import type { ComponentType } from 'react';

namespace Route {
	// Route boundary: we lose per-route data typing when storing in the engine
	// (ComponentType is contravariant in props). `any` here is intentional —
	// each page narrows `data` against its own loader's return type.
	export type Data = any;

	// User-facing handler shape: just the Component (and optional loader/cache).
	// The page key is derived from the pages map via reverse-lookup, so the
	// caller doesn't have to declare it twice.
	export type Handler = {
		cache?: boolean;
		Component: PageComponent;
		loader?: Loader;
	};

	// Hydration meta the server embeds in __data and the client reads to
	// pick the matching Component via a simple page→Component switch.
	// `searchParams` is the serialized query string (e.g. "a=1&b=2") so it
	// round-trips through JSON; reconstruct via `new URLSearchParams(...)`.
	export type Hydration<T = Data> = {
		data: T;
		page: Page;
		pathParams: Record<string, unknown>;
		searchParams: string;
	};

	export type Instance = {
		add: (path: string, handler: Handler) => Instance;
		match: (pathname: string) => MatchResult;
	};

	export type Loader<T = Data> = () => Promise<T> | T;

	export type MatchResult = {
		cache: boolean;
		Component: PageComponent;
		loader: Loader | null;
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
}

const createRouter = (
	notFoundPage: Route.Page,
	pages: Record<Route.Page, Route.PageComponent>
): Route.Instance => {
	const notFound = pages[notFoundPage];

	if (!notFound) {
		throw new Error(
			`Pages map is missing the notFoundPage entry: '${notFoundPage}'`
		);
	}

	const engine = new RouterEngine<Route.Handler>();
	const componentToPage = new Map<Route.PageComponent, Route.Page>(
		_.map(pages, (Component, page) => {
			return [Component, page];
		})
	);

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
				const result: Route.MatchResult = {
					cache: true,
					Component: notFound,
					loader: null,
					page: notFoundPage,
					pathParams: {}
				};

				return result;
			}

			if (isClientOnly(match.handler.Component)) {
				if (import.meta.env.DEV) {
					throw new Error(
						`Route '${pathname}' uses a client-only component as its page; client-only components must be children of a page, not pages themselves.`
					);
				}

				const result: Route.MatchResult = {
					cache: true,
					Component: notFound,
					loader: null,
					page: notFoundPage,
					pathParams: {}
				};

				return result;
			}

			const result: Route.MatchResult = {
				cache: match.handler.cache ?? true,
				Component: match.handler.Component,
				loader: match.handler.loader ?? null,
				page:
					componentToPage.get(match.handler.Component) ??
					notFoundPage,
				pathParams: match.pathParams
			};

			return result;
		}
	};

	return router;
};

export type { Route };
export default createRouter;
