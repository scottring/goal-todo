import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Failed to find root element');
  throw new Error('Failed to find root element');
}

try {
  console.log('Initializing React app...');
  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('React app mounted successfully');
} catch (error) {
  console.error('Failed to initialize React app:', error);
  // Display a user-friendly error message
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <h1>Something went wrong</h1>
      <p>Please try refreshing the page. If the problem persists, contact support.</p>
    </div>
  `;
}
