import { useEffect, useState } from 'react';

const Now = () => {
	const [now, setNow] = useState(() => {
		return new Date().toLocaleTimeString();
	});

	useEffect(() => {
		const id = setInterval(() => {
			setNow(new Date().toLocaleTimeString());
		}, 1000);

		return () => {
			clearInterval(id);
		};
	}, []);

	return <span className='font-mono'>{now}</span>;
};

export default Now;
