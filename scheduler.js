// child.js
console.log('child starting work');
var async = require('async');
var axon  = require('axon');
var pCtrl = require('node-pid-controller');

var aReq  = axon.socket('req');
var d     = new Date();
var pid   = "";
var steps = [];

aReq.connect(3000);

process.on('message', function(data)
{
    switch(data.action)
    {
        case 'start':
            pid   = new pCtrl(data['p'], data['i'], data['d']);
            steps = [];

            steps.push(data['steps']);
            async.series(steps);
         break;
    }
});

test = [
    function(cb)
    {
        var target        = 148;    // Target value.
        var targetReached = false;  // Did we reach the target?
        var runTime       = 3600;   // How long to continue running after we hit target.
        var startTime     = 0;      // What time did we hit the target.
        var brewTimer     = setInterval(function()
        {
            aReq.send({'action' : 'getAnalog', 'port': 'A0'}, function(resp)
            {
                // We hit our target
                if(!targetReached && resp.value >= target)
                {
                    targetReached = true;
                    startTime     = d.getTime() / 1000;
                }

                if((d.getTime() / 1000) - startTime >= runTime)
                {
                    clearInterval(brewTimer);
                    cb(null);
                }

                aReq.send({'action' : 'setPWM', 'port': '9', 'value': pid.update(data.value)}, function(msg)
                {
                   // Nothing.
                });
            });
        }, 1000);
    },
    function(cb)
    {
        // Finsiehd
        aReq.send({'action' : 'done'})
    }
];