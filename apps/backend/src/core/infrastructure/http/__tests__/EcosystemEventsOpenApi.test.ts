import openApiDocument from '../../../../../openapi.json' with { type: 'json' };
import { createPublicOpenApiDocument } from '../PublicOpenApiDocument.js';
import {
	projectOpenApiDocument,
	type OpenApiRecord
} from '../OpenApiDocumentProjection.js';
import { assertSelfContainedOpenApiDocument } from '../LocalPublicOpenApiSchemas.js';
import { isPublicOpenApiOperation } from '../OpenApiOperationClassification.js';
import {
	eventSlugPattern,
	githubNamePattern
} from '../../../../ecosystem-events/infrastructure/http/EcosystemEventsRequest.js';

const operations = [
	['listEcosystemEvents', 'get', '/v1/ecosystem-events'],
	['getEcosystemEvent', 'get', '/v1/ecosystem-events/{slug}'],
	['listEcosystemEventProjects', 'get', '/v1/ecosystem-events/{slug}/projects'],
	[
		'getEcosystemEventProject',
		'get',
		'/v1/ecosystem-events/{slug}/projects/{owner}/{repo}'
	],
	[
		'listRepositoryEcosystemEvents',
		'get',
		'/v1/repositories/{owner}/{repo}/ecosystem-events'
	]
] as const;

describe('ecosystem events in the public OpenAPI document', () => {
	const document = createPublicOpenApiDocument(openApiDocument);
	const paths = document.paths as Record<string, OpenApiRecord>;

	it.each(operations)(
		'should publish %s as a public operation',
		(operationId, method, path) => {
			const operation = paths[path]?.[method] as OpenApiRecord;

			expect(operation.operationId).toBe(operationId);
			expect(operation.tags).toEqual(['Ecosystem events']);
			expect(operation.security).toEqual([]);
			expect(isPublicOpenApiOperation({ method, operation, path })).toBe(true);
		}
	);

	it.each(operations)(
		'should resolve every reference of %s without fetching anything',
		(_operationId, method, path) => {
			const isolated = projectOpenApiDocument(document, {
				includeOperation: (candidate) =>
					candidate.path === path && candidate.method === method,
				includeSecuritySchemes: true,
				info: document.info as OpenApiRecord,
				servers: document.servers as OpenApiRecord[],
				tags: document.tags as OpenApiRecord[]
			});

			expect(() => assertSelfContainedOpenApiDocument(isolated)).not.toThrow();
		}
	);

	it('should describe the failures a client has to handle', () => {
		const list = paths['/v1/ecosystem-events/{slug}/projects']?.get as {
			responses: Record<string, OpenApiRecord>;
		};

		expect(Object.keys(list.responses)).toEqual(['200', '400', '404', '503']);
		expect(list.responses['503']?.headers).toHaveProperty('Retry-After');
	});

	it('should document the same limits the router enforces', () => {
		const list = paths['/v1/ecosystem-events/{slug}/projects']?.get as {
			parameters: { name: string; schema: Record<string, unknown> }[];
		};
		const parameter = (name: string) =>
			list.parameters.find((item) => item.name === name)!.schema;
		const slug = paths['/v1/ecosystem-events/{slug}']?.get as {
			parameters: { schema: { pattern: string } }[];
		};
		const repository = paths['/v1/repositories/{owner}/{repo}/ecosystem-events']
			?.get as { parameters: { schema: { pattern: string } }[] };

		expect(parameter('limit')).toMatchObject({ minimum: 1, maximum: 100 });
		expect(parameter('track').enum).toEqual(['genesis', 'scale']);
		expect(parameter('award').enum).toEqual(['first', 'runner-up', 'any']);
		expect(new RegExp(slug.parameters[0]!.schema.pattern).source).toBe(
			eventSlugPattern.source
		);
		expect(repository.parameters[0]!.schema.pattern).toBe(
			githubNamePattern.source
		);
	});

	it('should publish the schemas the operations refer to', () => {
		const schemas = (
			document.components as { schemas: Record<string, unknown> }
		).schemas;

		for (const name of [
			'EcosystemEvent',
			'EcosystemEventList',
			'EcosystemEventProject',
			'EcosystemEventProjectPage',
			'EcosystemRepositoryEvents',
			'EcosystemEventError'
		])
			expect(schemas).toHaveProperty(name);
	});
});
