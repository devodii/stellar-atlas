import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '@core/utilities/mapUnknownToError.js';
import { ECOSYSTEM_EVENT_TYPES } from '../../domain/EcosystemEventTypes.js';
import type {
	EcosystemEventDTO,
	EcosystemEventRepository
} from '../../domain/EcosystemEvent.js';

export interface GetEcosystemEventDTO {
	readonly slug: string;
}

@injectable()
export class GetEcosystemEvent {
	constructor(
		@inject(ECOSYSTEM_EVENT_TYPES.EcosystemEventRepository)
		private readonly repository: EcosystemEventRepository
	) {}

	async execute(
		dto: GetEcosystemEventDTO
	): Promise<Result<EcosystemEventDTO | null, Error>> {
		try {
			return ok(await this.repository.findEvent(dto.slug));
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
