// child.js
console.log('child starting work');
var async          = require('async');
var axon           = require('axon');
var pCtrl          = require('node-pid-controller');

// Bidirectional Communication
var aReq           = axon.socket('req');
var aRep           = axon.socket('rep');
var aRepData       = [];

// Stop the warnings
var steps          = [];
var i              = 0;

// Bidirectional communication with call backs.
aReq.connect(8002);
aRep.bind(8003);

aRep.on('connect', function()
{
    console.log('Child aRep CONNECTED');
});

// Such hacks. Polluting the scope with this one.
global.getStepsData = function (i)
{
    return aRepData.steps[i];
};

global.aRep        = aRep;
global.aReq        = aReq;
global.pid         = "";
global.sData       = {};
global.pidVal      = 0;
global.tReached    = false;
global.target      = 0;
global.runTime     = 0;
global.startTime   = 0;

aReq.on('connect', function()
{
    console.log('Child aReq CONNECTED');

    aRep.on('message', function(data, ret)
    {
        aRepData = data;

        switch(data.action)
        {
            case 'start':
                global.pid = new pCtrl(data['p'], data['i'], data['d']);
                steps      = [];

                for(i = 0; i < data.steps.length; i++)
                {
                    var stepFunc = new Function('cb' , '\n\
                        global.sData     = global.getStepsData(' + i + ');\n\
                        global.target    = parseFloat(global.sData.target);\n\
                        global.runTime   = parseFloat(global.sData.hold);\n\
                        global.tReached  = false;\n\
                        global.startTime = 0;\n\
                        \n\
                        global.pid.setTarget(global.target);\n\
                        \n\
                        var brewTimer     = setInterval(function()\n\
                        {\n\
                            global.aReq.send({"action" : "getAnalog", "port" : global.sData.read }, function (resp)\n\
                            {\n\
                                var d        = new Date();\n\
                                var respData = parseFloat(resp.data);\n\
                                if(!global.tReached && parseFloat(respData) >= global.target)\n\
                                {\n\
                                    global.tReached  = true;\n\
                                    global.startTime = Math.ceil(d.getTime() / 1000);\n\
                                }\n\
                                \n\
                                if(global.tReached && (Math.ceil(d.getTime() / 1000)) - global.startTime >= global.runTime)\n\
                                {\n\
                                    clearInterval(brewTimer);\n\
                                    cb(null);\n\
                                }\n\
                                \n\
                                /** Calculate PID output **/\n\
                                var uVal = Math.floor(global.pid.update(respData));\n\
                                var pVal = (uVal >= 1.0) ? uVal : 0;\n\
                                \n\
                                if(pVal != global.pidVal)\n\
                                {\n\
                                    global.pidVal = pVal;\n\
                                    global.aReq.send({"action" : "setPWM", "port" : global.sData.set, "value": pVal}, function(msg)\n\
                                    {\n\
                                    \n\
                                    });\n\
                                }\n\
                            });\n\
                            global.aReq.send({"action" : "logIt"});\n\
                        }, 250);');

                    steps.push(stepFunc);
                }

                steps.push(function(cb)
                {
                    // Finished
                    global.aReq.send({'action' : 'done'});
                    cb(null);
                });

                async.series(steps);
             break;
        }

        ret(1);
    });
});