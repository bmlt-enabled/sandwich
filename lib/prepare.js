var config = require('../config.js')

module.exports = {
    addPreindex: function(hash, id) {
        return id != null && id.indexOf("_") > -1 ? id : hash + "_" + id
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
            }
        }

        var sortKey = sortKeys.split(',')[0] || "distance_in_miles"
        if (sortKey == "start_time") {
            return sortType.sortTime(results, sortKey)
        } else if (sortKey == "distance_in_miles" || sortKey == "weekday_tinyint")  {
            return sortType.sortNumeric(results, sortKey)
        } else {
            return results;
        }
    },
    getServerInfo: function(results) {
        var highestVersionIndex = 0;
        var highestVersion = -1;

        for (var v = 0; v < results.length; v++) {
            if (highestVersion == -1 || results[v].versionInt > highestVersion) {
                highestVersion = results[v].versionInt;
                highestVersionIndex = v;
            }
        }

        results[highestVersionIndex].version = config.versionOverride;
        results[highestVersionIndex].versionInt = config.versionIntOverride;
        results[highestVersionIndex].semanticAdmin = config.semanticAdminOverride;

        return results[highestVersionIndex];
    },
    finalizeResults: function(results, resultSize) {
        results.splice(resultSize, results.length - 1);
        return results;
    }
}