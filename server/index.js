'use strict';

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const isCSSColorHex = require('is-css-color-hex');
const isCSSColorName = require('is-css-color-name');
const app = express();

const PI_ADDRESS = '192.168.2.3';
const PI_PORT = 3001;

app.use(express.static(path.join(__dirname, 'web')));
app.use(bodyParser.urlencoded({ extended: false }));

const stats = {};

app.post('/api/color', (req, res) => {
  const color = req.body.color;
  if (!isCSSColorHex(color) && !isCSSColorName(color)) {
    res.status(404).send('Invalid color name');
    return;
  }
  let responseText;
  if (!stats[color]) {
    stats[color] = 1;
    responseText = `You are the first person to choose ${color}, go you!`;
  } else {
    responseText = `${stats[color]} other ${stats[color] === 1 ? 'person' : 'people'} also chose ${color}, awesome!`;
    stats[color]++;
  }
  request.post(`http://${PI_ADDRESS}:${PI_PORT}/color`).form({ color }).on('response', () => {
    res.send(responseText);
  });
});

app.listen(3000, () => {
  console.log('Color server listening on port 3000!');
});
