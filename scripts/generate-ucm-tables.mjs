#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPLACEMENT = 0xfffd;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST = path.join(SCRIPT_DIR, "ucm-manifest.json");

if (isMainModule()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export async function main(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);

  if (args.help) {
    printHelp();
    return;
  }

  if (args.profileIds.length === 0 && !args.all) {
    console.error("Provide --profile <id> or --all.");
    printHelp();
    process.exitCode = 1;
    return;
  }

  const manifest = await loadManifest(args.manifest);
  const profileIds = args.all ? manifest.profiles.map((profile) => profile.id) : args.profileIds;

  for (const profileId of profileIds) {
    const profile = getProfile(manifest, profileId);
    const loaded = await loadProfileWithBase(manifest, profile, new Set());
    const tables = buildTables(loaded, { includeFallback: args.includeFallback });
    const summary = summarize(profile, loaded, tables);

    console.log(JSON.stringify(summary, null, 2));

    if (!args.dryRun) {
      if (!args.outDir) {
        throw new Error("Provide --out-dir when not using --dry-run.");
      }
      await mkdir(args.outDir, { recursive: true });
      const outputFile = path.join(args.outDir, profile.outputFile ?? `${profile.id}Tables.ts`);
      await writeFile(outputFile, formatTypeScriptModule(profile, loaded, tables), "utf8");
      console.log(`Wrote ${outputFile}`);
    }
  }
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

function parseArgs(rawArgs) {
  const parsed = {
    all: false,
    dryRun: false,
    help: false,
    includeFallback: false,
    manifest: DEFAULT_MANIFEST,
    outDir: undefined,
    profileIds: [],
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    switch (arg) {
      case "--all":
        parsed.all = true;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      case "--include-fallback":
        parsed.includeFallback = true;
        break;
      case "--manifest":
        parsed.manifest = requireValue(rawArgs, ++i, arg);
        break;
      case "--out-dir":
        parsed.outDir = requireValue(rawArgs, ++i, arg);
        break;
      case "--profile":
        parsed.profileIds.push(requireValue(rawArgs, ++i, arg));
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requireValue(rawArgs, index, option) {
  const value = rawArgs[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage:
  node scripts/generate-ucm-tables.mjs --profile ibm930 --dry-run
  node scripts/generate-ucm-tables.mjs --profile ibm930 --out-dir src/codec/generated
  node scripts/generate-ucm-tables.mjs --all --dry-run

Options:
  --manifest <file>       Manifest JSON. Defaults to scripts/ucm-manifest.json.
  --profile <id>          Profile id from the manifest. Can be repeated.
  --all                   Process all manifest profiles.
  --out-dir <directory>   Directory for generated TypeScript table files.
  --dry-run               Print summaries without writing files.
  --include-fallback      Include non-|0 UCM fallback mappings.
`);
}

async function loadManifest(manifestPath) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.profiles)) {
    throw new Error(`${manifestPath}: expected a profiles array.`);
  }

  return {
    manifestDir: path.dirname(manifestPath),
    profiles: manifest.profiles,
  };
}

function getProfile(manifest, profileId) {
  const profile = manifest.profiles.find((candidate) => candidate.id === profileId);
  if (!profile) {
    throw new Error(`Profile not found in manifest: ${profileId}`);
  }
  return profile;
}

async function loadProfileWithBase(manifest, profile, visiting) {
  if (visiting.has(profile.id)) {
    throw new Error(`Cyclic baseProfile dependency at ${profile.id}`);
  }

  visiting.add(profile.id);
  const chain = [];
  if (profile.baseProfile) {
    chain.push(...(await loadProfileWithBase(manifest, getProfile(manifest, profile.baseProfile), visiting)));
  }
  const text = await readProfileSource(manifest, profile);
  chain.push({
    profile,
    parsed: parseUcm(text, profile.sourceName ?? profile.id),
  });
  visiting.delete(profile.id);
  return chain;
}

async function readProfileSource(manifest, profile) {
  const source = profile.sourcePath ?? profile.sourceUrl;
  if (!source) {
    throw new Error(`${profile.id}: expected sourcePath or sourceUrl.`);
  }

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`${source}: HTTP ${response.status}`);
    }
    return response.text();
  }

  const sourcePath = path.isAbsolute(source) ? source : path.join(manifest.manifestDir, source);
  return readFile(sourcePath, "utf8");
}

export function parseUcm(text, sourceName = "unknown.ucm") {
  const header = {};
  const entries = [];
  let inCharmap = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    if (line === "CHARMAP") {
      inCharmap = true;
      continue;
    }
    if (line === "END CHARMAP") {
      inCharmap = false;
      continue;
    }

    if (!inCharmap) {
      parseHeaderLine(line, header);
      continue;
    }

    const entry = parseCharmapLine(line, sourceName);
    if (entry) {
      entries.push(entry);
    }
  }

  return { sourceName, header, entries };
}

function parseHeaderLine(line, header) {
  const match = line.match(/^<([^>]+)>\s+(.*)$/);
  if (!match) {
    return;
  }
  header[match[1]] = match[2].trim().replace(/^"|"$/g, "");
}

function parseCharmapLine(line, sourceName) {
  const match = line.match(/^((?:<U[0-9a-fA-F]{4,6}>)+)\s+((?:\\x[0-9a-fA-F]{2})+)\s+\|([0-9])/);
  if (!match) {
    return undefined;
  }

  return {
    sourceName,
    unicode: [...match[1].matchAll(/<U([0-9a-fA-F]{4,6})>/g)].map((unicodeMatch) =>
      Number.parseInt(unicodeMatch[1], 16),
    ),
    bytes: [...match[2].matchAll(/\\x([0-9a-fA-F]{2})/g)].map((byteMatch) =>
      Number.parseInt(byteMatch[1], 16),
    ),
    precision: Number.parseInt(match[3], 10),
  };
}

export function buildTables(loadedSources, options = {}) {
  const includeFallback = options.includeFallback === true;
  const entriesByByteKey = new Map();

  for (const source of loadedSources) {
    if (!["EBCDIC_STATEFUL", "SBCS"].includes(source.parsed.header.uconv_class)) {
      throw new Error(`${source.parsed.sourceName}: expected uconv_class EBCDIC_STATEFUL or SBCS.`);
    }

    for (const entry of source.parsed.entries) {
      if (entry.unicode.length !== 1 || (entry.bytes.length !== 1 && entry.bytes.length !== 2)) {
        continue;
      }
      if (!includeFallback && entry.precision !== 0) {
        continue;
      }

      entriesByByteKey.set(bytesKey(entry.bytes), entry);
    }
  }

  const sbcsToUnicode = Array.from({ length: 256 }, () => REPLACEMENT);
  const unicodeToSbcs = new Map();
  const dbcsToUnicode = new Map();
  const unicodeToDbcs = new Map();
  const mergedEntries = [...entriesByByteKey.values()].sort(compareEntriesByBytes);

  for (const entry of mergedEntries) {
    const codePoint = entry.unicode[0];
    if (entry.bytes.length === 1) {
      const byte = entry.bytes[0];
      sbcsToUnicode[byte] = codePoint;
      if (codePoint !== REPLACEMENT && !unicodeToSbcs.has(codePoint)) {
        unicodeToSbcs.set(codePoint, byte);
      }
      continue;
    }

    const pair = (entry.bytes[0] << 8) | entry.bytes[1];
    dbcsToUnicode.set(pair, codePoint);
    if (codePoint !== REPLACEMENT && !unicodeToDbcs.has(codePoint)) {
      unicodeToDbcs.set(codePoint, pair);
    }
  }

  return {
    sbcsToUnicode,
    unicodeToSbcs,
    dbcsToUnicode,
    unicodeToDbcs,
    mergedEntries,
  };
}

function bytesKey(bytes) {
  return bytes.map((byte) => hex(byte, 2)).join("");
}

function compareEntriesByBytes(a, b) {
  if (a.bytes.length !== b.bytes.length) {
    return a.bytes.length - b.bytes.length;
  }
  for (let i = 0; i < a.bytes.length; i += 1) {
    if (a.bytes[i] !== b.bytes[i]) {
      return a.bytes[i] - b.bytes[i];
    }
  }
  return 0;
}

function summarize(profile, loaded, tables) {
  return {
    profile: profile.id,
    label: profile.label,
    sources: loaded.map((source) => ({
      id: source.profile.id,
      sourceName: source.profile.sourceName,
      sourceRevision: source.profile.sourceRevision,
      uconvClass: source.parsed.header.uconv_class,
      base: source.parsed.header["icu:base"] ?? null,
      entries: source.parsed.entries.length,
    })),
    generated: {
      sbcsMappings: tables.sbcsToUnicode.filter((codePoint) => codePoint !== REPLACEMENT).length,
      dbcsMappings: tables.dbcsToUnicode.size,
      unicodeToSbcsMappings: tables.unicodeToSbcs.size,
      unicodeToDbcsMappings: tables.unicodeToDbcs.size,
    },
  };
}

export function formatTypeScriptModule(profile, loaded, tables) {
  const sourceLines = loaded
    .map(
      (source) =>
        `// - ${source.profile.sourceName} (${source.profile.sourceRevision ?? "unknown revision"})`,
    )
    .join("\n");

  return `// @ts-nocheck
// AUTO-GENERATED by scripts/generate-ucm-tables.mjs. Do not edit manually.
// Profile: ${profile.label} (${profile.id})
${sourceLines}

/** SBCS byte (0x00-0xFF) to Unicode code point. Index is the EBCDIC byte value. */
export const SBCS_TO_UNICODE: readonly number[] = [
${formatArray(tables.sbcsToUnicode)}
];

/** DBCS pair key ((b1 << 8) | b2) to Unicode code point. */
export const DBCS_TO_UNICODE: Record<number, number> = {
${formatMap(tables.dbcsToUnicode)}
};

/** Unicode code point to canonical SBCS byte. */
export const UNICODE_TO_SBCS: Record<number, number> = {
${formatMap(tables.unicodeToSbcs)}
};

/** Unicode code point to canonical DBCS pair key. */
export const UNICODE_TO_DBCS: Record<number, number> = {
${formatMap(tables.unicodeToDbcs)}
};
`;
}

function formatArray(values) {
  const lines = [];
  for (let i = 0; i < values.length; i += 8) {
    lines.push(`  ${values.slice(i, i + 8).map((value) => `0x${hex(value, 4)}`).join(", ")},`);
  }
  return lines.join("\n");
}

function formatMap(map) {
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([key, value]) => `  0x${hex(key, key > 0xff ? 4 : 2)}: 0x${hex(value, value > 0xff ? 4 : 2)},`)
    .join("\n");
}

function hex(value, width) {
  return value.toString(16).toUpperCase().padStart(width, "0");
}
