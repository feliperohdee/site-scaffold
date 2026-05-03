import { useState } from 'react';

import ClientOnly from '@/libs/client-only';
import Now from '@/app/components/now';
import { SITE_NAME } from '@/constants';

const Home = () => {
	const [count, setCount] = useState(0);

	const onClick = () => {
		setCount(count + 1);
	};

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<p className='text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
				A scaffold
			</p>
			<h1 className='tracking-display mt-4 text-7xl leading-[0.95] font-black'>
				{SITE_NAME}.
			</h1>
			<p className='mt-8 max-w-xl text-lg leading-relaxed text-neutral-700'>
				Server-rendered, R2-cached, hydrated on the client. The counter
				and the live clock below are the client-side bits on this page.
			</p>
			<button
				className='mt-10 bg-black px-6 py-3 text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800'
				onClick={onClick}
				type='button'
			>
				Clicked {count} times
			</button>
			<section className='mt-12 grid grid-cols-1 gap-3 border-t border-neutral-200 pt-10'>
				<p className='text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
					Client-only sample
				</p>
				<p className='max-w-xl text-base leading-relaxed text-neutral-700'>
					<code className='rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm'>
						&lt;Now /&gt;
					</code>{' '}
					reads <code>new Date()</code> and ticks every second —
					rendering it on the server would mismatch hydration.
					Wrapping it in{' '}
					<code className='rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm'>
						&lt;ClientOnly&gt;
					</code>{' '}
					emits the dashes during SSR; the live clock takes over after
					hydration:{' '}
					<ClientOnly
						fallback={
							<span className='font-mono text-neutral-400'>
								--:--:--
							</span>
						}
					>
						<Now />
					</ClientOnly>
				</p>
			</section>
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
			<nav className='mt-12 grid grid-cols-1 gap-3 border-t border-neutral-200 pt-10'>
				<p className='text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
					Programmatic SEO sample
				</p>
				<a
					className='text-base font-medium underline'
					href='/best-coffee'
				>
					/best-coffee (hub)
				</a>
				<a
					className='text-base font-medium underline'
					href='/best-coffee/lisbon'
				>
					/best-coffee/lisbon (item)
				</a>
				<a
					className='text-base font-medium underline'
					href='/best-coffee/coimbra'
				>
					/best-coffee/coimbra (thin → noindex)
				</a>
				<a
					className='text-base font-medium underline'
					href='/sitemap.xml'
				>
					/sitemap.xml
				</a>
				<a
					className='text-base font-medium underline'
					href='/robots.txt'
				>
					/robots.txt
				</a>
			</nav>
		</main>
	);
};

export default Home;
