import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '@core/utilities/mapUnknownToError.js';
import { ECOSYSTEM_EVENT_TYPES } from '../../domain/EcosystemEventTypes.js';
import { repositoryKey } from '../../domain/EcosystemEventDataset.js';
import type {
	EcosystemEventProjectDetailDTO,
	EcosystemEventRepository
} from '../../domain/EcosystemEvent.js';

export interface GetEcosystemEventProjectDTO {
	readonly event: string;
	readonly repository: string;
}

@injectable()
export class GetEcosystemEventProject {
	constructor(
		@inject(ECOSYSTEM_EVENT_TYPES.EcosystemEventRepository)
		private readonly repository: EcosystemEventRepository
	) {}

	async execute(
		dto: GetEcosystemEventProjectDTO
	): Promise<Result<EcosystemEventProjectDetailDTO | null, Error>> {
		try {
			return ok(
				await this.repository.findProject(
					dto.event,
					repositoryKey(dto.repository)
				)
			);
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
