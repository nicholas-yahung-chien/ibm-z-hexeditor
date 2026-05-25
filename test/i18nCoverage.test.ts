import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('localization bundles', () => {
  it('cover extension host vscode.l10n strings', () => {
    const source = readFileSync(join(root, 'src', 'i18n.ts'), 'utf8');
    const sourceKeys = extractVscodeL10nKeys(source);
    const bundleNames = readdirSync(join(root, 'l10n')).filter((name) => name.endsWith('.json'));

    expect(bundleNames.length).toBeGreaterThan(0);

    for (const bundleName of bundleNames) {
      const bundle = JSON.parse(readFileSync(join(root, 'l10n', bundleName), 'utf8')) as Record<string, string>;
      const missing = sourceKeys.filter((key) => !(key in bundle));

      expect(missing, `${bundleName} is missing localized keys`).toEqual([]);
    }
  });

  it('keeps package contribution locale files valid JSON', () => {
    const packageLocaleNames = readdirSync(root).filter((name) => (
      name.startsWith('package.nls.')
      && name.endsWith('.json')
      && name !== 'package.nls.json'
    ));

    expect(packageLocaleNames.length).toBeGreaterThan(0);

    for (const localeName of packageLocaleNames) {
      expect(() => JSON.parse(readFileSync(join(root, localeName), 'utf8')), localeName).not.toThrow();
    }
  });

  it('provides localized README entry points', () => {
    const readmeNames = [
      'README.zh-TW.md',
      'README.zh-CN.md',
      'README.ja.md',
      'README.ko.md',
      'README.de.md',
    ];

    for (const readmeName of readmeNames) {
      expect(existsSync(join(root, readmeName)), readmeName).toBe(true);
    }

    const readme = readFileSync(join(root, 'README.md'), 'utf8');
    for (const readmeName of readmeNames) {
      expect(readme).toContain(readmeName);
    }
  });
});

function extractVscodeL10nKeys(source: string): string[] {
  const matches = source.matchAll(/vscode\.l10n\.t\('((?:\\'|[^'])*)'/g);
  return Array.from(matches, (match) => JSON.parse(`"${match[1].replace(/"/g, '\\"')}"`) as string);
}
