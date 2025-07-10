#!/usr/bin/env tsx
/**
 * Generate TypeScript types from OpenAPI specification
 * This script fetches the OpenAPI spec from the server and generates type definitions
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import SwaggerParser from '@apidevtools/swagger-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'client', 'src', 'generated');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'api-types.ts');

/**
 * Convert OpenAPI schema to TypeScript type
 */
function schemaToTypeScript(name: string, schema: any, indent = ''): string {
  if (!schema) return 'unknown';

  // Handle references
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return refName;
  }

  // Handle arrays
  if (schema.type === 'array') {
    const itemType = schemaToTypeScript(name + 'Item', schema.items, indent);
    return `${itemType}[]`;
  }

  // Handle enums
  if (schema.enum) {
    return schema.enum.map((value: any) => `'${value}'`).join(' | ');
  }

  // Handle primitive types
  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return 'string'; // Could use Date if needed
      if (schema.format === 'email') return 'string';
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
  }

  // Handle objects
  if (schema.type === 'object' || schema.properties) {
    const properties = schema.properties || {};
    const required = schema.required || [];
    
    let result = '{\n';
    for (const [propName, propSchema] of Object.entries(properties)) {
      const isRequired = required.includes(propName);
      const nullable = (propSchema as any).nullable;
      const propType = schemaToTypeScript(propName, propSchema, indent + '  ');
      
      result += `${indent}  ${propName}${isRequired ? '' : '?'}: ${propType}`;
      if (nullable) result += ' | null';
      result += ';\n';
    }
    result += `${indent}}`;
    
    return result;
  }

  return 'unknown';
}

/**
 * Generate request/response types for an operation
 */
function generateOperationTypes(operationId: string, operation: any): string {
  let types = '';
  
  // Generate request body type if exists
  if (operation.requestBody?.content?.['application/json']?.schema) {
    const schema = operation.requestBody.content['application/json'].schema;
    const typeName = `${capitalize(operationId)}Request`;
    types += `export interface ${typeName} ${schemaToTypeScript(typeName, schema)}\n\n`;
  }
  
  // Generate response types
  for (const [statusCode, response] of Object.entries(operation.responses || {})) {
    if ((response as any).content?.['application/json']?.schema) {
      const schema = (response as any).content['application/json'].schema;
      const typeName = `${capitalize(operationId)}${statusCode}Response`;
      types += `export interface ${typeName} ${schemaToTypeScript(typeName, schema)}\n\n`;
    }
  }
  
  // Generate query parameters type if exists
  if (operation.parameters?.length > 0) {
    const queryParams = operation.parameters.filter((p: any) => p.in === 'query');
    if (queryParams.length > 0) {
      types += `export interface ${capitalize(operationId)}QueryParams {\n`;
      for (const param of queryParams) {
        types += `  ${param.name}${param.required ? '' : '?'}: ${schemaToTypeScript(param.name, param.schema, '  ')};\n`;
      }
      types += '}\n\n';
    }
  }
  
  return types;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Main function to generate types
 */
async function generateTypes() {
  try {
    console.log(`🔄 Fetching OpenAPI specification from ${API_BASE_URL}/api/openapi.json...`);
    
    // Fetch OpenAPI spec from server
    const response = await fetch(`${API_BASE_URL}/api/openapi.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
    }
    
    const spec = await response.json();
    
    // Validate OpenAPI spec
    const api = await SwaggerParser.validate(spec);
    console.log('✅ API specification is valid.');
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Generate TypeScript types
    let output = `/**
 * Auto-generated API types from OpenAPI specification
 * Generated on: ${new Date().toISOString()}
 * DO NOT EDIT MANUALLY
 */

`;
    
    // Generate schema types
    if (api.components?.schemas) {
      output += '// ===== Schema Types =====\n\n';
      for (const [schemaName, schema] of Object.entries(api.components.schemas)) {
        output += `export interface ${schemaName} ${schemaToTypeScript(schemaName, schema)}\n\n`;
      }
    }
    
    // Generate operation types
    output += '// ===== Operation Types =====\n\n';
    for (const [pathName, pathItem] of Object.entries(api.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const operationId = (operation as any).operationId || 
            `${method}${pathName.replace(/[^a-zA-Z0-9]/g, '')}`;
          output += generateOperationTypes(operationId, operation);
        }
      }
    }
    
    // Generate API client interface
    output += `// ===== API Client Interface =====\n\n`;
    output += `export interface APIClient {\n`;
    
    for (const [pathName, pathItem] of Object.entries(api.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
          const operationId = (operation as any).operationId || 
            `${method}${pathName.replace(/[^a-zA-Z0-9]/g, '')}`;
          
          // Determine parameter and return types
          let params = '';
          const pathParams = (operation as any).parameters?.filter((p: any) => p.in === 'path') || [];
          const hasQueryParams = (operation as any).parameters?.some((p: any) => p.in === 'query');
          const hasRequestBody = !!(operation as any).requestBody;
          
          if (pathParams.length > 0) {
            params = pathParams.map((p: any) => `${p.name}: ${schemaToTypeScript(p.name, p.schema)}`).join(', ');
          }
          if (hasQueryParams) {
            params += params ? ', ' : '';
            params += `query?: ${capitalize(operationId)}QueryParams`;
          }
          if (hasRequestBody) {
            params += params ? ', ' : '';
            params += `data: ${capitalize(operationId)}Request`;
          }
          
          const successResponse = Object.entries((operation as any).responses || {})
            .find(([code]) => code.startsWith('2'));
          const returnType = successResponse ? 
            `${capitalize(operationId)}${successResponse[0]}Response` : 
            'unknown';
          
          output += `  ${operationId}(${params}): Promise<${returnType}>;\n`;
        }
      }
    }
    
    output += '}\n';
    
    // Write to file
    await fs.writeFile(OUTPUT_FILE, output);
    console.log(`✅ TypeScript types generated successfully at ${OUTPUT_FILE}`);
    
  } catch (error) {
    console.error('❌ Error generating types:', error);
    process.exit(1);
  }
}

// Run the type generation
generateTypes().catch(console.error);

export { generateTypes };