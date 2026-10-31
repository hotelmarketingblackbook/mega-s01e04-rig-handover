import type { DigestNight } from '../digest/index.js';

export function DigestView({ digest }: { digest: DigestNight }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>status</th>
              <th>error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td class={row.retries >= 3 ? 'warn' : ''}>{row.retries}</td>
                <td class={row.lastStatus === 'fail' ? 'warn' : ''}>{row.lastStatus}</td>
                <td>{row.lastError ? <span class="warn">{row.lastError}</span> : <span class="mute">—</span>}</td>
                <td>{row.firstTime}</td>
                <td>{row.lastTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
