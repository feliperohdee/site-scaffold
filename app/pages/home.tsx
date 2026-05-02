import { useState } from 'react';

import Head from '@/app/components/head';

const Home = () => {
	const [count, setCount] = useState(0);

	const onClick = () => {
		setCount(count + 1);
	};

	return (
		<main className='mx-auto max-w-2xl px-6 py-16'>
			<Head
				description='A streaming SSR + hydrate starter on Cloudflare Workers.'
				title='embed-img-site — home'
			/>
			<h1 className='text-4xl font-bold tracking-tight'>
				embed-img-site
			</h1>
			<p className='mt-4 text-gray-600'>
				Server-rendered, R2-cached, hydrated on the client. Click the
				button — it&rsquo;s the only client-side state on this page.
			</p>
			<button
				className='mt-8 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-700'
				onClick={onClick}
				type='button'
			>
				Clicked {count} times
			</button>
			<nav className='mt-12 grid grid-cols-1 gap-2'>
				<p className='text-sm text-gray-500'>Try a dynamic route:</p>
				<a
					className='text-blue-600 underline'
					href='/hello-world'
				>
					/hello-world
				</a>
				<a
					className='text-blue-600 underline'
					href='/another-slug'
				>
					/another-slug
				</a>
				<a
					className='text-blue-600 underline'
					href='/some/missing/path'
				>
					/some/missing/path (404)
				</a>
			</nav>
		</main>
	);
};

export default Home;
