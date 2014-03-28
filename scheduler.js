// child.js
console.log('child starting work');
var async          = require('async');
var axon           = require('axon');
var pidCtrl        = require('x1022-pid-controller-js');
var pid            = {};

// Bidirectional Communication
var aReq           = axon.socket('req', null);
var aRep           = axon.socket('rep', null);
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


aReq.on('connect', function()
{
    console.log('Child aReq CONNECTED');

    aRep.on('message', function(data, ret)
    {
        aRepData = data;

        switch(data.action)
        {
            case 'start':
                steps      = [];

                pid = new pidCtrl({
                    KP : data['p'],
                    KI : data['i'],
                    KD : data['d']
                });

                pid.on('started', (function(aReq)
                {
                    return function()
                    {
                        console.log('START START START');

                        aReq.send({'action' : 'message', 'message' : 'STEP STARTED'}, function(msg)
                        {
                        });

                    }
                })(aReq));

                pid.on('targetReached', (function(aReq)
                {
                    return function()
                    {
                        console.log('REACHED REACHED REACHED');
                        aReq.send({'action' : 'message', 'message' : 'TARGET HIT'}, function(msg)
                        {
                        });
                    }
                })(aReq));

                for(i = 0; i < data.steps.length; i++)
                {
                    var  stepFunc = (function(data, sData, pid, aReq)
                    {
                        return function(cb)
                        {
                            pid.on('stopped',(function(cb, aReq)
                            {
                                return function()
                                {
                                    console.log('STOP STOP STOP');
                                    aReq.send({'action' : 'message', 'message' : 'STEP DONE'}, function(msg)
                                    {

                                    });

                                    cb();
                                }
                            })(cb, aReq));

                            pid.setTarget(sData.target);
                            pid.setDuration(sData.hold);

                            pid.setInput((function(read)
                            {
                                return function()
                                {
                                    var action = (read.match(/^A/)) ? 'getAnalog'
                                        : (read.match(/^DI/))
                                        ? 'getDigitalInput'
                                        : 'getOneWire';
                                    aReq.send({"action" : action, "port" : read }, function (resp)
                                    {
                                        pid.setIVal(parseFloat(resp.data));
                                    });
                                }
                            })(sData.read));

                            pid.setOutput((function(sData)
                            {
                                return function (val)
                                {
                                    aReq.send({'action' : 'setPWM', 'port' : sData.set, 'value' : val}, function (msg)
                                    {
                                    });
                                }
                            }(sData)));

                            pid.start();
                        }
                    })(data, aRepData.steps[i], pid, aReq);

                    steps.push(stepFunc);
                }

                steps.push((function()
                {
                    return function(cb)
                    {
                        // Finished
                        aReq.send({'action' : 'done'});
                        cb(null);
                    };
                })(aReq));

                async.series(steps);
             break;
        }

        ret(1);
    });
});