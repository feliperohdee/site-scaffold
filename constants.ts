import kebabCase from 'lodash/kebabCase';

declare const __BUILD_TIME__: string;

// Single source of truth — change this when scaffolding for a new site.
// Everything below (cache header names, page titles) derives from it.
const SITE_NAME = 'Site Scaffold';
const SITE_SLUG = kebabCase(SITE_NAME);

const DEV = import.meta.env.DEV;

// Dev: never cache (always fresh SSR for HMR / live editing)
// Prod: cache to R2 keyed by build timestamp — every build invalidates
const CACHE_ENABLED = !DEV;
const CACHE_VERSION = DEV ? 'dev' : `v-${__BUILD_TIME__}`;

const CACHE_HEADER = `x-${SITE_SLUG}-cache`;
const CACHE_CREATED_AT_HEADER = `x-${SITE_SLUG}-cache-created-at`;

export {
	CACHE_CREATED_AT_HEADER,
	CACHE_ENABLED,
	CACHE_HEADER,
	CACHE_VERSION,
	DEV,
	SITE_NAME
};
