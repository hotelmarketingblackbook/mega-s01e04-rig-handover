export type JobStatus = 'ok' | 'retry' | 'fail';

export type RawLogLine = {
  at: string;
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type DigestCounts = {
  ok: number;
  retry: number;
  fail: number;
};

export type DigestNight = {
  night: string;
  rows: DigestRow[];
  counts: DigestCounts;
  badLines: number;
};

export type ReadNight = (runsDir: string, night: string) => DigestNight | null;
