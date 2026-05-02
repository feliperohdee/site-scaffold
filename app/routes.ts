import { getArticleBySlug } from '@/app/libs/articles';
import ArticlePage from '@/app/pages/article';
import ArticlesPage from '@/app/pages/articles';
import createRouter from '@/app/libs/router';
import HomePage from '@/app/pages/home';
import NotFoundPage from '@/app/pages/not-found';
import SlugPage from '@/app/pages/slug';

const router = createRouter(NotFoundPage)
	.add('/', {
		Component: HomePage
	})
	.add('/articles', {
		Component: ArticlesPage
	})
	.add('/articles/:slug', {
		Component: ArticlePage,
		loader: ({ pathParams }) => {
			return getArticleBySlug(String(pathParams.slug ?? ''));
		}
	})
	.add('/:slug', {
		Component: SlugPage
	});

export default router.match;
