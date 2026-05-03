import _ from 'lodash';
import { describe, expect, it } from 'vitest';

import collections from '@/libs/pseo/discover-collection';

describe('@/libs/pseo/discover-collection', () => {
	it('should auto-discover the seed best-coffee collection', () => {
		const names = _.map(collections, definition => {
			return definition.name;
		});

		expect(names).toContain('best-coffee');
	});

	it('should expose a complete definition shape (item + path + key)', () => {
		const bestCoffee = _.find(collections, definition => {
			return definition.name === 'best-coffee';
		});

		expect(bestCoffee?.item.path).toEqual('/best-coffee/:slug');
		expect(bestCoffee?.item.key).toEqual('slug');
		expect(typeof bestCoffee?.item.list).toEqual('function');
	});
});
