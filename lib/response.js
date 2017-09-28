module.exports = {
    returnResponse: function(req, res, data) {
        req.url.indexOf('json') > -1 ? this.returnJSONResponse(res, data) : this.returnXMLResponse(res, data)
        return true;
    },
    returnJSONResponse: function (res, data) {
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Content-Length': JSON.stringify(data).length,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(data));
    },
    returnXMLResponse: function(res, data) {
        res.writeHead(200, {'Content-Type': 'application/xml'});
        res.end(data);
    }
}
