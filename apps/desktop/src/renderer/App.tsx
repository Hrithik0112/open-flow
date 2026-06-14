import { useEffect, useState } from 'react';
import { Onboarding } from './pages/Onboarding.js';
import { Settings } from './pages/Settings.js';
import { Dictionary } from './pages/Dictionary.js';
import { History } from './pages/History.js';

type Route = 'onboarding' | 'settings' | 'dictionary' | 'history';

function readRoute(): Route {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'settings' || hash === 'dictionary' || hash === 'history' || hash === 'onboarding') {
    return hash;
  }
  return 'settings';
}

export function App(): JSX.Element {
  const [route, setRoute] = useState<Route>(readRoute());

  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  switch (route) {
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
