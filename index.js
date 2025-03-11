const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const routes = require('./routes/routes');
const dotenv = require('dotenv');
const cors = require('cors');
const { startHealthCheckTimer, receiveHealthCheck } = require('./middleware/healthCheck')

dotenv.config();

const app = express();
app.use(cors())
app.use(bodyParser.json());

// Health check endpoint
app.get('/on', receiveHealthCheck);

mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ctty2fj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Chill, niko on!');
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  // Start the health check timer after server starts
  // startHealthCheckTimer();
});
