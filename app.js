const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const app = express();

const { mongoPassword: password } = require('./.env');
const MONGODB_URI = `mongodb+srv://roadtomars2030:${password}@cluster0.6j6n0va.mongodb.net/messages?retryWrites=true&w=majority`;

// app.use(bodyParser.urlencoded()); // x-ww-form-urlencoded
app.use(bodyParser.json()); //application/json
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));

app.use('/images', express.static(path.join(__dirname, 'images')));

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
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const { statusCode = 500, message, data } = error;
  res.status(statusCode).json({ message, data });
});

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    console.log('DATABASE CONNECTED');
    app.listen(8080);
  })
  .catch((err) => console.log(err));
