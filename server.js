var http = require("http");
var request = require("request");
var servers = [
    "http://bmlt.ncregion-na.org",
    "http://crna.org"
];
var rsvp = require('rsvp');

http.createServer(function (req, res) {
    console.log('request received: ' + req.url);
    if (req.url.indexOf('main_server') < 0 || req.url.indexOf('favicon') > -1) {
        res.writeHead(404)
        res.end();
    }

    var serverQueries = servers.map(function(server) {
        return getData(server + req.url, (req.url.indexOf("json") > -1));
    });

    rsvp.all(serverQueries).then(function(data) {
        var combined = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].headers['content-type'] === "application/json") {
                for (var j = 0; j < data[i].body.length; j++) {
                    combined.push(data[i].body[j]);
                }
            } else {
                combined.push(data[i].body);
            }
        }

        if (req.url.indexOf('switcher=GetServerInfo') > -1) {
            var lowestVersion = -1;
            var lowestVersionIndex = 0;

            var combinedLength = combined.length;
            for (var v = 0; v < combinedLength; v++) {
                if (lowestVersion == -1 || lowestVersion > combined[v].versionInt) {
                    lowestVersion = combined[v].versionInt;
                    lowestVersionIndex = v;
                }
            }

            combined = combined[lowestVersionIndex];
        } else if (req.url.indexOf('serverInfo') > -1) {
            combined = combined[0];
        }

        if (req.url.indexOf('json') > -1) {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(combined));
        } else {
            res.writeHead(200, {'Content-Type': 'application/xml'});
            res.end(combined);
        }
    }, function(error) {
        res.writeHead(500);
        res.end();
        console.error(error);
    });
}).listen(8888);

function getData(url, isJson) {
    var promise = new rsvp.Promise(function(resolve, reject) {
        request({
            url: url,
            json: isJson
        }, function(error, response, body) {
            if (error) {
                reject(response);
            } else {
                resolve(response);
            }
        });
    });

    return promise;
}