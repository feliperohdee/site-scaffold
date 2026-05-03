import _ from 'lodash';

const LANGS = [
	'de-de',
	'en-us',
	'es-es',
	'fr-fr',
	'it-it',
	'ja-jp',
	'pt-br'
] as const;

type Lang = (typeof LANGS)[number];

const isLang = (value: string | null): value is Lang => {
	return _.includes(LANGS, value);
};

export type { Lang };
export { LANGS, isLang };
