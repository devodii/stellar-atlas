import { parseEcosystemEventImportCliOptions } from '../EcosystemEventImportCliOptions.js';

describe('parseEcosystemEventImportCliOptions', () => {
	it('should import by default', () => {
		expect(
			parseEcosystemEventImportCliOptions(['--directory', 'data/2026'])
		).toEqual({ directory: 'data/2026', mode: 'import' });
	});

	it('should validate files only with --check', () => {
		expect(
			parseEcosystemEventImportCliOptions(['--check', '--directory', 'd'])
		).toEqual({ directory: 'd', mode: 'check' });
	});

	it('should compare without writing with --dry-run', () => {
		expect(
			parseEcosystemEventImportCliOptions(['--directory', 'd', '--dry-run'])
		).toEqual({ directory: 'd', mode: 'dry-run' });
	});

	it('should accept a repeated mode flag', () => {
		expect(
			parseEcosystemEventImportCliOptions([
				'--check',
				'--directory',
				'd',
				'--check'
			]).mode
		).toBe('check');
	});

	it.each([
		['no directory', []],
		['a directory without a value', ['--directory']],
		['a directory followed by a flag', ['--directory', '--check']],
		['both modes', ['--directory', 'd', '--check', '--dry-run']],
		['an unknown option', ['--directory', 'd', '--force']]
	])('should reject %s with the usage text', (_name, args) => {
		expect(() => parseEcosystemEventImportCliOptions(args)).toThrow(
			/Usage: import-ecosystem-event/
		);
	});
});
