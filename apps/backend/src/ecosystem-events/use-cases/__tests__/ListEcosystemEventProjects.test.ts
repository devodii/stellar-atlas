import { mock } from 'jest-mock-extended';
import type { EcosystemEventRepository } from '../../domain/EcosystemEvent.js';
import { encodeEcosystemEventProjectCursor } from '../../domain/EcosystemEventProjectCursor.js';
import {
	eventDto,
	projectItem
} from '../../__tests__/EcosystemEventFixtures.js';
import {
	InvalidEcosystemEventCursor,
	ListEcosystemEventProjects
} from '../list-ecosystem-event-projects/ListEcosystemEventProjects.js';

describe('ListEcosystemEventProjects', () => {
	let repository: ReturnType<typeof mock<EcosystemEventRepository>>;
	let useCase: ListEcosystemEventProjects;
	const rows = (count: number) =>
		Array.from({ length: count }, (_, index) =>
			projectItem({ slug: `project-${index}` })
		);

	beforeEach(() => {
		repository = mock<EcosystemEventRepository>();
		repository.findEvent.mockResolvedValue(eventDto());
		useCase = new ListEcosystemEventProjects(repository);
	});

	it('should return null for an event that does not exist', async () => {
		repository.findEvent.mockResolvedValue(null);

		const result = await useCase.execute({ event: 'nothing' });

		expect(result._unsafeUnwrap()).toBeNull();
		expect(repository.listProjects).not.toHaveBeenCalled();
	});

	it('should read one row more than the page to know whether another page exists', async () => {
		repository.listProjects.mockResolvedValue(rows(3));

		await useCase.execute({ event: 'hackmeridian-2026', limit: 2 });

		expect(repository.listProjects).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 3 })
		);
	});

	it('should return a cursor to the last row of a full page', async () => {
		repository.listProjects.mockResolvedValue([
			projectItem({ slug: 'a', award: 'first' }),
			projectItem({ slug: 'b', award: 'runner-up' }),
			projectItem({ slug: 'c' })
		]);

		const page = (
			await useCase.execute({ event: 'hackmeridian-2026', limit: 2 })
		)._unsafeUnwrap()!;

		expect(page.data.map((item) => item.slug)).toEqual(['a', 'b']);
		expect(page.nextCursor).toBe(
			encodeEcosystemEventProjectCursor({ awardRank: 1, slug: 'b' })
		);
	});

	it('should end the listing on a short page', async () => {
		repository.listProjects.mockResolvedValue(rows(2));

		const page = (
			await useCase.execute({ event: 'hackmeridian-2026', limit: 2 })
		)._unsafeUnwrap()!;

		expect(page.data).toHaveLength(2);
		expect(page.nextCursor).toBeNull();
	});

	it('should default and cap the page size', async () => {
		repository.listProjects.mockResolvedValue([]);

		await useCase.execute({ event: 'hackmeridian-2026' });
		await useCase.execute({ event: 'hackmeridian-2026', limit: 10_000 });

		expect(repository.listProjects).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				limit: ListEcosystemEventProjects.defaultLimit + 1
			})
		);
		expect(repository.listProjects).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				limit: ListEcosystemEventProjects.maxLimit + 1
			})
		);
	});

	it('should continue after a valid cursor', async () => {
		repository.listProjects.mockResolvedValue([]);
		const cursor = encodeEcosystemEventProjectCursor({
			awardRank: 2,
			slug: 'm'
		});

		await useCase.execute({ event: 'hackmeridian-2026', cursor });

		expect(repository.listProjects).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: { awardRank: 2, slug: 'm' } })
		);
	});

	it('should reject a cursor it did not issue', async () => {
		const result = await useCase.execute({
			event: 'hackmeridian-2026',
			cursor: 'garbage'
		});

		expect(result._unsafeUnwrapErr()).toBeInstanceOf(
			InvalidEcosystemEventCursor
		);
		expect(repository.listProjects).not.toHaveBeenCalled();
	});

	it('should pass the filters through', async () => {
		repository.listProjects.mockResolvedValue([]);

		await useCase.execute({
			event: 'hackmeridian-2026',
			track: 'scale',
			evidenceTier: 'verified',
			award: 'any',
			integration: 'freighter',
			search: 'pay'
		});

		expect(repository.listProjects).toHaveBeenCalledWith(
			expect.objectContaining({
				track: 'scale',
				evidenceTier: 'verified',
				award: 'any',
				integration: 'freighter',
				search: 'pay'
			})
		);
	});

	it('should return an error when the repository fails', async () => {
		repository.findEvent.mockRejectedValue(new Error('db down'));

		expect(
			(await useCase.execute({ event: 'x' }))._unsafeUnwrapErr().message
		).toBe('db down');
	});
});
