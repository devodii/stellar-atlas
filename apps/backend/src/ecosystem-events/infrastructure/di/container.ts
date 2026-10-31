import { interfaces } from 'inversify';
import { DataSource } from 'typeorm';
import { ECOSYSTEM_EVENT_TYPES } from '../../domain/EcosystemEventTypes.js';
import type {
	EcosystemEventDatasetStore,
	EcosystemEventRepository
} from '../../domain/EcosystemEvent.js';
import { GetEcosystemEvent } from '../../use-cases/get-ecosystem-event/GetEcosystemEvent.js';
import { GetEcosystemEventProject } from '../../use-cases/get-ecosystem-event-project/GetEcosystemEventProject.js';
import { ImportEcosystemEvent } from '../../use-cases/import-ecosystem-event/ImportEcosystemEvent.js';
import { ListEcosystemEventProjects } from '../../use-cases/list-ecosystem-event-projects/ListEcosystemEventProjects.js';
import { ListEcosystemEvents } from '../../use-cases/list-ecosystem-events/ListEcosystemEvents.js';
import { ListRepositoryEcosystemEvents } from '../../use-cases/list-repository-ecosystem-events/ListRepositoryEcosystemEvents.js';
import { TypeOrmEcosystemEventRepository } from '../database/repositories/TypeOrmEcosystemEventRepository.js';
import Container = interfaces.Container;

export function load(container: Container) {
	const dataSource = container.get(DataSource);
	const repository = new TypeOrmEcosystemEventRepository(dataSource);

	container
		.bind<EcosystemEventRepository>(
			ECOSYSTEM_EVENT_TYPES.EcosystemEventRepository
		)
		.toConstantValue(repository);
	container
		.bind<EcosystemEventDatasetStore>(
			ECOSYSTEM_EVENT_TYPES.EcosystemEventDatasetStore
		)
		.toConstantValue(repository);

	container.bind(GetEcosystemEvent).toSelf();
	container.bind(GetEcosystemEventProject).toSelf();
	container.bind(ImportEcosystemEvent).toSelf();
	container.bind(ListEcosystemEventProjects).toSelf();
	container.bind(ListEcosystemEvents).toSelf();
	container.bind(ListRepositoryEcosystemEvents).toSelf();
}
