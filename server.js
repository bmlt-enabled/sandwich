var http = require("http");
var request = require("request");
var servers = [
    "http://bmlt.ncregion-na.org",
    "http://crna.org"
];
var rsvp = require('rsvp');

http.createServer(function (req, res) {
    console.log("request received: " + req.url);
    if (req.url.indexOf("main_server") < 0 && req.url.indexOf("favicon") > -1) {
        res.end("404");
    }

    var serverQueries = servers.map(function(server) {
        return getJSON(server + req.url);
    });

    rsvp.all(serverQueries).then(function(data) {
        var combined = [];
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].body.length; j++) {
                combined.push(data[i].body[j]);
            }
        }

        if (req.url.indexOf("switcher=GetServerInfo")) {
            var lowestVersion = -1;
            var lowestVersionIndex = 0;

            var combinedLength = combined.length;
            for (var v = 0; v < combinedLength; v++) {
                if (lowestVersion == -1 || lowestVersion > combined[v].versionInt) {
                    lowestVersion = combined[v].versionInt;
                    lowestVersionIndex = v;
                }
            }

            combined = [ combined[lowestVersionIndex] ];
        }

        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(combined));

    }, function(error) {
        res.writeHead(500);
        res.end();
        console.error(error);
    });
}).listen(8888);

function getJSON(url) {
    var promise = new rsvp.Promise(function(resolve, reject) {
        request({
            url: url,
            json: true
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