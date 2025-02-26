import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the date-fns index.mjs file
const indexMjsPath = path.resolve(__dirname, '../node_modules/date-fns/index.mjs');
const dateFnsDir = path.resolve(__dirname, '../node_modules/date-fns');

// Check if the directory exists
if (!fs.existsSync(dateFnsDir)) {
  console.log('date-fns directory not found. Make sure to run npm install first.');
  process.exit(1);
}

// Check if the file already exists
if (!fs.existsSync(indexMjsPath)) {
  console.log('Creating date-fns/index.mjs file...');
  
  // Content to write to the file
  const content = `// Re-export from ESM directory
export * from './esm/index.js';
export { default } from './esm/index.js';`;
  
  // Write the file
  fs.writeFileSync(indexMjsPath, content);
  console.log('date-fns/index.mjs file created successfully.');
} else {
  console.log('date-fns/index.mjs file already exists.');
} 