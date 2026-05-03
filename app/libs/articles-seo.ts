import _ from 'lodash';

import { getArticles } from '@/app/libs/articles';
import { SITE_NAME } from '@/constants';
import type { Article } from '@/app/libs/articles';
import type { Route } from '@/libs/router';
import type { Sitemap } from '@/libs/sitemap';

// Cache-key schema version. Bump manually when the rendered output shape
// changes (e.g. JSON-LD payload structure, head meta keys). Independent of
// CACHE_VERSION (build-time) and ARTICLES_VERSION (content hash).
const ARTICLES_CACHE_VERSION = 'v1';

// Stable hash of the full article set (slug + date per article). Changes
// when any article is added, removed, or has its frontmatter date bumped —
// gives the articles index a cache version that's decoupled from build time.
const ARTICLES_VERSION = (() => {
	const fingerprint = _.map(getArticles(), article => {
		return `${article.slug}@${article.date}`;
	}).join('|');

	const hash = _.reduce(
		_.range(_.size(fingerprint)),
		(acc, i) => {
			return ((acc << 5) + acc) ^ fingerprint.charCodeAt(i);
		},
		5381
	);

	return (hash >>> 0).toString(36);
})();

const articleCacheScope = (data: Article | null): string | null => {
	if (!data) {
		return null;
	}

	return `articles/${ARTICLES_CACHE_VERSION}/${data.slug}/${data.date}`;
};

const articleIndexable = (data: Article | null): boolean => {
	return !_.isNull(data);
};

const articleIndexCacheScope = (): string => {
	return `articles/${ARTICLES_CACHE_VERSION}/${ARTICLES_VERSION}`;
};

const articleIndexMeta = (): Route.Meta => {
	return {
		canonical: '/articles',
		description: 'Long-form writing, notes, and experiments.',
		title: `Articles — ${SITE_NAME}`
	};
};

const articleJsonLd = (data: Article | null): unknown => {
	if (!data) {
		return null;
	}

	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		datePublished: data.date,
		headline: data.title,
		keywords: data.tags
	};
};

const articleMeta = (data: Article | null): Route.Meta => {
	if (!data) {
		return { title: `Not found — ${SITE_NAME}` };
	}

	return {
		canonical: `/articles/${data.slug}`,
		description: data.excerpt,
		ogType: 'article',
		title: `${data.title} — ${SITE_NAME}`
	};
};

const articleSitemapContributor: Sitemap.Contributor<Article> = {
	indexable: () => {
		return true;
	},
	lastmod: item => {
		return item.date || null;
	},
	list: () => {
		return getArticles();
	},
	name: 'articles',
	urlFor: item => {
		return `/articles/${item.slug}`;
	}
};

export {
	articleCacheScope,
	articleIndexable,
	articleIndexCacheScope,
	articleIndexMeta,
	articleJsonLd,
	articleMeta,
	articleSitemapContributor,
	ARTICLES_CACHE_VERSION,
	ARTICLES_VERSION
};
