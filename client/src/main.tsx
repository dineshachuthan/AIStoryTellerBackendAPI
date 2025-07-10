import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('PWA: Service Worker registered successfully', registration);
  },
  onUpdate: (registration) => {
    console.log('PWA: New content available, please refresh', registration);
    // Dispatch custom event for update notification
    window.dispatchEvent(new CustomEvent('swUpdate', { detail: registration }));
  }
});
