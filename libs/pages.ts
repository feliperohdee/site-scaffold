import _ from 'lodash';

import type { Route } from '@/libs/router';

// Auto-discovery: every `app/pages/*.tsx` file is registered here, keyed by
// its filename (without extension). To add a new page, drop the component
// file in `app/pages/` and reference its key from `worker/routes.ts` — no
// other registry, switch, or import to update.
const modules = import.meta.glob<Route.PageComponent>('../app/pages/*.tsx', {
	eager: true,
	import: 'default'
});

const pages = _.mapKeys(modules, (_value, key) => {
	return key.match(/\/([^/]+)\.tsx$/)?.[1] ?? key;
});

export default pages;
