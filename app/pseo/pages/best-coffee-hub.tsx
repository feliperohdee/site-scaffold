import _ from 'lodash';

import { isCityList } from '@/app/pseo/collections/best-coffee';
import type { Route } from '@/libs/router';

const BestCoffeeHub = ({ data }: Route.PageProps) => {
	const cities = isCityList(data) ? data : [];

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<a
				className='text-sm font-medium underline'
				href='/'
			>
				&larr; home
			</a>
			<p className='mt-8 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
				Coffee guides
			</p>
			<h1 className='tracking-display mt-4 text-7xl leading-[0.95] font-black'>
				Best Coffee.
			</h1>
			<p className='mt-8 max-w-xl text-lg leading-relaxed text-neutral-700'>
				A guide for every city — {_.size(cities)} so far. Each page is a
				programmatic SEO entry generated from one config file.
			</p>
			{_.size(cities) === 0 ? (
				<p className='mt-12 text-neutral-500'>No cities yet.</p>
			) : (
				<ul className='mt-12 grid grid-cols-1 divide-y divide-neutral-200 border-t border-b border-neutral-200'>
					{_.map(cities, city => {
						return (
							<li key={city.slug}>
								<a
									className='group block py-6'
									href={`/best-coffee/${city.slug}`}
								>
									<h2 className='tracking-display text-2xl leading-tight font-black text-black group-hover:underline'>
										Best Coffee in {city.name}
									</h2>
									<p className='mt-2 text-sm text-neutral-600'>
										{city.placesCount} spots · updated{' '}
										{city.updatedAt}
									</p>
								</a>
							</li>
						);
					})}
				</ul>
			)}
		</main>
	);
};

export default BestCoffeeHub;
