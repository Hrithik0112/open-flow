import { useEffect, useState } from 'react';

interface HistoryRow {
  id: number;
  timestamp: number;
  rawText: string;
  finalText: string;
  durationMs: number;
  bundleId: string | null;
  model: string;
}

export function History(): JSX.Element {
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    void (async () => {
      setRows((await window.openFlow.history.list(200)) as HistoryRow[]);
    })();
  }, []);

  return (
    <div className="page">
      <h1>History</h1>
      {rows.length === 0 ? (
        <p>No dictations yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Text</th>
              <th>App</th>
              <th>Took</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.timestamp).toLocaleString()}</td>
                <td>{row.finalText}</td>
                <td>{row.bundleId ?? '—'}</td>
                <td>{row.durationMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
