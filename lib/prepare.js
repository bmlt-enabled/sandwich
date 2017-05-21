var config = require('../config.js')

module.exports = {
    getSearchResults: function(results, sortKeys) {
        var sortType = {
            sortNumeric: function(results, sortKey) {
                combined = results.sort((a, b) => {
                    return parseFloat(a[sortKey]) - parseFloat(b[sortKey]);
                });

                var checker = combined.slice(config.resultSize, combined.length - 1);
                combined.splice(config.resultSize, combined.length - 1);

                for (var c = 0; c < checker.length; c++) {
                    if (checker[c][sortKey] - combined[combined.length - 1][sortKey] <= config.distanceBufferMiles) {
                        combined.push(checker[c]);
                    }
                }

                return combined;
            }
        }

        for (sortKey of sortKeys.split(',')) {
            if (sortKey == "distance_in_miles") {
                combined = sortType.sortNumeric(results, sortKey)
            }
        }

        return combined;
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
    }
}