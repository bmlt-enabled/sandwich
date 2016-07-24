var http = require("http");
var request = require("request");
var servers = [
    "http://bmlt.ncregion-na.org",
    "http://crna.org"
];
var rsvp = require('rsvp');
var asciiCodeInt = 65;

http.createServer(function (req, res) {
    console.log('request received: ' + req.url);
    if (req.url.indexOf('main_server') < 0 || req.url.indexOf('favicon') > -1) {
        res.writeHead(404);
        res.end();
    }

    var serverQueries = servers.map(function(server) {
        return getData(server + req.url, (req.url.indexOf("json") > -1));
    });

    rsvp.all(serverQueries).then(function(data) {
        var combined = [];
        for (var i = 0; i < data.length; i++) {
            // TODO: this is a weird bug in the BMLT where it return text/html content-type headers
            if (data[i].headers['content-type'].indexOf("application/xml") < 0) {
                for (var j = 0; j < data[i].body.length; j++) {
                    data[i].body[j].id = String.fromCharCode(asciiCodeInt + i) + data[i].body[j].id;
                    data[i].body[j].parent_id = String.fromCharCode(asciiCodeInt + i) + data[i].body[j].parent_id;
                    combined.push(data[i].body[j]);
                }
            } else {
                combined.push(data[i].body);
            }
        }

        // Sort search results
        if (req.url.indexOf('GetSearchResults') > - 1) {
            combined = combined.sort(function(a, b) {
                return parseFloat(a['distance_in_miles'], 2) - parseFloat(b['distance_in_miles'], 2);
            });

            combined.splice(10, arr.length - 1);
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
        } else if (req.url.indexOf('serverInfo') > -1 || req.url.indexOf('xml') > -1 || req.url.indexOf('xsd') > -1) {
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
    console.log("getData(): " + url);
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