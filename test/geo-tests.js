var geolib = require('geolib')
var coords = {
  nw_corner_longitude: -115.9936056,
  nw_corner_latitude: 39.9033762,
  se_corner_longitude: -89.7567399,
  se_corner_latitude: 26.2237111
};

function boxContains(box, latitude, longitude) {
    return geolib.isPointInside(
        {latitude: latitude, longitude: longitude},
        [
            {latitude: box.nw_corner_latitude, longitude: box.nw_corner_longitude},
            {latitude: box.nw_corner_latitude, longitude: box.se_corner_longitude},
            {latitude: box.se_corner_latitude, longitude: box.se_corner_longitude},
            {latitude: box.se_corner_latitude, longitude: box.nw_corner_longitude}
        ]
    );
}

console.log(boxContains(coords, 27,-90))