import _ from 'lodash';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Sitemap } from '@/libs/sitemap';
import {
	__resetForTests,
	absolutize,
	buildRobotsTxt,
	buildSitemapForContributor,
	buildSitemapIndex,
	escapeXml,
	getContributors,
	handleSitemapRequest,
	registerSitemap,
	resolveContributor,
	SITEMAP_CHUNK_SIZE
} from '@/libs/sitemap';

type Article = { date: string; slug: string; thin?: boolean };

const buildArticles = (): Article[] => {
	return [
		{ date: '2026-04-01', slug: 'a' },
		{ date: '2026-04-02', slug: 'b' },
		{ date: '2026-04-03', slug: 'c', thin: true }
	];
};

const articleContributor = (): Sitemap.Contributor<Article> => {
	return {
		indexable: item => {
			return !item.thin;
		},
		lastmod: item => {
			return item.date;
		},
		list: () => {
			return buildArticles();
		},
		name: 'articles',
		urlFor: item => {
			return `/articles/${item.slug}`;
		}
	};
};

describe('@/libs/sitemap', () => {
	beforeEach(() => {
		__resetForTests();
	});

	afterEach(() => {
		__resetForTests();
	});

	describe('absolutize', () => {
		it('should pass through fully qualified URLs', () => {
			expect(absolutize('https://x.test', 'https://y.test/foo')).toEqual(
				'https://y.test/foo'
			);
		});

		it('should join origin and absolute path', () => {
			expect(absolutize('https://x.test', '/foo/bar')).toEqual(
				'https://x.test/foo/bar'
			);
		});

		it('should add a leading slash to relative paths', () => {
			expect(absolutize('https://x.test', 'foo')).toEqual(
				'https://x.test/foo'
			);
		});

		it('should trim trailing slashes from origin', () => {
			expect(absolutize('https://x.test/', '/foo')).toEqual(
				'https://x.test/foo'
			);
		});
	});

	describe('buildRobotsTxt', () => {
		it('should reference the sitemap at the origin', () => {
			expect(buildRobotsTxt('https://x.test')).toContain(
				'Sitemap: https://x.test/sitemap.xml'
			);
		});
	});

	describe('buildSitemapForContributor', () => {
		it('should emit a urlset XML with one <url> per indexable item', async () => {
			registerSitemap(articleContributor());
			const xml = await buildSitemapForContributor(
				articleContributor(),
				'https://x.test'
			);

			expect(xml).toContain(
				'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
			);
			expect(xml).toContain('<loc>https://x.test/articles/a</loc>');
			expect(xml).toContain('<loc>https://x.test/articles/b</loc>');
			expect(xml).not.toContain('/articles/c');
			expect(xml).toContain('<lastmod>2026-04-01</lastmod>');
		});

		it('should respect chunk slicing at SITEMAP_CHUNK_SIZE', async () => {
			const big = Array.from(
				{ length: SITEMAP_CHUNK_SIZE + 5 },
				(_, i) => {
					return { id: i };
				}
			);
			const contributor: Sitemap.Contributor<{ id: number }> = {
				list: () => {
					return big;
				},
				name: 'big',
				urlFor: item => {
					return `/big/${item.id}`;
				}
			};

			const chunk1 = await buildSitemapForContributor(
				contributor,
				'https://x.test',
				1
			);
			const chunk2 = await buildSitemapForContributor(
				contributor,
				'https://x.test',
				2
			);

			const matches1 = chunk1.match(/<loc>/g) ?? [];
			const matches2 = chunk2.match(/<loc>/g) ?? [];
			expect(_.size(matches1)).toEqual(SITEMAP_CHUNK_SIZE);
			expect(_.size(matches2)).toEqual(5);
		});
	});

	describe('buildSitemapIndex', () => {
		it('should emit one <sitemap> per registered contributor when each fits in one chunk', async () => {
			registerSitemap(articleContributor());
			registerSitemap<{ slug: string }>({
				list: () => {
					return [{ slug: 'foo' }];
				},
				name: 'pages',
				urlFor: item => {
					return `/pages/${item.slug}`;
				}
			});

			const xml = await buildSitemapIndex('https://x.test');

			expect(xml).toContain(
				'<loc>https://x.test/sitemap-articles.xml</loc>'
			);
			expect(xml).toContain(
				'<loc>https://x.test/sitemap-pages.xml</loc>'
			);
		});

		it('should split a contributor into multiple chunk URLs when over SITEMAP_CHUNK_SIZE', async () => {
			const big = Array.from(
				{ length: SITEMAP_CHUNK_SIZE + 5 },
				(_, i) => {
					return { id: i };
				}
			);
			registerSitemap<{ id: number }>({
				list: () => {
					return big;
				},
				name: 'big',
				urlFor: item => {
					return `/big/${item.id}`;
				}
			});

			const xml = await buildSitemapIndex('https://x.test');

			expect(xml).toContain(
				'<loc>https://x.test/sitemap-big-1.xml</loc>'
			);
			expect(xml).toContain(
				'<loc>https://x.test/sitemap-big-2.xml</loc>'
			);
		});
	});

	describe('escapeXml', () => {
		it('should escape XML metacharacters', () => {
			expect(escapeXml(`&<>"'`)).toEqual('&amp;&lt;&gt;&quot;&apos;');
		});
	});

	describe('handleSitemapRequest', () => {
		it('should return null for non-sitemap routes', async () => {
			const result = await handleSitemapRequest('/foo', 'https://x.test');

			expect(result).toEqual(null);
		});

		it('should serve /robots.txt as text/plain', async () => {
			const result = await handleSitemapRequest(
				'/robots.txt',
				'https://x.test'
			);

			expect(result?.contentType).toEqual('text/plain; charset=utf-8');
			expect(result?.body).toContain(
				'Sitemap: https://x.test/sitemap.xml'
			);
		});

		it('should serve /sitemap.xml as the sitemap index', async () => {
			registerSitemap(articleContributor());

			const result = await handleSitemapRequest(
				'/sitemap.xml',
				'https://x.test'
			);

			expect(result?.contentType).toEqual(
				'application/xml; charset=utf-8'
			);
			expect(result?.body).toContain('<sitemapindex');
		});

		it('should serve /sitemap-<name>.xml as the per-contributor urlset', async () => {
			registerSitemap(articleContributor());

			const result = await handleSitemapRequest(
				'/sitemap-articles.xml',
				'https://x.test'
			);

			expect(result?.body).toContain('<urlset');
			expect(result?.body).toContain('/articles/a');
		});

		it('should return null for /sitemap-<unknown>.xml when no such contributor exists', async () => {
			const result = await handleSitemapRequest(
				'/sitemap-nope.xml',
				'https://x.test'
			);

			expect(result).toEqual(null);
		});

		it('should serve /sitemap-<name>-<chunk>.xml for chunked contributors', async () => {
			const big = Array.from(
				{ length: SITEMAP_CHUNK_SIZE + 5 },
				(_, i) => {
					return { id: i };
				}
			);
			registerSitemap<{ id: number }>({
				list: () => {
					return big;
				},
				name: 'big',
				urlFor: item => {
					return `/big/${item.id}`;
				}
			});

			const result = await handleSitemapRequest(
				'/sitemap-big-2.xml',
				'https://x.test'
			);

			expect(result?.body).toContain('<urlset');
			const matches = result!.body.match(/<loc>/g) ?? [];
			expect(_.size(matches)).toEqual(5);
		});
	});

	describe('registerSitemap', () => {
		it('should expose the contributor via getContributors', () => {
			registerSitemap(articleContributor());

			const contributors = getContributors();
			expect(contributors).toHaveLength(1);
			expect(contributors[0].name).toEqual('articles');
		});

		it('should overwrite silently when registering the same name twice (HMR-safe)', () => {
			registerSitemap(articleContributor());
			const replacement = {
				...articleContributor(),
				lastmod: () => {
					return '2099-01-01';
				}
			};
			registerSitemap(replacement);

			const contributors = getContributors();
			expect(contributors).toHaveLength(1);
			expect(contributors[0].lastmod!({ slug: 'a', date: 'x' })).toEqual(
				'2099-01-01'
			);
		});
	});

	describe('resolveContributor', () => {
		it('should filter out items where indexable returns false', async () => {
			const items = await resolveContributor(articleContributor());

			expect(items).toHaveLength(2);
			expect(
				_.map(items, item => {
					return item.loc;
				})
			).toEqual(['/articles/a', '/articles/b']);
		});

		it('should default indexable to true when not provided', async () => {
			const items = await resolveContributor<{ slug: string }>({
				list: () => {
					return [{ slug: 'a' }, { slug: 'b' }];
				},
				name: 'x',
				urlFor: item => {
					return `/x/${item.slug}`;
				}
			});

			expect(items).toHaveLength(2);
		});
	});
});
