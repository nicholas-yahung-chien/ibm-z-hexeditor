import * as vscode from 'vscode';
import type { ByteSourceKind, RecordMetadata } from './protocol';
import type { ZoweTreeResource } from './resourceSupport';

export interface HexOnSession {
  fileEncoding: string;
  byteSource: ByteSourceKind;
  bytes: Uint8Array;
  sourceViewColumn?: vscode.ViewColumn;
  zoweTreeResource?: ZoweTreeResource;
  recordMetadata?: RecordMetadata;
}

export class SessionRegistry {
  private readonly sessions = new Map<string, HexOnSession>();

  set(uri: vscode.Uri, session: HexOnSession): void {
    this.sessions.set(uri.toString(), session);
  }

  take(uri: vscode.Uri): HexOnSession | undefined {
    const key = uri.toString();
    const session = this.sessions.get(key);
    this.sessions.delete(key);
    return session;
  }
}
