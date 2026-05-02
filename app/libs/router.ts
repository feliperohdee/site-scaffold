import RouterEngine from 'use-request-utils/router';

import type { ComponentType } from 'react';

namespace Route {
	export type PageProps<T = unknown> = {
		data: T;
		pathParams: Record<string, unknown>;
		searchParams: URLSearchParams;
	};

	// Route boundary: we lose per-route data typing when storing in the engine
	// (ComponentType is contravariant in props). `any` here is intentional —
	// each page narrows `data` against its own loader's return type.
	export type Data = any;

	export type PageComponent = ComponentType<PageProps<Data>>;

	export type LoaderContext = {
		pathParams: Record<string, unknown>;
		request: Request;
		searchParams: URLSearchParams;
	};

	export type Loader<T = Data> = (ctx: LoaderContext) => Promise<T> | T;

	export type Handler = {
		cache?: boolean;
		Component: PageComponent;
		loader?: Loader;
	};

	export type MatchResult = {
		cache: boolean;
		Component: PageComponent;
		loader: Loader | null;
		pathParams: Record<string, unknown>;
	};

	export type Instance = {
		add: (path: string, handler: Handler) => Instance;
		match: (pathname: string) => MatchResult;
	};
}

const createRouter = (notFound: Route.PageComponent): Route.Instance => {
	const engine = new RouterEngine<Route.Handler>();

	const router: Route.Instance = {
		add: (path, handler) => {
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
					pathParams: {}
				};

				return result;
			}

			const result: Route.MatchResult = {
				cache: match.handler.cache ?? true,
				Component: match.handler.Component,
				loader: match.handler.loader ?? null,
				pathParams: match.pathParams
			};

			return result;
		}
	};

	return router;
};

export type { Route };
export default createRouter;
