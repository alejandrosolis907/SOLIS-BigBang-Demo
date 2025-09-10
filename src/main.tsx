import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
      <h1>🚀 SOLIS BigBang Demo</h1>
      <p>App corriendo con Vite + React + Express en Railway</p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
