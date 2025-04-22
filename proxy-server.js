const express = require('express');
const cors = require('cors');
const https = require('https');
const url = require('url');

// Import the client version directly from envato-api file to ensure consistency
const CLIENT_VERSION = "1dcc980a08791f2463cc52a984191b15f33cacb";
const ENVATO_BASE_URL = "https://elements.envato.com/data-api/page/items-neue-page";

const app = express();
const PORT = 3001;

// Enable CORS for all requests
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Helper function to make HTTPS requests
function makeHttpsRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
        'Referer': 'https://elements.envato.com/',
        'Origin': 'https://elements.envato.com',
        'X-Requested-With': 'XMLHttpRequest'
      }
    }, (res) => {
      let data = '';
      
      // A chunk of data has been received
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      // The whole response has been received
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
        }
      });
    });
    
    // Handle errors
    req.on('error', (error) => {
      reject(error);
    });
    
    // End the request
    req.end();
  });
}

// Custom middleware to handle Envato API requests
app.get('/envato-api', async (req, res) => {
  try {
    // Get query parameters from request
    const queryParams = req.query;
    
    // Ensure clientVersion is included
    if (!queryParams.clientVersion) {
      queryParams.clientVersion = CLIENT_VERSION;
    }
    
    // Construct the URL for the Envato API
    const params = new URLSearchParams(queryParams);
    const targetUrl = `${ENVATO_BASE_URL}?${params.toString()}`;
    
    console.log(`Proxying request to Envato API: ${targetUrl}`);
    
    // Make request to Envato API
    const data = await makeHttpsRequest(targetUrl);
    
    // Send JSON response back to client
    res.json(data);
  } catch (error) {
    console.error('Error proxying Envato API request:', error);
    res.status(500).json({ 
      error: `Proxy error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Proxy server is running');
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Using Envato CLIENT_VERSION: ${CLIENT_VERSION}`);
});
