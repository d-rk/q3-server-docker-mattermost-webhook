
const https = require('https');

const mattermostHost = process.env.MATTERMOST_HOST || '';
const mattermostPath = process.env.MATTERMOST_PATH || '';
console.log('mattermostHost: ' + mattermostHost);
console.log('mattermostPath: ' + mattermostPath);

function sendNotification(message) {

    console.log('sendNotification: ' + message);

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

function removeSplash(weaponsUsed) {

    Object.keys(weaponsUsed).forEach(weapon => {
        if (weapon.endsWith("_SPLASH")) {
            const mainWeapon = weapon.replace("_SPLASH", "");
            if (mainWeapon in weaponsUsed) {
                weaponsUsed[mainWeapon] += weaponsUsed[weapon];
            } else {
                weaponsUsed[mainWeapon] = weaponsUsed[weapon];
            }
            delete weaponsUsed[weapon];
        }
    });

    return weaponsUsed;
}

function getWeaponIcon(weaponName) {
    switch (weaponName) {
        case 'MOD_ROCKET':
            return ':q3-rocket-launcher:';
        case 'MOD_PLASMA':
            return ':q3-plasma-gun:';
        case 'MOD_SHOTGUN':
            return ':q3-shotgun:';
        case 'MOD_MACHINEGUN':
            return ':q3-machine-gun:';
        case 'MOD_RAILGUN':
            return ':q3-railgun:';
        case 'MOD_BFG':
            return ':q3-bfg:';
        case 'MOD_GRENADE':
            return ':q3-grenade-launcher:';
        case 'MOD_LIGHTNING':
            return ':q3-lightning-gun:';
        case 'MOD_GAUNTLET':
            return ':feelsgood:';
        default:
            return weaponName;
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

        let table = "| Player  | Frags  | Most Killed | Most Killed By | Favorite Weapons | Killed By World | Suicides |\n"
            + "| :------ | :----- | :----- | :----- | :----- | :----- | :----- |\n";

        playerIdSortedByScore.forEach(function(id) {
            if (id !== "1022") {
                const player = payload.data.players[id];
                let name = sanitizePlayerName(player.n);
                let score = player.score;
                let mostKilled = extractMaxPlayerAndCount(player, payload.data.players, "killed");
                let mostKilledBy = extractMaxPlayerAndCount(player, payload.data.players, "killedBy");
                let favoriteWeaponString = "";
                let killedByWorld = 0;
                let suicides = 0;

                if ("1022" in player.killedBy) {
                    killedByWorld = player.killedBy["1022"];
                }

                if (id in player.killedBy) {
                    suicides = player.killedBy[id];
                }

                player.weaponsUsed = removeSplash(player.weaponsUsed);

                const favoriteWeapons = Object.keys(player.weaponsUsed).sort(function (a, b) {
                    return player.weaponsUsed[b] - player.weaponsUsed[a]
                });

                for (let i = 0; i < favoriteWeapons.length; i++) {
                    if (i < 3) {
                        favoriteWeaponString += (" " + getWeaponIcon(favoriteWeapons[i]) + " " + player.weaponsUsed[favoriteWeapons[i]]);
                        favoriteWeaponString = favoriteWeaponString.trimStart();
                    }
                }

                table += "| " + name + " | " + score + " | " + mostKilled + " | " + mostKilledBy + " | " + favoriteWeaponString + " | " + killedByWorld + " | " + suicides  + " |\n";
            }
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
