import { useState } from 'react';

import Head from '@/app/components/head';
import { SITE_NAME } from '@/constants';

const Home = () => {
	const [count, setCount] = useState(0);

	const onClick = () => {
		setCount(count + 1);
	};

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<Head
				description='A streaming SSR + hydrate starter on Cloudflare Workers.'
				title={`${SITE_NAME} — home`}
			/>
			<p className='text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
				A scaffold
			</p>
			<h1 className='tracking-display mt-4 text-7xl leading-[0.95] font-black'>
				{SITE_NAME}.
			</h1>
			<p className='mt-8 max-w-xl text-lg leading-relaxed text-neutral-700'>
				Server-rendered, R2-cached, hydrated on the client. The button
				is the only client-side state on this page.
			</p>
			<button
				className='mt-10 bg-black px-6 py-3 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800'
				onClick={onClick}
				type='button'
			>
				Clicked {count} times
			</button>
			<nav className='mt-20 grid grid-cols-1 gap-3 border-t border-neutral-200 pt-10'>
				<p className='text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
					Try a route
				</p>
				<a
					className='text-base font-medium underline'
					href='/articles'
				>
					/articles
				</a>
				<a
					className='text-base font-medium underline'
					href='/hello-world'
				>
					/hello-world
				</a>
				<a
					className='text-base font-medium underline'
					href='/another-slug'
				>
					/another-slug
				</a>
				<a
					className='text-base font-medium underline'
					href='/some/missing/path'
				>
					/some/missing/path (404)
				</a>
			</nav>
		</main>
	);
};

export default Home;
