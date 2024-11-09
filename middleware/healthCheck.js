const axios = require('axios');
require('dotenv').config();

const PARTNER_URL = process.env.PARTNER_URL;

// Function to send health check request
const sendHealthCheck = async () => {
  try {
    const response = await axios.get(`${PARTNER_URL}/on`);
    console.log('Health check sent to partner server:', response.data);
  } catch (error) {
    console.error('Failed to send health check:', error.message);
  }
};

// Start the timer to send requests every 2 minutes
const startHealthCheckTimer = () => {
  // Send first check immediately
  sendHealthCheck();
  
  // Then send every 2 minutes
  setInterval(sendHealthCheck, 120000);
};

// Handle incoming health check
const receiveHealthCheck = (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`Health check received at ${timestamp}`);
  
  res.json({
    status: 'active',
    server: 'campo-server',
    timestamp
  });
};

module.exports = {
  startHealthCheckTimer,
  receiveHealthCheck
};