import {
	Check,
	Column,
	CreateDateColumn,
	Entity,
	Index,
	PrimaryGeneratedColumn
} from 'typeorm';
import type {
	EcosystemEventNetwork,
	EcosystemEventSummaryDTO
} from '@ecosystem-events/domain/EcosystemEvent.js';

@Entity('ecosystem_events')
@Check(
	'CHK_ecosystem_events_network',
	`"network" IN ('pubnet', 'testnet', 'futurenet')`
)
@Check('CHK_ecosystem_events_window', `"ends_at" > "starts_at"`)
@Index('uq_ecosystem_events_slug', ['slug'], { unique: true })
@Index('idx_ecosystem_events_starts_at', ['startsAt', 'slug'])
export class EcosystemEvent {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ type: 'varchar', length: 64 })
	slug!: string;

	@Column({ type: 'varchar', length: 200 })
	name!: string;

	@Column({ type: 'varchar', length: 16 })
	network!: EcosystemEventNetwork;

	@Column({ name: 'starts_at', type: 'timestamptz' })
	startsAt!: Date;

	@Column({ name: 'ends_at', type: 'timestamptz' })
	endsAt!: Date;

	@Column({ name: 'source_url', type: 'text', nullable: true })
	sourceUrl!: string | null;

	@Column({ type: 'char', length: 64 })
	revision!: string;

	@Column({ type: 'jsonb' })
	summary!: EcosystemEventSummaryDTO;

	@CreateDateColumn({ name: 'imported_at', type: 'timestamptz' })
	importedAt!: Date;
}
