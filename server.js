//	Customization

var appPort = 4000;

// Librairies

var express = require('express'), app = express();
var http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

var _ = require('underscore');




//var jade = require('jade');
//var io = require('socket.io').listen(app);
var pseudoArray = []; //block the admin username (you can disable it)
var chatHistory = {};

// Views Options
/*
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set("view options", { layout: false });
*/
app.use(express.static(__dirname + '/public'));

// Render and send the main page
/*
app.get('/', function(req, res){
  res.render('home.jade');
});*/
server.listen(appPort);
// app.listen(appPort);
console.log("Server listening on port " + appPort);

// Handle the socket.io connections

//var users = 0; //count the users

io.sockets.on('connection', function (socket) { // First connection
	
	chatHistory['all'] = [];


	socket.on('messageAll', function (data) { // broadcast the message to all		

		var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data};
		socket.broadcast.emit('messageAll', transmit);
		if (_.size(chatHistory['all']) > 10) {
			chatHistory['all'].splice(0,1);
		} else {
			chatHistory['all'].push(transmit);
		}

		console.log(chatHistory['all'])
		

	});
	socket.on('message', function (data) { // p2p the message 
		
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data.msg, to: socket.room};
			//socket.broadcast.emit('message', transmit);
			io.to(data.to).emit('message', transmit);
			console.log("user "+ transmit['pseudo'] +" said \""+transmit['message']+"\"");
			console.log("user send the msg");
	});
	socket.on('addUser', function (data) { // set to the users log
			
			console.log('addUser')
			console.log(data)
			pseudoArray.push(data);
			console.log("user connected and add to the list");
			
			socket.nickname = data.first_name+' '+data.last_name
			socket.room = data.id	
			socket.join(data.id);
			reloadUsers();
		
	});
	socket.on('listChatUpdate', function (data) { // Broadcast the message to all
		console.log('listChat')
		socket.nickname = data.first_name+' '+data.last_name
		socket.room = data.id	
		socket.join(data.id);
		reloadUsers(); // Send the count to all the users
		
	});
	socket.on('leave', function (data) { // Disconnection of the client		
		
			console.log("leave...")

			// elimina al usuario del arreglo 
			_.each(pseudoArray, function(item){
				if (item.codigo === data.codigo) {
					pseudoArray = _.without(pseudoArray, item)
				};
    		});

    		socket.leave(data.id);

			// renderiza sin el usuario
    		reloadUsers();
	});
});

function reloadUsers() { // Send the count of the users to all
	io.sockets.emit('nbUsers', pseudoArray);
}

/*
//
delete chatHistory[room.name]
chatHistory[socket.room] = [];
if (_.size(chatHistory[socket.room]) > 10) {
					chatHistory[socket.room].splice(0,1);
				} else {
					chatHistory[socket.room].push(people[socket.id].name + ": " + msg);
				}*/