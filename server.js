var http = require("http");
var https = require("https");
var request = require("request");
var fs = require("fs");
var rsvp = require('rsvp');
var path = require('path');
var servers;
var asciiCodeInt = 65;
var distanceBufferMiles = 1;
var resultSize = 10;
var sortMetric = 'distance_in_miles';
var vdir = "bmltfed";
var defaultVdir = "main_server";
var ssl = {
    key: fs.readFileSync(path.join(__dirname, 'certs/bmlt-aggregator.archsearch.org.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certs/bmlt-aggregator.archsearch.org.crt'))
};

http.createServer(requestReceived).listen(8888);
https.createServer(ssl, requestReceived).listen(8889);

function requestReceived (req, res) {
    console.log('request received: ' + req.url);
    if ((req.url.indexOf(vdir) < 0
        && req.url.indexOf(defaultVdir) < 0)
        || req.url.indexOf('favicon') > -1) {
        res.writeHead(404);
        res.end("404");
        return
    }

    var requestWithToken = req.url
        .substring(1)
        .replace("/" + vdir, "")
        .replace("/" + defaultVdir, "");

    var settingToken = requestWithToken
        .substring(0, requestWithToken.indexOf("/"))

    req.url = requestWithToken.replace(settingToken, "");

    servers = getServers(settingToken);

    if (servers.length == 0) {
        res.writeHead(404);
        res.end("404");
        return;
    } else {
        console.log("Querying " + servers.length + " servers.");
    }

    var serverQueries = servers.map(function(server) {
        return getData(server + req.url, (req.url.indexOf("json") > -1));
    });

    rsvp.all(serverQueries).then(function(data) {
        console.log("All requests received and returned.")
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
            var highestVersionIndex = 0;
            var highestVersion = -1;

            for (var v = 0; v < combined.length; v++) {
                if (highestVersion == -1 || combined[v].versionInt > highestVersion) {
                    highestVersion = combined[v].versionInt;
                    highestVersionIndex = v;
                }
            }

            combined[highestVersionIndex].version = '4.0.0';
            combined[highestVersionIndex].versionInt = '4000000';
            combined[highestVersionIndex].semanticAdmin = '0';
            combined = combined[highestVersionIndex];
        } else if (req.url.indexOf('serverInfo') > -1) {
            combined = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<bmltInfo>\r\n<serverVersion>\r\n<readableString>4.0.0</readableString>\r\n</serverVersion>\r\n</bmltInfo>";
        } else if (req.url.indexOf('xml') > -1 || req.url.indexOf('xsd') > -1) {
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
}

function getServers(settingToken) {
    var settings = process.env["BMLT_ROOT_SERVERS" + (settingToken == "_" ? "" : "_" + settingToken)]
    if (settings != null) {
        return settings.split(",");
    } else {
        return [];
    }
}

function getData(url, isJson) {
    console.log("getData(): " + url);
    var promise = new rsvp.Promise(function(resolve, reject) {
        request({
            url: url,
            json: isJson,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
            },
            timeout: 10000
        }, function(error, response, body) {
            if (error) {
                console.error(url + ": " + error);
                reject(response);
            } else {
                if (body != null) {
                    console.log("body array length: " + body.length + ", url: " + url)
                    if (body.toString().indexOf("DOCTYPE") >= 0) {
                        response.body = "";
                    }
                }
                resolve(response);
            }
        });
    });

    return promise;
}

console.log("BMLT aggregator server started.");