import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';

import './styles/tokens.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#262626',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
        },
      }}
    />
  </>
);
