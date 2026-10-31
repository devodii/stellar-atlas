import { MigrationInterface, QueryRunner } from 'typeorm';

export class EcosystemEventsMigration1793458800000 implements MigrationInterface {
	name = 'EcosystemEventsMigration1793458800000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "ecosystem_events" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"slug" varchar(64) NOT NULL,
				"name" varchar(200) NOT NULL,
				"network" varchar(16) NOT NULL,
				"starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
				"ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
				"source_url" text,
				"revision" char(64) NOT NULL,
				"summary" jsonb NOT NULL,
				"imported_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "PK_ecosystem_events_id" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_ecosystem_events_network"
					CHECK ("network" IN ('pubnet', 'testnet', 'futurenet')),
				CONSTRAINT "CHK_ecosystem_events_window"
					CHECK ("ends_at" > "starts_at")
			)
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "uq_ecosystem_events_slug"
			ON "ecosystem_events" ("slug")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "idx_ecosystem_events_starts_at"
			ON "ecosystem_events" ("starts_at", "slug")
		`);
		await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS "ecosystem_event_projects" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"event_id" uuid NOT NULL,
				"slug" varchar(128) NOT NULL,
				"repository" varchar(201) NOT NULL,
				"repository_key" varchar(201) NOT NULL,
				"repository_url" text NOT NULL,
				"name" varchar(200) NOT NULL,
				"description" text,
				"homepage" text,
				"language" varchar(64),
				"license" varchar(64),
				"topics" text[] NOT NULL DEFAULT '{}',
				"repository_created_at" TIMESTAMP WITH TIME ZONE,
				"owner" varchar(100) NOT NULL,
				"track" varchar(16) NOT NULL,
				"track_declared" boolean NOT NULL,
				"award" varchar(16),
				"award_rank" smallint NOT NULL,
				"evidence_tier" varchar(16) NOT NULL,
				"commits_in_window" integer,
				"contract_count" integer NOT NULL,
				"stack" jsonb NOT NULL,
				"integrations" jsonb NOT NULL,
				"integration_slugs" text[] NOT NULL DEFAULT '{}',
				"chain" jsonb NOT NULL,
				"contributors" jsonb NOT NULL,
				CONSTRAINT "PK_ecosystem_event_projects_id" PRIMARY KEY ("id"),
				CONSTRAINT "FK_ecosystem_event_projects_event"
					FOREIGN KEY ("event_id") REFERENCES "ecosystem_events" ("id")
					ON DELETE CASCADE,
				CONSTRAINT "CHK_ecosystem_event_projects_track"
					CHECK ("track" IN ('genesis', 'scale')),
				CONSTRAINT "CHK_ecosystem_event_projects_award"
					CHECK (
						("award" IS NULL AND "award_rank" = 2)
						OR ("award" = 'first' AND "award_rank" = 0)
						OR ("award" = 'runner-up' AND "award_rank" = 1)
					),
				CONSTRAINT "CHK_ecosystem_event_projects_evidence_tier"
					CHECK ("evidence_tier" IN ('verified', 'likely', 'possible'))
			)
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS "uq_ecosystem_event_projects_event_slug"
			ON "ecosystem_event_projects" ("event_id", "slug")
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX IF NOT EXISTS
			"uq_ecosystem_event_projects_event_repository"
			ON "ecosystem_event_projects" ("event_id", "repository_key")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "idx_ecosystem_event_projects_ranked"
			ON "ecosystem_event_projects" ("event_id", "award_rank", "slug")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "idx_ecosystem_event_projects_repository_key"
			ON "ecosystem_event_projects" ("repository_key")
		`);
		await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS "idx_ecosystem_event_projects_integrations"
			ON "ecosystem_event_projects" USING GIN ("integration_slugs")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP INDEX IF EXISTS "idx_ecosystem_event_projects_integrations"
		`);
		await queryRunner.query(`
			DROP TABLE IF EXISTS "ecosystem_event_projects"
		`);
		await queryRunner.query(`DROP TABLE IF EXISTS "ecosystem_events"`);
	}
}
