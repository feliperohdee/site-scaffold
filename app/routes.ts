import RouterEngine from 'use-request-utils/router';

import ArticlePage from '@/app/pages/article';
import ArticlesPage from '@/app/pages/articles';
import HomePage from '@/app/pages/home';
import NotFoundPage from '@/app/pages/not-found';
import SlugPage from '@/app/pages/slug';

import type { ComponentType } from 'react';

type PageComponent = ComponentType<{
	pathParams: Record<string, unknown>;
	searchParams: URLSearchParams;
}>;

type MatchResult = {
	Component: PageComponent;
	pathParams: Record<string, unknown>;
};

const buildEngine = () => {
	const engine = new RouterEngine<{ Component: PageComponent }>();

	engine.add('GET', '/', { Component: HomePage });
	engine.add('GET', '/articles', { Component: ArticlesPage });
	engine.add('GET', '/articles/:slug', { Component: ArticlePage });
	engine.add('GET', '/:slug', { Component: SlugPage });

	return engine;
};

const matchRoute = (pathname: string): MatchResult => {
	const engine = buildEngine();
	const matches = engine.match('GET', pathname);
	const match = matches[0];

	if (!match) {
		const result: MatchResult = {
			Component: NotFoundPage,
			pathParams: {}
		};

		return result;
	}

	const result: MatchResult = {
		Component: match.handler.Component,
		pathParams: match.pathParams
	};

	return result;
};

export { matchRoute };
export type { PageComponent };
