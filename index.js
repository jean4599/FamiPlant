var raspi     = require('raspi-io'),
    five      = require("johnny-five"),
    dhtSensor = require('node-dht-sensor'),
    Gpio      = require('onoff').Gpio,
    waterPump = new Gpio(18, 'out'),
    awsDevice = require('./device');

var ioPi = new raspi();
var waterLevelValue, soilValue, lcd, temperature, humidity;

var tempSensor = {
  initialize: function() {
    return dhtSensor.initialize(11, 4);
  },
  read: function() {
    var readOut = dhtSensor.read();
    temperature = readOut.temperature.toFixed(2);
    humidity = readOut.humidity.toFixed(2)
    console.log('Temperature: ' + temperature + 'C, ' +
            'humidity: ' + humidity + '%');
    // return readOut;
    setTimeout(function(){
      tempSensor.read();
    }, 4000)
  }
}

var boards = new five.Boards([
  {id: 'pi', io: ioPi, debug: true },
  {id: 'uno', port: "/dev/ttyUSB0", debug: true }
]);

boards.on("ready", function() {
  console.log('ready');
  if (tempSensor.initialize()) {
    tempSensor.read();
  } else {
    console.warn('Failed to initialize sensor');
  }

  // test purpose | blink led on uno
  var led = new five.Led({
    pin: 13,
    board: this.byId("uno")
  });
  led.blink(500);

  // initialize water level sensor power pin
  var waterPower = five.Pin({pin: 'D4', board: this.byId("uno")});

  // A0 is used for water level sensor
  var waterLevelSensor = new five.Sensor({ pin: 'A0', enabled: false, board: this.byId("uno") });
  waterLevelSensor.on("data", function() {
    if(waterPower.isHigh) {
      waterLevelValue = this.value;
      //console.log('water lev: '+this.value);
    }
  });

  // initialize soil moisture power pin
  var power = five.Pin({pin: 'D7', board: this.byId("uno")});
  // A1 is used for water level sensor
  var soilMoisture = new five.Sensor({ pin: "A1", enabled: false, board: this.byId("uno") });
  soilMoisture.on("data", function() {
    if (power.isHigh) {
      soilValue = this.value;
      //console.log('soil lev: '+this.value);
    }
  });

  var uno = this.byId("uno")
  uno.loop(15000, ()=> {
    if (!power.isHigh) {
      power.high();
      soilMoisture.enable();
    }
    if(!waterPower.isHigh) {
      waterPower.high();
      waterLevelSensor.enable();
    }

    uno.wait(500, function() {
      waterPower.low();
      waterLevelSensor.disable();
      power.low();
      soilMoisture.disable();
    });
  });

  awsUpdater();
});

awsDevice.device.on('message', function(topic, payload) {
  console.log('message', topic, payload.toString());
  payloadData = JSON.parse(payload);
  if(payloadData['sol'] >= 820) {
    waterPump.writeSync(1);
  } else {
    waterPump.writeSync(0);
  }
});


awsUpdater = function() {
  setInterval(function() {
    data = {'temp': parseFloat(temperature), 'hum': parseFloat(humidity), 'wat': parseFloat(waterLevelValue), 'sol': parseFloat(soilValue)}
    awsDevice.device.publish('sensor/data/1', JSON.stringify(data));
  }, 20000);
}

