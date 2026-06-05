import { describe, expect, it, vi } from 'vitest';
import { asZoweTreeResource, getZoweDatasetStats, type ZoweTreeResource } from '../src/resourceSupport';

vi.mock('vscode', () => ({
  Uri: class Uri {
    constructor(readonly scheme: string, readonly path = '') {}
    static parse(value: string): Uri {
      const match = /^([^:]+):(.*)$/.exec(value);
      return new Uri(match?.[1] ?? '', match?.[2] ?? '');
    }
    static from(value: { scheme: string; path: string }): Uri {
      return new Uri(value.scheme, value.path);
    }
  },
}));

describe('Zowe resource support', () => {
  it('uses the current data set node stats when record layout fields are present', () => {
    const resource = zoweResource({
      recfm: 'FB',
      lrecl: 80,
      blksz: 3200,
    });

    expect(getZoweDatasetStats(resource)).toMatchObject({
      recfm: 'FB',
      lrecl: 80,
      blksz: 3200,
    });
  });

  it('falls back to parent PDS stats when a member node lacks record layout fields', () => {
    const parent = zoweResource({
      recfm: 'FB',
      lrecl: 80,
      blksz: 3200,
    });
    const member = zoweResource(
      { user: 'NICHOL' },
      parent,
      { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL/SAM1.cbl' } as never,
    );

    expect(getZoweDatasetStats(member)).toMatchObject({
      user: 'NICHOL',
      recfm: 'FB',
      lrecl: 80,
      blksz: 3200,
    });
  });

  it('falls back to ZoweDatasetNode mParent when getParent is unavailable', () => {
    const parent = zoweResource({
      recfm: 'FB',
      lrecl: 80,
      blksz: 3200,
    });
    const member = {
      resourceUri: { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL/SAM1.cbl' },
      label: 'SAM1',
      contextValue: 'memberBinary',
      getStats: () => undefined,
      mParent: parent,
    } as never as ZoweTreeResource;

    expect(getZoweDatasetStats(member)).toMatchObject({
      recfm: 'FB',
      lrecl: 80,
      blksz: 3200,
    });
  });

  it('does not use stats for non-data-set Zowe resources', () => {
    const resource = zoweResource(
      { recfm: 'FB', lrecl: 80 },
      undefined,
      { scheme: 'zowe-uss', path: '/zosmf/u/nichol/file.txt' } as never,
    );

    expect(getZoweDatasetStats(resource)).toBeUndefined();
  });

  it('accepts URI-like Zowe tree resources from extension boundaries', () => {
    const resource = asZoweTreeResource({
      resourceUri: { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL/SAM1.cbl' },
      getStats: () => ({ recfm: 'FB', lrecl: 80 }),
    });

    expect(resource?.resourceUri.scheme).toBe('zowe-ds');
    expect(getZoweDatasetStats(resource)).toMatchObject({ recfm: 'FB', lrecl: 80 });
  });
});

function zoweResource(
  stats: unknown,
  parent?: ZoweTreeResource,
  uri = { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL' } as never,
): ZoweTreeResource {
  return {
    resourceUri: uri,
    getStats: () => stats,
    getParent: parent ? () => parent : undefined,
  };
}
