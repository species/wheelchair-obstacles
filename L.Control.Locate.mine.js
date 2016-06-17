/* based on https://github.com/domoritz/leaflet-locatecontrol 0.35
   Michael Maier
   Fri Dec 26 23:18:56 CET 2014
   */

geoLocSuccess = function(position) {
  console.log(position.coords.latitude + position.coords.longitude);
  var center = new L.LatLng(position.coords.latitude, position.coords.longitude);
// alert(position.coords.latitude);
  map.setView(center, 13);
};

geoLocFairure = function(position) {
  alert("geoloc failed! ");
};

L.Control.Locate = L.Control.extend({
  options: {
    position: 'topleft',
    icon: 'locate-icon',
    strings: {
      title: "Show me where I am"
    }
  },
  onAdd: function (map) {
    var container = L.DomUtil.create('div','leaflet-control-locate leaflet-bar leaflet-control');
    var link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single ' + this.options.icon, container);
    link.href = '#';
    link.title = this.options.strings.title;

    L.DomEvent.on(link, 'click', function() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geoLocSuccess, geoLocFairure);
      } else
        alert("Sorry, no Geolocation Support!");
    });
    return container;
  }
});

L.control.locate = function (options) {
      return new L.Control.Locate(options);
};

