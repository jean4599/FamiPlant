var awsIot = require('aws-iot-device-sdk');

var device = awsIot.device({
  keyPath: './certs/private.pem.key',
  certPath: './certs/certificate.pem.crt',
  caPath: './certs/rootCA.pem',
  host: "a2fjaggbyc4pmi.iot.us-east-2.amazonaws.com",
  port: 8883,
  clientId: "raspi-data-publisher",
  region: 'us-east-1'
});

//
// Device is an instance returned by mqtt.Client(), see mqtt.js for full
// documentation.
//
device.on('connect', function() {
  console.log('connect');
  device.subscribe('sensor/data/2');
});

module.exports.device = device