var http = require("http");
var https = require("https");
var request = require("request");
var config = require('./config.js');
var prepare = require('./lib/prepare.js');
var geolib = require('./lib/geo.js')
var responselib = require('./lib/response.js')
var urlUtils = require("url");
var cache = require('memory-cache');
var servers;

http.createServer(requestReceived).listen(8888);
https.createServer(config.ssl, requestReceived).listen(8889);

function requestReceived(req, res) {
    console.log('request received: ' + req.url);
    if ((req.url.indexOf(config.vdir) < 0
        && req.url.indexOf(config.defaultVdir) < 0)
        || req.url.indexOf('favicon') > -1) {
        res.writeHead(404);
        res.end("404");
        return
    }

    var requestWithToken = req.url
        .substring(1)
        .replace("/" + config.vdir, "")
        .replace("/" + config.defaultVdir, "");

    var settingToken = requestWithToken
        .substring(0, requestWithToken.indexOf("/")) || requestWithToken

    req.url = requestWithToken.replace(settingToken, "");

    if (req.url == "/purge") {
        cache.del(settingToken)
        res.writeHead(200);
        res.end(settingToken + " cache purged.");
        return
    }

    getServers(settingToken).then(servers => {
        if (req.url == "" || req.url == "/") {
            res.writeHead(200);
            res.end(JSON.stringify(servers));
            return null
        } 
        
        if (req.url.indexOf("lat_val") >= 0 && req.url.indexOf("long_val") >= 0) {
            var queryParams = urlUtils.parse(req.url, true).query
            var lat = queryParams["lat_val"]
            var lon = queryParams["long_val"]

            var filteredServers = []
            for (server of servers) {
                // support for BMLT roots pre - v2.8.16, no coverage areas so must be included
                if (server["coverageArea"] == null || geolib.boxContains(server["coverageArea"], lat, lon)) {
                    filteredServers.push(server)
                }
            }
        }
        
        if (req.url.indexOf("/filter?") >= 0) {
            res.writeHead(200);
            res.end(JSON.stringify(filteredServers));
            return null;
        }

        console.log("Querying " + servers.length + " servers.");    

        return servers.map(server => {
            return getData(server["rootURL"] + req.url, (req.url.indexOf("json") > -1));
        });
    }).catch(error => {
        console.error(error);
        res.writeHead(404);
        res.end("404");
        return null
    }).then(serverQueries => {
        if (serverQueries !== null) {
            return executeQueries(serverQueries);
        }
    });

    function executeQueries(serverQueries) {
        return Promise.all(serverQueries).then(data => {
            console.log("All requests received and returned.");

            if (req.url.indexOf('GetLangs.php') > -1 && req.url.indexOf('json') > -1) {
                var data = config.languagesOverride;
                return responselib.returnResponse(req, res, data);
            }

            // Clean up bad results from servers
            var k = data.length;
            while (k--) {
                if (data[k] == null) data.splice(k, 1)
            }

            var combined = [];
            for (var i = 0; i < data.length; i++) {
                // TODO: this is a weird bug in the BMLT where it return text/html content-type headers
                if (data[i].headers['content-type'].indexOf("application/xml") < 0) {
                    for (var j = 0; j < data[i].body.length; j++) {
                        var preIndex = i + 1;
                        if (req.url.indexOf('GetSearchResults') > -1) {
                            data[i].body[j].service_body_bigint = preIndex + data[i].body[j].service_body_bigint;
                        } else {
                            data[i].body[j].id = preIndex + data[i].body[j].id;
                            data[i].body[j].parent_id = preIndex + data[i].body[j].parent_id;
                        }

                        combined.push(data[i].body[j]);
                    }
                } else {
                    combined.push(data[i].body);
                }
            }

            // Sort search results
            if (req.url.indexOf('GetSearchResults') > -1) {
                if (req.url.indexOf('sort_keys') > -1) {
                    var sortKeys = urlUtils.parse(req.url, true).query.sort_keys
                    combined = prepare.getSearchResults(combined, sortKeys)
                } else {
                    combined = prepare.getSearchResults(combined, config.defaultSortKey)
                }

                combined = prepare.finalizeResults(combined);
            }

            if (req.url.indexOf('switcher=GetServerInfo') > -1) {
                combined = prepare.getServerInfo(combined)
            } else if (req.url.indexOf('serverInfo') > -1) {
                combined = config.serverInfoOverride;
            } else if (req.url.indexOf('xml') > -1 || req.url.indexOf('xsd') > -1) {
                combined = combined[0];
            }

            responselib.returnResponse(req, res, combined);
        }, error => {
            res.writeHead(500);
            res.end("500");
            console.error(error);
        });
    }
}

function getServers(settingToken) {
    return new Promise((resolve, reject) => {
        var settings = process.env["BMLT_ROOT_SERVERS" + (settingToken == "_" ? "" : "_" + settingToken)]

        var serversArray = cache.get(settingToken) || []

        if (serversArray.length > 0) {
            console.log(settingToken + " cache hit")
            resolve(serversArray)
        } else if (settings.indexOf("json:") == 0) {
            getData(settings.replace("json:", ""), true).then(servers => {
                for (server of servers.body) {
                    serversArray.push(server["rootURL"]);
                }

                return Promise.all(
                    serversArray.map(server => {
                        return getData(server + "client_interface/json/?switcher=GetCoverageArea", 
                            true, { "x-bmlt-root": server })
                    })
                )
            }).then(responses => {
                serversArray = []
                for (r of responses) {
                    serversArray.push({
                        "rootURL": r.request.headers["x-bmlt-root"],
                        // support for BMLT roots pre - v2.8.16, no coverage areas so must be included
                        "coverageArea": (typeof r.body[0] == "object" ? r.body[0] : null)
                    })
                }
                cache.put(settingToken, serversArray, config.cacheTtlMs)
                resolve(serversArray);
            }).catch(error => {
                reject(error);
            });
        } else if (settings != null) {
            resolve(settings.split(","));
        } else {
            reject();
        }
    });
}

function getData(url, isJson, headers) {
    console.log("getData(): " + url);
    if (headers == null) {
        headers = { 'User-Agent': config.userAgent }
    } else {
        headers['User-Agent'] = config.userAgent;
    }

    return new Promise((resolve, reject) => {
        request({
            url: url,
            json: isJson,
            headers: headers,
            timeout: config.requestTimeoutMilliseconds
        }, (error, response, body) => {
            if (error) {
                console.error("\r\n" + url + ": " + error);
                resolve(response);
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
}

console.log("sandwich server started.");