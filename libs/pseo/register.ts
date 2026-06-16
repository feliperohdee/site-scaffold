import _ from 'lodash';

import { registerSitemap } from '@/libs/sitemap';
import context from '@/worker/context';
import type { Pseo } from '@/libs/pseo/types';
import type { Route } from '@/libs/router';

const buildItemCacheVersion = (
	collectionName: string,
	collectionVersion: string,
	itemVersion: string | null
): string => {
	const base = `c/${collectionName}/${collectionVersion}`;

	if (!itemVersion) {
		return base;
	}

	return `${base}/i:${itemVersion}`;
};

const buildItemPath = <T>(
	pathTemplate: string,
	item: T,
	key: keyof T & string
): string => {
	const value = `${item[key] ?? ''}`;

	return pathTemplate.replace(`:${key}`, value);
};

const registerCollection = <T>(
	router: Route.Instance,
	definition: Pseo.Definition<T>
): void => {
	const collectionVersion = definition.version ?? '1';
	const { item, hub, name } = definition;

	router.add(item.path, {
		Component: item.Component,
		cacheScope: data => {
			if (_.isNil(data)) {
				return null;
			}

			const ctx: Pseo.ItemContext<T> = {
				item: data,
				params: context.store.pathParams
			};
			const itemVersion = item.itemVersion?.(ctx) ?? null;

			return buildItemCacheVersion(name, collectionVersion, itemVersion);
		},
		indexable: data => {
			if (_.isNil(data)) {
				return false;
			}

			if (!item.indexable) {
				return true;
			}

			const ctx: Pseo.ItemContext<T> = {
				item: data,
				params: context.store.pathParams
			};

			return item.indexable(ctx);
		},
		jsonLd: data => {
			if (_.isNil(data) || !item.jsonLd) {
				return null;
			}

			const ctx: Pseo.ItemContext<T> = {
				item: data,
				params: context.store.pathParams
			};

			return item.jsonLd(ctx);
		},
		loader: async () => {
			const all = await item.list();
			const params = context.store.pathParams;
			const value = `${params[item.key] ?? ''}`;
			const found = _.find(all, candidate => {
				return `${candidate[item.key]}` === value;
			});

			return found ?? null;
		},
		meta: data => {
			if (_.isNil(data) || !item.meta) {
				return null;
			}

			const ctx: Pseo.ItemContext<T> = {
				item: data,
				params: context.store.pathParams
			};

			return item.meta(ctx);
		}
	});

	if (hub) {
		router.add(hub.path, {
			Component: hub.Component,
			cacheScope: () => {
				return `c/${name}/${collectionVersion}/__hub`;
			},
			jsonLd: data => {
				if (!hub.jsonLd) {
					return null;
				}

				const ctx: Pseo.HubContext<T> = {
					items: _.isArray(data) ? data : []
				};

				return hub.jsonLd(ctx);
			},
			loader: async () => {
				return await item.list();
			},
			meta: data => {
				if (!hub.meta) {
					return null;
				}

				const ctx: Pseo.HubContext<T> = {
					items: _.isArray(data) ? data : []
				};

				return hub.meta(ctx);
			}
		});
	}

	registerSitemap<T>({
		indexable: candidate => {
			if (!item.indexable) {
				return true;
			}

			const ctx: Pseo.ItemContext<T> = {
				item: candidate,
				params: {}
			};

			return item.indexable(ctx);
		},
		lastmod: candidate => {
			const ctx: Pseo.ItemContext<T> = {
				item: candidate,
				params: {}
			};

			return item.itemVersion?.(ctx) ?? null;
		},
		list: () => {
			return item.list();
		},
		name,
		urlFor: candidate => {
			return buildItemPath(item.path, candidate, item.key);
		}
	});
};

const registerCollections = (
	router: Route.Instance,
	definitions: Pseo.Definition<any>[]
): void => {
	_.forEach(definitions, definition => {
		registerCollection(router, definition);
	});
};

export { buildItemCacheVersion, buildItemPath, registerCollection };
export default registerCollections;
