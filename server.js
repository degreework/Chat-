
// puerto del servidor
var appPort = 4000;

// Librerias necesarias
var express = require('express'), app = express();
var http = require('http')
  , server = http.createServer(app)
  ,	mongoose = require('mongoose')
  , io = require('socket.io').listen(server);

var _ = require('underscore');


// variables en el servidor 
var pseudoArray = []; 


//app.use(express.static(__dirname + '/public'));

//mongoose
var Schema = mongoose.Schema;

// declaro los esquemas 
var MessageSchema = new Schema({
  room_id: { type: String, index: true },
  nameSender:  String,
  message: String,
  date: Date,
  from: Number,
  thumb: String
});

var MessageAllSchema = new Schema({
  nameSender:  String,
  message: String,
  date: Date,
  from: Number,
  thumb: String
});

var RoomSchema = new Schema({
  room_id : { type: String, index: {unique: true} }
});

// asigno los esquemas a la bd
mongoose.model('Message', MessageSchema);
mongoose.model('MessageAll', MessageSchema);
mongoose.model('Room', RoomSchema);

// conecto a la bd mongo
mongoose.connect('mongodb://localhost/chat');

// traigo los modelos 
var Message = mongoose.model('Message');
var MessageAll = mongoose.model('MessageAll');
var Room = mongoose.model('Room');

// escucha del servidor 
server.listen(appPort);
console.log("Server listening on port " + appPort);


// maneja las conecciones que se hacen a traves de socket.io 
io.sockets.on('connection', function (socket) { // First connection
	
	// cuando mandan un mensaje al chat global, lo envia a todos
	socket.on('messageAll', function (data) { 


		// datos a enviar 
		fecha = new Date().toISOString()
		var transmit = {date : fecha, pseudo : socket.nickname, message : data, thumb: socket.thumb};
		
		// se crea y guarda el mensaje en la bd de mongo
		var mensaje = new MessageAll();
		mensaje.nameSender = socket.nickname
		mensaje.message = data
		mensaje.date =	fecha
		mensaje.from = socket.room
		mensaje.thumb = socket.thumb

		mensaje.save(function(err) {
		  if (err) throw err;

		  console.log('Message created!');
		});

		// se envia a todos los usuarios
		socket.broadcast.emit('messageAll', transmit);

	});
	// cuando mandan un mensajes individual (p2p), lo envia al usuario con el que chatea 
	socket.on('message', function (data) { 
		
			//console.log(data)
			// se acomoda el identificador del room 
			var id_room = data.ids.split(',').sort().toString()
			
			// se verifica si la room existe o no en la bd de mongo, si no, crea la room 
			Room.find({ room_id: id_room }, function(err, room) {
			  if (err) throw err;

			  // object of the user
			  console.log(room);

			  if (room.length === 0) {
				var hall = new Room();
				hall.room_id = id_room
				hall.save(function(err) {
				  if (err) throw err;

				  console.log('Room created!');
				});
			};

			});

			//console.log(socket.room)
			fecha = new Date().toISOString()
			// datos a enviar 
			var transmit = {date : fecha, pseudo : socket.nickname, message : data.msg, from: socket.room, thumb: socket.thumb, to: data.to};
			
			// se crea y guarda el mensaje en la bd de mongo
			var mensaje = new Message();
			mensaje.room_id = id_room
			mensaje.nameSender = socket.nickname
			mensaje.message = data.msg
			mensaje.date =	fecha
			mensaje.from = socket.room
			mensaje.thumb = socket.thumb

			mensaje.save(function(err) {
			  if (err) throw err;

			  console.log('Message created!');
			});

			//se envia al usuario con el que se chatea 
			console.log(data.to)
			io.to(data.to).emit('message', transmit);
			
			//console.log("user "+ transmit['pseudo'] +" said \""+transmit['message']+"\"");
			console.log("user send the msg");
	});
	
	// Cuando un usuario se loguea en la app lo agrega al chat 
	socket.on('addUser', function (data) { 
			
			//console.log('addUser')
			//console.log(data)
			pseudoArray.push(data);
			console.log("user connected and add to the list");
			
			socket.nickname = data.first_name+' '+data.last_name
			socket.room = data.id
			socket.thumb = data.thumb
			socket.join(data.id);
			reloadUsers();
			send_History_Chat_All(socket.room)

		
	});
	
	// Mantiene la lista de usuarios actualizada 
	socket.on('listChatUpdate', function (data) { 
		console.log('listChat')
		socket.nickname = data.first_name+' '+data.last_name
		socket.room = data.id	
		socket.thumb = data.thumb
		socket.join(data.id);
		reloadUsers(); // Send the count to all the users
		send_History_Chat_All(socket.room)
		
	});
	
	// pide el hisorial de una o varias conversacion en especifico 
	socket.on('chat_history', function (data) { 
		
		var id_room = data.room.split(',').sort().toString()
		Message.find({room_id:id_room}, function(err, messages) {
		  if (err) throw err;

		  // object of all the users
		  console.log('historial de la conversacion')
		  console.log(messages)
		  
		  io.to(data.from).emit('chat_history', messages, data.from, data.to);

		});


	});
	
	// Cuando un usuario se sale de la aplicacion lo saca del chat 
	socket.on('leave', function (data) { 
		
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

//funcion que envia el array con los usuarios actuales al front 
function reloadUsers() { 
	io.sockets.emit('nbUsers', pseudoArray);
}

// funcion que consulta el historial del chat global y envia los mensajes al front 
function send_History_Chat_All(my_id){

	MessageAll.find({}, function(err, messages) {
	  if (err) throw err;

	  // object of all the users
	  //console.log('historial chat global')
	  //console.log(messages)
	  //io.sockets.emit('send_History_Chat_All', messages);
	  io.to(my_id).emit('send_History_Chat_All', messages);

	});
}

