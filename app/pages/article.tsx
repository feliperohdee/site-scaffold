import _ from 'lodash';

import Head from '@/app/components/head';
import Markdown from '@/app/components/markdown';
import NotFound from '@/app/pages/not-found';
import { getArticleBySlug } from '@/app/libs/articles';
import { SITE_NAME } from '@/constants';

const Article = ({
	pathParams
}: {
	pathParams: Record<string, unknown>;
	searchParams: URLSearchParams;
}) => {
	const slug = String(pathParams.slug ?? '');
	const article = getArticleBySlug(slug);

	if (!article) {
		return <NotFound />;
	}

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<Head
				description={article.excerpt}
				title={`${article.title} — ${SITE_NAME}`}
			/>
			<a
				className='text-sm font-medium underline'
				href='/articles'
			>
				&larr; articles
			</a>
			<header className='mt-8 border-b border-neutral-200 pb-12'>
				<div className='flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
					{article.date && (
						<time dateTime={article.date}>{article.date}</time>
					)}
					{article.date && <span aria-hidden>·</span>}
					<span>{article.readingTime} min read</span>
				</div>
				<h1 className='tracking-display mt-6 text-6xl leading-[0.95] font-black'>
					{article.title}
				</h1>
				{_.size(article.tags) > 0 && (
					<ul className='mt-6 flex flex-wrap gap-2'>
						{article.tags.map(tag => {
							return (
								<li
									className='bg-neutral-100 px-2 py-0.5 text-xs font-bold tracking-wide text-neutral-700 uppercase'
									key={tag}
								>
									{tag}
								</li>
							);
						})}
					</ul>
				)}
			</header>
			<Markdown
				className='mt-12'
				content={article.content}
			/>
		</main>
	);
};

export default Article;
