var http = require("http");
var servers = [
        "http://ncregion-na.org/bmlt/main_server",
        "http://crna.org/main_server"
];
var completed_requests = 0;

http.createServer(function (serverRequest, serverResponse) {
    console.log("request received: " + serverRequest.url);
    servers.forEach(function(server) {
        var responses = [];
        console.log("retrieving: " + server + serverRequest.url);
        http.get(server + serverRequest.url, function(res) {
            res.on('data', function(chunk){
                responses.push(chunk);
            });

            res.on('end', function(){
                if (completed_requests++ == servers.length - 1) {
                    // All downloads are completed
                    console.log('body:', responses.join());

                    serverResponse.write(responses.join());
                    serverResponse.end();
                }
            });
        });
    })
}).listen(8888);