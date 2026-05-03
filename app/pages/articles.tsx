import _ from 'lodash';

import { isArticleList } from '@/app/libs/articles';
import ArticleCard from '@/app/components/article-card';
import type { Route } from '@/libs/router';

const Articles = ({ data }: Route.PageProps) => {
	const articles = isArticleList(data) ? data : [];

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<a
				className='text-sm font-medium underline'
				href='/'
			>
				&larr; home
			</a>
			<p className='mt-8 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
				Writing
			</p>
			<h1 className='tracking-display mt-4 text-7xl leading-[0.95] font-black'>
				Articles.
			</h1>
			<p className='mt-8 max-w-xl text-lg leading-relaxed text-neutral-700'>
				Drop a{' '}
				<code className='rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-base'>
					.md
				</code>{' '}
				file into{' '}
				<code className='rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-base'>
					app/content/articles/
				</code>{' '}
				and it shows up here.
			</p>
			{_.size(articles) === 0 ? (
				<p className='mt-20 text-neutral-500'>No articles yet.</p>
			) : (
				<ul className='mt-20 grid grid-cols-1 divide-y divide-neutral-200 border-t border-b border-neutral-200'>
					{_.map(articles, article => {
						return (
							<li key={article.slug}>
								<ArticleCard article={article} />
							</li>
						);
					})}
				</ul>
			)}
		</main>
	);
};

export default Articles;
