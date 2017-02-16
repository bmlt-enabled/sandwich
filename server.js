var http = require("http");
var request = require("request");
var servers;
var rsvp = require('rsvp');
var asciiCodeInt = 65;
var distanceBufferMiles = 1;
var resultSize = 10;
var sortMetric = 'distance_in_miles';
var vdir = "bmltfed"

http.createServer(function (req, res) {
    console.log('request received: ' + req.url);
    if (req.url.indexOf(vdir) < 0 || req.url.indexOf('favicon') > -1) {
        res.writeHead(404);
        res.end("404");
        return
    }

    var settingToken = (req.url.substring(1, req.url.indexOf('/' + vdir + '/')));
    req.url = req.url.replace("/" + settingToken + "/" + vdir, "");
    if (settingToken == "dfb32b5bf254b39b56f24a435e22670e") {
        servers = [
            "http://bmlt.ncregion-na.org/main_server",
            "http://crna.org/main_sever"
        ];
    } else if (settingToken == "e4d84d69084b9bd67c7c0c2805a00cc9") {
        servers = [
            "http://bmlt.ncregion-na.org/main_server",
            "http://crna.org/main_server",
            "http://www.alnwfl.org/main_server",
            "http://naflorida.org/bmlt_server"
        ];
    } else {
        res.writeHead(404);
        res.end("404");
        return;
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
                    if (req.url.indexOf('GetSearchResults') > - 1) {
                        data[i].body[j].service_body_bigint = String.fromCharCode(asciiCodeInt + i) + data[i].body[j].service_body_bigint;
                    } else {
                        data[i].body[j].id = String.fromCharCode(asciiCodeInt + i) + data[i].body[j].id;
                        data[i].body[j].parent_id = String.fromCharCode(asciiCodeInt + i) + data[i].body[j].parent_id;
                    }

                    combined.push(data[i].body[j]);
                }
            } else {
                combined.push(data[i].body);
            }
        }

        // Sort search results
        if (req.url.indexOf('GetSearchResults') > - 1) {
            combined = combined.sort(function(a, b) {
                return parseFloat(a[sortMetric]) - parseFloat(b[sortMetric]);
            });

            var checker = combined.slice(resultSize, combined.length - 1);
            combined.splice(resultSize, combined.length - 1);

            for (var c = 0; c < checker.length; c++) {
                if (checker[c][sortMetric] - combined[combined.length - 1][sortMetric] <= distanceBufferMiles) {
                    combined.push(checker[c]);
                }
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
        res.end("500");
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
                console.log("body array length: " + response.body.length + ", url: " + url)
                resolve(response);
            }
        });
    });

    return promise;
}