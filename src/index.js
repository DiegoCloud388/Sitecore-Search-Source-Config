require('dotenv').config();
const App = require('./App');

const { SC_API_KEY, API_URL } = process.env;

if (!SC_API_KEY || !API_URL) {
    console.error('Missing required environment variables: SC_API_KEY and API_URL');
    process.exit(1);
}

// --- Entry Point ---
const app = new App(SC_API_KEY, API_URL);
app.run();