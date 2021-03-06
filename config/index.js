var config = module.exports;

config.brewnoduino = {
    serialPort : '/dev/ttyACM0',
    'k'        : {
        'p' : 25.00,
        'i' : 0.25,
        'd' : 0.25
    },
    'resistor' : '11000', // Resistor value for thermistor devices, set to 0 if using TMP device.
    'voltage'  : 5, // Arduino operating voltage (3.3 or 5) - Used for certain analog devices.
    'outputs'  : {
        'pwm'     : [
            {
                'name' : 'Heater',
                'port' : '3',
                'min'  : 0,
                'max'  : 255
            },
            {
                'name' : 'Pump',
                'port' : '5',
                'min'  : 0,
                'max'  : 255            
            }
        ],
        'digital' : [
            {
                'name' : 'Aux 1',
                'port' : '6'
            },
            {
                'name' : 'Aux 2',
                'port' : '11'
            },        
            {
                'name' : 'LED',
                'port' : '13'
            }
        ]
    },
    'inputs'  : {
        'analog' : [
            // Need to add OneWire support here. even though digital?
            /**
            {
                'name'    : 'Brew Pot',
                'port'    : 'A0',
                'type'    : 'thermistor', // thermistor, tmp36
                'display' : 'temperature', // Only temperature as of now.
                'units'   : 'F' // F or C
            }
            ,
            // **/
        ],
        'digital' : [
            {

            }
        ]
    },
    'OneWire' : {
        port    : 2,
        devices : [
            {
                'name'     : 'Brew Pot',
                'address'  : [40, 210, 130, 220, 4, 0, 0, 113],
                'type'     : 'DS18B20', // DS18B20, ???
                'display'  : 'temperature', // Only temperature as of now.
                'units'    : 'F' // F or C
            }
        ]
    }
};
