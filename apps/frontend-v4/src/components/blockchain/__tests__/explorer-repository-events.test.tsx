import { jest } from '@jest/globals';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
jest.unstable_mockModule('../explorer-repository-events.module.css', () => ({
	default: {}
}));
const {
	ExplorerRepositoryEventsView,
	parseRepositoryEvents,
	repositoryEventsPath
} = await import('../explorer-repository-events');

const participation = (overrides: Record<string, unknown> = {}) => ({
	event: {
		slug: 'hackmeridian-2026',
		name: 'HackMeridian 2026',
		network: 'testnet',
		startsAt: '2026-10-25T09:00:00.000Z',
		endsAt: '2026-10-26T12:00:00.000Z'
	},
	repository: 'ethan-r13n/nest',
	name: 'nest',
	track: 'genesis',
	trackDeclared: false,
	award: 'first',
	evidenceTier: 'verified',
	links: {
		project: '/v1/ecosystem-events/hackmeridian-2026/projects/ethan-r13n/nest'
	},
	...overrides
});

describe('repository ecosystem events', () => {
	describe('repositoryEventsPath', () => {
		it('should build the lookup path for a GitHub repository', () => {
			expect(repositoryEventsPath('ethan-r13n/nest')).toBe(
				'/v1/repositories/ethan-r13n/nest/ecosystem-events'
			);
		});

		it.each(['', 'nest', 'a/b/c', 'a/b c', '../x', 'a/b?x=1', '/b'])(
			'should not build a path for %j',
			(value) => {
				expect(repositoryEventsPath(value)).toBeNull();
			}
		);
	});

	describe('parseRepositoryEvents', () => {
		it('should read an event with its award and evidence', () => {
			expect(
				parseRepositoryEvents({ repository: 'x/y', data: [participation()] })
			).toEqual([
				{
					slug: 'hackmeridian-2026',
					name: 'HackMeridian 2026',
					network: 'testnet',
					award: 'first',
					track: null,
					verified: true
				}
			]);
		});

		it('should show a track only when the team declared it', () => {
			const declared = parseRepositoryEvents({
				data: [participation({ track: 'scale', trackDeclared: true })]
			});
			const assumed = parseRepositoryEvents({
				data: [participation({ track: 'scale', trackDeclared: false })]
			});

			expect(declared[0]?.track).toBe('scale');
			expect(assumed[0]?.track).toBeNull();
		});

		it('should treat anything that is not verified as code only', () => {
			expect(
				parseRepositoryEvents({
					data: [participation({ evidenceTier: 'likely' })]
				})[0]?.verified
			).toBe(false);
		});

		it.each([
			null,
			undefined,
			'text',
			5,
			[],
			{},
			{ data: 'nope' },
			{ data: [null, 1, {}] }
		])('should ignore a malformed response %j', (body) => {
			expect(parseRepositoryEvents(body)).toEqual([]);
		});

		it('should skip malformed entries and keep the good ones', () => {
			const events = parseRepositoryEvents({
				data: [{ event: { slug: 1 } }, participation()]
			});

			expect(events).toHaveLength(1);
		});

		it('should drop an unknown award', () => {
			expect(
				parseRepositoryEvents({ data: [participation({ award: 'gold' })] })[0]
					?.award
			).toBeNull();
		});
	});

	describe('view', () => {
		it('should render nothing for a repository that took part in no event', () => {
			expect(
				renderToStaticMarkup(
					createElement(ExplorerRepositoryEventsView, { events: [] })
				)
			).toBe('');
		});

		it('should say which event, on which network, with which award', () => {
			const html = renderToStaticMarkup(
				createElement(ExplorerRepositoryEventsView, {
					events: parseRepositoryEvents({ data: [participation()] })
				})
			);

			expect(html).toContain('Ecosystem events');
			expect(html).toContain('HackMeridian 2026');
			expect(html).toContain('testnet');
			expect(html).toContain('1st place');
			expect(html).toContain('On-chain verified');
			expect(html).toContain('belongs to the event&#x27;s network');
		});

		it('should say when there is no on-chain proof', () => {
			const html = renderToStaticMarkup(
				createElement(ExplorerRepositoryEventsView, {
					events: parseRepositoryEvents({
						data: [participation({ award: null, evidenceTier: 'likely' })]
					})
				})
			);

			expect(html).toContain('Code only');
			expect(html).not.toContain('place');
		});
	});
});
