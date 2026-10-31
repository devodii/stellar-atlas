import express, { type Response, type Router } from 'express';
import type { Result } from 'neverthrow';
import { GetEcosystemEvent } from '../../use-cases/get-ecosystem-event/GetEcosystemEvent.js';
import { GetEcosystemEventProject } from '../../use-cases/get-ecosystem-event-project/GetEcosystemEventProject.js';
import { ListEcosystemEventProjects } from '../../use-cases/list-ecosystem-event-projects/ListEcosystemEventProjects.js';
import { InvalidEcosystemEventCursor } from '../../use-cases/list-ecosystem-event-projects/ListEcosystemEventProjects.js';
import { ListEcosystemEvents } from '../../use-cases/list-ecosystem-events/ListEcosystemEvents.js';
import { ListRepositoryEcosystemEvents } from '../../use-cases/list-repository-ecosystem-events/ListRepositoryEcosystemEvents.js';
import {
	EcosystemEventRequestError,
	eventSlug,
	projectListQuery,
	repositoryName
} from './EcosystemEventsRequest.js';

export interface EcosystemEventsRouterConfig {
	readonly getEcosystemEvent: GetEcosystemEvent;
	readonly getEcosystemEventProject: GetEcosystemEventProject;
	readonly listEcosystemEventProjects: ListEcosystemEventProjects;
	readonly listEcosystemEvents: ListEcosystemEvents;
	readonly listRepositoryEcosystemEvents: ListRepositoryEcosystemEvents;
}

const cacheControl = 'public, max-age=300';

export function ecosystemEventsRouter(
	config: EcosystemEventsRouterConfig
): Router {
	const router = express.Router();

	router.get('/', async (request, response) =>
		respond(response, () => config.listEcosystemEvents.execute())
	);
	router.get('/:slug', async (request, response) =>
		respond(
			response,
			() => config.getEcosystemEvent.execute({ slug: eventSlug(request) }),
			'ecosystem_event_not_found',
			'Ecosystem event not found'
		)
	);
	router.get('/:slug/projects', async (request, response) =>
		respond(
			response,
			() =>
				config.listEcosystemEventProjects.execute(projectListQuery(request)),
			'ecosystem_event_not_found',
			'Ecosystem event not found'
		)
	);
	router.get('/:slug/projects/:owner/:repo', async (request, response) =>
		respond(
			response,
			() =>
				config.getEcosystemEventProject.execute({
					event: eventSlug(request),
					repository: repositoryName(request)
				}),
			'ecosystem_event_project_not_found',
			'Project not found in this ecosystem event'
		)
	);

	return router;
}

export function repositoryEcosystemEventsRouter(
	config: Pick<EcosystemEventsRouterConfig, 'listRepositoryEcosystemEvents'>
): Router {
	const router = express.Router();

	router.get('/:owner/:repo/ecosystem-events', async (request, response) =>
		respond(response, () =>
			config.listRepositoryEcosystemEvents.execute({
				repository: repositoryName(request)
			})
		)
	);

	return router;
}

async function respond<T>(
	response: Response,
	run: () => Promise<Result<T, Error>>,
	notFoundCode = 'ecosystem_event_not_found',
	notFoundMessage = 'Not found'
): Promise<void> {
	try {
		const result = await run();
		if (result.isErr()) throw result.error;
		if (result.value === null) {
			response.status(404).json({ code: notFoundCode, error: notFoundMessage });
			return;
		}
		response.setHeader('Cache-Control', cacheControl);
		response.json(result.value);
	} catch (error) {
		if (
			error instanceof EcosystemEventRequestError ||
			error instanceof InvalidEcosystemEventCursor
		) {
			response.status(400).json({
				code: 'invalid_ecosystem_event_request',
				error: error.message
			});
			return;
		}
		response.setHeader('Cache-Control', 'no-store');
		response.setHeader('Retry-After', '30');
		response.status(503).json({
			code: 'ecosystem_events_unavailable',
			error: 'Ecosystem event data is temporarily unavailable'
		});
	}
}
