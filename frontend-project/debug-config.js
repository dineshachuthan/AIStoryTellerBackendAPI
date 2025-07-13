// Debug configuration
console.log('=== RUNTIME CONFIG DEBUG ===');
console.log('Current location:', window.location.href);
console.log('Hostname:', window.location.hostname);
console.log('Protocol:', window.location.protocol);
console.log('Port:', window.location.port);

// Test the runtime config
import { config } from './src/config/runtime.js';
console.log('Runtime config:', config);

// Test API endpoint
console.log('Testing API endpoint...');
fetch(`${config.API_URL}/api/auth/user`, { credentials: 'include' })
  .then(response => {
    console.log('API Response status:', response.status);
    console.log('API Response headers:', response.headers);
    return response.text();
  })
  .then(data => {
    console.log('API Response data:', data);
  })
  .catch(error => {
    console.error('API Error:', error);
  });