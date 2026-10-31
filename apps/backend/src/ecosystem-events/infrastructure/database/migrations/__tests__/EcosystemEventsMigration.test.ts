import { EcosystemEventsMigration1793458800000 } from '../1793458800000-EcosystemEventsMigration.js';

describe('EcosystemEventsMigration1793458800000', () => {
	let migration: EcosystemEventsMigration1793458800000;
	let queryRunner: { query: jest.Mock };

	beforeEach(() => {
		migration = new EcosystemEventsMigration1793458800000();
		queryRunner = { query: jest.fn() };
	});

	const ran = (fragment: string) =>
		expect(queryRunner.query).toHaveBeenCalledWith(
			expect.stringContaining(fragment)
		);

	it('should create the events table with its constraints', async () => {
		await migration.up(queryRunner as never);

		ran('CREATE TABLE IF NOT EXISTS "ecosystem_events"');
		ran('"slug" varchar(64) NOT NULL');
		ran('"revision" char(64) NOT NULL');
		ran('"summary" jsonb NOT NULL');
		ran('"CHK_ecosystem_events_network"');
		ran("CHECK (\"network\" IN ('pubnet', 'testnet', 'futurenet'))");
		ran('"CHK_ecosystem_events_window"');
		ran('CREATE UNIQUE INDEX IF NOT EXISTS "uq_ecosystem_events_slug"');
	});

	it('should create the projects table that follows its event', async () => {
		await migration.up(queryRunner as never);

		ran('CREATE TABLE IF NOT EXISTS "ecosystem_event_projects"');
		ran('FOREIGN KEY ("event_id") REFERENCES "ecosystem_events" ("id")');
		ran('ON DELETE CASCADE');
		ran('"CHK_ecosystem_event_projects_track"');
		ran('"CHK_ecosystem_event_projects_evidence_tier"');
	});

	it('should keep the award and its rank consistent', async () => {
		await migration.up(queryRunner as never);

		ran('"CHK_ecosystem_event_projects_award"');
		ran(`("award" = 'first' AND "award_rank" = 0)`);
		ran(`("award" = 'runner-up' AND "award_rank" = 1)`);
		ran(`("award" IS NULL AND "award_rank" = 2)`);
	});

	it('should index the listing order, the repository lookup and integrations', async () => {
		await migration.up(queryRunner as never);

		ran('"uq_ecosystem_event_projects_event_slug"');
		ran('"uq_ecosystem_event_projects_event_repository"');
		ran('ON "ecosystem_event_projects" ("event_id", "award_rank", "slug")');
		ran('ON "ecosystem_event_projects" ("repository_key")');
		ran('USING GIN ("integration_slugs")');
	});

	it('should be safe to run twice', async () => {
		await migration.up(queryRunner as never);

		for (const [sql] of queryRunner.query.mock.calls as [string][])
			expect(sql).toMatch(/IF NOT EXISTS/);
	});

	it('should drop the projects before their events', async () => {
		await migration.down(queryRunner as never);

		const statements = (queryRunner.query.mock.calls as [string][]).map(
			([sql]) => sql
		);
		const dropOrder = statements.filter((sql) => sql.includes('DROP TABLE'));

		expect(dropOrder[0]).toContain('"ecosystem_event_projects"');
		expect(dropOrder[1]).toContain('"ecosystem_events"');
	});
});
