jQuery(function(){

	// This demo depends on the canvas element
	if(!('getContext' in document.createElement('canvas'))){
		alert('Sorry, it looks like your browser does not support canvas!');
		return false;
	}

	// The URL of your web server (the port is set in app.js)
	var url = 'http://localhost:3000';

	var doc = jQuery(document),
		canvas = jQuery('#paper'),
		ctx = canvas[0].getContext('2d'),
		instructions = jQuery('#instructions');

    // ctx setup
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;

	// Generate an unique ID
	var id = Math.round(jQuery.now()*Math.random());

    //Generate a random color
    var r = Math.floor(Math.random() * 255) + 70;
    var g = Math.floor(Math.random() * 255) + 70;
    var b = Math.floor(Math.random() * 255) + 70;
    var color = 'rgb(' + r + ',' + g + ',' + b + ')';

	// A flag for drawing activity
	var drawing = false;

	var clients = {};
	var cursors = {};

	var socket = io.connect(url);
	
	socket.on('moving', function (data) {
		
		if(! (data.id in clients)){
			// a new user has come online. create a cursor for them
			cursors[data.id] = jQuery('<div class="cursor">').appendTo('#cursors');
		}
		
		// Move the mouse pointer
		cursors[data.id].css({
			'left' : data.x,
			'top' : data.y
		});
		
		// Is the user drawing?
		if(data.drawing && clients[data.id]){
			
			// Draw a line on the canvas. clients[data.id] holds
			// the previous position of this user's mouse pointer

            ctx.strokeStyle = data.color;
			drawLine(clients[data.id].x, clients[data.id].y, data.x, data.y);
		}
		
		// Saving the current client state
		clients[data.id] = data;
		clients[data.id].updated = jQuery.now();
	});

	var prev = {};
	
	canvas.on('mousedown',function(e){
		e.preventDefault();
		drawing = true;
		prev.x = e.pageX;
		prev.y = e.pageY;
		
		// Hide the instructions
		instructions.fadeOut();
	});
	
	doc.bind('mouseup mouseleave',function(){
		drawing = false;
	});

	var lastEmit = jQuery.now();

	doc.on('mousemove',function(e){
		if(jQuery.now() - lastEmit > 30){
			socket.emit('mousemove',{
				'x': e.pageX,
				'y': e.pageY,
				'drawing': drawing,
                'color': color,
				'id': id
			});
			lastEmit = jQuery.now();
		}
		
		// Draw a line for the current user's movement, as it is
		// not received in the socket.on('moving') event above
		
		if(drawing){

            ctx.strokeStyle = color;
			drawLine(prev.x, prev.y, e.pageX, e.pageY);

			prev.x = e.pageX;
			prev.y = e.pageY;
		}
	});

	// Remove inactive clients after 10 seconds of inactivity
    setInterval(function(){
        var totalOnline = 0;
        for(var ident in clients){
            if(jQuery.now() - clients[ident].updated > 10000){

                // Last update was more than 10 seconds ago.
                // This user has probably closed the page

                cursors[ident].remove();
                delete clients[ident];
                delete cursors[ident];
            }
            else totalOnline++;
        }
        jQuery('#onlineCounter').html('Players Connected: '+totalOnline);
    },10000);

	function drawLine(fromx, fromy, tox, toy){
        ctx.beginPath();
		ctx.moveTo(fromx, fromy);
		ctx.lineTo(tox, toy);
		ctx.stroke();
	}

});