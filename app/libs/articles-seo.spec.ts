import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import { getArticleBySlug } from '@/app/libs/articles';
import { SITE_NAME } from '@/constants';
import {
	articleCacheScope,
	articleIndexable,
	articleIndexCacheScope,
	articleIndexMeta,
	articleJsonLd,
	articleMeta,
	articleSitemapContributor,
	ARTICLES_VERSION
} from '@/app/libs/articles-seo';

import type { Article } from '@/app/libs/articles';

const seedArticle = (): Article => {
	const article = getArticleBySlug('hello-world');

	if (!article) {
		throw new Error('test fixture missing: hello-world article');
	}

	return article;
};

describe('@/app/libs/articles-seo', () => {
	describe('articleCacheScope', () => {
		it('should return null for non-article data', () => {
			expect(articleCacheScope(null)).toEqual(null);
		});

		it('should return articles/v1/<slug>/<date> for a valid article', () => {
			const article = seedArticle();

			expect(articleCacheScope(article)).toEqual(
				`articles/v1/${article.slug}/${article.date}`
			);
		});
	});

	describe('articleIndexable', () => {
		it('should return false for non-article data', () => {
			expect(articleIndexable(null)).toEqual(false);
		});

		it('should return true for a valid article', () => {
			expect(articleIndexable(seedArticle())).toEqual(true);
		});
	});

	describe('articleIndexCacheScope', () => {
		it('should return articles/v1/<ARTICLES_VERSION>', () => {
			expect(articleIndexCacheScope()).toEqual(
				`articles/v1/${ARTICLES_VERSION}`
			);
		});
	});

	describe('articleIndexMeta', () => {
		it('should return canonical /articles + title + description', () => {
			expect(articleIndexMeta()).toEqual({
				canonical: '/articles',
				description: 'Long-form writing, notes, and experiments.',
				title: `Articles — ${SITE_NAME}`
			});
		});
	});

	describe('articleJsonLd', () => {
		it('should return null when data is not an article', () => {
			expect(articleJsonLd(null)).toEqual(null);
		});

		it('should return a schema.org Article payload for a valid article', () => {
			const article = seedArticle();

			expect(articleJsonLd(article)).toEqual({
				'@context': 'https://schema.org',
				'@type': 'Article',
				datePublished: article.date,
				headline: article.title,
				keywords: article.tags
			});
		});
	});

	describe('articleMeta', () => {
		it('should return a 404 title when data is not an article', () => {
			expect(articleMeta(null)).toEqual({
				title: `Not found — ${SITE_NAME}`
			});
		});

		it('should return canonical/description/ogType=article/title for a valid article', () => {
			const article = seedArticle();

			expect(articleMeta(article)).toEqual({
				canonical: `/articles/${article.slug}`,
				description: article.excerpt,
				ogType: 'article',
				title: `${article.title} — ${SITE_NAME}`
			});
		});
	});

	describe('articleSitemapContributor', () => {
		it('should be named "articles"', () => {
			expect(articleSitemapContributor.name).toEqual('articles');
		});

		it('should mark every item as indexable', () => {
			expect(articleSitemapContributor.indexable!(seedArticle())).toEqual(
				true
			);
		});

		it('should expose the article date as lastmod', () => {
			const article = seedArticle();

			expect(articleSitemapContributor.lastmod!(article)).toEqual(
				article.date
			);
		});

		it('should fall back to null lastmod when the article has no date', () => {
			const dateless = { ...seedArticle(), date: '' };

			expect(articleSitemapContributor.lastmod!(dateless)).toEqual(null);
		});

		it('should produce /articles/<slug> URLs', () => {
			const article = seedArticle();

			expect(articleSitemapContributor.urlFor(article)).toEqual(
				`/articles/${article.slug}`
			);
		});

		it('should resolve list() to the full set of articles', async () => {
			const list = await articleSitemapContributor.list();

			expect(_.size(list)).toBeGreaterThan(0);
			expect(list[0]).toMatchObject({ slug: expect.any(String) });
		});
	});

	describe('ARTICLES_VERSION', () => {
		it('should be a non-empty base-36 hash string', () => {
			expect(/^[0-9a-z]+$/.test(ARTICLES_VERSION)).toEqual(true);
		});
	});
});
