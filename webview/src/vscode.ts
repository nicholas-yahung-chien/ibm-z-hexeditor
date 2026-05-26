import type { FromWebviewMessage } from '../../src/protocol';

type WithoutNonce<T> = T extends { nonce: string } ? Omit<T, 'nonce'> : T;
type FromWebviewMessageWithoutNonce = WithoutNonce<FromWebviewMessage>;

interface VsCodeApi {
  postMessage(message: FromWebviewMessage): void;
  getState(): unknown;
  setState(state: unknown): void;
}

interface HexOnVsCodeApi extends Omit<VsCodeApi, 'postMessage'> {
  postMessage(message: FromWebviewMessageWithoutNonce): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

// Get the message nonce from the meta tag
function getMessageNonce(): string {
  const meta = document.querySelector('meta[name="vscode-message-nonce"]');
  return meta?.getAttribute('content') || '';
}

const baseVscode = window.acquireVsCodeApi?.() ?? {
  postMessage: (message: FromWebviewMessage) => console.log('VS Code message', message),
  getState: () => undefined,
  setState: () => undefined,
};

// Wrap postMessage to automatically include nonce
export const vscode: HexOnVsCodeApi = {
  ...baseVscode,
  postMessage: (message: FromWebviewMessageWithoutNonce) => {
    const nonce = getMessageNonce();
    baseVscode.postMessage({ ...message, nonce } as FromWebviewMessage);
  },
};
