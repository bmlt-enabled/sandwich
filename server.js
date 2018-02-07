var http = require("http");
var https = require("https");
var request = require("request");
var config = require('./config.js');
var prepare = require('./lib/prepare.js');
var geolib = require('./lib/geo.js')
var utils = require("./lib/utils.js")
var responselib = require('./lib/response.js')
var urlUtils = require("url");
var cache = require('memory-cache');
var servers;

http.createServer(requestReceived).listen(8888, "0.0.0.0");
https.createServer(config.ssl, requestReceived).listen(8889);

function log(message) {
    if (config.debug) { 
        console.log(message);
    }
}

function requestReceived(req, res) {
    log('request received: ' + req.url);
    if ((req.url.indexOf(config.vdir) < 0)
        || req.url.indexOf('favicon') > -1) {
        res.writeHead(404);
        res.end("Not found.");
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
    
    getServers(!!urlUtils.parse(req.url, true).query["bypassCache"]).then(servers => {
        if (req.url.replace("?bypassCache=true", "") == "" || req.url.replace("?bypassCache=true", "") == "/") {
            responselib.returnJSONResponse(res, servers);
            return null;
        } 

        if (req.url.indexOf("/cache") >= 0) {
            responselib.returnJSONResponse(res, cache.keys());
            return null;
        }

        if ((req.url.indexOf("get_used_formats") > -1 || req.url.indexOf("services") > -1) && req.url.indexOf("recursive") < 0) {
            req.url += "&recursive=1"
        }
        
        var filteredServers = []
        if (req.url.indexOf("lat_val") >= 0 && req.url.indexOf("long_val") >= 0) {
            var queryParams = urlUtils.parse(req.url, true).query
            var lat = queryParams["lat_val"]
            var lon = queryParams["long_val"]


            for (server of servers) {
                // Checks also in case a root server might be down, and no coverage area can be found.
                if (server["coverageArea"] == null || geolib.boxContains(server["coverageArea"], lat, lon)) {
                    filteredServers.push({"root": server, "url" : req.url})
                }
            }
        } else if (req.url.indexOf("services") >= 0) {
            var queryParams = urlUtils.parse(req.url, true).query
            var pathname = urlUtils.parse(req.url, true).pathname
            var filteredServers = []
            var servicesParameterKey = req.url.indexOf("services[]") >= 0 ? "services[]" : "services"
            var servicesQS = queryParams[servicesParameterKey] instanceof Array ? queryParams[servicesParameterKey] : [queryParams[servicesParameterKey]]
            
            for (service of servicesQS) {
                var services = /([0-9]{3})([0]{3})([0-9]*)/g.exec(service)

                for (server of servers) {
                    if (server["serverId"] == services[1]) {
                        delete queryParams[servicesParameterKey]
                        req.url = pathname + utils.convertMapToQueryString(queryParams) + servicesParameterKey + "=" + services[3]
                        filteredServers.push({"root": server, "url" : req.url})
                        //req.url = req.url.replace(services[1] + "000", "")
                        break;
                    }
                }
            }
        } else {
            for (server of servers) {
                filteredServers.push({"root": server, "url" : req.url})
            }
        }

        if (req.url.indexOf("/filter?") >= 0) {
            responselib.returnJSONResponse(res, filteredServers);
            return null;
        }

        servers = filteredServers
        log("Querying " + (servers.length - 1) + " servers.");    

        return servers.map(server => {
            // TODO: needs to support the concept of urls specific to a root server because service Ids may overlap at this point.
            /*
                https://bmlt.ncregion-na.org/main_server//client_interface/json/?switcher=GetSearchResults&services[]=1&services[]=27&sort_keys=location_municipality,weekday_tinyint,start_time,meeting_name&get_used_formats&recursive=1
                http://crna.org/main_server//client_interface/json/?switcher=GetSearchResults&services[]=1&services[]=27&sort_keys=location_municipality,weekday_tinyint,start_time,meeting_name&get_used_formats&recursive=1
            */
            return getData(server.root["rootURL"] + server["url"], 
                (server["url"].indexOf("json") > -1), 
                { "x-bmlt-root": server.root["rootURL"], "x-bmlt-root-server-id": getServer(server.root["rootURL"].serverId) },
                 config.cacheCheck(server["url"]));
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
            log("All requests received and returned.");
            var queryParams = urlUtils.parse(req.url, true).query

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
            var meetings = [];
            var formats = [];
            for (var i = 0; i < data.length; i++) {
                // TODO: this is a weird bug in the BMLT where it return text/html content-type headers
                if (data[i].statusCode != 200 || data[i].body == null || JSON.stringify(data[i].body).length < 10) continue;
                if (data[i].headers != null && data[i].headers['content-type'].indexOf("application/xml") < 0) {
                    for (var j = 0; j < utils.getMeetingData(req, data, i).length; j++) {
                        var serverId = getServer(data[i].request.headers["x-bmlt-root"]).serverId;
                        if (req.url.indexOf('GetSearchResults') > -1) {
                            utils.getMeetingDataPoint(req, data, i, j).service_body_bigint = prepare.addServerId(serverId, utils.getMeetingDataPoint(req, data, i, j).service_body_bigint);
                        } else if (utils.getMeetingDataPoint(req, data, i, j).id != null && utils.getMeetingDataPoint(req, data, i, j).parent_id != null) {
                            utils.getMeetingDataPoint(req, data, i, j).id = prepare.addServerId(serverId, utils.getMeetingDataPoint(req, data, i, j).id);
                            utils.getMeetingDataPoint(req, data, i, j).parent_id = prepare.addServerId(serverId, utils.getMeetingDataPoint(req, data, i, j).parent_id);
                        }

                        var meetingDataPoint = utils.getMeetingDataPoint(req, data, i, j)
                        req.url.indexOf("get_used_formats") > -1 ? meetings.push(meetingDataPoint) : combined.push(meetingDataPoint)
                    }
                } else {  // xml response body
                    combined.push(data[i].body);
                }
            }

            if (req.url.indexOf("get_used_formats") > -1) { 
                for (var i = 0; i < data.length; i++) {
                    if (data[i].statusCode != 200 || data[i].body == null || JSON.stringify(data[i].body).length < 10) continue;
                    for (var j = 0; j < utils.getFormatData(req, data, i).length; j++) {
                        var serverId = getServer(data[i].request.headers["x-bmlt-root"]).serverId;
                        utils.getFormatDataPoint(req, data, i, j).id = prepare.addServerId(serverId, utils.getFormatDataPoint(req, data, i, j).id);
                        formats.push(utils.getFormatDataPoint(req, data, i, j))
                    }
                }

                combined = { "meetings" : meetings , "formats" : formats };
            }

            // Sort search results
            if (req.url.indexOf('GetSearchResults') > -1) {
                if (req.url.indexOf('sort_keys') > -1) {
                    var sortKeys = urlUtils.parse(req.url, true).query.sort_keys
                    if (req.url.indexOf('get_used_formats') > -1) {
                        combined["meetings"] = prepare.getSearchResults(combined["meetings"], sortKeys)
                    } else {
                        combined = prepare.getSearchResults(combined, sortKeys)
                    }
                } else if (req.url.indexOf('get_used_formats') < 0) {
                    combined = prepare.getSearchResults(combined, config.defaultSortKey)
                }

                if (queryParams["geo_width"] < 0 || queryParams["geo_width_km"] < 0) {
                    combined = prepare.finalizeResults(
                        combined, 
                        Math.abs(queryParams["geo_width"]), 
                        req.url.indexOf('sort_keys') > -1 ? sortKeys : config.defaultSortKey,
                        urlUtils.parse(req.url, true).query["weekdays[]"]
                    ) 
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

function getServers(bypassCache) {
    return new Promise((resolve, reject) => {
        var settings = process.env["BMLT_ROOT_SERVERS"]
        var serversArray = bypassCache ? [] : cache.get("_") || []

        if (serversArray.length > 0) {
            log("cache hit")
            resolve(serversArray)
        } else if (settings.indexOf("json:") == 0) {
            getData(settings.replace("json:", ""), true, null, !bypassCache).then(servers => {
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
                    serversArray.push({
                        "rootURL": r.request.headers["x-bmlt-root"],
                        "serverId": r.request.headers["x-bmlt-root-server-id"],
                        "status": (r != null && r.body != null),
                        "coverageArea": (r != null && r.body != null && typeof r.body[0] == "object") ? r.body[0] : null
                    })
                 }
                if (!bypassCache) cache.put("_", serversArray, config.cacheTtlMs)
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
            log("cache hit: " + url)
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
                resolve({request: {headers: headers}});
            } else {
                if (body != null) {
                    log("body array length: " + body.length + ", url: " + url)
                    if (body.toString().indexOf("DOCTYPE") >= 0) {
                        response.body = "";
                    }
                }

                if (shouldCache) {
                    log("cache miss: " + url)
                    cache.put(url, response, config.cacheTtlMs)
                }
                
                resolve(response);
            }
        });
    });
}

log("sandwich server started.");