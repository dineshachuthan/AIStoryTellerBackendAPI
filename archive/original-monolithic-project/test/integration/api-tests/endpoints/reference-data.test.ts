/**
 * Reference Data API Endpoint Tests
 * Tests all reference data endpoints
 */

import { TestEndpoint } from '../test-config';

export const referenceDataEndpoints: TestEndpoint[] = [
  {
    name: 'Get Emotions',
    method: 'GET',
    path: '/api/reference-data/emotions',
    category: 'emotion',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return emotion reference data',
        description: 'Validates emotion data structure',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              (response[0].id && response[0].emotion && 
               response[0].sampleText && response[0].category === 1));
        },
      },
    ],
  },
  {
    name: 'Get Sounds',
    method: 'GET',
    path: '/api/reference-data/sounds',
    category: 'emotion',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return sound reference data',
        description: 'Validates sound data structure',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              (response[0].id && response[0].sound && 
               response[0].sampleText && response[0].category === 2));
        },
      },
    ],
  },
  {
    name: 'Get Modulations',
    method: 'GET',
    path: '/api/reference-data/modulations',
    category: 'emotion',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return modulation reference data',
        description: 'Validates modulation data structure',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              (response[0].id && response[0].modulation && 
               response[0].sampleText && response[0].category === 3));
        },
      },
    ],
  },
  {
    name: 'Get Character Archetypes',
    method: 'GET',
    path: '/api/reference-data/archetypes',
    category: 'emotion',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return character archetypes',
        description: 'Validates archetype data structure',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              (response[0].id && response[0].name && 
               response[0].description && response[0].traits));
        },
      },
    ],
  },
];