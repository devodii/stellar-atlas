import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { err, ok, Result } from 'neverthrow';
import { mapUnknownToError } from '@core/utilities/mapUnknownToError.js';
import { ECOSYSTEM_EVENT_TYPES } from '../../domain/EcosystemEventTypes.js';
import {
	decodeEcosystemEventProjectCursor,
	encodeEcosystemEventProjectCursor
} from '../../domain/EcosystemEventProjectCursor.js';
import { awardRank } from '../../domain/EcosystemEventDataset.js';
import type {
	EcosystemEventProjectPageDTO,
	EcosystemEventProjectQuery,
	EcosystemEventRepository
} from '../../domain/EcosystemEvent.js';

export type ListEcosystemEventProjectsDTO = Omit<
	EcosystemEventProjectQuery,
	'limit' | 'cursor'
> & {
	readonly limit?: number;
	readonly cursor?: string;
};

export class InvalidEcosystemEventCursor extends Error {
	constructor() {
		super('The cursor is not valid for this listing');
		this.name = 'InvalidEcosystemEventCursor';
	}
}

@injectable()
export class ListEcosystemEventProjects {
	static readonly defaultLimit = 25;
	static readonly maxLimit = 100;

	constructor(
		@inject(ECOSYSTEM_EVENT_TYPES.EcosystemEventRepository)
		private readonly repository: EcosystemEventRepository
	) {}

	async execute(
		dto: ListEcosystemEventProjectsDTO
	): Promise<Result<EcosystemEventProjectPageDTO | null, Error>> {
		try {
			const cursor =
				dto.cursor === undefined
					? undefined
					: decodeEcosystemEventProjectCursor(dto.cursor);
			if (cursor === null) return err(new InvalidEcosystemEventCursor());
			if ((await this.repository.findEvent(dto.event)) === null)
				return ok(null);

			const limit = Math.min(
				dto.limit ?? ListEcosystemEventProjects.defaultLimit,
				ListEcosystemEventProjects.maxLimit
			);
			const rows = await this.repository.listProjects({
				...dto,
				limit: limit + 1,
				cursor
			});
			const data = rows.slice(0, limit);
			const last = data.at(-1);

			return ok({
				data,
				nextCursor:
					rows.length > limit && last
						? encodeEcosystemEventProjectCursor({
								awardRank: awardRank(last.award),
								slug: last.slug
							})
						: null
			});
		} catch (error) {
			return err(mapUnknownToError(error));
		}
	}
}
