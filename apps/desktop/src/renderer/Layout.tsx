import type { ReactNode } from 'react';

export type Route = 'status' | 'onboarding' | 'settings' | 'dictionary' | 'history';

interface Item {
  route: Route;
  label: string;
  hint?: string;
}

const ITEMS: Item[] = [
  { route: 'status', label: 'Status', hint: 'Diagnostics' },
  { route: 'settings', label: 'Settings', hint: 'Hotkey, model, prefs' },
  { route: 'dictionary', label: 'Dictionary', hint: 'Replacement rules' },
  { route: 'history', label: 'History', hint: 'Past dictations' },
  { route: 'onboarding', label: 'Onboarding', hint: 'Permissions / setup' },
];

export function Layout(props: { route: Route; onNavigate: (r: Route) => void; children: ReactNode }): JSX.Element {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <span className="app-sidebar-mark" />
          <div>
            <div className="app-sidebar-title">open-flow</div>
            <div className="app-sidebar-subtitle">Local dictation</div>
          </div>
        </div>
        <nav>
          {ITEMS.map((item) => (
            <button
              key={item.route}
              className={`app-nav-item ${props.route === item.route ? 'is-active' : ''}`}
              onClick={() => props.onNavigate(item.route)}
            >
              <span className="app-nav-label">{item.label}</span>
              {item.hint && <span className="app-nav-hint">{item.hint}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="app-content">{props.children}</main>
    </div>
  );
}
