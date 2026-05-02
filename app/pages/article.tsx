import _ from 'lodash';

import Head from '@/app/components/head';
import Markdown from '@/app/components/markdown';
import NotFound from '@/app/pages/not-found';
import { SITE_NAME } from '@/constants';

import type { Article as ArticleType } from '@/app/libs/articles';
import type { Route } from '@/app/libs/router';

const isArticle = (value: unknown): value is ArticleType => {
	return (
		_.isObject(value) &&
		'slug' in value &&
		'title' in value &&
		'content' in value
	);
};

const Article = ({ data }: Route.PageProps) => {
	if (!isArticle(data)) {
		return <NotFound />;
	}

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<Head
				description={data.excerpt}
				title={`${data.title} — ${SITE_NAME}`}
			/>
			<a
				className='text-sm font-medium underline'
				href='/articles'
			>
				&larr; articles
			</a>
			<header className='mt-8 border-b border-neutral-200 pb-12'>
				<div className='flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
					{data.date && <time dateTime={data.date}>{data.date}</time>}
					{data.date && <span aria-hidden>·</span>}
					<span>{data.readingTime} min read</span>
				</div>
				<h1 className='tracking-display mt-6 text-6xl leading-[0.95] font-black'>
					{data.title}
				</h1>
				{_.size(data.tags) > 0 && (
					<ul className='mt-6 flex flex-wrap gap-2'>
						{data.tags.map(tag => {
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
				content={data.content}
			/>
		</main>
	);
};

export default Article;
