import type { FromWebviewMessage } from '../../src/protocol';

interface VsCodeApi {
  postMessage(message: FromWebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

export const vscode = window.acquireVsCodeApi?.() ?? {
  postMessage: (message: FromWebviewMessage) => console.log('VS Code message', message),
  getState: () => undefined,
  setState: () => undefined,
};
