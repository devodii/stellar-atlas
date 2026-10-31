import express from 'express';
import request from 'supertest';
import { mock } from 'jest-mock-extended';
import { err, ok } from 'neverthrow';
import {
	eventDto,
	projectItem
} from '../../../__tests__/EcosystemEventFixtures.js';
import { GetEcosystemEvent } from '../../../use-cases/get-ecosystem-event/GetEcosystemEvent.js';
import { GetEcosystemEventProject } from '../../../use-cases/get-ecosystem-event-project/GetEcosystemEventProject.js';
import {
	InvalidEcosystemEventCursor,
	ListEcosystemEventProjects
} from '../../../use-cases/list-ecosystem-event-projects/ListEcosystemEventProjects.js';
import { ListEcosystemEvents } from '../../../use-cases/list-ecosystem-events/ListEcosystemEvents.js';
import { ListRepositoryEcosystemEvents } from '../../../use-cases/list-repository-ecosystem-events/ListRepositoryEcosystemEvents.js';
import {
	ecosystemEventsRouter,
	repositoryEcosystemEventsRouter
} from '../EcosystemEventsRouter.js';

describe('EcosystemEventsRouter.integration', () => {
	let app: express.Application;
	let getEcosystemEvent: jest.Mocked<GetEcosystemEvent>;
	let getEcosystemEventProject: jest.Mocked<GetEcosystemEventProject>;
	let listEcosystemEventProjects: jest.Mocked<ListEcosystemEventProjects>;
	let listEcosystemEvents: jest.Mocked<ListEcosystemEvents>;
	let listRepositoryEcosystemEvents: jest.Mocked<ListRepositoryEcosystemEvents>;

	beforeEach(() => {
		getEcosystemEvent = mock<GetEcosystemEvent>();
		getEcosystemEventProject = mock<GetEcosystemEventProject>();
		listEcosystemEventProjects = mock<ListEcosystemEventProjects>();
		listEcosystemEvents = mock<ListEcosystemEvents>();
		listRepositoryEcosystemEvents = mock<ListRepositoryEcosystemEvents>();
		const config = {
			getEcosystemEvent,
			getEcosystemEventProject,
			listEcosystemEventProjects,
			listEcosystemEvents,
			listRepositoryEcosystemEvents
		};
		app = express();
		app.use('/v1/ecosystem-events', ecosystemEventsRouter(config));
		app.use('/v1/repositories', repositoryEcosystemEventsRouter(config));
	});

	describe('events', () => {
		it('should list events and let clients cache them', async () => {
			listEcosystemEvents.execute.mockResolvedValue(ok({ data: [eventDto()] }));

			await request(app)
				.get('/v1/ecosystem-events')
				.expect(200)
				.expect('Cache-Control', 'public, max-age=300')
				.expect((response) => {
					expect(response.body.data[0].slug).toBe('hackmeridian-2026');
					expect(response.body.data[0].summary.projectCount).toBe(1);
				});
		});

		it('should return one event', async () => {
			getEcosystemEvent.execute.mockResolvedValue(ok(eventDto()));

			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026')
				.expect(200)
				.expect((response) => expect(response.body.network).toBe('testnet'));
			expect(getEcosystemEvent.execute).toHaveBeenCalledWith({
				slug: 'hackmeridian-2026'
			});
		});

		it('should answer 404 for an unknown event', async () => {
			getEcosystemEvent.execute.mockResolvedValue(ok(null));

			await request(app)
				.get('/v1/ecosystem-events/nothing')
				.expect(404)
				.expect({
					code: 'ecosystem_event_not_found',
					error: 'Ecosystem event not found'
				});
		});

		it.each(['Upper', 'under_score', '-lead', 'a--b'])(
			'should answer 400 for the slug %s without querying',
			async (slug) => {
				await request(app)
					.get(`/v1/ecosystem-events/${slug}`)
					.expect(400)
					.expect((response) =>
						expect(response.body.code).toBe('invalid_ecosystem_event_request')
					);
				expect(getEcosystemEvent.execute).not.toHaveBeenCalled();
			}
		);
	});

	describe('projects', () => {
		beforeEach(() => {
			listEcosystemEventProjects.execute.mockResolvedValue(
				ok({ data: [projectItem()], nextCursor: null })
			);
		});

		it('should return a page of projects', async () => {
			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026/projects')
				.expect(200)
				.expect('Cache-Control', 'public, max-age=300')
				.expect((response) => {
					expect(response.body.data[0].repository).toBe('Team/App');
					expect(response.body.nextCursor).toBeNull();
				});
		});

		it('should pass every filter to the use case', async () => {
			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026/projects')
				.query({
					track: 'scale',
					tier: 'verified',
					award: 'any',
					integration: 'stellar-wallets-kit',
					q: ' pay ',
					limit: '10',
					cursor: 'abc'
				})
				.expect(200);

			expect(listEcosystemEventProjects.execute).toHaveBeenCalledWith({
				event: 'hackmeridian-2026',
				track: 'scale',
				evidenceTier: 'verified',
				award: 'any',
				integration: 'stellar-wallets-kit',
				search: 'pay',
				cursor: 'abc',
				limit: 10
			});
		});

		it.each([
			['track', 'sideways'],
			['tier', 'maybe'],
			['award', 'gold'],
			['integration', 'Not A Slug'],
			['limit', '0'],
			['limit', '101'],
			['limit', 'ten'],
			['limit', '1.5'],
			['q', 'x'.repeat(101)],
			['cursor', 'x'.repeat(201)]
		])('should answer 400 for %s=%s', async (name, value) => {
			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026/projects')
				.query({ [name]: value })
				.expect(400);
			expect(listEcosystemEventProjects.execute).not.toHaveBeenCalled();
		});

		it('should answer 400 when a filter is repeated', async () => {
			await request(app)
				.get(
					'/v1/ecosystem-events/hackmeridian-2026/projects?track=scale&track=genesis'
				)
				.expect(400);
		});

		it('should answer 400 for a cursor the use case rejects', async () => {
			listEcosystemEventProjects.execute.mockResolvedValue(
				err(new InvalidEcosystemEventCursor())
			);

			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026/projects?cursor=nope')
				.expect(400)
				.expect((response) =>
					expect(response.body.error).toBe(
						'The cursor is not valid for this listing'
					)
				);
		});

		it('should answer 404 for an unknown event', async () => {
			listEcosystemEventProjects.execute.mockResolvedValue(ok(null));

			await request(app)
				.get('/v1/ecosystem-events/nothing/projects')
				.expect(404);
		});
	});

	describe('one project', () => {
		it('should return the project', async () => {
			getEcosystemEventProject.execute.mockResolvedValue(
				ok({ ...projectItem(), integrations: [] } as never)
			);

			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026/projects/Team/App')
				.expect(200);
			expect(getEcosystemEventProject.execute).toHaveBeenCalledWith({
				event: 'hackmeridian-2026',
				repository: 'Team/App'
			});
		});

		it('should answer 404 with a project-specific code', async () => {
			getEcosystemEventProject.execute.mockResolvedValue(ok(null));

			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026/projects/Team/Missing')
				.expect(404)
				.expect((response) =>
					expect(response.body.code).toBe('ecosystem_event_project_not_found')
				);
		});

		it('should answer 400 for a name that is not a GitHub name', async () => {
			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026/projects/Team/a%20b')
				.expect(400);
			expect(getEcosystemEventProject.execute).not.toHaveBeenCalled();
		});
	});

	describe('repository lookup', () => {
		it('should list the events of a repository', async () => {
			listRepositoryEcosystemEvents.execute.mockResolvedValue(
				ok({ repository: 'Team/App', data: [] })
			);

			await request(app)
				.get('/v1/repositories/Team/App/ecosystem-events')
				.expect(200)
				.expect('Cache-Control', 'public, max-age=300')
				.expect({ repository: 'Team/App', data: [] });
		});

		it('should answer 400 for a repository name with a space', async () => {
			await request(app)
				.get('/v1/repositories/Team/a%20b/ecosystem-events')
				.expect(400);
			expect(listRepositoryEcosystemEvents.execute).not.toHaveBeenCalled();
		});
	});

	describe('failures', () => {
		it('should answer 503 and ask clients to retry when the data is unavailable', async () => {
			listEcosystemEvents.execute.mockResolvedValue(err(new Error('db down')));

			await request(app)
				.get('/v1/ecosystem-events')
				.expect(503)
				.expect('Cache-Control', 'no-store')
				.expect('Retry-After', '30')
				.expect({
					code: 'ecosystem_events_unavailable',
					error: 'Ecosystem event data is temporarily unavailable'
				});
		});

		it('should not leak internal error messages', async () => {
			getEcosystemEvent.execute.mockResolvedValue(
				err(new Error('connection refused at 10.0.0.5:5432'))
			);

			await request(app)
				.get('/v1/ecosystem-events/hackmeridian-2026')
				.expect(503)
				.expect((response) =>
					expect(JSON.stringify(response.body)).not.toContain('10.0.0.5')
				);
		});
	});
});
