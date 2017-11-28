var fs = require("fs");
var path = require('path');

module.exports = {
    cacheTtlMs: 300000,
    requestTimeoutMilliseconds: 5000,
    vdir: 'sandwich',
    defaultVdir: 'main_server',
    distanceKey: 'distance_in_miles',
    defaultSortKey: 'distance_in_miles',
    userAgent: 'Mozilla/4.0 (compatible; MSIE: 5.01; Windows NT 5.0)',
    versionOverride: '4.0.0',
    versionIntOverride: '4000000',
    semanticAdminOverride: '0',
    serverInfoOverride: '<?xml version=\"1.0\" encoding=\"utf-8\"?>\r\n<bmltInfo>\r\n<serverVersion>\r\n<readableString>4.0.0</readableString>\r\n</serverVersion>\r\n</bmltInfo>',
    languagesOverride: {"languages":[{"key":"en","name":"English","default":true},{"key":"de","name":"German"},{"key":"es","name":"Spanish"},{"key":"fr","name":"French"},{"key":"it","name":"Italian"},{"key":"sv","name":"Svenska"}]},
    ssl: {
        key: fs.readFileSync(path.join(__dirname, 'certs/privkey.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'certs/cert.pem')),
        ca: fs.readFileSync(path.join(__dirname, 'certs/chain.pem'))
    },
    cachedEndpoints: [
        "switcher=GetServerInfo",
        "switcher=GetServiceBodies",
        "switcher=GetFormats",
        "GetLangs.php",
        "GetServiceBodies.php"
    ],
    cacheCheck: function(url) {
        for (ce of this.cachedEndpoints) {
            if (url.indexOf(ce) >= 0) {
                return true;
            }
        }

        return false;
    }
}