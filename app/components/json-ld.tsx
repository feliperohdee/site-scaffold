import _ from 'lodash';
import { useMemo } from 'react';

import safeJsonStringify from '@/libs/safe-json';

const JsonLd = ({ data }: { data: unknown }) => {
	const items = useMemo(() => {
		const items: unknown[] = _.isArray(data) ? data : [data];

		return items;
	}, [data]);

	if (_.isNil(data)) {
		return null;
	}

	return (
		<>
			{_.map(items, (item, index) => {
				return (
					<script
						dangerouslySetInnerHTML={{
							__html: safeJsonStringify(item)
						}}
						key={index}
						type='application/ld+json'
					/>
				);
			})}
		</>
	);
};

export default JsonLd;
