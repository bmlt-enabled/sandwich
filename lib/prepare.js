var config = require('../config.js')

module.exports = {
    addServerId: function(serverId, id) {
        var re = /([0-9]{3})([0]{3})([0-9]*)/g
        var match = re.exec(id)
        return id != null && match != null && match[2] == "000" ? id : serverId + "000" + id
    },
    getSearchResults: function(results, sortKeys) {
        var sortType = {
            sortNumeric: function(results, sortKey) {
                return results.sort((a, b) => {
                    return parseFloat(a[sortKey]) - parseFloat(b[sortKey])
                })
            },
            sortTime: function(results, sortKey) {
                return results.sort((a, b) => {
                    aDay = a['weekday_tinyint']
                    bDay = b['weekday_tinyint']
                    // Sort Saturday before Sunday
                    if (aDay == 1 && bDay == 7) {
                        aDay = 8
                    } else if (bDay == 1 && aDay == 7) {
                        bDay = 8
                    }

                    return Date.parse('1970/01/0' + aDay + ' ' + a[sortKey])
                        - Date.parse('1970/01/0' + bDay + ' ' + b[sortKey])
                })
            },
            sortString: function(results, sortKey) {
                return results.sort((a, b) => a[sortKey].localeCompare(b[sortKey]))
            }
        }

        var sortKey = sortKeys.split(',')[0] || "distance_in_miles"
        if (sortKey == "start_time") {
            return sortType.sortTime(results, sortKey)
        } else if (sortKey == "distance_in_miles" || 
                sortKey == "weekday_tinyint" || 
                sortKey == "service_body_bigint")  {
            return sortType.sortNumeric(results, sortKey)
        } else if (sortKey == "location_municipality" || 
                sortKey == "location_city_subsection" || 
                sortKey == "location_sub_province" || 
                sortKey == "location_province" || 
                sortKey == "meeting_name") {
            return sortType.sortString(results, sortKey)
        } else {
            return results;
        }
    },
    getServerInfo: function(results) {
        var highestVersionIndex = 0;
        var highestVersion = -1;

        for (var v = 0; v < results.length; v++) {
            if (results[v] != null && (highestVersion == -1 || results[v].versionInt > highestVersion)) {
                highestVersion = results[v].versionInt;
                highestVersionIndex = v;
            }
        }

        results[highestVersionIndex].version = config.versionOverride;
        results[highestVersionIndex].versionInt = config.versionIntOverride;
        results[highestVersionIndex].semanticAdmin = config.semanticAdminOverride;

        return [results[highestVersionIndex]];
    },
    finalizeResults: function(results, resultSize, sortKey) {
        var tempSet = []
        var finalResult = []
        var daysPushed = [false, false, false, false, false, false, false]

        results = this.getSearchResults(results, "distance_in_miles");

        var lastDay = 0;
        if (results[0]["weekday_tinyint"] != null) {
            for (item of results) {
                if (!daysPushed[item["weekday_tinyint"] - 1]) {
                    tempSet.push(item)
                    daysPushed[item["weekday_tinyint"] - 1] = true
                }
            }

            tempSet = this.getSearchResults(tempSet, "distance_in_miles");
            furthestDistance = tempSet[tempSet.length - 1];
    
            for (item of results) {
                if (item["distance_in_miles"] <= furthestDistance) {
                    finalResult.push(item)
                }
            }
    
            finalResult = this.getSearchResults(finalResult, sortKey)
        } else {
            finalResult = results
        }
        
        return finalResult;
    }
}