import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '@core/utilities/mapUnknownToError.js';
import { ECOSYSTEM_EVENT_TYPES } from '../../domain/EcosystemEventTypes.js';
import type {
	EcosystemEventDTO,
	EcosystemEventRepository
} from '../../domain/EcosystemEvent.js';

@injectable()
export class ListEcosystemEvents {
	constructor(
		@inject(ECOSYSTEM_EVENT_TYPES.EcosystemEventRepository)
		private readonly repository: EcosystemEventRepository
	) {}

	async execute(): Promise<
		Result<{ readonly data: readonly EcosystemEventDTO[] }, Error>
	> {
		try {
			return ok({ data: await this.repository.listEvents() });
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
