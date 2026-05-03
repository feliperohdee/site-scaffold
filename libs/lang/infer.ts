import _ from 'lodash';

import type { Lang } from '@/libs/lang/types';

const countryToLang: Record<string, Lang> = {
	ao: 'pt-br',
	ar: 'es-es',
	at: 'de-de',
	au: 'en-us',
	be: 'fr-fr',
	br: 'pt-br',
	ca: 'en-us',
	cd: 'fr-fr',
	ch: 'de-de',
	cl: 'es-es',
	co: 'es-es',
	cr: 'es-es',
	de: 'de-de',
	ec: 'es-es',
	es: 'es-es',
	fr: 'fr-fr',
	gb: 'en-us',
	ie: 'en-us',
	in: 'en-us',
	it: 'it-it',
	jp: 'ja-jp',
	mx: 'es-es',
	nz: 'en-us',
	pe: 'es-es',
	pt: 'pt-br',
	sn: 'fr-fr',
	us: 'en-us',
	ve: 'es-es'
};

const inferLang = (country: string): Lang => {
	if (!country) {
		return 'en-us';
	}

	const normalized = _.toLower(country);

	return countryToLang[normalized] ?? 'en-us';
};

export default inferLang;
