var next_value      = 0;
var gauge1          = "";
var gauge2          = "";

// Initial plot data is a bunch of 0's
var d1 = [];

for(var i = 0; i < 300; i++)
{
    d1.push(0);
}


function padLeft(nr, n, str)
{
    return Array(n-String(nr).length+1).join(str||'0')+nr;
}

function main()
{
    "use strict";

    // connect to the light bulb server
    var socket = io.connect('');
    
    socket.on('connect', function ()
    {
        console.log('CONNECTED!');
        gauge1 = new Gauge({
            renderTo    : 'gauge1',
            width       : 250,
            height      : 250,
            maxValue    : 220,
            glow        : true,
            units       : '°F',
            title       : 'Temp',
            valueFormat : { int : 3, dec : 1 },
            highlights  : [{ from: 172, to: 220, color: '#F00' }]
        });

        gauge2 = new Gauge({
            renderTo    : 'gauge2',
            width       : 250,
            height      : 250,
            maxValue    : 220,
            glow        : true,
            units       : '°F',
            title       : 'Temp',
            valueFormat : { int : 3, dec : 1 },
            highlights  : [{ from: 172, to: 220, color: '#F00' }]
        });

        gauge1.setValue(0);
        gauge2.setValue(0);
    });

    socket.on('io', function (args)
    {
        var divClass = (args.status == 1) ? 'on' :  'off';

        switch(args.port)
        {   
            case 10:
                $('#io10').removeClass();
                $('#io10').addClass(divClass);
            break;

            case 11:
                $('#io11').removeClass();
                $('#io11').addClass(divClass);
            break;

            case 12:
                $('#io12').removeClass();
                $('#io12').addClass(divClass);
            break;

            case 13:
                $('#io13').removeClass();
                $('#io13').addClass(divClass);
            break;
        }
    });

    socket.on('temp1', function (update)
    {
        gauge1.setValue(update.value);
    });
    
    $('#io10').bind('click' ,function ()
    {
        socket.emit(($(this).attr("class") == 'on') ? 'ioOff' : 'ioOn', {'port' : 10});
    });

    $('#io11').bind('click' ,function ()
    {
        socket.emit(($(this).attr("class") == 'on') ? 'ioOff' : 'ioOn', {'port' : 11});
    });

    $('#io12').bind('click' ,function ()
    {
        socket.emit(($(this).attr("class") == 'on') ? 'ioOff' : 'ioOn', {'port' : 12});
    });

    $('#io13').bind('click' ,function ()
    {
        socket.emit(($(this).attr("class") == 'on') ? 'ioOff' : 'ioOn', {'port' : 13});
    });
}

window.addEventListener('DOMContentLoaded', main);