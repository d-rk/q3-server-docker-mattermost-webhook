
const https = require('https');

const mattermostHost = process.env.MATTERMOST_HOST || '';
const mattermostPath = process.env.MATTERMOST_PATH || '';
console.log('mattermostHost: ' + mattermostHost);
console.log('mattermostPath: ' + mattermostPath);

function sendNotification(message) {

    const data = JSON.stringify({
        text: message
    });

    const options = {
        hostname: mattermostHost,
        port: 443,
        path: mattermostPath,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`);
    });

    req.on('error', error => {
        console.error(error)
    });

    req.write(data);
    req.end();
}

function sanitizePlayerName(name) {
    return name.replace(/\^\d+/g, "")
}

function extractMaxPlayerAndCount(player, players, property) {
    const maxPlayerIdSortedByCount = Object.keys(player[property]).sort(function (a, b) {
        return player[property][b] - player[property][a]
    });

    if (maxPlayerIdSortedByCount.length > 0) {
        const maxPlayer = players[maxPlayerIdSortedByCount[0]];
        const maxCount = player[property][maxPlayerIdSortedByCount[0]];
        return sanitizePlayerName(maxPlayer.n) + "(" + maxCount + ")";
    } else {
        return "-";
    }
}

function startClient() {

    const host = process.env.REST_API_HOST || '127.0.0.1';
    const port = process.env.REST_API_PORT || '9009';
    const url = 'http://' + host + ':' + port;

    let currentMap = undefined;
    let currentPlayers = [];

    console.log('url: ' + url);

    let socket = require('socket.io-client')(url);
    socket.on('connect', function () {
        console.log("connected");
    });
    socket.on('say', function (payload) {
        console.log("say: " + JSON.stringify(payload));
    });
    socket.on('playerBegin', function (payload) {
        console.log("playerBegin: " + JSON.stringify(payload));
        let name = sanitizePlayerName(payload.data.n);
        if (currentPlayers.indexOf(name) === -1) {
            sendNotification("player joined: **" + name + "**");
            currentPlayers.push(name);
        }
    });
    socket.on('playerInfoChanged', function (payload) {
        console.log("playerInfoChanged: " + JSON.stringify(payload));
    });
    socket.on('playerConnect', function (payload) {
        console.log("playerConnect: " + JSON.stringify(payload));
    });
    socket.on('playerDisconnect', function (payload) {
        console.log("playerDisconnect: " + JSON.stringify(payload));
    });
    socket.on('gameStart', function (payload) {
        console.log("gameStart: " + JSON.stringify(payload));
        if (currentMap !== payload.data.properties.mapname) {
            sendNotification("new game started: **" + payload.data.properties.mapname + "**");
            currentMap = payload.data.properties.mapname;
            currentPlayers = [];
        }
    });
    socket.on('gameEnd', function (payload) {
        console.log("gameEnd: " + JSON.stringify(payload));
        
        if (Object.keys(payload.data.players).length === 0) { return; }

        const playerIdSortedByScore = Object.keys(payload.data.players).sort(function (a, b) {
            return payload.data.players[b].score - payload.data.players[a].score
        });

        let table = "| Player  | Frags  | Most Killed | Most Killed By | Favorite Weapon | Killed By World |\n"
            + "| :------ | :----- | :----- | :----- | :----- | :----- |\n";

        playerIdSortedByScore.forEach(function(id) {
            const player = payload.data.players[id];
            let name = sanitizePlayerName(player.n);
            let score = player.score;
            let mostKilled = extractMaxPlayerAndCount(player, payload.data.players, "killed");
            let mostKilledBy = extractMaxPlayerAndCount(player, payload.data.players, "killedBy");
            let favoriteWeapon = "-";
            let killedByWorld = 0;

            if ("1022" in player.killedBy) {
                killedByWorld = player.killedBy["1022"];
            }

            const favoriteWeapons = Object.keys(player.weaponsUsed).sort(function (a, b) {
                return player.weaponsUsed[b] - player.weaponsUsed[a]
            });

            if (favoriteWeapons.length > 0) {
                favoriteWeapon = favoriteWeapons[0] + "(" + player.weaponsUsed[favoriteWeapons[0]] + ")";
            }

            table += "| " + name + " | " + score + " | " + mostKilled + " | " + mostKilledBy + " | " + favoriteWeapon + " | " + killedByWorld  + " |\n";
        });

        sendNotification(table);
    });
    socket.on('gameShutdown', function (payload) {
        console.log("gameShutdown: " + JSON.stringify(payload));
    });
    socket.on('item', function (payload) {
        console.log("item: " + JSON.stringify(payload));
    });
    socket.on('kill', function (payload) {
        console.log("kill: " + JSON.stringify(payload));
    });
    socket.on('disconnect', function () {
        console.log("disconnected");
    });
}

startClient();
