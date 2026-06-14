import { useEffect, useState } from 'react';
import { Layout, type Route } from './Layout.js';
import { Status } from './pages/Status.js';
import { Onboarding } from './pages/Onboarding.js';
import { Settings } from './pages/Settings.js';
import { Dictionary } from './pages/Dictionary.js';
import { History } from './pages/History.js';
import { HUD } from './pages/HUD.js';

type AnyRoute = Route | 'hud';

function readRoute(): AnyRoute {
  const hash = window.location.hash.replace('#', '');
  if (
    hash === 'status' ||
    hash === 'settings' ||
    hash === 'dictionary' ||
    hash === 'history' ||
    hash === 'onboarding' ||
    hash === 'hud'
  ) {
    return hash;
  }
  return 'status';
}

export function App(): JSX.Element {
  const [route, setRoute] = useState<AnyRoute>(readRoute());

  useEffect(() => {
    const update = (): void => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    const unsubscribe = window.openFlow.app?.onNavigate?.((msg) => {
      navigate(msg.route);
    });
    return () => {
      window.removeEventListener('hashchange', update);
      unsubscribe?.();
    };
  }, []);

  function navigate(next: Route): void {
    window.location.hash = `#${next}`;
    setRoute(next);
  }

  if (route === 'hud') return <HUD />;

  const page = renderPage(route);
  return (
    <Layout route={route} onNavigate={navigate}>
      {page}
    </Layout>
  );
}

function renderPage(route: Route): JSX.Element {
  switch (route) {
    case 'status':
      return <Status />;
    case 'onboarding':
      return <Onboarding />;
    case 'settings':
      return <Settings />;
    case 'dictionary':
      return <Dictionary />;
    case 'history':
      return <History />;
  }
}
