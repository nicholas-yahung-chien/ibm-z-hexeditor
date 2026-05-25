import { execFile } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { createServer } from 'vite';

const execFileAsync = promisify(execFile);
const workspace = process.cwd();
const outputDir = resolve(workspace, 'images/screenshots');
const edgePath = process.env.EDGE_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const captures = [
  ['hex-on-standard.png', '?demo=standard', '1600,1000'],
  ['diagnostics-expanded.png', '?demo=diagnostics', '1600,1000'],
  ['sbcs-preview.png', '?demo=sbcs', '1400,720'],
  ['condense-mode.png', '?demo=condense&header=collapsed', '1600,1000'],
];

await mkdir(outputDir, { recursive: true });
await access(edgePath).catch(() => {
  throw new Error(`Unable to find Edge at ${edgePath}. Set EDGE_PATH to a Chromium-based browser executable.`);
});

const server = await createServer({
  configFile: resolve(workspace, 'vite.config.mjs'),
  server: {
    host: '127.0.0.1',
  },
});

await server.listen(0, '127.0.0.1');
const address = server.httpServer?.address();
if (!address || typeof address === 'string') {
  await server.close();
  throw new Error('Unable to determine Vite server address.');
}

try {
  for (const [fileName, query, windowSize] of captures) {
    const screenshot = resolve(outputDir, fileName);
    const userDataDir = resolve(workspace, `.tmp/edge-screenshots/${fileName}`);
    const url = `http://127.0.0.1:${address.port}/${query}`;
    await mkdir(userDataDir, { recursive: true });
    await execFileAsync(edgePath, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--virtual-time-budget=3000',
      `--user-data-dir=${userDataDir}`,
      `--window-size=${windowSize}`,
      `--screenshot=${screenshot}`,
      url,
    ], { windowsHide: true });
    console.log(`Captured ${screenshot}`);
  }
} finally {
  await server.close();
}
