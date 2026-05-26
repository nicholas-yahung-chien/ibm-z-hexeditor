import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const context = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: true,
  logLevel: 'info'
});

if (watch) {
  copyCodicons();
  await context.watch();
  console.log('Watching extension sources...');
} else {
  await context.rebuild();
  await context.dispose();
  copyCodicons();
}

function copyCodicons() {
  mkdirSync('dist/codicons', { recursive: true });
  copyFileSync('node_modules/@vscode/codicons/dist/codicon.css', 'dist/codicons/codicon.css');
  copyFileSync('node_modules/@vscode/codicons/dist/codicon.ttf', 'dist/codicons/codicon.ttf');
}
