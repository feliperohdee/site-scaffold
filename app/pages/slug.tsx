import Head from '@/app/components/head';
import { CACHE_HEADER, SITE_NAME } from '@/constants';

type SlugProps = {
	pathParams: Record<string, unknown>;
	searchParams: URLSearchParams;
};

const Slug = ({ pathParams }: SlugProps) => {
	const slug = String(pathParams.slug ?? '');

	return (
		<main className='mx-auto max-w-2xl px-6 py-16'>
			<Head
				description={`A dynamic page rendered for the slug "${slug}".`}
				title={`${slug} — ${SITE_NAME}`}
			/>
			<a
				className='text-sm text-blue-600 underline'
				href='/'
			>
				&larr; home
			</a>
			<h1 className='mt-6 text-4xl font-bold tracking-tight'>{slug}</h1>
			<p className='mt-4 text-gray-600'>
				The worker matched{' '}
				<code className='rounded bg-gray-100 px-2 py-1'>/:slug</code>{' '}
				and rendered this page server-side. The HTML is cached in R2
				keyed by URL, so a refresh should show{' '}
				<code className='rounded bg-gray-100 px-2 py-1'>
					{CACHE_HEADER}: HIT
				</code>
				.
			</p>
		</main>
	);
};

export default Slug;
