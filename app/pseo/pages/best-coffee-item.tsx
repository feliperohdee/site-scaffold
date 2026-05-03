import _ from 'lodash';

import { isCity } from '@/app/pseo/collections/best-coffee';
import NotFound from '@/app/pages/not-found';
import type { Route } from '@/libs/router';

const BestCoffeeItem = ({ data }: Route.PageProps) => {
	if (!isCity(data)) {
		return <NotFound />;
	}

	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<a
				className='text-sm font-medium underline'
				href='/best-coffee'
			>
				&larr; all cities
			</a>
			<header className='mt-8'>
				<p className='text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
					Coffee guide
				</p>
				<h1 className='tracking-display mt-4 text-6xl leading-[0.95] font-black'>
					Best Coffee in {data.name}
				</h1>
				<p className='mt-6 text-lg text-neutral-700'>
					{data.placesCount} hand-picked spots, refreshed{' '}
					<time dateTime={data.updatedAt}>{data.updatedAt}</time>.
				</p>
			</header>
			<ul className='mt-12 grid grid-cols-1 gap-6'>
				{_.map(data.picks, pick => {
					return (
						<li
							className='border-l-4 border-neutral-200 pl-5'
							key={pick.name}
						>
							<h2 className='text-2xl font-black'>{pick.name}</h2>
							<p className='mt-2 text-neutral-700'>
								{pick.description}
							</p>
						</li>
					);
				})}
			</ul>
		</main>
	);
};

export default BestCoffeeItem;
