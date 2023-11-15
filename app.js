const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const feedRoutes = require('./routes/feed');

const { mongoPassword: password } = require('./.env');
const MONGODB_URI = `mongodb+srv://roadtomars2030:${password}@cluster0.6j6n0va.mongodb.net/messages?retryWrites=true&w=majority`;

const app = express();

// app.use(bodyParser.urlencoded()); // x-ww-form-urlencoded
app.use(bodyParser.json()); //application/json

// Handling CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/feed', feedRoutes);

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    console.log('DATABASE CONNECTED');
    app.listen(8080);
  })
  .catch((err) => console.log(err));
