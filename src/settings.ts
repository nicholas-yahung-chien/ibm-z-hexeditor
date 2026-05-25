import * as vscode from 'vscode';
import {
  DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_RULES,
  DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_PAIRS,
  parseDbcsAmbiguousExclusionRules,
  shouldSeedDefaultDbcsAmbiguousExclusions,
  type DbcsAmbiguousExclusionRule,
} from './dbcsAmbiguousExclusions';
import type { InspectIbmDbcsOptions } from './inspector/inspectIbmDbcs';

const CONFIG_SECTION = 'ibmZHexEditor';
const CUSTOM_EXCLUSIONS_ENABLED = 'dbcsAmbiguousExclusionsEnabled';
const CUSTOM_EXCLUSIONS = 'dbcsAmbiguousExclusions';

export interface DiagnosticsSettings {
  options: InspectIbmDbcsOptions;
  invalidRules: readonly string[];
}

export function readDiagnosticsSettings(resource?: vscode.Uri): DiagnosticsSettings {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION, resource);
  const enabled = config.get<boolean>(CUSTOM_EXCLUSIONS_ENABLED, false);

  if (!enabled) {
    return {
      options: { dbcsAmbiguousExclusions: DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_PAIRS },
      invalidRules: [],
    };
  }

  const parsed = parseDbcsAmbiguousExclusionRules(config.get<unknown>(CUSTOM_EXCLUSIONS, []));
  return {
    options: { dbcsAmbiguousExclusions: parsed.pairs },
    invalidRules: parsed.invalidRules,
  };
}

export async function seedDefaultDbcsAmbiguousExclusionsIfNeeded(): Promise<void> {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const inspected = config.inspect<DbcsAmbiguousExclusionRule[]>(CUSTOM_EXCLUSIONS);
  if (!shouldSeedDefaultDbcsAmbiguousExclusions({
    enabled: config.get<boolean>(CUSTOM_EXCLUSIONS_ENABLED, false),
    globalValue: inspected?.globalValue,
    workspaceValue: inspected?.workspaceValue,
    workspaceFolderValue: inspected?.workspaceFolderValue,
  })) {
    return;
  }

  await config.update(
    CUSTOM_EXCLUSIONS,
    DEFAULT_DBCS_AMBIGUOUS_EXCLUSION_RULES,
    vscode.ConfigurationTarget.Global,
  );
}

export function affectsDiagnosticsSettings(event: vscode.ConfigurationChangeEvent): boolean {
  return event.affectsConfiguration(`${CONFIG_SECTION}.${CUSTOM_EXCLUSIONS_ENABLED}`) ||
    event.affectsConfiguration(`${CONFIG_SECTION}.${CUSTOM_EXCLUSIONS}`);
}
