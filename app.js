/**
 * Brewnoduino (Brew no du ween Oh)
 * Version: 1.0.0 Alpha
 * By EllisGL
 */
/**
 * TODO:
 * Scheduler: Add more options
 *            Figure out how if there's a way around having to use globals.
 * Digital input displays
 * OneWire Temperature support
 * Manual Temp setting
 * Clean this mess up
 */
/**
 * Module dependencies.
 */
var express    = require('express');
var app        = express();
var config     = require('./config');
var http       = require('http');
var routes     = require('./routes');
var path       = require('path');
var fs         = require('fs');

// Firmata
var board      = require('./firmataConnector').start(config.brewnoduino.serialPort);

// Schedule runner - child process. (Just for now -- might bring it back into the main if it proves not to block)
var cProcess   = require('child_process');
cProcess.fork('./scheduler');

// Bidirectional communication with call backs.
var axon       = require('axon');
var aRep       = axon.socket('rep', null);
aRep.bind(8002);

var aReq       = axon.socket('req', null);
aReq.connect(8003);

// Brew log.
var logFile    = "";

// Stop the IDE warnings.
var i          = 0; // Counter variable
var analog     = "";
var tReading   = 0;

// all environments
app.set('port', process.env.PORT || 8001);
app.set('views', path.join(__dirname, 'views'));
app.set('cfg', config);
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('Ima gonna eat your cookie!'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io').listen(server);

// Routes
app.get('/', routes.index);

// Temp stuff
function thermistor(data, resistor)
{
    var temp = Math.log((((1024 * resistor) / data) - resistor));
    temp     = 1 / (0.001129148 + (0.000234125 + (0.0000000876741 * temp * temp )) * temp); // Convert to Kelvin
    temp     = temp - 273.15;                                                               // Convert Kelvin to Celsius

    return temp;
}

function tmp36(data, voltage)
{
    var v  = data * voltage;
    v     /= 1024.0;

    return (v - 0.5) * 100; // Convert to Celsius.
}

function roundTo(num, places)
{
    return +(Math.round(num + "e+"+places) + "e-"+places);
}

// Convert Celsius to Fahrenheit
function convertCF(temp)
{
    return (temp * 9.0)/ 5.0 + 32.0;
}

// Tracking states
var ports        = {
    'output' : {
        'pwm' : {},
        'digital' :{}
    },
    'input' :
    {
        'analog' : {},
        'digital' : {}
    }
};

// Fill in for the tracking states.
for(i = 0; i < config.brewnoduino.outputs.pwm.length; i++)
{
    ports.output.pwm[config.brewnoduino.outputs.pwm[i].port] = {'value' : 0};
}

for(i = 0; i < config.brewnoduino.outputs.digital.length; i++)
{
    ports.output.digital[config.brewnoduino.outputs.digital[i].port] = {'value' : 0};
}

for(i = 0; i < config.brewnoduino.inputs.analog.length; i++)
{
    // sArr = Smoothing array.
    ports.input.analog[config.brewnoduino.inputs.analog[i].port] = {'value' : 0, 'cnt' : 0, 'sArr' : []};
}

for(i = 0; i < config.brewnoduino.inputs.digital.length; i++)
{
    ports.input.digital[config.brewnoduino.inputs.digital[i].port] = {'value' : 0};
}

board.on('connection', function ()
{
    // Run through the config again and setup the pin write modes.
    for (i = 0; i < config.brewnoduino.outputs.pwm.length; i++)
    {
        var pwm = config.brewnoduino.outputs.pwm[i];
        board.pinMode(pwm.port, board.PWM);
    }

    for (i = 0; i < config.brewnoduino.outputs.digital.length; i++)
    {
        var digital = config.brewnoduino.outputs.digital[i];

        board.pinMode(digital.port, board.OUTPUT);
    }

    // Run through the config again to setup the analog reads
    for (i = 0; i < config.brewnoduino.inputs.analog.length; i++)
    {
        analog = config.brewnoduino.inputs.analog[i];

        if(analog.port != 'OneWire')
        {
            board.analogRead(board[analog.port], function (val)
            {
               // Smooth the analog reading
               if(ports.input.analog[analog.port].cnt == 24)
               {
                   // Reset counter
                   ports.input.analog[analog.port].cnt = 0;

                   // Sort values
                   ports.input.analog[analog.port].sArr.sort();

                   // Drop highest
                   ports.input.analog[analog.port].sArr.pop();

                   // Drop lowest
                   ports.input.analog[analog.port].sArr.shift();

                   // Get sum for Average
                   var sum = ports.input.analog[analog.port].sArr.reduce(function(a, b) { return a + b });

                   /**
                    { name: 'brew pot',
                       port: 'A0',
                       display: 'temperature',
                       units: 'f' }
                    */
                   // Convert to F and store
                   if(analog.display == 'temperature')
                   {
                        ports.input.analog[analog.port].value = roundTo((analog.units == 'F') ? convertCF(sum / ports.input.analog[analog.port].sArr.length)
                                                                                            : (sum / ports.input.analog[analog.port].sArr.length), 1).toFixed(1);
                   }
                   else
                   {
                       ports.input.analog[analog.port].value = (sum / ports.input.analog[analog.port].sArr.length);
                   }

                   // Reset the array.
                   ports.input.analog[analog.port].sArr = [];

                   // Get current value
                   // Using switch for possible future updates.
                   switch(analog.type)
                   {
                       case 'thermistor':
                           tReading = thermistor(val, config.brewnoduino.resistor);
                       break;

                       case 'tmp36':
                           tReading = tmp36(val, config.brewnoduino.voltage);
                       break;
                   }

                   ports.input.analog[analog.port].sArr.push((analog.display == 'temperature') ? tReading : val);

                   // Increment counter
                   ports.input.analog[analog.port].cnt++;
               }
               else
               {
                   // Get current value
                   // Using switch for possible future updates.
                   switch(analog.type)
                   {
                       case 'thermistor':
                           tReading = thermistor(val, config.brewnoduino.resistor);
                           break;

                       case 'tmp36':
                           tReading = tmp36(val, config.brewnoduino.voltage);
                           break;
                   }

                   ports.input.analog[analog.port].sArr.push((analog.display == 'temperature') ? tReading : val);

                   // Increment counter
                   ports.input.analog[analog.port].cnt++;
               }

            });
        }
        else
        {
            // OneWire stuff
        }
    }

    // Set PWM on Arduino and emit event
    function setPWM(port, value)
    {
        //console.log(port);
        //console.log(ports.output.pwm);
        var ts    = Date.now();
        var pwm   = ports.output.pwm[port];
        pwm.value = value;

        board.analogWrite(port, value);
        io.sockets.emit('updatePWM', {'ts': ts, 'port' : port, 'value' : value});
    }

    // Set Digital on Arduino and emit event
    function setDigital(port, value)
    {
        var ts        = Date.now();
        var digital   = ports.output.digital[port];
        digital.value = value;

        board.digitalWrite(port, value);
        io.sockets.emit('updateDigital', {'ts': ts, 'port' : port, 'value' : value});
    }

    function logIt()
    {
        var d  = new Date();
        var ts = d.getTime();
        // Logs all port values
        var entry = {};
        entry[ts] = ports;
        logFile.write('    ' + JSON.stringify(entry) + '\n');
    }

    // Schedule runner stuff
    aRep.on('error', function(err)
    {
        console.log('aRep ERROR:');
        console.log(err);
    });

    aRep.on('socket error', function(err)
    {
        console.log('aRep SOCKET ERROR:');
        console.log(err);
    });

    aRep.on('connect', function()
    {
        console.log('Parent aRep connected');
    });

    aReq.on('connect', function()
    {
        console.log('Parent aReq connected');
    });

    aRep.on('message', function (data, reply)
    {
        var port = '';

        switch(data.action)
        {
            case 'getAnalog':
                reply({'data': ports.input.analog[data.port].value});
                break;

            case 'getDigitalInput':
                port = data.port.replace(/^DI/, '');
                break;

            case 'getDigitalOutput':
                break;

            case 'setDigital':
                port = data.port.replace(/^DO/, '');
                break;

            case 'setPWM':
                // Strip P.
                port = data.port.replace(/^P/, '');
                setPWM(port, data.value);
                reply('ok');
                break;

            case 'done':
                io.sockets.emit('done');
            break;

            case 'logIt':
                logIt();
            break;
        }
    });

    // WebSocket connection handler
    io.sockets.on('connection', function (socket)
    {
        socket.emit('CONNECTED!');

         // Output current digital / PWM values
        for(i = 0; i < config.brewnoduino.outputs.digital.length ; i++)
        {
            var digital = config.brewnoduino.outputs.digital[i];
            setDigital(digital.port, ports.output.digital[digital.port].value);
        }

        for(i = 0; i < config.brewnoduino.outputs.pwm.length ; i++)
        {
            var pwm = config.brewnoduino.outputs.pwm[i];
            setPWM(pwm.port, ports.output.pwm[pwm.port].value);
        }

        // Run through configs yet another time to setup the analog emitters.
        for(i = 0; i < config.brewnoduino.inputs.analog.length; i++)
        {
            analog = config.brewnoduino.inputs.analog[i];

            setInterval(function()
            {
                var ts = Date.now();
                socket.emit(analog.port, {'ts' : ts, 'value' : ports.input.analog[analog.port].value});
            }, 1000);
        }

        socket.on('setDigital', function (data)
        {
            setDigital(data.port, data.value)
        });

        socket.on('setPWM', function (data)
        {
            setPWM(data.port, data.value);
        });

        socket.on('runSchedule', function (data)
        {
            // Send message to child process.
            logFile = fs.createWriteStream('./logs/' + (Math.round(new Date() / 1000)) + '.log');

            logFile.write('{\n');
            //sRunner.send({'action' : 'start', 'p' : config.brewnoduino.k.p, 'i' : config.brewnoduino.k.i, 'd' : config.brewnoduino.k.d, 'steps': data});
            aReq.send({'action' : 'start', 'p' : config.brewnoduino.k.p, 'i' : config.brewnoduino.k.i, 'd' : config.brewnoduino.k.d, 'steps': data}, function(res){});
        });

        socket.on('done', function()
        {
            // Brew schedule done.
            // Close log file.
            socket.emit('finished');
            logFile.write('}');
            logFile.end();
        });

        socket.on('disconnect', function ()
        {
            console.log('client disconnected: ' + socket.id);
        });
    });
});