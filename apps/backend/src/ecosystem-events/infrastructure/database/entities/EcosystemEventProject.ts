import {
	Check,
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn
} from 'typeorm';
import type {
	EcosystemChainDTO,
	EcosystemContributorDTO,
	EcosystemEvidenceTier,
	EcosystemIntegrationDTO,
	EcosystemProjectAward,
	EcosystemProjectTrack
} from '@ecosystem-events/domain/EcosystemEvent.js';
import { EcosystemEvent } from './EcosystemEvent.js';

@Entity('ecosystem_event_projects')
@Check('CHK_ecosystem_event_projects_track', `"track" IN ('genesis', 'scale')`)
@Check(
	'CHK_ecosystem_event_projects_award',
	`("award" IS NULL AND "award_rank" = 2)
	OR ("award" = 'first' AND "award_rank" = 0)
	OR ("award" = 'runner-up' AND "award_rank" = 1)`
)
@Check(
	'CHK_ecosystem_event_projects_evidence_tier',
	`"evidence_tier" IN ('verified', 'likely', 'possible')`
)
@Index('uq_ecosystem_event_projects_event_slug', ['eventId', 'slug'], {
	unique: true
})
@Index(
	'uq_ecosystem_event_projects_event_repository',
	['eventId', 'repositoryKey'],
	{ unique: true }
)
@Index('idx_ecosystem_event_projects_ranked', ['eventId', 'awardRank', 'slug'])
@Index('idx_ecosystem_event_projects_repository_key', ['repositoryKey'])
export class EcosystemEventProject {
	@PrimaryGeneratedColumn('uuid')
	id!: string;

	@Column({ name: 'event_id', type: 'uuid' })
	eventId!: string;

	@ManyToOne(() => EcosystemEvent, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'event_id' })
	event?: EcosystemEvent;

	@Column({ type: 'varchar', length: 128 })
	slug!: string;

	@Column({ type: 'varchar', length: 201 })
	repository!: string;

	@Column({ name: 'repository_key', type: 'varchar', length: 201 })
	repositoryKey!: string;

	@Column({ name: 'repository_url', type: 'text' })
	repositoryUrl!: string;

	@Column({ type: 'varchar', length: 200 })
	name!: string;

	@Column({ type: 'text', nullable: true })
	description!: string | null;

	@Column({ type: 'text', nullable: true })
	homepage!: string | null;

	@Column({ type: 'varchar', length: 64, nullable: true })
	language!: string | null;

	@Column({ type: 'varchar', length: 64, nullable: true })
	license!: string | null;

	@Column({ type: 'text', array: true, default: () => `'{}'` })
	topics!: string[];

	@Column({
		name: 'repository_created_at',
		type: 'timestamptz',
		nullable: true
	})
	repositoryCreatedAt!: Date | null;

	@Column({ type: 'varchar', length: 100 })
	owner!: string;

	@Column({ type: 'varchar', length: 16 })
	track!: EcosystemProjectTrack;

	@Column({ name: 'track_declared', type: 'boolean' })
	trackDeclared!: boolean;

	@Column({ type: 'varchar', length: 16, nullable: true })
	award!: EcosystemProjectAward | null;

	@Column({ name: 'award_rank', type: 'smallint' })
	awardRank!: number;

	@Column({ name: 'evidence_tier', type: 'varchar', length: 16 })
	evidenceTier!: EcosystemEvidenceTier;

	@Column({ name: 'commits_in_window', type: 'integer', nullable: true })
	commitsInWindow!: number | null;

	@Column({ name: 'contract_count', type: 'integer' })
	contractCount!: number;

	@Column({ type: 'jsonb' })
	stack!: Readonly<Record<string, string | null>>;

	@Column({ type: 'jsonb' })
	integrations!: readonly EcosystemIntegrationDTO[];

	@Column({
		name: 'integration_slugs',
		type: 'text',
		array: true,
		default: () => `'{}'`
	})
	integrationSlugs!: string[];

	@Column({ type: 'jsonb' })
	chain!: EcosystemChainDTO;

	@Column({ type: 'jsonb' })
	contributors!: readonly EcosystemContributorDTO[];
}
