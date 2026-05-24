#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const sources = process.argv.slice(2);

if (sources.length === 0) {
  console.error("Usage: node scripts/inspect-ucm-mapping.mjs <url-or-file> [...]");
  process.exitCode = 1;
}

const HEADER_KEYS = [
  "code_set_name",
  "uconv_class",
  "mb_cur_min",
  "mb_cur_max",
  "subchar",
  "subchar1",
  "icu:base",
];

async function readSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`${source}: HTTP ${response.status}`);
    }
    return response.text();
  }

  return readFile(source, "utf8");
}

function parseHeaderLine(line, header) {
  for (const key of HEADER_KEYS) {
    const match = line.match(new RegExp(`^<${escapeRegExp(key)}>\\s+(.*)$`));
    if (match) {
      header[key] = match[1].trim().replace(/^"|"$/g, "");
      return;
    }
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseByteSequence(bytesText) {
  return [...bytesText.matchAll(/\\x([0-9a-fA-F]{2})/g)].map((match) =>
    Number.parseInt(match[1], 16),
  );
}

function inspectUcm(text) {
  const header = {};
  const stats = {
    mappingEntries: 0,
    oneByteMappings: 0,
    twoByteMappings: 0,
    longerMappings: 0,
    privateUseMappings: 0,
    fallbackMappings: 0,
  };
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

    const match = line.match(/^((?:<U[0-9a-fA-F]{4,6}>)+)\s+((?:\\x[0-9a-fA-F]{2})+)\s+\|([0-9])/);
    if (!match) {
      continue;
    }

    stats.mappingEntries += 1;
    const unicodeCodes = [...match[1].matchAll(/<U([0-9a-fA-F]{4,6})>/g)].map((unicodeMatch) =>
      Number.parseInt(unicodeMatch[1], 16),
    );
    const bytes = parseByteSequence(match[2]);
    const precision = Number.parseInt(match[3], 10);

    if (bytes.length === 1) {
      stats.oneByteMappings += 1;
    } else if (bytes.length === 2) {
      stats.twoByteMappings += 1;
    } else {
      stats.longerMappings += 1;
    }

    if (unicodeCodes.some((codePoint) => codePoint >= 0xe000 && codePoint <= 0xf8ff)) {
      stats.privateUseMappings += 1;
    }
    if (precision !== 0) {
      stats.fallbackMappings += 1;
    }
  }

  return { header, stats };
}

for (const source of sources) {
  try {
    const text = await readSource(source);
    const result = inspectUcm(text);
    console.log(
      JSON.stringify(
        {
          source,
          ...result,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
