
function startClient() {

  let socket = require('socket.io-client')('http://127.0.0.1:9009');
  socket.on('connect', function(){
    console.log("connected");
  });
  socket.on('say', function(data){
    console.log("say: " + JSON.stringify(data));
  });
  socket.on('playerBegin', function(data){
    console.log("playerBegin: " + JSON.stringify(data));
  });
  socket.on('playerDisconnected', function(data){
    console.log("playerDisconnect: " + JSON.stringify(data));
  });
  socket.on('gameStart', function(data){
    console.log("gameStart: " + JSON.stringify(data));
  });
  socket.on('disconnect', function(){
    console.log("disconnected");
  });
}

startClient();
