
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
    if (name === undefined) {
        return "<unknown>";
    } else {
        return name.replace(/\^\d+/g, "")
    }
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

function getIcon(element) {
    switch (element) {
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
        case 'MOD_TELEFRAG':
            return ':fireworks:';
        case 'item_health_small':
            return ':q3-health-small:';
        case 'item_health_large':
            return ':q3-health-large:';
        case 'item_health_mega':
            return ':q3-health-mega:';
        case 'item_armor_shard':
            return ':q3-armor-shard:';
        case 'item_armor_combat':
            return ':q3-armor-combat:';
        case 'item_armor_body':
            return ':q3-armor-body:';
        case 'item_quad':
            return ':q3-quad:';
        case 'item_enviro':
            return ':q3-enviro:';
        case 'item_haste':
            return ':q3-haste:';
        case 'item_invis':
            return ':q3-invis:';
        case 'item_regen':
            return ':q3-regen:';
        default:
            return element;
    }
}

function getIconString(items, limit) {

    if (!items) {
        return null;
    }

    const sortedItems = Object.keys(items).sort(function (a, b) {
        return items[b] - items[a]
    });

    let iconString = '';

    for (let i = 0; i < sortedItems.length; i++) {
        if (limit === -1 || i < limit) {
            iconString += (" " + getIcon(sortedItems[i]) + " " + items[sortedItems[i]]);
            iconString = iconString.trimStart();
        }
    }

    return iconString;
}

function lastKillBadge(weaponName) {

    if (!weaponName) {
        return '';
    }

    switch (weaponName) {
        case 'MOD_ROCKET':
            return ' :poop:';
        case 'MOD_BFG':
            return ' :clown_face:';
        case 'MOD_GAUNTLET':
            return ' :trophy:';
        case 'MOD_TELEFRAG':
            return ' :scream:';
        default:
            return '';
    }
}

function startClient() {

    const host = process.env.REST_API_HOST || '127.0.0.1';
    const port = process.env.REST_API_PORT || '9009';
    const url = 'http://' + host + ':' + port;

    let currentMap = undefined;
    let currentPlayers = [];
    let collectedItems = {};
    let lastKilledWith = {};

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
            collectedItems[payload.data.id] = {}
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

        let table = "| Player  | Frags  | Most Killed | Most Killed By | Favorite Weapons | Items | Killed By World | Suicides |\n"
            + "| :------ | :----- | :----- | :----- | :----- | :----- | :----- | :----- |\n";

        let atLeastOnePlayer = false;
        let isFirstPlayer = true;

        playerIdSortedByScore.forEach(function(id) {
            if (id !== "1022") {
                atLeastOnePlayer = true;
                const player = payload.data.players[id];
                let name = sanitizePlayerName(player.n);
                let score = player.score;
                let mostKilled = extractMaxPlayerAndCount(player, payload.data.players, "killed");
                let mostKilledBy = extractMaxPlayerAndCount(player, payload.data.players, "killedBy");
                let favoriteWeaponString = getIconString(removeSplash(player.weaponsUsed), 3);
                let favoriteItemString = getIconString(collectedItems[id], -1);
                let killedByWorld = 0;
                let suicides = 0;
                let crown = isFirstPlayer ? lastKillBadge(lastKilledWith[id]) : '';

                if ("1022" in player.killedBy) {
                    killedByWorld = player.killedBy["1022"];
                }

                if (id in player.killedBy) {
                    suicides = player.killedBy[id];
                }

                table += "| " + name + crown + " | " + score + " | " + mostKilled + " | " + mostKilledBy + " | " + favoriteWeaponString + " | " + favoriteItemString + " | " + killedByWorld + " | " + suicides  + " |\n";
                isFirstPlayer = false;
            }
        });

        if (atLeastOnePlayer) {
            sendNotification(table);
        }
    });
    socket.on('gameShutdown', function (payload) {
        console.log("gameShutdown: " + JSON.stringify(payload));
    });
    socket.on('item', function (payload) {
        console.log("item: " + JSON.stringify(payload));
        if (collectedItems[payload.data.player.id] !== undefined) {
            let items = collectedItems[payload.data.player.id];

            const relevantItems = ["item_health_small", "item_health_large", "item_health_mega", "item_armor_shard",
                "item_armor_combat", "item_armor_body", "item_quad", "item_enviro", "item_haste", "item_invis", "item_regen"];

            if (relevantItems.includes(payload.data.item)) {
                if (payload.data.item in items) {
                    items[payload.data.item]++;
                } else {
                    items[payload.data.item] = 1;
                }
            }
        }
    });
    socket.on('kill', function (payload) {
        console.log("kill: " + JSON.stringify(payload));
        lastKilledWith[payload.data.killer.id] = payload.data.weapon.n;
    });
    socket.on('disconnect', function () {
        console.log("disconnected");
    });
}

startClient();
