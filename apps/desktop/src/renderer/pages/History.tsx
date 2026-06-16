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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    void (async () => {
      setRows((await window.openFlow.history.list(200)) as HistoryRow[]);
    })();
  }, []);

  const selectedCount = selectedIds.size;
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  function toggleSelected(id: number): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllVisible(): void {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();
      const next = new Set(prev);
      for (const row of rows) next.add(row.id);
      return next;
    });
  }

  async function deleteRows(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const label = ids.length === 1 ? 'this history item' : `${ids.length} history items`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;

    await window.openFlow.history.delete(ids);
    setRows((prev) => prev.filter((row) => !ids.includes(row.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  return (
    <div className="page page-history">
      <div className="page-header-row">
        <div>
          <div className="eyebrow">History</div>
          <h1>Past dictations.</h1>
          <p className="page-subtitle">{rows.length} saved locally.</p>
        </div>
        {rows.length > 0 && (
          <button disabled={selectedCount === 0} onClick={() => void deleteRows([...selectedIds])}>
            Delete selected{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="empty-panel">No dictations yet.</div>
      ) : (
        <div className="table-panel">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all history items"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                  />
                </th>
                <th>When</th>
                <th>Text</th>
                <th>App</th>
                <th>Took</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select history item from ${new Date(row.timestamp).toLocaleString()}`}
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                    />
                  </td>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td>{row.finalText}</td>
                  <td>{row.bundleId ?? '—'}</td>
                  <td>{row.durationMs} ms</td>
                  <td>
                    <button onClick={() => void deleteRows([row.id])}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
