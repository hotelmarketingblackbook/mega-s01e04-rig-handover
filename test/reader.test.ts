import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/index.js';

describe('run log reader', () => {
  it('reads runs/2026-10-28.jsonl with 5 jobs and 1 bad line', () => {
    const res = readNight('runs', '2026-10-28');
    expect(res).not.toBeNull();
    expect(res?.rows).toHaveLength(5);
    expect(res?.badLines).toBe(1);

    const jobs = res!.rows.map((r) => r.job);
    expect(jobs).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);

    // Check owner null handling
    const digestJob = res!.rows.find((r) => r.job === 'digest/render');
    expect(digestJob?.owner).toBeNull();
    expect(digestJob?.runs).toBe(1);
    expect(digestJob?.retries).toBe(0);
    expect(digestJob?.lastStatus).toBe('ok');

    // Check retries handling
    const fixturesJob = res!.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fixturesJob?.runs).toBe(4);
    expect(fixturesJob?.retries).toBe(3);
    expect(fixturesJob?.lastStatus).toBe('ok');

    // Check fail handling
    const notesJob = res!.rows.find((r) => r.job === 'notes/backup');
    expect(notesJob?.runs).toBe(1);
    expect(notesJob?.retries).toBe(0);
    expect(notesJob?.lastStatus).toBe('fail');
    expect(notesJob?.lastError).toBe('quota exceeded');
  });

  it('returns null for a night with no file', () => {
    const res = readNight('runs', '1999-01-01');
    expect(res).toBeNull();
  });
});
