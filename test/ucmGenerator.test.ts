import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const GENERATOR = path.join(process.cwd(), 'scripts', 'generate-ucm-tables.mjs');

describe('UCM table generator', () => {
  it('loads base profiles, overlays delta mappings, and skips fallbacks by default', () => {
    const workDir = mkdtempSync(path.join(tmpdir(), 'ibm-z-hex-ucm-'));
    const basePath = path.join(workDir, 'base.ucm');
    const deltaPath = path.join(workDir, 'delta.ucm');
    const manifestPath = path.join(workDir, 'manifest.json');
    const outDir = path.join(workDir, 'out');

    writeFileSync(
      basePath,
      [
        '<code_set_name> "base"',
        '<mb_cur_min> 1',
        '<mb_cur_max> 2',
        '<uconv_class> "EBCDIC_STATEFUL"',
        'CHARMAP',
        '<U0041> \\xC1 |0',
        '<U00A2> \\x4A |1',
        '<U3000> \\x40\\x40 |0',
        'END CHARMAP',
      ].join('\n'),
    );
    writeFileSync(
      deltaPath,
      [
        '<code_set_name> "delta"',
        '<mb_cur_min> 1',
        '<mb_cur_max> 2',
        '<uconv_class> "EBCDIC_STATEFUL"',
        '<icu:base> "base"',
        'CHARMAP',
        '<U0042> \\xC2 |0',
        '<U0043> \\xC3 |1',
        '<U2603> \\x40\\x40 |0',
        '<U6E2C> \\x5A\\x61 |0',
        'END CHARMAP',
      ].join('\n'),
    );
    writeFileSync(
      manifestPath,
      JSON.stringify({
        profiles: [
          {
            id: 'base',
            label: 'Base',
            sourceName: 'base.ucm',
            sourcePath: basePath,
            outputFile: 'baseTables.ts',
          },
          {
            id: 'delta',
            label: 'Delta',
            sourceName: 'delta.ucm',
            sourcePath: deltaPath,
            baseProfile: 'base',
            outputFile: 'deltaTables.ts',
          },
        ],
      }),
    );

    const dryRun = execFileSync(process.execPath, [
      GENERATOR,
      '--manifest',
      manifestPath,
      '--profile',
      'delta',
      '--dry-run',
    ], { encoding: 'utf8' });
    const summary = JSON.parse(dryRun);

    expect(summary.sources.map((source: { id: string }) => source.id)).toEqual(['base', 'delta']);
    expect(summary.generated.sbcsMappings).toBe(2);
    expect(summary.generated.dbcsMappings).toBe(2);

    execFileSync(process.execPath, [
      GENERATOR,
      '--manifest',
      manifestPath,
      '--profile',
      'delta',
      '--out-dir',
      outDir,
    ], { encoding: 'utf8' });

    const generated = readFileSync(path.join(outDir, 'deltaTables.ts'), 'utf8');
    expect(generated).toContain('0x41: 0xC1');
    expect(generated).toContain('0x42: 0xC2');
    expect(generated).not.toContain('0x43: 0xC3');
    expect(generated).not.toContain('0x00A2: 0x4A');
    expect(generated).toContain('0x4040: 0x2603');
    expect(generated).toContain('0x5A61: 0x6E2C');
  });
});
