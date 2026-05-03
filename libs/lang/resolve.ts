import inferLang from '@/libs/lang/infer';
import { isLang } from '@/libs/lang/types';
import type { Lang } from '@/libs/lang/types';

const resolveLang = (input: {
	country: string;
	urlLang: string | null;
}): Lang => {
	if (isLang(input.urlLang)) {
		return input.urlLang;
	}

	return inferLang(input.country);
};

export default resolveLang;
