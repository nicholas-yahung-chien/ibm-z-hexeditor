import { cellsFromBytes, makeSnapshot } from '../../src/byteModel';
import { encodeToIbm1047 } from '../../src/codec/ibm1047';
import { encodeToIbm937, SI, SO } from '../../src/codec/ibm937';
import type { EditorSnapshot, EditorViewSettings, ToWebviewMessage } from '../../src/protocol';

type DemoName = 'standard' | 'diagnostics' | 'sbcs' | 'condense';

interface DemoPayload {
  snapshot: EditorSnapshot;
  settings: EditorViewSettings;
}

export function installDemoSnapshots(): void {
  const demo = currentDemoName();
  if (!demo) {
    return;
  }

  document.body.classList.add('demo-theme');
  const payload = demoPayload(demo);
  requestAnimationFrame(() => {
    postDemoMessage({ type: 'settings', settings: payload.settings });
    postDemoMessage({ type: 'init', snapshot: payload.snapshot });
  });
}

export function shouldCollapseDemoHeader(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('header') === 'collapsed';
}

export function shouldExpandDemoDiagnostics(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('demo') === 'diagnostics';
}

function currentDemoName(): DemoName | null {
  const value = new URLSearchParams(window.location.search).get('demo');
  if (value === 'standard' || value === 'diagnostics' || value === 'sbcs' || value === 'condense') {
    return value;
  }
  return null;
}

function postDemoMessage(message: ToWebviewMessage): void {
  window.dispatchEvent(new MessageEvent('message', { data: message }));
}

function demoPayload(demo: DemoName): DemoPayload {
  const locale = new URLSearchParams(window.location.search).get('locale') ?? 'en';
  if (demo === 'sbcs') {
    return {
      snapshot: snapshotFromBytes('HELLO.ibm1047.cpy', 'ibm1047', concatBytes(
        encodeToIbm1047('HELLO WORLD'),
        Uint8Array.from([0x15]),
        encodeToIbm1047('ABC'),
        Uint8Array.from([0x15]),
      )),
      settings: { condenseMode: false, showRuler: false, locale },
    };
  }

  const diagnostics = demo === 'diagnostics';
  return {
    snapshot: snapshotFromBytes(
      diagnostics ? 'SOAIPB1.missing-so.ibm937.cpy' : 'SOAIPB1.ibm937.cpy',
      'ibm937',
      diagnostics ? demoIbm937BytesWithMissingShift() : demoIbm937Bytes(),
      diagnostics,
    ),
    settings: {
      condenseMode: demo === 'condense',
      showRuler: demo === 'condense',
      locale,
    },
  };
}

function snapshotFromBytes(fileName: string, fileEncoding: string, bytes: Uint8Array, dirty = false): EditorSnapshot {
  return makeSnapshot({
    uri: `demo:/${fileName}`,
    fileName,
    fileEncoding,
    cells: cellsFromBytes(bytes),
    dirty,
  });
}

function concatBytes(...chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function demoIbm937Bytes(): Uint8Array {
  return encodeToIbm937([
    '******       測試一下',
    '      LICENSED MATERIALS - PROPERTY OF IBM',
    '      DISPLAY "HELLO WORLD"',
    '      000100 000200 000300',
    '      END-EXEC',
  ].join('\n'));
}

function demoIbm937BytesWithMissingShift(): Uint8Array {
  const bytes = demoIbm937Bytes();
  const firstSo = bytes.indexOf(SO);
  const firstSi = bytes.indexOf(SI);
  if (firstSo < 0 || firstSi < 0) {
    return bytes;
  }

  return Uint8Array.from([
    ...bytes.slice(0, firstSo),
    ...bytes.slice(firstSo + 1, firstSi),
    ...bytes.slice(firstSi),
  ]);
}
