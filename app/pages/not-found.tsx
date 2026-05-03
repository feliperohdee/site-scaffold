const NotFound = () => {
	return (
		<main className='mx-auto max-w-3xl px-6 py-24'>
			<p className='text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase'>
				Error
			</p>
			<h1 className='tracking-display mt-4 text-8xl leading-[0.9] font-black'>
				404
			</h1>
			<p className='mt-8 max-w-xl text-lg leading-relaxed text-neutral-700'>
				This page does not exist.
			</p>
			<a
				className='mt-10 inline-block text-base font-medium underline'
				href='/'
			>
				&larr; home
			</a>
		</main>
	);
};

export default NotFound;
