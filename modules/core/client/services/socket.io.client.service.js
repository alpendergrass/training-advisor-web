// 'use strict';

// // Create the Socket.io wrapper service
// angular.module('core').service('Socket', ['Authentication', '$state', '$timeout',
//   function (Authentication, $state, $timeout) {
//     // Connect to Socket.io server
//     this.connect = function () {
//       // Connect only when authenticated
//       if (Authentication.user) {
//         //I need to use port 4443 for websocket because it does not work over port 80 in Cloud Foundry.
//         this.socket = io();
//         //this.socket = io(location.protocol + '//' + location.hostname + ':4443');
//         // this.socket = io(location.protocol + '//' + location.hostname + ':4443', { secure: true });
//       }
//     };
//     this.connect();

//     // Wrap the Socket.io 'on' method
//     this.on = function (eventName, callback) {
//       if (this.socket) {
//         this.socket.on(eventName, function (data) {
//           $timeout(function () {
//             callback(data);
//           });
//         });
//       }
//     };

//     // Wrap the Socket.io 'emit' method
//     this.emit = function (eventName, data) {
//       if (this.socket) {
//         this.socket.emit(eventName, data);
//       }
//     };

//     // Wrap the Socket.io 'removeListener' method
//     this.removeListener = function (eventName) {
//       if (this.socket) {
//         this.socket.removeListener(eventName);
//       }
//     };

//     this.init = function() {
//       this.socket.removeAllListeners();
//     };
//   }
// ]);
