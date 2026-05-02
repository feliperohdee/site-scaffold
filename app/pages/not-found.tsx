import Head from '@/app/components/head';

const NotFound = () => {
	return (
		<main className='mx-auto max-w-2xl px-6 py-16'>
			<Head title='Not found — embed-img-site' />
			<h1 className='text-4xl font-bold tracking-tight'>404</h1>
			<p className='mt-4 text-gray-600'>This page does not exist.</p>
			<a
				className='mt-8 inline-block text-blue-600 underline'
				href='/'
			>
				&larr; home
			</a>
		</main>
	);
};

export default NotFound;
