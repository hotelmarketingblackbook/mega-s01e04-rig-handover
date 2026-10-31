import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestNight, DigestRow, RawLogLine } from './types.js';

export function readNight(runsDir: string, night: string): DigestNight | null {
  const filePath = join(runsDir, `${night}.jsonl`);
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let badLines = 0;
  const jobMap = new Map<string, RawLogLine[]>();

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed) as RawLogLine;
      if (!parsed || typeof parsed.job !== 'string' || typeof parsed.at !== 'string' || typeof parsed.status !== 'string') {
        badLines++;
        continue;
      }

      const existing = jobMap.get(parsed.job) ?? [];
      existing.push(parsed);
      jobMap.set(parsed.job, existing);
    } catch {
      badLines++;
    }
  }

  const rows: DigestRow[] = [];

  for (const [job, entries] of jobMap.entries()) {
    const first = entries[0];
    const last = entries[entries.length - 1];

    let retries = 0;
    for (const e of entries) {
      if (e.status === 'retry') {
        retries++;
      }
    }

    // Owner can be null. Use the last defined owner if present, or null.
    let owner: string | null = null;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].owner !== undefined) {
        owner = entries[i].owner;
        break;
      }
    }

    rows.push({
      job,
      owner,
      runs: entries.length,
      retries,
      lastStatus: last.status,
      lastError: last.error ?? null,
      firstTime: first.at,
      lastTime: last.at,
    });
  }

  rows.sort((a, b) => a.job.localeCompare(b.job));

  return {
    night,
    rows,
    badLines,
  };
}
