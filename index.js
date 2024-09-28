const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const routes = require('./routes/routes');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors())
app.use(bodyParser.json());

mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ctty2fj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.send('Welcome to the University Rating API');
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));