var BoundingBox = require('geocoordinate').BoundingBox
var bbox = new BoundingBox();

var coords = {
  nw_corner_longitude: -84.028368,
  nw_corner_latitude: 36.7554986,
  se_corner_longitude: -76.7304894,
  se_corner_latitude: 34.3095133
};

bbox.pushCoordinate(coords.nw_corner_latitude, coords.se_corner_longitude);
bbox.pushCoordinate(coords.se_corner_latitude, coords.nw_corner_longitude);

bbox.box();

console.log(bbox.contains(35, -77));