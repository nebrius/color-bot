'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const converter = require('hsl-to-rgb-for-reals');
const space = require('color-space');
const convertCssColorNameToHex = require('convert-css-color-name-to-hex');
const SerialPort = require('serialport').SerialPort;
const app = express();

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//const PORT = '/dev/tty.usbmodem1421';
//const PORT = '/dev/cu.usbserial-DA00T0D6';
const PORT = '/dev/ttyAMA0';

const serialPort = new SerialPort(PORT, {
  baudrate: 115200
});

const STATE_IDLE = 'idle';
const STATE_FLASHING = 'flashing';

const INITIAL_COLOR = [ [ 0, 100, 10 ], [ 40, 100, 10 ], [ 80, 100, 10 ] ];

serialPort.on('open', (err) => {
  if (err) {
    console.log(`Failed to open serial port: ${err}`);
    process.exit(1);
  }

  let currentPixelSet = INITIAL_COLOR;
  let currentState = STATE_IDLE;
  let currentDirection;
  let fadeCount;

  setInterval(() => {
    switch(currentState) {
      case STATE_IDLE:
        for (const pixel of currentPixelSet) {
          pixel[0] += 1;
          if (pixel[0] >= 360) {
            pixel[0] = 0;
          }
        }
        break;

      case STATE_FLASHING:
        if (currentDirection === 1) {
          currentPixelSet[0][2] += 5;
          currentPixelSet[1][2] += 5;
          currentPixelSet[2][2] += 5;
          if (currentPixelSet[0][2] >= 50) {
            currentDirection = -1;
          }
        } else {
          currentPixelSet[0][2] -= 5;
          currentPixelSet[1][2] -= 5;
          currentPixelSet[2][2] -= 5;
          if (currentPixelSet[0][2] <= 0) {
            if (fadeCount === 4) {
              currentState = STATE_IDLE;
              currentPixelSet = INITIAL_COLOR;
            }
            fadeCount++;
            currentDirection = 1;
          }
        }
        break;
    }
    let data = '';
    for (const pixel of currentPixelSet) {
      const rgb = space.hsl.rgb(pixel);
      for (const channel of rgb) {
        data += ('00' + Math.floor(channel).toString(16)).slice(-2).toUpperCase();
      }
    }
    serialPort.write(data);
  }, 30);

  app.post('/color', (req, res) => {
    console.log(`User requested to set color ${req.body.color}`);
    const rgb = convertCssColorNameToHex(req.body.color);
    const pixel = space.rgb.hsl([ parseInt(`0x${rgb[1]}${rgb[2]}`), parseInt(`0x${rgb[3]}${rgb[4]}`), parseInt(`0x${rgb[5]}${rgb[6]}`) ]);
    pixel[1] = 100;
    pixel[2] = 0;
    currentState = STATE_FLASHING;
    currentPixelSet = [ ([]).concat(pixel), ([]).concat(pixel), ([]).concat(pixel) ];
    currentDirection = 1;
    fadeCount = 0;
    res.send('ok');
  });

  const server = app.listen(3001, function () {
    console.log(`Lighting bot listening at http://${server.address().address}:${server.address().port}`);
  });
});
