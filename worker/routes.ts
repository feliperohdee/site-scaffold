import context from '@/worker/context';
import createRouter from '@/libs/router';
import pages from '@/libs/pages';
import { getArticleBySlug } from '@/app/libs/articles';

const router = createRouter('not-found', pages)
	.add('/', {
		Component: pages.home
	})
	.add('/articles', {
		Component: pages.articles
	})
	.add('/articles/:slug', {
		Component: pages.article,
		loader: () => {
			return getArticleBySlug(
				String(context.store.pathParams.slug ?? '')
			);
		}
	})
	.add('/:slug', {
		Component: pages.slug
	});

export default router.match;
