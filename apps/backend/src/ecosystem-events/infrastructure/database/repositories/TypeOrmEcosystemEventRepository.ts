import { injectable } from 'inversify';
import type { DataSource } from 'typeorm';
import type {
	EcosystemEventDTO,
	EcosystemEventDatasetDTO,
	EcosystemEventImportOutcomeDTO,
	EcosystemEventProjectDetailDTO,
	EcosystemEventProjectItemDTO,
	EcosystemEventProjectQuery,
	EcosystemRepositoryParticipationDTO
} from '../../../domain/EcosystemEvent.js';
import type {
	EcosystemEventDatasetStore,
	EcosystemEventRepository
} from '../../../domain/EcosystemEvent.js';
import { EcosystemEvent } from '../entities/EcosystemEvent.js';
import { EcosystemEventProject } from '../entities/EcosystemEventProject.js';
import {
	mapEvent,
	mapParticipation,
	mapProjectDetail,
	mapProjectItem,
	projectRow
} from '../EcosystemEventMapper.js';

const insertChunkSize = 200;

@injectable()
export class TypeOrmEcosystemEventRepository
	implements EcosystemEventRepository, EcosystemEventDatasetStore
{
	constructor(private readonly dataSource: DataSource) {}

	async listEvents(): Promise<readonly EcosystemEventDTO[]> {
		const events = await this.dataSource
			.getRepository(EcosystemEvent)
			.find({ order: { startsAt: 'DESC', slug: 'ASC' } });

		return events.map(mapEvent);
	}

	async findEvent(slug: string): Promise<EcosystemEventDTO | null> {
		const event = await this.dataSource
			.getRepository(EcosystemEvent)
			.findOne({ where: { slug } });

		return event === null ? null : mapEvent(event);
	}

	async listProjects(
		query: EcosystemEventProjectQuery
	): Promise<readonly EcosystemEventProjectItemDTO[]> {
		const builder = this.dataSource
			.getRepository(EcosystemEventProject)
			.createQueryBuilder('project')
			.innerJoin('project.event', 'event')
			.where('event.slug = :event', { event: query.event });

		if (query.track)
			builder.andWhere('project.track = :track', { track: query.track });
		if (query.evidenceTier)
			builder.andWhere('project.evidenceTier = :tier', {
				tier: query.evidenceTier
			});
		if (query.award === 'any') builder.andWhere('project.award IS NOT NULL');
		else if (query.award)
			builder.andWhere('project.award = :award', { award: query.award });
		if (query.integration)
			builder.andWhere(
				'project.integrationSlugs @> ARRAY[:integration]::text[]',
				{ integration: query.integration }
			);
		if (query.search)
			builder.andWhere(
				`(project.name ILIKE :search ESCAPE '\\'
					OR project.repository ILIKE :search ESCAPE '\\'
					OR project.description ILIKE :search ESCAPE '\\')`,
				{ search: `%${escapeLike(query.search)}%` }
			);
		if (query.cursor)
			builder.andWhere(
				'(project.awardRank, project.slug) > (:cursorRank, :cursorSlug)',
				{ cursorRank: query.cursor.awardRank, cursorSlug: query.cursor.slug }
			);

		const projects = await builder
			.orderBy('project.awardRank', 'ASC')
			.addOrderBy('project.slug', 'ASC')
			.limit(query.limit)
			.getMany();

		return projects.map((project) => mapProjectItem(query.event, project));
	}

	async findProject(
		slug: string,
		repositoryKey: string
	): Promise<EcosystemEventProjectDetailDTO | null> {
		const project = await this.dataSource
			.getRepository(EcosystemEventProject)
			.createQueryBuilder('project')
			.innerJoin('project.event', 'event')
			.where('event.slug = :slug', { slug })
			.andWhere('project.repositoryKey = :repositoryKey', { repositoryKey })
			.getOne();

		return project === null ? null : mapProjectDetail(slug, project);
	}

	async listRepositoryParticipations(
		repositoryKey: string
	): Promise<readonly EcosystemRepositoryParticipationDTO[]> {
		const rows = await this.dataSource
			.getRepository(EcosystemEventProject)
			.createQueryBuilder('project')
			.innerJoinAndSelect('project.event', 'event')
			.where('project.repositoryKey = :repositoryKey', { repositoryKey })
			.orderBy('event.startsAt', 'DESC')
			.addOrderBy('event.slug', 'ASC')
			.getMany();

		return rows.flatMap((row) =>
			row.event ? [mapParticipation(row, row.event)] : []
		);
	}

	async findRevision(slug: string): Promise<string | null> {
		const event = await this.dataSource
			.getRepository(EcosystemEvent)
			.findOne({ select: { revision: true }, where: { slug } });

		return event?.revision ?? null;
	}

	async replace(
		dataset: EcosystemEventDatasetDTO
	): Promise<EcosystemEventImportOutcomeDTO> {
		const { manifest, projects, summary, revision } = dataset;

		return this.dataSource.transaction(async (manager) => {
			const existing = await manager
				.getRepository(EcosystemEvent)
				.createQueryBuilder('event')
				.setLock('pessimistic_write')
				.where('event.slug = :slug', { slug: manifest.slug })
				.getOne();
			const outcome = {
				slug: manifest.slug,
				revision,
				projects: projects.length
			};
			if (existing?.revision === revision)
				return {
					...outcome,
					status: 'unchanged' as const,
					changes: { added: 0, retained: projects.length, removed: 0 }
				};

			const { raw } = await manager
				.createQueryBuilder()
				.insert()
				.into(EcosystemEvent)
				.values({
					slug: manifest.slug,
					name: manifest.name,
					network: manifest.network,
					startsAt: new Date(manifest.startsAt),
					endsAt: new Date(manifest.endsAt),
					sourceUrl: manifest.sourceUrl,
					revision,
					summary,
					importedAt: new Date()
				})
				.orUpdate(
					[
						'name',
						'network',
						'starts_at',
						'ends_at',
						'source_url',
						'revision',
						'summary',
						'imported_at'
					],
					['slug']
				)
				.returning('id')
				.execute();
			const event = { id: (raw as { id: string }[])[0]!.id };

			const projectRepository = manager.getRepository(EcosystemEventProject);
			const previous = new Set(
				(
					await projectRepository.find({
						select: { slug: true },
						where: { eventId: event.id }
					})
				).map((project) => project.slug)
			);
			const current = new Set(projects.map((project) => project.slug));
			await projectRepository.delete({ eventId: event.id });
			for (let offset = 0; offset < projects.length; offset += insertChunkSize)
				await projectRepository.insert(
					projects
						.slice(offset, offset + insertChunkSize)
						.map((project) => projectRow(event.id, project))
				);
			const retained = [...current].filter((slug) => previous.has(slug)).length;

			return {
				...outcome,
				status: existing ? ('updated' as const) : ('created' as const),
				changes: {
					added: current.size - retained,
					retained,
					removed: previous.size - retained
				}
			};
		});
	}
}

function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
