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
    if ((req.url.indexOf(config.vdir) < 0)
        || req.url.indexOf('favicon') > -1) {
        res.writeHead(404);
        res.end("404");
        return
    }

    var requestWithToken = req.url
        .substring(1)
        .replace("/" + config.vdir, "")

    req.url = requestWithToken.replace("_", "");

    if (req.url == "/purge") {
        cache.del("_")
        res.writeHead(200);
        res.end("cache purged.");
        return
    }
    
    getServers().then(servers => {
        if (req.url == "" || req.url == "/") {
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Length": JSON.stringify(servers).length
            });
            res.end(JSON.stringify(servers));
            return null
        } 
        
        if (req.url.indexOf("lat_val") >= 0 && req.url.indexOf("long_val") >= 0) {
            var queryParams = urlUtils.parse(req.url, true).query
            var lat = queryParams["lat_val"]
            var lon = queryParams["long_val"]

            var filteredServers = []
            for (server of servers) {
                // Checks also in case a root server might be down, and no coverage area can be found.
                if (server["coverageArea"] == null || geolib.boxContains(server["coverageArea"], lat, lon)) {
                    filteredServers.push(server)
                }
            }

            servers = filteredServers
        } else if (req.url.indexOf("services") >= 0) {
            var queryParams = urlUtils.parse(req.url, true).query
            var filteredServers = []
            var servicesQS = []
            if (req.url.indexOf("services[]") >= 0) {
                servicesQS = queryParams["services[]"] instanceof Array ? queryParams["services[]"] : [queryParams["services[]"]]
            } else {
                servicesQS = queryParams["services"] instanceof Array ? queryParams["services"] : [queryParams["services"]]
            }
            
            for (service of servicesQS) {
                var services = /([0-9]{3})([0]{3})([0-9]*)/g.exec(service)

                for (server of servers) {
                    if (server["serverId"] == services[1]) {
                        filteredServers.push(server)
                        req.url = req.url.replace(services[1] + "000", "")
                        break;
                    }
                }
            }

            servers = filteredServers
        }

        if (req.url.indexOf("get_used_formats") > -1 || req.url.indexOf("services") > -1) {
            req.url += "&recursive=1"
        }
        
        if (req.url.indexOf("/filter?") >= 0) {
            res.writeHead(200, {
                "Content-Type": "application/json",
                "Length": JSON.stringify(filteredServers).length
            });
            res.end(JSON.stringify(filteredServers));
            return null;
        }

        console.log("Querying " + servers.length + " servers.");    

        return servers.map(server => {
            // TODO: needs to support the concept of urls specific to a root server because service Ids may overlap at this point.
            /*
                https://bmlt.ncregion-na.org/main_server//client_interface/json/?switcher=GetSearchResults&services[]=1&services[]=27&sort_keys=location_municipality,weekday_tinyint,start_time,meeting_name&get_used_formats&recursive=1
                http://crna.org/main_server//client_interface/json/?switcher=GetSearchResults&services[]=1&services[]=27&sort_keys=location_municipality,weekday_tinyint,start_time,meeting_name&get_used_formats&recursive=1
            */
            return getData(server["rootURL"] + req.url, 
                (req.url.indexOf("json") > -1), 
                { "x-bmlt-root": server["rootURL"], "x-bmlt-root-server-id": getServer(server["rootURL"].serverId) },
                 config.cacheCheck(req.url));
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
            var queryParams = urlUtils.parse(req.url, true).query

            if (req.url.indexOf('GetLangs.php') > -1 && req.url.indexOf('json') > -1) {
                var data = config.languagesOverride;
                return responselib.returnResponse(req, res, data);
            } else if (req.url.indexOf("get_used_formats") > -1) {
                // gotta handle this better combine these results (there will be some overlap for sure)
                return responselib.returnResponse(req, res, data[0].body);
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
                        var serverId = getServer(data[i].request.headers["x-bmlt-root"]).serverId;
                        if (req.url.indexOf('GetSearchResults') > -1) {
                            data[i].body[j].service_body_bigint = prepare.addServerId(serverId, data[i].body[j].service_body_bigint);
                        } else if (data[i].body[j].id != null && data[i].body[j].parent_id != null) {
                            data[i].body[j].id = prepare.addServerId(serverId, data[i].body[j].id);
                            data[i].body[j].parent_id = prepare.addServerId(serverId, data[i].body[j].parent_id);
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

                if (queryParams["geo_width"] < 0 || queryParams["geo_width_km"] < 0) {
                    combined = prepare.finalizeResults(combined, Math.abs(queryParams["geo_width"]))
                }
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

function getServer(rootURL) {
    var serversArray = cache.get('_') || []
    if (serversArray.length == 0) return {};
    for (server of serversArray) {
        if (server["rootURL"] == rootURL) {
            return server;
        }
    }
}

function getServers() {
    return new Promise((resolve, reject) => {
        var settings = process.env["BMLT_ROOT_SERVERS"]
        var serversArray = cache.get("_") || []

        if (serversArray.length > 0) {
            console.log("cache hit")
            resolve(serversArray)
        } else if (settings.indexOf("json:") == 0) {
            getData(settings.replace("json:", ""), true).then(servers => {
                for (server of servers.body) {
                    serversArray.push(server);
                }

                return Promise.all(
                    serversArray.map(server => {
                        return getData(server["rootURL"] + "client_interface/json/?switcher=GetCoverageArea", 
                            true, { "x-bmlt-root": server["rootURL"], "x-bmlt-root-server-id": server["id"] })
                    })
                )
            }).then(responses => {
                serversArray = []
                for (r of responses) {
                    if (r != null && r.body != null) {
                        serversArray.push({
                            "rootURL": r.request.headers["x-bmlt-root"],
                            "serverId": r.request.headers["x-bmlt-root-server-id"],
                            "coverageArea": r.body[0]
                        })
                    } else {
                        console.log("No response from the other end, excluding it from the cache set.")
                    }
                }
                cache.put("_", serversArray, config.cacheTtlMs)
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

function getData(url, isJson, headers, shouldCache) {
    // TODO: simplify
    if (headers == null) {
        headers = { 'User-Agent': config.userAgent }
    } else {
        headers['User-Agent'] = config.userAgent;
    }

    return new Promise((resolve, reject) => {
        if (shouldCache && cache.get(url) != null) {
            console.log("cache hit: " + url)
            resolve(cache.get(url))
            return
        }

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

                if (shouldCache) {
                    console.log("cache miss: " + url)
                    cache.put(url, response, config.cacheTtlMs)
                }
                
                resolve(response);
            }
        });
    });
}

console.log("sandwich server started.");