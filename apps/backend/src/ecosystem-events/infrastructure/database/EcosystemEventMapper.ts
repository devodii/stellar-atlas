import type {
	EcosystemEventDTO,
	EcosystemEventProjectDetailDTO,
	EcosystemEventProjectDocumentDTO,
	EcosystemEventProjectItemDTO,
	EcosystemRepositoryParticipationDTO
} from '../../domain/EcosystemEvent.js';
import {
	awardRank,
	repositoryKey
} from '../../domain/EcosystemEventDataset.js';
import type { EcosystemEvent } from './entities/EcosystemEvent.js';
import type { EcosystemEventProject } from './entities/EcosystemEventProject.js';

export function projectPath(event: string, repository: string): string {
	return `/v1/ecosystem-events/${event}/projects/${repository}`;
}

export function mapEvent(entity: EcosystemEvent): EcosystemEventDTO {
	return {
		slug: entity.slug,
		name: entity.name,
		network: entity.network,
		startsAt: entity.startsAt.toISOString(),
		endsAt: entity.endsAt.toISOString(),
		sourceUrl: entity.sourceUrl,
		importedAt: entity.importedAt.toISOString(),
		summary: entity.summary
	};
}

export function mapProjectItem(
	event: string,
	entity: EcosystemEventProject
): EcosystemEventProjectItemDTO {
	return {
		event,
		slug: entity.slug,
		repository: entity.repository,
		repositoryUrl: entity.repositoryUrl,
		name: entity.name,
		description: entity.description,
		language: entity.language,
		track: entity.track,
		trackDeclared: entity.trackDeclared,
		award: entity.award,
		evidenceTier: entity.evidenceTier,
		commitsInWindow: entity.commitsInWindow,
		contractCount: entity.contractCount,
		integrations: entity.integrationSlugs,
		links: { self: projectPath(event, entity.repository) }
	};
}

export function mapProjectDetail(
	event: string,
	entity: EcosystemEventProject
): EcosystemEventProjectDetailDTO {
	const { integrations: _slugs, ...item } = mapProjectItem(event, entity);

	return {
		...item,
		homepage: entity.homepage,
		license: entity.license,
		topics: entity.topics,
		createdAt: entity.repositoryCreatedAt?.toISOString() ?? null,
		owner: entity.owner,
		stack: entity.stack,
		integrations: entity.integrations,
		chain: entity.chain,
		contributors: entity.contributors
	};
}

export function mapParticipation(
	entity: EcosystemEventProject,
	event: EcosystemEvent
): EcosystemRepositoryParticipationDTO {
	return {
		event: {
			slug: event.slug,
			name: event.name,
			network: event.network,
			startsAt: event.startsAt.toISOString(),
			endsAt: event.endsAt.toISOString()
		},
		repository: entity.repository,
		name: entity.name,
		track: entity.track,
		trackDeclared: entity.trackDeclared,
		award: entity.award,
		evidenceTier: entity.evidenceTier,
		links: { project: projectPath(event.slug, entity.repository) }
	};
}

export function projectRow(
	eventId: string,
	document: EcosystemEventProjectDocumentDTO
): Omit<EcosystemEventProject, 'id' | 'event'> {
	return {
		eventId,
		slug: document.slug,
		repository: document.repository,
		repositoryKey: repositoryKey(document.repository),
		repositoryUrl: document.repositoryUrl,
		name: document.name,
		description: document.description,
		homepage: document.homepage,
		language: document.language,
		license: document.license,
		topics: [...document.topics],
		repositoryCreatedAt:
			document.createdAt === null ? null : new Date(document.createdAt),
		owner: document.owner,
		track: document.track,
		trackDeclared: document.trackDeclared,
		award: document.award,
		awardRank: awardRank(document.award),
		evidenceTier: document.evidenceTier,
		commitsInWindow: document.commitsInWindow,
		contractCount: document.chain.contracts,
		stack: document.stack,
		integrations: document.integrations,
		integrationSlugs: document.integrations.map(({ slug }) => slug),
		chain: document.chain,
		contributors: document.contributors
	};
}
