function startClient() {

    let socket = require('socket.io-client')('http://127.0.0.1:9009');
    socket.on('connect', function () {
        console.log("connected");
    });
    socket.on('say', function (data) {
        console.log("say: " + JSON.stringify(data));
    });
    socket.on('playerBegin', function (data) {
        console.log("playerBegin: " + JSON.stringify(data));
    });
    socket.on('playerInfoChanged', function (data) {
        console.log("playerInfoChanged: " + JSON.stringify(data));
    });
    socket.on('playerConnect', function (data) {
        console.log("playerConnect: " + JSON.stringify(data));
    });
    socket.on('playerDisconnect', function (data) {
        console.log("playerDisconnect: " + JSON.stringify(data));
    });
    socket.on('gameStart', function (data) {
        console.log("gameStart: " + JSON.stringify(data));
    });
    socket.on('gameEnd', function (data) {
        console.log("gameEnd: " + JSON.stringify(data));
    });
    socket.on('item', function (data) {
        console.log("item: " + JSON.stringify(data));
    });
    socket.on('kill', function (data) {
        console.log("kill: " + JSON.stringify(data));
    });
    socket.on('disconnect', function () {
        console.log("disconnected");
    });
}

startClient();
