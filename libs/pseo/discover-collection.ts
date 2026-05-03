import _ from 'lodash';

import type { Pseo } from '@/libs/pseo/types';

// Auto-discovery: every `app/pseo/collections/*.ts` file is a collection.
// Mirrors the `libs/pages.ts` glob pattern. To register a new collection,
// drop a file in `app/pseo/collections/` — no other registry to edit.
const modules = import.meta.glob<Pseo.Definition>(
	'../../app/pseo/collections/*.ts',
	{
		eager: true,
		import: 'default'
	}
);

const collections = _.values(modules);

export default collections;
