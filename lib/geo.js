var geolib = require('geolib')

module.exports = {
    boxContains: function(box, latitude, longitude) {
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
}