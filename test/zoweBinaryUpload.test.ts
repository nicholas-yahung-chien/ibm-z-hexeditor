import { describe, expect, it, vi } from 'vitest';
import { canAttemptZoweDirectBinaryUpload, resolveZoweDataSetName } from '../src/zoweBinaryUpload';

vi.mock('vscode', () => ({
  Uri: class Uri {
    constructor(readonly scheme: string, readonly path = '', readonly query = '') {}

    static parse(value: string): Uri {
      const match = /^([^:]+):([^?]*)(?:\?(.*))?$/.exec(value);
      return new Uri(match?.[1] ?? '', match?.[2] ?? '', match?.[3] ?? '');
    }

    with(changes: { query?: string }): Uri {
      return new Uri(this.scheme, this.path, changes.query ?? this.query);
    }
  },
  extensions: {
    getExtension: () => undefined,
  },
  workspace: {
    fs: {
      writeFile: vi.fn(),
    },
  },
}));

describe('Zowe direct binary upload helpers', () => {
  it('prefers direct binary upload for fixed-length zowe datasets with aligned bytes', () => {
    const uri = { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL/SAM1.cbl' } as never;

    expect(canAttemptZoweDirectBinaryUpload({
      uri,
      bytes: new Uint8Array(160),
      recordMetadata: { source: 'inferred', recordFormat: 'FB', logicalRecordLength: 80 },
    })).toBe(true);
  });

  it('does not prefer direct binary upload for non-zowe or unaligned fixed-length content', () => {
    expect(canAttemptZoweDirectBinaryUpload({
      uri: { scheme: 'file', path: '/tmp/SAM1.cbl' } as never,
      bytes: new Uint8Array(160),
      recordMetadata: { source: 'inferred', recordFormat: 'FB', logicalRecordLength: 80 },
    })).toBe(false);

    expect(canAttemptZoweDirectBinaryUpload({
      uri: { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL/SAM1.cbl' } as never,
      bytes: new Uint8Array(161),
      recordMetadata: { source: 'inferred', recordFormat: 'FB', logicalRecordLength: 80 },
    })).toBe(false);
  });

  it('resolves a PDS member from Zowe tree parent and label', () => {
    const uri = { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL/SAM1.cbl' } as never;
    const resource = {
      label: 'SAM1',
      mParent: { label: 'NICHOL.WAZI.SAMPLE.COBOL' },
    } as never;

    expect(resolveZoweDataSetName(uri, resource)).toBe('NICHOL.WAZI.SAMPLE.COBOL(SAM1)');
  });

  it('prefers an existing Zowe fullPath data set name', () => {
    const uri = { scheme: 'zowe-ds', path: '/zosmf/IGNORED.DATA.SET/MEM.cbl' } as never;
    const resource = {
      fullPath: 'NICHOL.WAZI.SAMPLE.COBOL(SAM1)',
      label: 'MEM',
      mParent: { label: 'IGNORED.DATA.SET' },
    } as never;

    expect(resolveZoweDataSetName(uri, resource)).toBe('NICHOL.WAZI.SAMPLE.COBOL(SAM1)');
  });

  it('falls back to URI path segments when the tree resource is unavailable', () => {
    const uri = { scheme: 'zowe-ds', path: '/zosmf/NICHOL.WAZI.SAMPLE.COBOL/SAM1.cbl' } as never;

    expect(resolveZoweDataSetName(uri, undefined)).toBe('NICHOL.WAZI.SAMPLE.COBOL(SAM1)');
  });
});
