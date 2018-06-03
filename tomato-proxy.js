const https = require('https');
const httpProxy = require('http-proxy');
const config = require('./config.js');

const proxy = httpProxy.createProxyServer({secure: false});
https.createServer(config.ssl, requestReceived).listen(8889);

function requestReceived(req, res) {
    console.log('request received: ' + req.url + ' from: ' + req.connection.remoteAddress);
    req.url = req.url.replace("/_/sandwich", "");
    proxy.web(req, res, {
        target: config.tomatoUri
    });
}

proxy.on('proxyReq', function(proxyReq, req, res, options) {
    proxyReq.setHeader('User-Agent', '+sandwich');
});
