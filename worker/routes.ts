import { getArticleBySlug, getArticles } from '@/app/libs/articles';
import { registerSitemap } from '@/libs/sitemap';
import { SITE_NAME } from '@/constants';
import collections from '@/libs/pseo/discover-collection';
import context from '@/worker/context';
import createRouter from '@/libs/router';
import pages from '@/libs/discover-pages';
import registerCollections from '@/libs/pseo/register';
import {
	articleCacheScope,
	articleIndexable,
	articleIndexCacheScope,
	articleIndexMeta,
	articleJsonLd,
	articleMeta,
	articleSitemapContributor
} from '@/app/libs/articles-seo';

registerSitemap(articleSitemapContributor);

const router = createRouter(pages)
	.notFound({
		Component: pages['not-found'],
		meta: () => {
			return {
				title: `Not found — ${SITE_NAME}`
			};
		}
	})
	.add('/', {
		Component: pages.home,
		meta: () => {
			return {
				description:
					'A streaming SSR + hydrate starter on Cloudflare Workers.',
				title: `${SITE_NAME} — home`
			};
		}
	})
	.add('/articles', {
		Component: pages.articles,
		cacheScope: articleIndexCacheScope,
		loader: () => {
			return getArticles();
		},
		meta: articleIndexMeta
	})
	.add('/articles/:slug', {
		Component: pages.article,
		cacheScope: articleCacheScope,
		indexable: articleIndexable,
		jsonLd: articleJsonLd,
		loader: () => {
			return getArticleBySlug(`${context.store.pathParams.slug ?? ''}`);
		},
		meta: articleMeta
	});

// pSEO collections register before the catch-all `/:slug` so their hub
// paths (e.g. `/best-coffee`) win over the slug fallback.
registerCollections(router, collections);

router.add('/:slug', {
	Component: pages.slug,
	meta: () => {
		const slug = `${context.store.pathParams.slug ?? ''}`;

		return {
			description: `A dynamic page rendered for the slug "${slug}".`,
			title: `${slug} — ${SITE_NAME}`
		};
	}
});

export default router.match;
