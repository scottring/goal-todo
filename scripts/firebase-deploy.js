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

async function deployToFirebase() {
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
    
    // Build the application
    console.log('Building the application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Deploy to Firebase
    console.log(`Deploying to ${environment} environment using Firebase...`);
    
    try {
      if (environment === 'prod') {
        console.log('Using production project...');
        execSync('firebase deploy --only hosting', { stdio: 'inherit' });
      } else {
        console.log('Using development project...');
        // Check if goals-a2d40-dev exists in .firebaserc
        const firebaseRcPath = path.resolve(__dirname, '../.firebaserc');
        const firebaseRc = JSON.parse(fs.readFileSync(firebaseRcPath, 'utf8'));
        
        if (firebaseRc.projects && firebaseRc.projects.development) {
          execSync('firebase use development && firebase deploy --only hosting', { stdio: 'inherit' });
        } else {
          console.log('Development project not found in .firebaserc, using default project...');
          execSync('firebase deploy --only hosting', { stdio: 'inherit' });
        }
      }
      
      console.log(`Successfully deployed to ${environment} environment using Firebase!`);
    } catch (error) {
      console.error(`Error deploying to Firebase: ${error.message}`);
      console.log('Attempting to use default project instead...');
      
      // Try deploying to default project as fallback
      execSync('firebase deploy --only hosting', { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Deployment failed:', error.message);
  } finally {
    rl.close();
  }
}

deployToFirebase(); 