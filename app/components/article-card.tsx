import _ from 'lodash';

import type { Article } from '@/app/libs/articles';

const ArticleCard = ({ article }: { article: Article }) => {
	return (
		<a
			className='group block py-8 transition-colors'
			href={`/articles/${article.slug}`}
		>
			<div className='flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
				{article.date && (
					<time dateTime={article.date}>{article.date}</time>
				)}
				{article.date && <span aria-hidden>·</span>}
				<span>{article.readingTime} min read</span>
			</div>
			<h2 className='tracking-display mt-3 text-3xl leading-tight font-black text-black group-hover:underline'>
				{article.title}
			</h2>
			<p className='mt-3 max-w-2xl text-base leading-relaxed text-neutral-700'>
				{article.excerpt}
			</p>
			{_.size(article.tags) > 0 && (
				<ul className='mt-4 flex flex-wrap gap-2'>
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
		</a>
	);
};

export default ArticleCard;
