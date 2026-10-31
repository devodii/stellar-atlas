import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '@core/utilities/mapUnknownToError.js';
import { ECOSYSTEM_EVENT_TYPES } from '../../domain/EcosystemEventTypes.js';
import { repositoryKey } from '../../domain/EcosystemEventDataset.js';
import type {
	EcosystemEventRepository,
	EcosystemRepositoryParticipationDTO
} from '../../domain/EcosystemEvent.js';

export interface ListRepositoryEcosystemEventsDTO {
	readonly repository: string;
}

export interface RepositoryEcosystemEventsDTO {
	readonly repository: string;
	readonly data: readonly EcosystemRepositoryParticipationDTO[];
}

@injectable()
export class ListRepositoryEcosystemEvents {
	constructor(
		@inject(ECOSYSTEM_EVENT_TYPES.EcosystemEventRepository)
		private readonly repository: EcosystemEventRepository
	) {}

	async execute(
		dto: ListRepositoryEcosystemEventsDTO
	): Promise<Result<RepositoryEcosystemEventsDTO, Error>> {
		try {
			return ok({
				repository: dto.repository,
				data: await this.repository.listRepositoryParticipations(
					repositoryKey(dto.repository)
				)
			});
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
