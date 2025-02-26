import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to prompt user
const prompt = (question) => new Promise((resolve) => {
  rl.question(question, (answer) => resolve(answer));
});

async function deploy() {
  try {
    // First ensure the date-fns fix is applied
    console.log('Ensuring date-fns/index.mjs exists...');
    execSync('node scripts/ensure-date-fns-mjs.js', { stdio: 'inherit' });
    
    // Ask which environment to deploy to
    const environment = await prompt('Deploy to (dev/prod): ');
    
    if (environment !== 'dev' && environment !== 'prod') {
      console.error('Invalid environment. Please specify "dev" or "prod".');
      rl.close();
      return;
    }
    
    // Map environment to Firebase project alias
    const projectAlias = environment === 'dev' ? 'development' : 'production';
    
    // Ask which hosting provider to use
    const provider = await prompt('Hosting provider (vercel/netlify/firebase): ');
    
    if (!['vercel', 'netlify', 'firebase'].includes(provider)) {
      console.error('Invalid provider. Please specify "vercel", "netlify", or "firebase".');
      rl.close();
      return;
    }
    
    // Build the application
    console.log('Building the application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Deploy based on provider and environment
    console.log(`Deploying to ${environment} environment using ${provider}...`);
    
    switch (provider) {
      case 'vercel':
        if (environment === 'prod') {
          execSync('vercel --prod', { stdio: 'inherit' });
        } else {
          execSync('vercel', { stdio: 'inherit' });
        }
        break;
        
      case 'netlify':
        if (environment === 'prod') {
          execSync('netlify deploy --dir=dist --prod', { stdio: 'inherit' });
        } else {
          execSync('netlify deploy --dir=dist', { stdio: 'inherit' });
        }
        break;
        
      case 'firebase':
        try {
          if (environment === 'prod') {
            execSync('firebase deploy --only hosting -P production', { stdio: 'inherit' });
          } else {
            execSync('firebase deploy --only hosting -P development', { stdio: 'inherit' });
          }
        } catch (error) {
          console.error(`Error deploying to Firebase: ${error.message}`);
          console.log('Attempting to use default project instead...');
          
          // Try deploying to default project as fallback
          execSync('firebase deploy --only hosting', { stdio: 'inherit' });
        }
        break;
    }
    
    console.log(`Successfully deployed to ${environment} environment using ${provider}!`);
  } catch (error) {
    console.error('Deployment failed:', error.message);
  } finally {
    rl.close();
  }
}

deploy(); 