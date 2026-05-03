import _ from 'lodash';

import type { Route } from '@/libs/router';

// Auto-discovery: every `app/pages/*.tsx` and `app/pseo/pages/*.tsx` file is
// registered here, keyed by its filename (without extension). To add a new
// page, drop the component file in either folder — no other registry,
// switch, or import to update. Filenames must be unique across both globs.
const pageModules = import.meta.glob<Route.PageComponent>(
	'../app/pages/*.tsx',
	{
		eager: true,
		import: 'default'
	}
);

const pseoPageModules = import.meta.glob<Route.PageComponent>(
	'../app/pseo/pages/*.tsx',
	{
		eager: true,
		import: 'default'
	}
);

const pages = _.mapKeys(
	{
		...pageModules,
		...pseoPageModules
	},
	(_value, key) => {
		return key.match(/\/([^/]+)\.tsx$/)?.[1] ?? key;
	}
);

export default pages;
