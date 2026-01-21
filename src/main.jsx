
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { initializeNotificationService } from '@/lib/NotificationService';

// Initialiser le service de notifications push au démarrage de l'application
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    initializeNotificationService().catch(err => {
      console.error('Erreur initialisation service notifications au démarrage:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
