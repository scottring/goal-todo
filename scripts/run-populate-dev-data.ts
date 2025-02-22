import { populateDevData } from './populate-dev-data';

// Get the user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('Please provide your user ID as a command line argument');
  console.error('Usage: npm run populate-dev-data YOUR_USER_ID');
  process.exit(1);
}

// Run the populate function
populateDevData(userId)
  .then(() => {
    console.log('Successfully populated development data!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error populating development data:', error);
    process.exit(1);
  }); 