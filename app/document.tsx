import { ReactNode } from 'react';

import { DEV } from '@/constants';

type DocumentProps = {
	children: ReactNode;
};

const cssHref = DEV ? '/app/styles/index.css' : '/assets/client.css';

const Document = ({ children }: DocumentProps) => {
	return (
		<html lang='en'>
			<head>
				<meta charSet='utf-8' />
				<meta
					content='width=device-width, initial-scale=1.0'
					name='viewport'
				/>
				<link
					href={cssHref}
					rel='stylesheet'
				/>
			</head>
			<body>
				<div id='root'>{children}</div>
			</body>
		</html>
	);
};

export default Document;
