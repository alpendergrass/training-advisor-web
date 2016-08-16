'use strict';
var _ = require('lodash');

// Create the trainingDayMessage socket configuration
module.exports = function (io, socket) {
  // Emit the status event when a new socket client is connected
  // This happens when user first hits a page that sets up a connection.
  // io.emit('trainingDayMessage', {
  //   type: 'status',
  //   text: 'Is now connected',
  //   title: 'User Connected',
  //   created: Date.now(),
  //   username: socket.request.user.username
  // });

  //Let's remove any old socket IDs for this user if they exist.
  console.log('Clearing out saved socket IDs prior to saving new connection.');
  _.remove(global.userSocketIDs, function(sock) {
    console.log('Saved socketID for ' + sock.username + '  with socket ID: ' + sock.socketID);
    return sock.username === socket.request.user.username;
  });

  //save socket ID by username.
  //TODO: user could be connected on multiple brwosers/devices. 
  //We need to better way to connect users and sockets.
  var sock = { username: socket.request.user.username, socketID: socket.id } ;
  global.userSocketIDs.push(sock);

  console.log(socket.request.user.username + ' is now connected to trainingDayMessage with socket ID: ' + socket.id);

  // Emit the status event when a socket client is disconnected
  socket.on('disconnect', function () {
    //remove saved socket ID by username.
    _.remove(global.userSocketIDs, function(sock) {
      return sock.username === socket.request.user.username;
    });

    console.log(socket.request.user.username + ' is now disconnected from trainingDayMessage socket ID ' + socket.id);
  });
};
