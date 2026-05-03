import _ from 'lodash';

import safeJsonStringify from '@/libs/safe-json';

const JsonLd = ({ data }: { data: unknown }) => {
	if (_.isNil(data)) {
		return null;
	}

	const items = _.isArray(data) ? data : [data];

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
