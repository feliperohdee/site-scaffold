import { CACHE_HEADER } from '@/constants';

const Slug = ({
	pathParams
}: {
	pathParams: Record<string, unknown>;
	searchParams: URLSearchParams;
}) => {
	const slug = `${pathParams.slug ?? ''}`;

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<a
				className='text-sm font-medium underline'
				href='/'
			>
				&larr; home
			</a>
			<h1 className='tracking-display mt-8 text-6xl leading-[0.95] font-black'>
				{slug}
			</h1>
			<p className='mt-8 max-w-xl text-lg leading-relaxed text-neutral-700'>
				The worker matched{' '}
				<code className='rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-base'>
					/:slug
				</code>{' '}
				and rendered this page server-side. The HTML is cached in R2
				keyed by URL — a refresh should show{' '}
				<code className='rounded-sm bg-neutral-100 px-1.5 py-0.5 font-mono text-base'>
					{CACHE_HEADER}: HIT
				</code>
				.
			</p>
		</main>
	);
};

export default Slug;
