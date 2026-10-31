import {
	ecosystemEventNetworks,
	type EcosystemEventManifestDTO
} from '../../domain/EcosystemEvent.js';
import type { DocumentReader } from './DocumentReader.js';

const manifestKeys = [
	'slug',
	'name',
	'network',
	'starts_at',
	'ends_at',
	'source_url'
] as const;

export const ecosystemEventSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseEcosystemEventManifest(
	raw: unknown,
	reader: DocumentReader
): EcosystemEventManifestDTO {
	const document = reader.object(raw, '', manifestKeys);
	const slug = reader.string(document?.slug, 'slug');
	if (slug && (!ecosystemEventSlugPattern.test(slug) || slug.length > 64))
		reader.fail('slug', 'must be lowercase words separated by hyphens');
	const startsAt = reader.timestamp(document?.starts_at, 'starts_at');
	const endsAt = reader.timestamp(document?.ends_at, 'ends_at');
	if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt))
		reader.fail('ends_at', 'must be after starts_at');

	return {
		slug,
		name: reader.string(document?.name, 'name'),
		network: reader.oneOf(document?.network, 'network', ecosystemEventNetworks),
		startsAt,
		endsAt,
		sourceUrl: reader.optionalUrl(document?.source_url, 'source_url')
	};
}
