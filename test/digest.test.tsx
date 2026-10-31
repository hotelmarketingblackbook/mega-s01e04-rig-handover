import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { DigestRow } from '../src/digest/index.js';

describe('digest routes', () => {
  const baseConfig = {
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: 'runs',
  };

  it('GET /digest/2026-10-28 renders locally with table and warning marks', async () => {
    process.env.LANE_MARKER = 'TEST-LANE';
    const app = createApp(baseConfig);
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('digest · 2026-10-28');
    expect(html).toContain('TEST-LANE');
    expect(html).toContain('digest/render');
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('notes/backup');
    // Check retry >= 3 warning
    expect(html).toContain('class="warn">3</td>');
    // Check fail warning
    expect(html).toContain('class="warn">fail</td>');
    // Check owner null rendered as dash
    expect(html).toContain('—');
  });

  it('GET /api/digest/2026-10-28 returns the same jobs in the same order as HTML', async () => {
    const app = createApp(baseConfig);
    const pageRes = await app.request('/digest/2026-10-28');
    const pageHtml = await pageRes.text();

    const apiRes = await app.request('/api/digest/2026-10-28');
    expect(apiRes.status).toBe(200);

    const rows = (await apiRes.json()) as DigestRow[];
    expect(rows).toHaveLength(5);

    const expectedOrder = [
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ];
    expect(rows.map((r) => r.job)).toEqual(expectedOrder);

    // Verify ordering in HTML
    let lastIdx = -1;
    for (const job of expectedOrder) {
      const idx = pageHtml.indexOf(job);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it('status board links both nights on disk to a digest that renders', async () => {
    const app = createApp(baseConfig);
    const res = await app.request('/');
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('<a href="/digest/2026-10-28">2026-10-28</a>');
    expect(html).toContain('<a href="/digest/2026-10-27">2026-10-27</a>');

    // Both link targets render
    const r1 = await app.request('/digest/2026-10-28');
    expect(r1.status).toBe(200);
    const r2 = await app.request('/digest/2026-10-27');
    expect(r2.status).toBe(200);
  });

  describe('temp runs dir tests for 2a and 2b (200, 404, empty night, bad line)', () => {
    let tempDir: string;
    let tempConfig: typeof baseConfig;

    beforeAll(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'rig-test-runs-'));
      tempConfig = { ...baseConfig, runsDir: tempDir };

      // Empty night
      writeFileSync(join(tempDir, '2026-10-01.jsonl'), '');

      // Night with bad line
      writeFileSync(
        join(tempDir, '2026-10-02.jsonl'),
        [
          'not valid json',
          JSON.stringify({
            at: '2026-10-02T01:00:00+01:00',
            job: 'test/job',
            status: 'ok',
            owner: 'tester',
          }),
        ].join('\n'),
      );
    });

    afterAll(() => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    });

    it('returns 404 for night with no file', async () => {
      const app = createApp(tempConfig);
      const resPage = await app.request('/digest/1999-01-01');
      expect(resPage.status).toBe(404);

      const resApi = await app.request('/api/digest/1999-01-01');
      expect(resApi.status).toBe(404);
    });

    it('renders "nothing ran" for empty night', async () => {
      const app = createApp(tempConfig);
      const resPage = await app.request('/digest/2026-10-01');
      expect(resPage.status).toBe(200);
      const html = await resPage.text();
      expect(html).toContain('nothing ran');

      const resApi = await app.request('/api/digest/2026-10-01');
      expect(resApi.status).toBe(200);
      const json = await resApi.json();
      expect(json).toEqual([]);
    });

    it('renders valid jobs for night with bad line (bad line counted, never thrown)', async () => {
      const app = createApp(tempConfig);
      const resPage = await app.request('/digest/2026-10-02');
      expect(resPage.status).toBe(200);
      const html = await resPage.text();
      expect(html).toContain('test/job');

      const resApi = await app.request('/api/digest/2026-10-02');
      expect(resApi.status).toBe(200);
      const json = (await resApi.json()) as DigestRow[];
      expect(json).toHaveLength(1);
      expect(json[0].job).toBe('test/job');
    });
  });
});
