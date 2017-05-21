var config = require('../config.js')

module.exports = {
    getSearchResults: function(results, sortKeys) {
        var sortType = {
            sortNumeric: function(results, sortKey) {
                return results.sort((a, b) => {
                    return parseFloat(a[sortKey]) - parseFloat(b[sortKey]);
                })
            },
            sortTime: function(results, sortKey) {
                return results.sort((a, b) => {
                    return Date.parse('1970/01/0' + a['weekday_tinyint'] + ' ' + a[sortKey])
                     - Date.parse('1970/01/0' + b['weekday_tinyint'] + ' ' + b[sortKey])
                })
            }
        }

        var sortKey = sortKeys.split(',')[0] || "distance_in_miles"
        if (sortKey == "start_time") {
            return sortType.sortTime(results, sortKey)
        } else if (sortKey == "distance_in_miles" || sortKey == "weekday_tinyint")  {
            return sortType.sortNumeric(results, sortKey)
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
    finalizeResults: function(results) {
        // var checker = results.slice(0, config.resultSize - 1)
        // results.splice(0, config.resultSize - 1)
        var checker = results.slice(config.resultSize, results.length - 1);
        results.splice(config.resultSize, results.length - 1);

        for (var c = 0; c < checker.length; c++) {
            if (checker[c][config.distanceKey] - results[results.length - 1][config.distanceKey] <= config.distanceBufferMiles) {
                results.push(checker[c]);
            }
        }

        return results;
    }
}