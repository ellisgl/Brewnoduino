var config = module.exports;

config.brewnoduino = {
    serialPort : '/dev/ttyACM0',
    'OneWire'  : {
        'pin' : '2'
    },
    'k'        : {
        'p' : 0.25,
        'i' : 0.01,
        'd' : 0.01
    },
    'resistor' : 9000, // Resistor value for thermistor devices, set to 0 if using TMP device.
    'voltage'  : 5, // Arduino operating voltage (3.3 or 5) - Used for certain analog devices.
    'outputs'  : {
        'pwm'     : [
            {
                'name' : 'Heater',
                'port' : '9',
                'min'  : 0,
                'max'  : 255            
            },
            {
                'name' : 'Pump',
                'port' : '10',
                'min'  : 0,
                'max'  : 255            
            }            
            
        ],
        'digital' : [
            {
                'name' : 'Aux 1',
                'port' : '11'
            },
            {
                'name' : 'Aux 2',
                'port' : '12'
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
            {
                'name'    : 'Brew Pot',
                'port'    : 'A0',
                'type'    : 'thermistor', // thermistor, tmp36
                'display' : 'temperature', // Only temperature as of now.
                'units'   : 'F' // F or C
            }
/**
            ,
            {
                'name'     : 'rims',
                'port'     : 'OneWire',
                'address'  : '0x00',
                'getValue' : ['0x00, 0x00, 0x00, 0x00, 0x00'],
                'display'  : 'temperature', // Only temperature as of now.
                'units'    : 'F' // F or C
            }
 **/
        ],
        'digital' : [
            {

            }
        ]
    }
};