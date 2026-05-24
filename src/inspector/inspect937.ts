import { IBM937_PROFILE } from '../codec/ibm937';
import { inspectIbmDbcs } from './inspectIbmDbcs';

export type {
  AnalysisResult,
  DiagnosticEvent,
  DiagnosticKind,
} from './inspectIbmDbcs';
export {
  PROBLEM_KINDS,
  WARNING_KINDS,
} from './inspectIbmDbcs';

/** Inspect a potentially malformed IBM-937 byte stream. */
export function inspectIbm937(data: Uint8Array): ReturnType<typeof inspectIbmDbcs> {
  return inspectIbmDbcs(IBM937_PROFILE, data);
}
