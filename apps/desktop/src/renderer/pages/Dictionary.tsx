import { useEffect, useState } from 'react';
import type { DictionaryRule } from '@open-flow/shared';

export function Dictionary(): JSX.Element {
  const [rules, setRules] = useState<DictionaryRule[]>([]);

  useEffect(() => {
    void (async () => {
      setRules(await window.openFlow.dictionary.load());
    })();
  }, []);

  async function persist(next: DictionaryRule[]): Promise<void> {
    setRules(next);
    await window.openFlow.dictionary.save(next);
  }

  function addRow(): void {
    void persist([...rules, { from: '', to: '', caseSensitive: false, wholeWord: false }]);
  }

  function updateRow(index: number, patch: Partial<DictionaryRule>): void {
    const next = rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
    void persist(next);
  }

  function removeRow(index: number): void {
    void persist(rules.filter((_, i) => i !== index));
  }

  return (
    <div className="page">
      <h1>Dictionary</h1>
      <p>Replace words or phrases in your transcripts. Applied left-to-right after Whisper output.</p>
      <table>
        <thead>
          <tr>
            <th>From</th>
            <th>To</th>
            <th>Case</th>
            <th>Whole word</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, i) => (
            <tr key={i}>
              <td>
                <input
                  type="text"
                  value={rule.from}
                  onChange={(e) => updateRow(i, { from: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={rule.to}
                  onChange={(e) => updateRow(i, { to: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={rule.caseSensitive}
                  onChange={(e) => updateRow(i, { caseSensitive: e.target.checked })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={rule.wholeWord}
                  onChange={(e) => updateRow(i, { wholeWord: e.target.checked })}
                />
              </td>
              <td>
                <button onClick={() => removeRow(i)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <button onClick={addRow}>Add rule</button>
      </div>
    </div>
  );
}
