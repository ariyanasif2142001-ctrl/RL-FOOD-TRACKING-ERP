import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { LoginPortal } from './components/LoginPortal';
import './index.css';

const AppContainer: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('rl_food_logged_in') === 'true';
  });

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('rl_food_logged_in', 'true');
      const scriptId = 'orig-script-bundle';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'module';
        script.src = '/assets/index-BB69zdb3.js';
        document.body.appendChild(script);
      }
    } else {
      localStorage.removeItem('rl_food_logged_in');
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <LoginPortal
        onLoginSuccess={() => {
          localStorage.setItem('rl_food_logged_in', 'true');
          setIsLoggedIn(true);
          window.location.reload();
        }}
      />
    );
  }

  return null; // When logged in, index-BB69zdb3.js handles mounting to #root
};

const mountEl = document.getElementById('root');
if (mountEl) {
  const isAlreadyLoggedIn = localStorage.getItem('rl_food_logged_in') === 'true';
  if (isAlreadyLoggedIn) {
    // Directly load original app bundle into #root
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/assets/index-BB69zdb3.js';
    document.body.appendChild(script);
  } else {
    ReactDOM.createRoot(mountEl).render(<AppContainer />);
  }
}
