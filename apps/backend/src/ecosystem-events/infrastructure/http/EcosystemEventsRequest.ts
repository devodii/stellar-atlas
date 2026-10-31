import type { Request } from 'express';
import {
	ecosystemEvidenceTiers,
	ecosystemProjectAwards,
	ecosystemProjectTracks
} from '../../domain/EcosystemEvent.js';
import { ListEcosystemEventProjects } from '../../use-cases/list-ecosystem-event-projects/ListEcosystemEventProjects.js';
import type { ListEcosystemEventProjectsDTO } from '../../use-cases/list-ecosystem-event-projects/ListEcosystemEventProjects.js';

export const eventSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const githubNamePattern = /^(?!\.{1,2}$)[A-Za-z0-9_.-]{1,100}$/;
const maxSearchLength = 100;
const maxCursorLength = 200;

export class EcosystemEventRequestError extends Error {}

export function eventSlug(request: Request): string {
	const slug = request.params.slug ?? '';
	if (slug.length > 64 || !eventSlugPattern.test(slug))
		throw new EcosystemEventRequestError('Invalid event slug');

	return slug;
}

export function repositoryName(request: Request): string {
	const { owner = '', repo = '' } = request.params;
	if (!githubNamePattern.test(owner) || !githubNamePattern.test(repo))
		throw new EcosystemEventRequestError('Invalid GitHub repository');

	return `${owner}/${repo}`;
}

export function projectListQuery(
	request: Request
): ListEcosystemEventProjectsDTO {
	const query = request.query;
	const track = single(query.track, 'track');
	const evidenceTier = single(query.tier, 'tier');
	const award = single(query.award, 'award');
	const integration = single(query.integration, 'integration');
	const search = single(query.q, 'q')?.trim();
	const cursor = single(query.cursor, 'cursor');
	const limit = single(query.limit, 'limit');

	if (track && !oneOf(ecosystemProjectTracks, track))
		throw new EcosystemEventRequestError('Invalid track');
	if (evidenceTier && !oneOf(ecosystemEvidenceTiers, evidenceTier))
		throw new EcosystemEventRequestError('Invalid tier');
	if (award && award !== 'any' && !oneOf(ecosystemProjectAwards, award))
		throw new EcosystemEventRequestError('Invalid award');
	if (integration && !eventSlugPattern.test(integration))
		throw new EcosystemEventRequestError('Invalid integration');
	if (search && search.length > maxSearchLength)
		throw new EcosystemEventRequestError('The search text is too long');
	if (cursor && cursor.length > maxCursorLength)
		throw new EcosystemEventRequestError('Invalid cursor');
	if (
		limit !== undefined &&
		!(
			/^\d+$/.test(limit) &&
			Number(limit) >= 1 &&
			Number(limit) <= ListEcosystemEventProjects.maxLimit
		)
	)
		throw new EcosystemEventRequestError(
			`limit must be between 1 and ${ListEcosystemEventProjects.maxLimit}`
		);

	return {
		event: eventSlug(request),
		track: track as ListEcosystemEventProjectsDTO['track'],
		evidenceTier: evidenceTier as ListEcosystemEventProjectsDTO['evidenceTier'],
		award: award as ListEcosystemEventProjectsDTO['award'],
		integration,
		search: search || undefined,
		cursor,
		limit: limit === undefined ? undefined : Number(limit)
	};
}

function single(value: unknown, name: string): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== 'string')
		throw new EcosystemEventRequestError(`${name} must be a single value`);

	return value;
}

function oneOf(allowed: readonly string[], value: string): boolean {
	return allowed.includes(value);
}
