import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure the root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; font-family: system-ui;">
      <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 2rem; border-radius: 0.5rem; max-width: 500px; text-align: center;">
        <h2>Critical Error</h2>
        <p>Root element not found. Please contact support.</p>
      </div>
    </div>
  `;
  throw new Error('Root element not found');
}

// Clear any existing content
rootElement.innerHTML = '';

// Enhanced global error handling
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
  
  // Show user-friendly error
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; font-family: system-ui; background: #f9fafb;">
      <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 2rem; border-radius: 0.5rem; max-width: 500px; text-align: center;">
        <h2 style="margin: 0 0 1rem 0;">Application Error</h2>
        <p style="margin: 0 0 1rem 0;">There was an error loading the application. Please refresh the page.</p>
        <p style="margin: 0 0 1.5rem 0; font-size: 0.875rem; color: #991b1b;">Error: ${event.message || 'Unknown error occurred'}</p>
        <button onclick="window.location.reload()" style="background: #dc2626; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
          Refresh Page
        </button>
      </div>
    </div>
  `;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  console.error('Promise rejection details:', {
    reason: event.reason,
    promise: event.promise
  });
});

// Add loading indicator
rootElement.innerHTML = `
  <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; background: #f9fafb;">
    <div style="text-center;">
      <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #16a34a; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
      <p style="color: #6b7280; margin: 0;">Loading Campus Mantri Portal...</p>
    </div>
  </div>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
`;

try {
  // Test if React is available
  if (typeof StrictMode === 'undefined') {
    throw new Error('React is not loaded properly');
  }

  // Test if createRoot is available
  if (typeof createRoot === 'undefined') {
    throw new Error('React DOM is not loaded properly');
  }

  // Create and render the app
  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; font-family: system-ui; background: #f9fafb;">
      <div style="background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 2rem; border-radius: 0.5rem; max-width: 500px; text-align: center;">
        <h2 style="margin: 0 0 1rem 0;">Render Error</h2>
        <p style="margin: 0 0 1rem 0;">Failed to start the application. Please refresh the page.</p>
        <p style="margin: 0 0 1.5rem 0; font-size: 0.875rem; color: #991b1b;">Error: ${error instanceof Error ? error.message : 'Unknown render error'}</p>
        <button onclick="window.location.reload()" style="background: #dc2626; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
          Refresh Page
        </button>
      </div>
    </div>
  `;
}