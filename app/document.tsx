import { ReactNode } from 'react';

import { DEV } from '@/constants';

const clientEntry = DEV ? '/app/index.tsx' : '/assets/client.js';
const cssHref = DEV ? '/app/styles/index.css' : '/assets/client.css';

const reactRefreshPreamble = `
import RefreshRuntime from '/@react-refresh';
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
`.trim();

const Document = ({ children }: { children: ReactNode }) => {
	return (
		<html lang='en'>
			<head>
				<meta charSet='utf-8' />
				<meta
					content='width=device-width, initial-scale=1.0'
					name='viewport'
				/>
				<link
					href='https://fonts.googleapis.com'
					rel='preconnect'
				/>
				<link
					crossOrigin='anonymous'
					href='https://fonts.gstatic.com'
					rel='preconnect'
				/>
				<link
					href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap'
					rel='stylesheet'
				/>
				{DEV && (
					<script
						dangerouslySetInnerHTML={{
							__html: reactRefreshPreamble
						}}
						type='module'
					/>
				)}
				<link
					href={cssHref}
					rel='stylesheet'
				/>
			</head>
			<body>
				<div id='root'>{children}</div>
				<script
					defer
					src={clientEntry}
					type='module'
				/>
			</body>
		</html>
	);
};

export default Document;
