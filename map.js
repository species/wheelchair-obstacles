if(!window.console)  // for very old browser
    var console = { log : function(i){}}

var language = window.navigator.languages ? window.navigator.languages[0] : (window.navigator.language || window.navigator.userLanguage);

if(typeof language === 'string')
    language = [ language ];

// we need to have the following languages:
// browserlang
// a short one (de instead of de-AT) if not present
// en as fallback if not present

if(language.indexOf("en") == -1)
    language.push("en");

for(var i = 0; i < language.length; i++) {
    if(language[i].match(/-/)) {
        var short_lang = language[i].match(/^([a-zA-Z]*)-/)[1];
        if(language.indexOf(short_lang) == -1) {
            language.push(short_lang);
            continue;
        }
    }
}

console.log(language);

// global texts
var attr = {
  osm : 'Map data &copy; <a href="https://openstreetmap.org/">OpenStreetMap</a> contributors - <a href="http://opendatacommons.org/licenses/odbl/">ODbL</a>',
  osm_tiles : 'Tiles &copy; OSM - <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC BY-SA</a>',
  search : 'Search by OSM - <a href="http://wiki.openstreetmap.org/wiki/Nominatim">Nominatim</a>',
  mapbox : 'Tiles &copy; <a href="http://mapbox.com/about/maps/">MapBox</a>',
  mapquest : 'Tiles courtesy of <a href="http://www.mapquest.com/">MapQuest</a>',
  greenmap : 'Green Map Icons used by permission &copy; <a href="http://www.greenmap.org">Green Map System 2015</a>',
  overpass : 'POI via <a href="http://www.overpass-api.de/">Overpass API</a>'
}

if(!window.assethost)
    var assethost = "http://demo.transformap.co/";

/*
 * takes a two args: osm datatype and osm id
 * if marker in field of view, toggle popup.
 * zooms in if marker is hidden in cluster to get leafletMarker
 */
function MytogglePopup(osm_type,osm_id) {
    disableLoadPOI = true;
    var leaflet_marker = getVisibleMarker(osm_type,osm_id)
    if(leaflet_marker) {
        leaflet_marker.togglePopup();
        setTimeout(function () {
            disableLoadPOI = false;
        }, 200);
        return;
    } //else

    var target_marker;
    var marker_array = markers.GetMarkers();
    for(var i = 0; i < marker_array.length; i++) {
        var prunecluster_marker = marker_array[i];
        if(prunecluster_marker.data.type == osm_type && prunecluster_marker.data.id == osm_id) {
            target_marker = prunecluster_marker;
            break;
        }
    }
    if(target_marker) {
        if(map.getZoom() == map.getMaxZoom()) {
            var possible_clusters = [];
            map.eachLayer(function (layer) {
                if(layer._population > 0)
                    possible_clusters.push(layer);
            });
            var distance = 123456789;
            var nearest_cluster = null;
            for(i = 0; i < possible_clusters.length; i++) {
                var new_distance = calculateDistance(target_marker.position.lat, possible_clusters[i]._latlng.lat, target_marker.position.lng,  possible_clusters[i]._latlng.lng);
                if( new_distance < distance ) {
                    distance = new_distance;
                    nearest_cluster = possible_clusters[i];
                }
            }
            if(!nearest_cluster) {
                console.log("Error in MytogglePopup: no nearest cluster found");
                disableLoadPOI = false;
                return;
            }
            nearest_cluster.fireEvent('click');
        }
        else
          map.setZoomAround( new L.LatLng(target_marker.position.lat, target_marker.position.lng), map.getZoom() + 1);

        setTimeout(function () {
            MytogglePopup(osm_type,osm_id);
        }, 200);
    } else {
        disableLoadPOI = false;
        console.log("Error in MytogglePopup: marker " + osm_type + " " + osm_id + " not found in markers.GetMarkers()");
    }
}


//source: http://jsfiddle.net/vg01q7xw/
Number.prototype.toRad = function() {
        return this * Math.PI / 180;
}
function calculateDistance(lat1, lat2, lon1, lon2) {
    var R = 6371000; // meter
    var Phi1 = lat1.toRad();
    var Phi2 = lat2.toRad();
    var DeltaPhi = (lat2 - lat1).toRad();
    var DeltaLambda = (lon2 - lon1).toRad();

    var a = Math.sin(DeltaPhi / 2) * Math.sin(DeltaPhi / 2)
            + Math.cos(Phi1) * Math.cos(Phi2) * Math.sin(DeltaLambda / 2)
            * Math.sin(DeltaLambda / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    return d;
}

function getVisibleMarker(osm_type,osm_id) {
    var my_layer = null;
    map.eachLayer(function (layer) {
        if(! layer._popup || ! layer.options.alt)
            return;
        if(layer.options.alt != (osm_type + " " + osm_id))
            return;

        my_layer = layer;
    });
    return my_layer;
}

/* this part must be in global namespace */
// fetch taxonomy, containing all translations, and implicit affiliations
// taken from Wikipedia:JSON
var taxonomy, turbolink;
var url = assethost+"taxonomy.json";
/* var http_request = new XMLHttpRequest();
http_request.open("GET", url, true);
http_request.onreadystatechange = function () {
      var done = 4, ok = 200;
      if (http_request.readyState === done && http_request.status === ok) {
          if(!window.JSON) {
//              document.getElementById('map').inn("Error:cannot handle JSON");
              return;
          }
          taxonomy = JSON.parse(http_request.responseText);

          if(taxonomy) {
              // add map key derived from it
              for(var osmkey_counter = 0; osmkey_counter < overpass_config.icon_tags.length; osmkey_counter++) {
                  var osmkey = overpass_config.icon_tags[osmkey_counter];

                  var taxonomy_block = taxonomy[osmkey];
                  if (!taxonomy_block) {
                      console.log("no entry in taxonomy for " + osmkey);
                      break;
                  }

                  var entry_array = taxonomy_block['items'];
                  for (var i = 0; i < entry_array.length; i++ ) {
                      var item = entry_array[i];
                      for ( var osmvalue_counter = 0; osmvalue_counter < item['osm:values'].length; osmvalue_counter++ ) {
                          var li = $("<li>");
                          var new_id = item['osm:key'] + item['osm:values'][osmvalue_counter];
                          li.attr("onClick", "toggleInfoBox('" + new_id + "');");
                          li.append('<img src="'+assethost+'assets/transformap/pngs/identities/24/' + item['osm:key'] + '=' + item['osm:values'][osmvalue_counter] + '.png" /> '
                                  + item['label']['en']
                                  + '<div class=InfoBox ' 
                                      + 'id="' + new_id + '">'
                                      + item['description']['en'] + '</div>');
                          $('#mapkey').append(li);
                      }
                  }
              }

              if(window.filters)
                  createFiltersOfTaxonomy();

          }
          else
              console.log("taxonomy not here");

      }
  };
http_request.send(null); */

var overpass_ql_text,
    overpass_query,
    overpass_query_nodes,
    overpass_query_ways,
    overpass_query_rels,
    object_type_keys = [ "amenity", "shop", "tourism", "craft", "garden:type", "leisure", "office", "man_made", "landuse", "club", "farm_boxes", "barrier", "footway","highway" ] ;

/*
 * sets global the vars above
 * MUST be called before first loadPOI
 */
function buildOverpassQuery() {
    if(! window.overpass_config )
        window.overpass_config = {};

    var op_server1 = "//overpass-api.de/api/",
        op_server2 = (window.parent.document.location.protocol == "https:") ? op_server1 : "http://api.openstreetmap.fr/oapi/", //fr does'n have https, ru too
        op_server3 = (window.parent.document.location.protocol == "https:") ? op_server1 : "http://overpass.osm.rambler.ru/cgi/";

    if(! overpass_config.timeout)             overpass_config.timeout = 180;
    if(! overpass_config.minzoom)             overpass_config.minzoom = 12;
    if(! overpass_config.servers)             overpass_config.servers = [ op_server1, op_server2, op_server3 ];
    if(! overpass_config.q_array)             overpass_config.q_array = [ [ '"wheelchair"' ] ];
    if(! overpass_config.icon_folder)         overpass_config.icon_folder = "wheelchair";
    if(! overpass_config.icon_tags)           overpass_config.icon_tags = [ "wheelchair" ];
    if(! overpass_config.icon_size)           overpass_config.icon_size = 24;
    if(! overpass_config.class_selector_key)  overpass_config.class_selector_key = { key: "" };

    var overpass_urlstart = 'interpreter?data=';
    var overpass_start = '[out:json][timeout:' + overpass_config.timeout + '][bbox:BBOX];';

    var overpass_query_string = "";
    var overpass_query_string_nodes = "";
    var overpass_query_string_ways = "";
    var overpass_query_string_rels = "";

    for (var i = 0; i < overpass_config.q_array.length; i++) {
      var anded_tags = overpass_config.q_array[i];
      var anded_querystring = "";
      var nr_of_and_clauses = anded_tags.length;
      for (var j=0; j < nr_of_and_clauses; j++) {
        anded_querystring += "[" + anded_tags[j] + "]";
      }

      overpass_query_string += "node" + anded_querystring + ";out;";
      overpass_query_string += "(way" + anded_querystring + ";node(w));out;";
      overpass_query_string += "rel" + anded_querystring + ";out;>;out;";

      overpass_query_string_nodes += "node" + anded_querystring + ";out;";
      overpass_query_string_ways += "(way" + anded_querystring + ";node(w));out;";
      overpass_query_string_rels += "rel" + anded_querystring + ";out;>;out;";
    }

    overpass_ql_text = overpass_start + overpass_query_string;
    overpass_query = overpass_config.servers[0] + overpass_urlstart + overpass_ql_text;
    overpass_query_nodes = overpass_config.servers[0] + overpass_urlstart + overpass_start + overpass_query_string_nodes;
    overpass_query_ways = overpass_config.servers[1] + overpass_urlstart + overpass_start + overpass_query_string_ways;
    overpass_query_rels = overpass_config.servers[2] + overpass_urlstart + overpass_start + overpass_query_string_rels;
    console.log(overpass_query_nodes);
    console.log(overpass_query_ways);
    console.log(overpass_query_rels);
}

var debugLayer,
    map,
    markers = new PruneClusterForLeaflet(20,10),
    lc = {},
    default_overlay = {
      "POIs" : markers
    };

function initMap(defaultlayer,base_maps,overlay_maps,lat,lon,zoom) {
  var center = new L.LatLng(lat ? lat : 0, lon ? lon : 0);

  var overriddenId = (L.Control.EditInOSM) ? new L.Control.EditInOSM.Editors.Id({ url: "http://editor.transformap.co/#background=Bing&map=" }) : null

  var MapQuestOpen_OSM = new L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg', {
      subdomains: '1234',
      attribution: [attr.osm, attr.mapquest, attr.overpass, attr.greenmap].join(', '),
      maxZoom : 19,
      maxNativeZoom: 18 ,
      noWrap: true
  });
  var osm = new L.TileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: [attr.osm, attr.osm_tiles, attr.overpass, attr.greenmap].join(', '),
      maxZoom : 19,
      noWrap: true
  });

  if(!defaultlayer)
    defaultlayer = (window.parent.document.location.protocol == "https:") ? osm : MapQuestOpen_OSM;
  if(!overlay_maps)
    overlay_maps = default_overlay;

  geometry_layer = new L.GeoJSON(null, {
    onEachFeature: function (e, layer) {
      if (e.properties && e.properties.name) layer.bindPopup(e.properties.name);
      if (e.properties && e.properties.style) layer.setStyle(e.properties.style);
    }
  });

  map = new L.Map('map', {
    center: center,
    zoom: zoom ? zoom : 3,
    layers: defaultlayer,
    editInOSMControlOptions: {
        position: 'topright',
        zoomThreshold: 18,
        widget: 'multiButton',
        editors: [overriddenId] 
        }
  });
  
  if(!base_maps) {

    base_maps = {
      'MapQuestOpen': MapQuestOpen_OSM,
      'OpenSteetMap - Mapnik': osm
    };
  }

  map.addLayer(markers);
  map.addLayer(geometry_layer);

  var ctrl = new L.Control.Layers(base_maps,overlay_maps)
  map.addControl(ctrl);

  L.LatLngBounds.prototype.toOverpassBBoxString = function (){
    var a = this._southWest,
        b = this._northEast;
    return [a.lat, a.lng, b.lat, b.lng].join(",");
  }

  var path_style = L.Path.prototype._updateStyle;
  L.Path.prototype._updateStyle = function () {
    path_style.apply(this);
    for (k in this.options.svg) {
      this._path.setAttribute(k, this.options.svg[k]);
    }
  }

  if(window.createSideBar) {
      createSideBar();
      setTimeout(toggleSideBarOnLoad,200);
      map.on('moveend', updatePOIlist);
      if(window.filters)
          map.on('moveend',updateFilterCount); // here because it is called on every map move
  }

  $('#map').append('<a href="https://github.com/species/wheelchair-obstacles" title="Fork me on GitHub" id=forkme></a>');
  $('#forkme').append('<img src="'+assethost+'assets/forkme-on-github.png" alt="Fork me on GitHub" />');

  $('#map').append('<img src="'+assethost+'assets/ajax-loader.gif" id="loading_node" class="loading" />');
  $('#map').append('<img src="'+assethost+'assets/ajax-loader.gif" id="loading_way" class="loading" />');
  $('#map').append('<img src="'+assethost+'assets/ajax-loader.gif" id="loading_relation" class="loading" />');
  $('#map').append('<div id="notificationbar">Please zoom in to update POIs!</div>');

  map.on('moveend', updateLinks);
  map.on('popupopen', setImageInPopup);
  map.on('popupopen', setTranslationsInPopup);

  var popup_param = getUrlVars()["popup"];
  if(popup_param) {
      open_popup_on_load.type = popup_param.match(/^(node|way|relation)/)[1];
      open_popup_on_load.id = popup_param.replace(/^(node|way|relation)/,'' );
  }

  debugLayer = L.layerGroup();
  debugLayer.addTo(map);

  return map;
}

var open_popup_on_load = { type : "", id: "", already_shown: false };

/*
   var href = location.href;
   var hasQuery = href.indexOf("?") + 1;
   var hasHash = href.indexOf("#") + 1;
   var appendix = (hasQuery ? "&" : "?") + "ts=true";
   location.href = hasHash ? href.replace("#", appendix + "#") : href + appendix;
   */

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value.replace(/#.*$/,'');
    });
    return vars;
}

function setImageInPopup(obj) {
//    console.log("setImageInPopup: called");
    if(!document.getElementById('wp-image')) {
//        console.log("setImageInPopup: no wp-image");
        return;
    }
    if ($('#wp-image img').attr('src')) {
//        console.log("setImageInPopup: src already set");
        return;
    }
    var img = $('#wp-image img');
    var source = wikipedia_images["wpimage_" + img.attr('title')];

    if(!source) {
        $('#wp-image').css('display','none');
//        console.log("setImageInPopup: no answer for item yet");
        return;
    }
    if ( source == "UNDEF") {
        $('#wp-image').css('display','none');
//        console.log("setImageInPopup: no image on wikipedia");
        return;
    }
//    console.log("setImageInPopup: setting src " + source);
    $('#wp-image').css('display','table-cell');
    img.attr('src', source);
}

function setTranslationsInPopup(obj) {
    var elements = $('.leaflet-popup-content [translated]');
    if(!elements.length)
        return;

    //console.log(elements.length + " untranslated elements found.");
    elements.each(function ( index ) {
        var jqitem = $(this);
        var tags_string = jqitem.attr("sourcetext");
        if(tags_string == "unknown feature")
            return;
        var tags = tags_string.split(",");
        var new_strings = [];
        var langs_used = [];
        for(var i=0; i < tags.length; i++) {
            var tag = tags[i].trim();
            if(!translations.tags[tag]) {
                console.log("setTranslationsInPopup: no entry in translations found for '" + tag + "'");
                new_strings.push(tag);
                continue;
            }

            var found_transl = 0;
            for(var j=0; j < language.length; j++) {
                var targetlang = language[j];
                if(translations.tags[tag][targetlang]) {
                    new_strings.push(translations.tags[tag][targetlang].value);
                    if(langs_used.indexOf(targetlang) == -1)
                        langs_used.push(targetlang);
                    found_transl = 1;
                    break;
                }
            } 
            if(!found_transl) {
                console.log("no translation in your lang or en found for: '" + tag + "'");
                new_strings.push(tag);
            }

        }
        var new_text = new_strings.join(", ");
        if(jqitem.children().first().text() != new_text) {
            jqitem.children().first().text(new_text);
            jqitem.attr("translated",langs_used.join(","));
        }
    });
}

function addSearch() {
  map.addControl( new L.Control.Search({
    url: '//nominatim.openstreetmap.org/search?format=json&q={s}',
    jsonpParam: 'json_callback',
    propertyName: 'display_name',
    propertyLoc: ['lat','lon'],
    circleLocation: false,
    markerLocation: false,
    autoType: false,
    autoCollapse: false,
    minLength: 2,
    zoom:16
  }) );

}
function addLocate() {
lc = L.control.locate({
        position: 'topleft',
        showPopup: false,
        strings: {
                title: "Jump to my location!"
            }
      }
      ).addTo(map);
}

var marker_table = {};
var old_zoom = 20;

var pids = {
    node : {
        counter : 0,
        active : {}
    },
    way : {
        counter : 0,
        active : {}
    },
    relation : {
        counter : 0,
        active : {}
    }
}

var mutex_loading = { "loading_node" : 0, "loading_way" : 0, "loading_relation" : 0 };

var on_start_loaded = 0;

/*
 *  type: "loading_node" / "loading_way" / "loading_relation"
 *  change: (+)1 or -1
 */
function changeLoadingIndicator(type, change) {

    var loading_indicator = document.getElementById(type);
    if(mutex_loading[type] + change >= 0) //don't go into negative
        mutex_loading[type] = mutex_loading[type] + change;
    if(change == -1) {
        if(mutex_loading[type] == 0) 
          loading_indicator.style.display = "none";
    } else  // +1
        loading_indicator.style.display = "block";
    loading_indicator.title = mutex_loading[type];
}

function secHTML(input) {
    return $("<div>").text( input ).html();
}

function getIconTag(tags) {
    for (var i = 0; i < overpass_config.icon_tags.length; i++) {
      var key = overpass_config.icon_tags[i];
      if(tags[key] && ! ( key == "amenity" && tags[key] == "shop" ) ) {
        return key;
      }
    }
    return "";
}

function chooseIconSrc(tags,iconsize) {

  var icon_uri_start = assethost+"assets/poi-icons/" + overpass_config.icon_folder + "/" + iconsize + "/";
  var icon_url = "";

  if(tags["traffic_signals:minimap"] == "wrong")
    return icon_uri_start + "traffic_signals:minimap=wrong.png";

  if(tags.kerb)
    return icon_uri_start + "kerb=" + tags.kerb + ".png";

  if(tags["wheelchair:turning"] == "no")
    return icon_uri_start + "wheelchair:turning=no.png";

  if(tags.width) {
    if(tags.width < 0.9)
      return icon_uri_start + "width-bad.png";
  }

  if(tags.incline) {
    var incline = Math.abs(parseFloat(tags.incline));
    if(incline > 6 || tags.incline == "down" || tags.incline == "up")
      return icon_uri_start + "incline_up_red.png";
    if(incline > 3)
      return icon_uri_start + "incline_up_orange.png";
  }

  if(tags["incline:across"]){
    var incline_across = Math.abs(parseFloat(tags["incline:across"]));
    if(incline_across > 6)
      return icon_uri_start + "incline_across-right_red.png";
  }

  if(tags["overtaking:wheelchair"] == "no")
    return icon_uri_start + "overtaking:wheelchair=no.png";

  if(tags["incline:across"]){
    var incline_across = Math.abs(parseFloat(tags["incline:across"]));
    if(incline_across > 3)
      return icon_uri_start + "incline_across-right_red.png";
  }


  return icon_uri_start + "/unknown.png";
}

var disableLoadPOI = false;

var bboxes_requested = [
    /* e.g. { outer_bbox: L.LatLngBounds, inner_polyboxes: [ L.LatLngBounds, L.LatLngBounds, ... ]  }, { ... } */
    ]; //VERY SIMPLE list of areas already requested, don't load if new one is inside

/*contains(2) {
    return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) &&     // south2 >= south && north2 <= north &&
           (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);       // west2 >= west && east2 <= east
}
intersects(2) {
    latIntersects = (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat),
    lngIntersects = (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);

    return latIntersects && lngIntersects;
}*/

/*
 * returns true if it already was in BBOX,
 * and false if it had to be added
 */
function checkIfInRequestedBboxesAndIfNotaddTo(bounds) {
    var north = bounds._northEast.lat,  // for performance reasons, do this one time
        east  = bounds._northEast.lng,
        south = bounds._southWest.lat,
        west  = bounds._southWest.lng;
    var b_height = north - south,
        b_width  = east - west,
        width_to_height = b_width/b_height;

    var zoom_delta_to_max = map.getMaxZoom() - map.getZoom(),
        min_height = b_height / (Math.pow(2,zoom_delta_to_max));
//      console.log("checkIfInRequestedBboxesAndIfNotaddTo: viewbox_height = " + viewbox_height + "°, min_heigh = " + min_height);
    var min_width = b_width / (Math.pow(2,zoom_delta_to_max));

 //   console.log("checkIfInRequestedBboxesAndIfNotaddTo: called. bboxes_requested:" + JSON.stringify(bboxes_requested));
    for(var i=0; i < bboxes_requested.length; i++) { //for-loop over outer bboxes
        var current_bound = bboxes_requested[i];
        if(! current_bound.outer_bbox.intersects(bounds)) //neither crossing nor inside
            continue;
        console.log("checkIfInRequestedBboxesAndIfNotaddTo begin: " + current_bound.inner_polyboxes.length + " inner polyboxes");
        if(current_bound.outer_bbox.contains(bounds)) { // only if it doesn't cross outer bbox it is possible that it's already covered
            for(var inner_bbox_i = 0; inner_bbox_i < current_bound.inner_polyboxes.length; inner_bbox_i++) {
                current_inner_bbox = current_bound.inner_polyboxes[inner_bbox_i];
                if(!current_inner_bbox.hasOwnProperty("_southWest")) {
                    console.log("current_inner_bbox error:");
                    console.log(current_inner_bbox);
                    console.log(current_bound);
                }
                //current_inner_bbox.contains(bounds):
                if(south < current_inner_bbox._southWest.lat || 
                   north > current_inner_bbox._northEast.lat ||
                   west  < current_inner_bbox._southWest.lng ||
                   east  > current_inner_bbox._northEast.lng)
                    continue;
                return true; // all ¬ contains-checks failed, must be contained

/*                if(current_inner_bbox.contains(bounds)) {
 //                   console.log("checkIfInRequestedBboxesAndIfNotaddTo: bbox already here");
                    return true;
                    
                } //false == continue*/
            }
        }
        else //intersects one border
            current_bound.outer_bbox.extend(bounds);
        // either intersects with outer bbox or is not in any inner bbox
        // add one horizontal and one vertical box that it intersects for EACH box!
        var new_bboxes = [],
            new_bounds_north_stretched = null,
            new_bounds_south_stretched = null,
            new_bounds_west_stretched = null,
            new_bounds_east_stretched = null;
        var nr_of_deletions = 0;
        var addbounds = true;
        for(var inner_bbox_i = 0; inner_bbox_i < current_bound.inner_polyboxes.length; inner_bbox_i++) {
            current_inner_bbox = current_bound.inner_polyboxes[inner_bbox_i];

            //if ! current_inner_bbox.intersects(bounds) continue (both boxes completely disjunct)
            if(south >= current_inner_bbox._northEast.lat ||
               north <= current_inner_bbox._southWest.lat ||
               east  <= current_inner_bbox._southWest.lng ||
               west  >= current_inner_bbox._northEast.lng)
                continue;

            /* 16 cases:
                1.: bounds completely inside current_inner_bbox
                    -> is already covered by 1st for-loop with inner_polyboxes
                2.: current_inner_bbox completely inside -> delete it; continue (empty array slots cleared afterwards)
                                                                        -> use delete array[i], it does not reindex. reindex afterwards, remove all undefined...
                3-10: 8 where one box is crosses only one side of the other
                   3-6:  4 where bounds is bigger
                   7-10: 4 where current_inner_bbox is bigger
                11-14: 4 where they cross them on two sides (corner-crossing)
                15,15: as stretching boxes can be longer, heigher it can happen that they form a "cross" -> simply add bounds, no special handling needed
                    =^= (bwb && beb && !bnb && !bsb) || (!bwb && !bwb && bnb && bsb)

             *  WHAT IF some bounds are equal? TODO
             *  FIXME a lot of dual boxes seem to be generated... -OK they were if a box hits one with same border
             */

            /* TODO shrinking of bounds:
             *   stretching of inner_polyboxes is still needed, because: you don't know which side gets cut first, and if inner_polyboxes don't overlap,
             * only a corner would get cutted out (which isn't possible on rectangles)
             *
             * with each run of the inner for-loop we can cut bounds smaller. if nothing left, it ... have to move first for-loop in!
             */

            var boundsnorth_bigger = (north >= current_inner_bbox._northEast.lat),
                boundssouth_bigger = (south <= current_inner_bbox._southWest.lat),
                boundseast_bigger = (east >= current_inner_bbox._northEast.lng),
                boundswest_bigger = (west <= current_inner_bbox._southWest.lng);
            console.log("bnb:"+boundsnorth_bigger+" bsb:"+boundssouth_bigger+" beb:"+boundseast_bigger+" bwb:"+boundswest_bigger);

            var bounds_bigger_on_howmany_sides = (boundsnorth_bigger ? 1 : 0) + (boundssouth_bigger ? 1 : 0) + (boundseast_bigger ? 1 : 0) + (boundswest_bigger);
            console.log("bounds_bigger_on_howmany_sides: " + bounds_bigger_on_howmany_sides);

            if(bounds_bigger_on_howmany_sides == 4) { // case 2
                delete current_bound.inner_polyboxes[inner_bbox_i];
                nr_of_deletions++;
                continue;
            }

            //box is an autogenerated stretching box - these are always inside downloaded boxes, ignore for generating more.
            if(current_inner_bbox.hasOwnProperty('stretch'))
                continue;

            if(bounds_bigger_on_howmany_sides == 3) { // cases 3-6
                if(!boundsnorth_bigger) { // current_inner_bbox crosses bounds on north, stretch southward
                    console.log("3-6: !bnb");
                    var inner_height = current_inner_bbox._northEast.lat - current_inner_bbox._southWest.lat;
                    var max_to_stretch = north - inner_height;
                    current_inner_bbox._southWest.lat = (max_to_stretch < south) ? south : max_to_stretch;
                    continue;
                }
                if(!boundssouth_bigger) {
                    console.log("3-6: !bsb");
                    var inner_height = current_inner_bbox._northEast.lat - current_inner_bbox._southWest.lat;
                    var max_to_stretch = south + inner_height;
                    current_inner_bbox._northEast.lat = (max_to_stretch > north) ? north : max_to_stretch;
                    continue;
                }
                if(!boundseast_bigger) {
                    console.log("3-6: !beb");
                    var inner_width = current_inner_bbox._northEast.lng - current_inner_bbox._southWest.lng;
                    var max_to_stretch = east - inner_width;
                    current_inner_bbox._southWest.lng = (max_to_stretch < west) ? west : max_to_stretch;
                    continue;
                }
                if(!boundswest_bigger) {
                    console.log("3-6: !bwb");
                    var inner_width = current_inner_bbox._northEast.lng - current_inner_bbox._southWest.lng;
                    var max_to_stretch = west + inner_width;
                    current_inner_bbox._northEast.lng = (max_to_stretch > east) ? east : max_to_stretch;
                    continue;
                }
                console.log("shouldn't have reached bounds_bigger_on_howmany_sides == 3 after ????????????");
            }
            if(bounds_bigger_on_howmany_sides == 1) { // cases 7-10
                addbounds = false; // we add a bigger box instead
                if(boundssouth_bigger) { // bounds crosses current_inner_bbox on south, stretch northwards
                    console.log("7-10: bsb");
                    var max_to_stretch = current_inner_bbox._southWest.lat + b_height;
                    var new_north = (max_to_stretch > current_inner_bbox._northEast.lat) ? current_inner_bbox._northEast.lat : max_to_stretch;
                    if(!new_bounds_north_stretched) {
                        new_bounds_north_stretched = new L.latLngBounds( [ south, west ], [ new_north, east ] );
                    } else {
                        if(new_bounds_north_stretched._northEast.lat < new_north)
                            new_bounds_north_stretched._northEast.lat = new_north;
                    }
                    //TODO shrink bounds!
                    continue;
                }
                if(boundsnorth_bigger) { // bounds crosses current_inner_bbox on north, stretch southwards
                    console.log("7-10: bnb");
                    var max_to_stretch = current_inner_bbox._northEast.lat - b_height;
                    var new_south = (max_to_stretch < current_inner_bbox._southWest.lat) ? current_inner_bbox._southWest.lat : max_to_stretch;
                    if(!new_bounds_south_stretched) {
                        new_bounds_south_stretched = new L.latLngBounds( [ new_south, west ], [ north, east ] );
                    } else {
                        if(new_bounds_south_stretched._southWest.lat > new_south)
                            new_bounds_south_stretched._southWest.lat = new_south;
                    }
                    //TODO shrink bounds!
                    continue;
                }
                if(boundseast_bigger) { // bounds crosses current_inner_bbox on east, stretch westwards
                    console.log("7-10: beb");
                    var max_to_stretch = current_inner_bbox._northEast.lng - b_width;
                    var new_west = (max_to_stretch < current_inner_bbox._southWest.lng) ? current_inner_bbox._southWest.lng : max_to_stretch;
                    if(!new_bounds_west_stretched) {
                        new_bounds_west_stretched = new L.latLngBounds( [ south, new_west ], [ north, east ] );
                    } else {
                        if(new_bounds_west_stretched._southWest.lng > new_west)
                            new_bounds_west_stretched._southWest.lng = new_west;
                    }
                    //TODO shrink bounds!
                    continue;
                }
                if(boundswest_bigger) { // bounds crosses current_inner_bbox on west, stretch eastwards
                    console.log("7-10: bwb");
                    var max_to_stretch = current_inner_bbox._southWest.lng + b_width;
                    var new_east = (max_to_stretch > current_inner_bbox._northEast.lng) ? current_inner_bbox._northEast.lng : max_to_stretch;
                    if(!new_bounds_east_stretched) {
                        new_bounds_east_stretched = new L.latLngBounds( [ south, west ], [ north, new_east ] );
                    } else {
                        if(new_bounds_east_stretched._northEast.lng < new_east)
                            new_bounds_east_stretched._northEast.lng = new_east;
                    }
                    //TODO shrink bounds!
                    continue;
                }
                console.log("shouldn't have reached bounds_bigger_on_howmany_sides == 1 after ????????????");
            }
            if(bounds_bigger_on_howmany_sides == 2) { //cases 11-16
                if( (boundswest_bigger && boundseast_bigger && !boundsnorth_bigger && !boundssouth_bigger) ||
                    (!boundswest_bigger && !boundseast_bigger && boundsnorth_bigger && boundssouth_bigger) )
                    continue;  // case 15+16

                    /*we only need an stretching box if:
                     *  xbox only if overlapping_x / width_to_height < overlap_y
                     *  ybox only if overlapping_x < overlap_y * width_to_height
                     *  -> either an x OR an y-box!
                     */
                if(boundsnorth_bigger && boundseast_bigger && !boundssouth_bigger && !boundswest_bigger) {
                    console.log("11-14: b topright, cib bottomleft ");
                    var overlap_x = current_inner_bbox._northEast.lng - west,
                        overlap_y = current_inner_bbox._northEast.lat - south;
                    if(overlap_x < overlap_y * width_to_height) {
                        //x stretching box
                        var b_N = current_inner_bbox._northEast.lat,
                            b_S = south,
                            xb_height = b_N - b_S;
                        if(xb_height <= min_height) continue; //console.log("no xb, to small");

                        var x_stretch_value = xb_height * width_to_height;

                        var xb_E_max = west + x_stretch_value,
                            b_E = (xb_E_max > east) ? east : xb_E_max;

                        var xb_W_max = current_inner_bbox._northEast.lng - x_stretch_value,
                            b_W = (xb_W_max < current_inner_bbox._southWest.lng) ? current_inner_bbox._southWest.lng : xb_W_max;
                        console.log("new xb");
                    } else {
                        //y stretching box
                        var b_E = current_inner_bbox._northEast.lng,
                            b_W = west,
                            yb_width = b_E - b_W;
                        if(yb_width <= min_width) continue; //console.log("no yb, to small");

                        var y_stretch_value = yb_width / width_to_height;

                        var yb_N_max = south + y_stretch_value,
                            b_N = (yb_N_max > north) ? north : yb_N_max;

                        var yb_S_max = current_inner_bbox._northEast.lat - y_stretch_value,
                            b_S = (yb_S_max < current_inner_bbox._southWest.lat) ? current_inner_bbox._southWest.lat : yb_S_max;
                        console.log("new yb");
                    }
                }
                if(boundsnorth_bigger && !boundseast_bigger && !boundssouth_bigger && boundswest_bigger) {
                    console.log("11-14: b topleft, cib bottomright ");
                    var overlap_x = east - current_inner_bbox._southWest.lng,
                        overlap_y = current_inner_bbox._northEast.lat - south;
                    if(overlap_x < overlap_y * width_to_height) {//x stretching box
                        var b_N = current_inner_bbox._northEast.lat,
                            b_S = south,
                            xb_height = b_N - b_S;
                        if(xb_height <= min_height) continue;//console.log("no xb, to small");

                        var x_stretch_value = xb_height * width_to_height;

                        var xb_E_max = current_inner_bbox._southWest.lng + x_stretch_value,
                            b_E = (xb_E_max > current_inner_bbox._northEast.lng) ? current_inner_bbox._northEast.lng : xb_E_max;

                        var xb_W_max = east - x_stretch_value,
                            b_W = (xb_W_max < west) ? west : xb_W_max;
                        console.log("new xb");
                    } else {//y stretching box
                        var b_E = east,
                            b_W = current_inner_bbox._southWest.lng,
                            yb_width = b_E - b_W;
                        if(yb_width <= min_width) continue; //console.log("no yb, to small");

                        var y_stretch_value = yb_width / width_to_height;

                        var yb_N_max = south + y_stretch_value,
                            b_N = (yb_N_max > north) ? north : yb_N_max;

                        var yb_S_max = current_inner_bbox._northEast.lat - y_stretch_value,
                            b_S = (yb_S_max < current_inner_bbox._southWest.lat) ? current_inner_bbox._southWest.lat : yb_S_max;
                        console.log("new yb");
                    }
                }
                if(!boundsnorth_bigger && !boundseast_bigger && boundssouth_bigger && boundswest_bigger) {
                    console.log("11-14: b bottomleft, cib topright ");
                    var overlap_x = east - current_inner_bbox._southWest.lng,
                        overlap_y = north - current_inner_bbox._southWest.lat;
                    if(overlap_x < overlap_y * width_to_height) {//x stretching box
                        var b_N = north,
                            b_S = current_inner_bbox._southWest.lat,
                            xb_height = b_N - b_S;
                        if(xb_height <= min_height) continue;//console.log("no xb, to small");

                        var x_stretch_value = xb_height * width_to_height;

                        var xb_E_max = current_inner_bbox._southWest.lng + x_stretch_value,
                            b_E = (xb_E_max > current_inner_bbox._northEast.lng) ? current_inner_bbox._northEast.lng : xb_E_max;

                        var xb_W_max = east - x_stretch_value,
                            b_W = (xb_W_max < west) ? west : xb_W_max;
                        console.log("new xb");
                    } else {//y stretching box
                        var b_E = east,
                            b_W = current_inner_bbox._southWest.lng,
                            yb_width = b_E - b_W;
                        if(yb_width <= min_width) continue; //console.log("no yb, to small");

                        var y_stretch_value = yb_width / width_to_height;

                        var yb_N_max = current_inner_bbox._southWest.lat + y_stretch_value,
                            b_N = (yb_N_max > current_inner_bbox._northEast.lat) ? current_inner_bbox._northEast.lat : yb_N_max;

                        var yb_S_max = north - y_stretch_value,
                            b_S = (yb_S_max < south) ? south : yb_S_max;
                        console.log("new yb");
                    }
                }
                if(!boundsnorth_bigger && boundseast_bigger && boundssouth_bigger && !boundswest_bigger) {
                    console.log("11-14: b bottomright, cib topleft ");
                    var overlap_x = current_inner_bbox._northEast.lng - west,
                        overlap_y = north - current_inner_bbox._southWest.lat;
                    if(overlap_x < overlap_y * width_to_height) {//x stretching box
                        var b_N = north,
                            b_S = current_inner_bbox._southWest.lat,
                            xb_height = b_N - b_S;
                        if(xb_height <= min_height) continue;//console.log("no xb, to small");

                        var x_stretch_value = xb_height * width_to_height;

                        var xb_E_max = west + x_stretch_value,
                             b_E = (xb_E_max > east) ? east : xb_E_max;

                        var xb_W_max = current_inner_bbox._northEast.lng - x_stretch_value,
                            b_W = (xb_W_max < current_inner_bbox._southWest.lng) ? current_inner_bbox._southWest.lng : xb_W_max;
                        console.log("new xb");
                    } else {//y stretching box
                        var b_E = current_inner_bbox._northEast.lng,
                            b_W = west,
                            yb_width = b_E - b_W;
                        if(yb_width <= min_width) continue; //console.log("no yb, to small");

                        var y_stretch_value = yb_width / width_to_height;

                        var yb_N_max = current_inner_bbox._southWest.lat + y_stretch_value,
                            b_N = (yb_N_max > current_inner_bbox._northEast.lat) ? current_inner_bbox._northEast.lat : yb_N_max;

                        var yb_S_max = north - y_stretch_value,
                            b_S = (yb_S_max < south) ? south : yb_S_max;
                        console.log("new yb");
                    }
                }
                stretching_box = new L.latLngBounds( [ b_S, b_W ], [ b_N, b_E ] );
                stretching_box.stretch = true; //add distinguishment from an orig box
                new_bboxes.push( stretching_box );
                continue;
            }
        }
 /*       if(new_bboxes) {
            console.log("checkIfInRequestedBboxesAndIfNotaddTo: new stretching bboxes to add:");
            console.log(new_bboxes);
        } else
            console.log("checkIfInRequestedBboxesAndIfNotaddTo: no net stretching bboxes to add.");*/

        //delete
        if(nr_of_deletions)
            console.log(nr_of_deletions + " to delete");
        for(var inner_bbox_i = 0; nr_of_deletions ; inner_bbox_i++) {
            if(! current_bound.inner_polyboxes[inner_bbox_i]) {
                current_bound.inner_polyboxes.splice(inner_bbox_i--,1);
                nr_of_deletions--;
            }
        }

        if(addbounds)
            current_bound.inner_polyboxes.push(bounds);

        for(var new_i=0; new_i < new_bboxes.length; new_i++)
            current_bound.inner_polyboxes.push(new_bboxes[new_i]);

        var stretchbounds = { 1: new_bounds_east_stretched, 2: new_bounds_west_stretched, 3: new_bounds_south_stretched, 4: new_bounds_north_stretched };
        for (i in stretchbounds)
            if(stretchbounds[i])
                current_bound.inner_polyboxes.push(stretchbounds[i]);

        console.log("checkIfInRequestedBboxesAndIfNotaddTo: " + current_bound.inner_polyboxes.length + " inner polyboxes now.");
        return false;
    }
    //it is completely outside from every outer bbox, create a new one
    var new_outer_box_deep_copy = new L.latLngBounds( [ south, west ], [ north, east ] );
    var bounds_deep_copy = new L.latLngBounds( [ south, west ], [ north, east ] );
    bboxes_requested.push( { outer_bbox: new_outer_box_deep_copy, inner_polyboxes: [ bounds_deep_copy ] } );
 //   console.log("checkIfInRequestedBboxesAndIfNotaddTo: outside other bboxes, add a new");
    return false;
}

//https://stackoverflow.com/questions/1484506/random-color-generator-in-javascript
function rainbow(numOfSteps, step) {
    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
    // Adam Cole, 2011-Sept-14
    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
    var r, g, b;
    var h = step / numOfSteps;
    var i = ~~(h * 6);
    var f = h * 6 - i;
    var q = 1 - f;
    switch(i % 6){
        case 0: r = 1; g = f; b = 0; break;
        case 1: r = q; g = 1; b = 0; break;
        case 2: r = 0; g = 1; b = f; break;
        case 3: r = 0; g = q; b = 1; break;
        case 4: r = f; g = 0; b = 1; break;
        case 5: r = 1; g = 0; b = q; break;
    }
    var c = "#" + ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
    return (c);
}

var debugLayerShown = false;
function toggleDebugLayer() {
    debugLayerShown = !debugLayerShown;
    disableLoadPOI = true;
    if(!debugLayerShown) {
        debugLayer.clearLayers();
        disableLoadPOI = false;
        return;
    }

    for(var i=0; i < bboxes_requested.length; i++) {
        var current_bound = bboxes_requested[i];
        for(var inner_bbox_i = 0; inner_bbox_i < current_bound.inner_polyboxes.length; inner_bbox_i++) {
            current_inner_bbox = current_bound.inner_polyboxes[inner_bbox_i];
            if(current_inner_bbox.stretch)
                console.log("stretch");
            var rect = L.rectangle(current_inner_bbox, {color: rainbow(256, Math.floor(Math.random() * 256)), weight: (current_inner_bbox.stretch) ? 2 : 8, fill: false}).on('click',clickOnLayer);
            debugLayer.addLayer(rect);
            //debugLayer.addLayer(L.rectangle(current_inner_bbox, {color: rainbow(256, 128), weight: 1, fill: false}));
        }

    }

    var dup_dump = {};
    var sum = 0;
    //find dups - there were a LOT of dups!
    for(var i=0; i < bboxes_requested.length; i++) {
        var current_bound = bboxes_requested[i];
        for(var inner_bbox_i = 0; inner_bbox_i < current_bound.inner_polyboxes.length; inner_bbox_i++) {
            current_inner_bbox = current_bound.inner_polyboxes[inner_bbox_i];
            var north = L.Util.formatNum(current_inner_bbox._northEast.lat,7),
                east  = L.Util.formatNum(current_inner_bbox._northEast.lng,7),
                south = L.Util.formatNum(current_inner_bbox._southWest.lat,7),
                west  = L.Util.formatNum(current_inner_bbox._southWest.lng,7);

            //sort dup_dumps on north,east,south,west coordinate
            // dump[north][east][south][west] = true if bbox exists
            if(!dup_dump[north]) {
                var west_obj = 1;
                var south_obj = {};
                    south_obj[west] = west_obj;
                var east_obj = {};
                    east_obj[south] = south_obj;
                var north_obj = {};
                    north_obj[east] = east_obj;
                dup_dump[north] = north_obj;
            } else {
                if(!dup_dump[north][east]) {
                    var west_obj = 1;
                    var south_obj = {};
                        south_obj[west] = west_obj;
                    var east_obj = {};
                        east_obj[south] = south_obj;
                    dup_dump[north][east] = east_obj;
                } else {
                    if(!dup_dump[north][east][south]) {
                        var west_obj = 1;
                        var south_obj = {};
                            south_obj[west] = west_obj;
                        dup_dump[north][east][south] = south_obj;
                    } else {
                        if(!dup_dump[north][east][south][west]) {
                            dup_dump[north][east][south][west] = 1;
                        } else {
                            dup_dump[north][east][south][west]++;
                        }
                    }
                }
            }
        }
        var different = 0;
        var dups = 0;
        for(n in dup_dump) {
            for(e in dup_dump[n]) {
                for(s in dup_dump[n][e]) {
                    for(w in dup_dump[n][e][s]) {
                        console.log("n"+n+" e"+e+" s"+s+" w"+w+" : "+ dup_dump[n][e][s][w]);
                        dups = dups + dup_dump[n][e][s][w] -1;
                        different++;
                    }
                }
            }
        }
        console.log(dup_dump);
        console.log("unique: "+different+" of " + current_bound.inner_polyboxes.length + ", " + dups + " dups");
    }
}

function clickOnLayer(e) {
    console.log(e.target._parts);
//    e.bringToFront();
}

var wikidata_mappings = { tags : {}, ids : {} },
    translations = { tags: {} };

/* how to get object descriptions:
ask wikidata for an object that has osm property $object_tag
https://wdq.wmflabs.org/api?q=string[214:%2264192849%22]
osm tag property is P1282

https://wdq.wmflabs.org/api?q=string[1282:"Tag:amenity=restaurant"]
* takes  object_tag = "key=value"
*/
function fetchTranslationsFromWikiData(object_tag) {
    if(object_tag.indexOf("=") == -1) {
        console.log("Error in fetchTranslationsFromWikiData: tag has to be in key=value format, not :'" + object_tag + "'");
        return;
    }

    var kv = object_tag.split("="),
        value = kv[1],
        osm_string = (value == "yes") ? "Key:" + kv[0] : "Tag:" + object_tag;


    if(!wikidata_mappings.tags[object_tag]) {
        var wikidata_query = 'https://wdq.wmflabs.org/api?q=string[1282:"' + osm_string + '"]'; //FIXME is it possible to retrieve page Q$id in one call?
        /*
           returns
                {"status":{
                    "error":"OK",
                    "items":1,
                    "querytime":"0ms",
                    "parsed_query":"STRING[1282:'Tag:amenity=restaurant']"},
                  "items":[11707]
                }
        */

        $.getJSON(wikidata_query + "&callback=?", function(data) {
            if(data.status.error != "OK") {
                console.log("wikidata returned " + data.status.error + " for query '" + data.status.parsed_query + "'.");
                return;
            }
            var tag_array = data.status.parsed_query.match(/1282:'(Tag|Key):([a-z:_0-9-]+)[=]?(.*)']$/);
            var tag = (tag_array[1] == "Key" ) ? tag_array[2] + "=yes" : tag_array[2] + "=" + tag_array[3];
            console.log("wdm: " + tag);
            if(data.items.length == 0) {
                console.log("nothing found in wikidata for query '" + data.status.parsed_query + "'.");
                console.log(data);
                wikidata_mappings.tags[tag] = -1;
                return;
            }
            var item;
            for(var i=0; i < data.items.length; i++) { //takes last one
                item = data.items[i];
                //console.log("got answer from wikidata for query '" + data.status.parsed_query + "': '" + item + "'.");
            }

            wikidata_mappings.tags[tag] = "Q" + item;
            wikidata_mappings.ids["Q" + item] = tag;

            var wikidata_object_query = "https://www.wikidata.org/wiki/Special:EntityData/Q" + item + ".json"; //Note: throws CORS error if item == undefined
            $.getJSON(wikidata_object_query, function(data) {
                if(!data.entities) {
                    console.log("wikidata returned no entities");
                    return;
                }
                for(q_number in data.entities) {
                    var item = data.entities[q_number];
                    translations.tags[wikidata_mappings.ids[q_number]] = item.labels;
                }
                setTimeout(setTranslationsInPopup,100);
            });
        });
        wikidata_mappings.tags[object_tag] = "loading";
    }
}

/* out of given tags, looks up "main keys" out of global var object_type_keys,
 * and returns a nice array with each tag split up in a single entry
 * tags[ "amenity=cafe; fast_food", "shop=bakery", ... ] → [ "amenity=cafe", "amenity=fast_food", "shop=bakery" ]
 */
function getMainTags(tags) {
    object_tags = [];
    for(var i=0; i < object_type_keys.length; i++) {
        var key = object_type_keys[i];
        if(tags[key]) {
            var value = tags[key];
            if(value.indexOf(";") >= 0) {
                var values = value.split(";");
                for (var j=0; j < values.length; j++) {
                    object_tags.push(key + "=" + values[j].trim());
                }
            }
            else
                object_tags.push(key + "=" + value);
        }
    }
    console.log(object_tags);
    return object_tags;
}

function loadPoi() {

  var notificationbar =  document.getElementById("notificationbar");
  if (map.getZoom() < overpass_config.minzoom ) {
    notificationbar.style.display = "block";
    if(on_start_loaded && window.createSideBar) {
      var json_date = new Date(pois_lz.osm3s.timestamp_osm_base);
      $('#tall').html("Lowzoom data: " + json_date.toLocaleString());
      $('#tnode').css("display", "hidden");
      $('#tway').css("display", "hidden");
      $('#trel').css("display", "hidden");
      return;
    }

    if(pois_lz) { 
      console.log(pois_lz);
      console.log("adding lz POIs");

      changeLoadingIndicator("loading_node",+1);
      handleNodes(pois_lz); 

      changeLoadingIndicator("loading_way",+1);
      handleWays(pois_lz); 

      changeLoadingIndicator("loading_relation",+1);
      handleRelations(pois_lz); 

      if(window.createSideBar) {
          var json_date = new Date(pois_lz.osm3s.timestamp_osm_base);
          $('#tall').html("Lowzoom data: " + json_date.toLocaleString());
          $('#tnode').css("display", "hidden");
          $('#tway').css("display", "hidden");
          $('#trel').css("display", "hidden");
      }

      on_start_loaded = 1;
    }

    return;
  }
  notificationbar.style.display = "none";

  var current_zoom = map.getZoom();
  console.log("loadPOI called, z" + current_zoom);
  if(current_zoom > old_zoom && current_zoom != overpass_config.minzoom) {
    console.log("zooming in, POI already loaded, nothing to to");
    old_zoom = current_zoom;
    return;
  }
  old_zoom = current_zoom;

  if(disableLoadPOI)
      return;

  // if Graz (start position, gets called once first) do nothing
      var centre = map.getCenter();
  if (centre.lat == 47.07 && centre.lng == 15.43) {
      var splitstr = window.location.href.split('#');
      if (splitstr[1]) {
          var coords_href = splitstr[1].split('/');
          if ( coords_href[1] == 47.07 && coords_href[2] == 15.43 )
              console.log("look, we are really in Graz");
          else {
              console.log("1st call, return");
              return;
          }
      }
  }

  var bounds = map.getBounds();
  if(checkIfInRequestedBboxesAndIfNotaddTo(bounds))
      return;

  function url_ify(link,linktext) {
    if (/@/.test(link)) {
      return '<a href="mailto:' + link + '">' + secHTML(linktext) + '</a>';
    } else if (/^[0-9-+\s]*$/.test(link)) {
      return '<a href="tel:' + link + '">' + linktext.replace(/\s/g,"&nbsp;") + '</a>'; //FIXME how to prefix fax nrs?
    } else {
      if ( ! /^http/.test(link) ) //http[s] is implicit here
        link = "http://" + link;
      return $("<div>").append( $('<a>').attr('href', link).text(linktext) ).html();
    }
  }

  function fillPopup(tags,type,id,lat,lon) {

    var tags_to_ignore = [ "name" , "ref", "addr:street", "addr:housenumber", "addr:postcode", "addr:city", "addr:suburb", "addr:country","website","url","contact:website","contact:url","email","contact:email","phone","contact:phone","fax","contact:fax","created_by","area","layer","room","indoor","twitter","contact:twitter","link:twitter", "contact:google_plus", "google_plus", "link:google_plus", "contact:facebook","facebook","link:facebook","facebook:page","website:facebook","url:facebook","contact:youtube","youtube","link:youtube","wheelchair","wikipedia","wikidata","image","source","lit","segregated","motor_vehicle" ];

    var r = $('<table>');

    var href = location.href.replace(/#.*$/,'').replace(/[&?]popup=(node|way|relation)[0-9]+/,'');
    var hasQuery = href.indexOf("?") + 1;
    var appendix = (hasQuery ? "&" : "?") + "popup=" + type + id;

    var popup_href =  href + appendix + '#' + map.getZoom() + '/' + lat + '/' + lon;

    r.append($('<tr>')
            .attr('class','header')
            .append($('<td>').append('<a href="' + popup_href + '" title="Link to this POI on this map">Permalink</a>'))
            .append($('<td>').append('<a href="http://editor.transformap.co/#background=Bing&id=' + type.substring(0,1) + id + '&map=19/' + lon + '/' + lat + '" title="Edit this object with iD for TransforMap" target=_blank>Edit</a>'))
        );
    r.append($('<tr>')
            .attr('class','header')
            .append($('<td>').append('<a href="https://www.openstreetmap.org/' + type + "/" + id + '" title="Link to ' + type + ' ' + id + ' on OpenStreetMap" target=_blank><img src="'+assethost+'assets/20px-Mf_' + type + '.svg.png" />' + type.substring(0,1) + id + '</a>'))
            .append($('<td>').append('<a href="http://map.project-osrm.org/?dest=' + lat + ',' + lon + '&destname=' + tags['name'] + '" target=_blank title="Route here with OSRM">Route Here</a>'))
        );
    var wikipedia_link = "";

    function addSocialMediaLinks(tags) {
        var string = "";

        for (key in tags) {
            var value = tags[key].replace(/^http[s]?:\/\//,""); //we add https later, regardless of link
            var valuestring = decodeURIComponent(value); 
            var img = "<img src='"+assethost+"assets/";

            if(/twitter/.test(key)) {
                if(! /twitter.com\//.test(value)) valuestring = "twitter.com/" + valuestring;
                img += "twitter.16.png' title='on Twitter' />";
            } else
            if(/facebook/.test(key) || (/facebook.com\/|fb.com\//.test(value) && /website/.test(key)) ) {
                if(! /facebook.com\/|fb.com\//.test(value)) valuestring = "facebook.com/" + valuestring;
                img += "facebook.16.png' title='Facebook-page' />";
            } else
            if(/google_plus/.test(key)) {
                if(! /plus.google.com\//.test(value)) valuestring = "plus.google.com/" + valuestring;
                img += "g+.16.png' title='Google+ page' />";
            } else
            if(/youtube/.test(key)) {
                if(! /youtube.com\//.test(value)) valuestring = "youtube.com/" + valuestring;
                img += "YouTube.16.png' title='YouTube channel' />";
            } else
            if(/^wikipedia/.test(key)) {
                var lang = key.match(/^(?:wikipedia:)([a-z-]{2,7})$/) || ""; // if value starts with e.g. "de:ARTICLE", this works in WP anyway
                if(! /wikipedia\./.test(value)) valuestring = "wikipedia.org/wiki/" + valuestring;
                if(lang) valuestring = lang[1] + "." + valuestring;

                img += "wikipedia.16.png' title='Wikipedia Article' />";
                wikipedia_link = "https://" + valuestring;
            } else
            if(/wikidata/.test(key)) {
                if(! /wikidata.org\//.test(value)) valuestring = "wikidata.org/wiki/" + valuestring;
                img += "wikidata.16.png' title='Wikidata Entry' />";
            } else
                continue;

            valuestring = "https://" + valuestring;

            string += "<a href='" + valuestring + "'>" + img + "</a> ";
        }

        return string;
    }

    var social_media_links = "";//addSocialMediaLinks(tags);

    if(tags["addr:street"] || tags["addr:housenumber"] || tags["addr:postcode"] || tags["addr:city"] || tags["addr:suburb"] || tags["addr:country"]
            || tags["website"] || tags["url"] || tags["contact:website"] || tags["contact:url"] || tags["email"] || tags["contact:email"]
            || tags["phone"] || tags["contact:phone"] || tags["fax"] || tags["contact:fax"] || tags["wheelchair"] || social_media_links) {
        r.append($('<tr>')
                .attr('class','header')
                .append($('<td>').append(
              (tags["addr:street"] ? tags["addr:street"] : "" ) +
              (tags["addr:housenumber"] ? ("&nbsp;" + tags["addr:housenumber"]) : "" ) + 
              ( (tags["addr:housenumber"] || tags["addr:street"]) ? ",<br>" : "" ) +
              (tags["addr:postcode"] ? (tags["addr:postcode"] + " ") : "" ) +
              (tags["addr:city"] ? tags["addr:city"] : "" ) + 
              (tags["addr:suburb"] ? "-" + tags["addr:suburb"] : "") +
              (tags["addr:country"] ? "<br>" + tags["addr:country"] : "") +
              (tags["wheelchair"] ? ("<br><img class='wheelchair " + tags["wheelchair"] + "' src='"+assethost+"assets/disability-18.png' title='wheelchair: " + 
                                     ( (tags["wheelchair"] == "yes") ? "100% accessible" :
                                       ( (tags["wheelchair"] == "limited" ) ? "limited (assist needed)" :
                                         ( (tags["wheelchair"] == "no") ? "no" : tags["wheelchair"] ) ) ) +
                                     ( tags["wheelchair:description"] ? ("\n" + secHTML(tags["wheelchair:description"])) : "" )
                                     + "'/>") : "")+
              (tags["wheelchair:description"] ? ("\n" + secHTML(tags["wheelchair:description"])) : "" )

              ))
        .append($('<td>').append(
            (tags["website"] ? (url_ify(tags["website"],"website") + "<br>") : "" ) +
            (tags["url"] ? (url_ify(tags["url"],"website") + "<br>") : "" ) +
            (tags["contact:website"] ? (url_ify(tags["contact:website"],"website") + "<br>") : "" ) +
            (tags["contact:url"] ? (url_ify(tags["contact:url"],"website") + "<br>") : "" ) +

            (tags["email"] ? (url_ify(tags["email"],"email") + "<br>") : "" )+
            (tags["contact:email"] ? (url_ify(tags["contact:email"],"email") + "<br>") : "" ) +

            (tags["phone"] ? (url_ify(tags["phone"], "Tel:&nbsp;" + tags["phone"]) + "<br>") : "" ) +
            (tags["contact:phone"] ? (url_ify(tags["contact:phone"], "Tel:&nbsp;" + tags["contact:phone"]) + "<br>") : "" ) + 

            (tags["fax"] ? (url_ify(tags["fax"], "Fax:&nbsp;" + tags["fax"]) + "<br>") : "" ) +
            (tags["contact:fax"] ? (url_ify(tags["contact:fax"], "Fax:&nbsp;" + tags["contact:fax"]) + "<br>") : "" ) +

            social_media_links

          )));
    }
    var wp_articlename = "";
    for (key in tags) {
        if(/^wikipedia/.test(key)) {
            var value = tags[key];
            var lang = key.match(/^(?:wikipedia:)([a-z-]{2,7})$/) || value.match(/^([a-z-]{2,7}):/) || ""; 
            lang = (lang) ? lang[1] : "en";

            if(! /wikipedia\./.test(value))
                wp_articlename = value;
            else {
                wp_articlename = value.replace(/^http[s]?:\/\//,'')
                                      .replace(/^www\./,'')
                                      .replace(/^([a-z-]{2,7})\.wikipedia/,'')
                                      .replace(/^wikipedia\./,'')
                                      .replace(/^[a-z]{2,3}\/wiki\//,'');
            }
            wp_articlename = wp_articlename.replace(/^[a-z-]{2,7}:/,'');
            var article_id = "wpimage_" + wp_articlename; // we must omit LANG here, as we don't have a way to get lang in callback function run on wikipedia's answer FIXME breaks on 2 wp links, when the first one is non-english...

            var req_string = "https://" + lang + ".wikipedia.org/w/api.php?action=query&titles=" + wp_articlename + "&prop=pageimages&format=json&pithumbsize=276";

            $.getJSON(req_string + "&callback=?", function(data) {
                    for(obj_id in data.query.pages) {
                        var item = data.query.pages[obj_id];
 //                       console.log("got answer from wikipedia for " + item.title + ".");
                        if(item.thumbnail) {
                            wikipedia_images["wpimage_" + item.title] = item.thumbnail.source;
                        } else {
                            wikipedia_images["wpimage_" + item.title] = "UNDEF";
                            console.log("no WP image for " + item.title);
                        }
                    }
                    setTimeout(setImageInPopup,100); //needed here too if site called with popup open
            });

            r.append($('<tr>')
                    .attr('class','header')
                    .append("<td colspan=2 id='wp-image'><img id='" +article_id + "' title='" + wp_articlename + "'/><a href='" + wikipedia_link +"'>© Wikipedia</a></td>" )//only one popup shall be open at a time for the id to be unique
                    );

        }
    }
    if(tags['image']) {
        if(tags['image'].match(/^File:/)) {
            var imagename = tags['image'].replace(/ /,"_");
            var req_string = "https://commons.wikimedia.org/w/api.php"
                + "?action=query"
                + "&format=json"
                + "&titles=" + imagename
                + "&prop=imageinfo"
                + "&iiprop=url"
                + "&iiurlwidth=276";
            $.getJSON(req_string+ "&callback=?", function(data) {
                for(obj_id in data.query.pages) {
                    var item = data.query.pages[obj_id];
                    console.log("got answer from wikimedia commons for " + item.title + ".");
                    if(item.imageinfo[0]) {
                        var item_name = decodeURIComponent(item.imageinfo[0].descriptionurl.replace(/.*\//,'')); //item.title is with spaces instead of underscores.
                        wikipedia_images["wpimage_" + item_name] = item.imageinfo[0].thumburl;
                    } else {
                        wikipedia_images["wpimage_" + item.title.replace(/ /,"_") ] = "UNDEF";
                        console.log("no WP image for " + item.title);
                    }
                }
                setTimeout(setImageInPopup,100); //needed here too if site called with popup open
            });

            r.append($('<tr>')
                    .attr('class','header')
                    .append("<td colspan=2 id='wp-image'><img id='" + imagename + "' title='" + imagename + "'/><a href='https://commons.wikimedia.org/wiki/" + imagename + "'>© Wikimedia Commons</a></td>" )
                        // FIXME attribution/License must be set on return of call
                    );


        }
        else if( ! (wp_articlename && tags['image'].match(/wiki(pedia|media)/)) ) {
            r.append($('<tr>')
                    .attr('class','header')
                    .append("<td colspan=2 id='image'><img src='" + tags['image'] + "' style='width:276px;' /></td>" )//only one popup shall be open at a time for the id to be unique
                );
        }
    }



    for (key in tags) {
      var value = tags[key];
      if ( tags_to_ignore.indexOf(key) >= 0) 
        continue;

      if ( key == 'website' || key == 'url' || key == 'contact:website' ||  key == 'contact:url') { 
        var teststr=/^http/; //http[s] is implicit here
        if ( ! teststr.test(value) )
          value = "http://" + value;
          
        var htlink = '<a href="' + value + '">' + value + '</a>';
        r.append($('<tr>').append($('<th>').text(key)).append($('<td>').append(htlink)));
      } else if ( /^wikipedia/.test(key)) { 
        var lang = key.match(/^(?:wikipedia:)([a-z-]{2,7})$/) || ""; // if value starts with e.g. "de:ARTICLE", this works in WP anyway
        var begin = (! /^http/.test(value)) ? "https://" + ((lang) ? (lang[1] + ".") : "") + "wikipedia.org/wiki/" : ""; //http[s] is implicit here

        var htlink = $('<a>').attr('href', begin + value).text(decodeURIComponent(value));
        r.append($('<tr>').addClass('tag').append($('<th>').text(key)).append($('<td>').append(htlink)));
      } else if ( key == 'wikidata' ) { 
        var begin = (! /^http/.test(value)) ? "https://www.wikidata.org/wiki/" : ""; //http[s] is implicit here

        var htlink = $('<a>').attr('href', begin + value).text(decodeURIComponent(value));
        r.append($('<tr>').addClass('tag').append($('<th>').text(key)).append($('<td>').append(htlink)));
      } else if (key == 'contact:email' || key == 'email') {
        if ( ! /^mailto:/.test(value) )
          value = "mailto:" + value;

        var htlink = $('<a>').attr('href', value).text(value);
        r.append($('<tr>').addClass('tag').append($('<th>').text(key)).append($('<td>').append(htlink)));
      } else {
        var key_escaped = secHTML(key);
        var value_escaped = secHTML(value);

        var keytext = key_escaped.replace(/:/g,":<wbr />");
        var valuetext = "<span>=&nbsp;</span>" + value_escaped.replace(/;/g,"; ");

        /* display label:* instead of key */ 
        /*
        var found = 0; // use for break outer loops

        for ( groupname in taxonomy ) { // e.g. "fulfils_needs" : {}=group 
          group = taxonomy[groupname];

          var count_items = group["items"].length;
          for (var i = 0; i < count_items; i++) { // loop over each item in group["items"]
            item = group["items"][i];
            if(item["osm:key"] == keytext) {
              keytext = "<em>" + item.label["en"] + "</em>"; //<em> for displaying a translated value
              found = 1;
              break;
            }
          } 
          if(found == 1)
            break; // for ( groupname in taxonomy ) 
        } 
        */

        r.append($('<tr>').addClass('tag')
            .append($('<th>').append(keytext))
            .append($('<td>').append(valuetext))
            );
      }

    } // end for (key in tags)

    var s = $('<div>');
    s.append(r);
    var retval = $('<div>').append(s);

    var object_tags = getMainTags(tags),
        object_text = "unknown feature";

    if(object_tags.length) {
        object_tags.forEach(function (currentValue) {
            fetchTranslationsFromWikiData(currentValue);
        });

        object_text = object_tags.join(", ");
    }

    retval.prepend($('<h3>')
            .attr("translated","untranslated")
            .attr("title", (object_text == "unknown feature") ? "This Object has no known OSM tag set" : object_text )
            .attr("sourcetext", object_text )
            .append($("<span>")
                .text(object_text))
            .append($("<span>")
                .text("?")
                .attr("title","Click here to show where this value comes from"))
                    );
    retval.prepend($('<h1>').text(tags["name"]));
    return retval.html();
  }

  function bindPopupOnData(data) {
    // first: check if no item with this osm-id exists...
    var hashtable_key = data.type + data.id; // e.g. "node1546484546"
    if(marker_table[hashtable_key] == 1) //object already there
      return;
    marker_table[hashtable_key] = 1;

    if(!data.tags) {
      console.log("no tags on:");
      console.log(data);
      return;
    }
    if(data.tags.disused == "yes" || data.tags.opening_hours == "off" || data.tags["disused:shop"] || data.tags["disused:amenity"]) {
      console.log("object disused:" + data.type + data.id);
      return;
    }

    var icon_url = chooseIconSrc(data.tags,overpass_config.icon_size);

    var icon_class = (overpass_config.class_selector_key && data.tags[overpass_config.class_selector_key["key"]]) ? overpass_config.class_selector_key["key"] : "color_undef";

    var needs_icon = L.icon({
      iconUrl: icon_url,
      iconSize: new L.Point(overpass_config.icon_size, overpass_config.icon_size),
      iconAnchor: new L.Point(overpass_config.icon_size / 2, overpass_config.icon_size / 2),
      popupAnchor: new L.Point(0, - overpass_config.icon_size / 2),
      className: "k-" + icon_class// + " k-" + icon_class
    });

    var pdata = {
      lat: data.lat,
      lon: data.lon,
      id: data.id,
      type: data.type,
      icon: needs_icon,
      title: data.tags.name,
      popup: fillPopup(data.tags,data.type,data.id,data.lat,data.lon),
      tags: data.tags
    }
    var pmarker = new PruneCluster.Marker(data.lat, data.lon, pdata);

    return pmarker;
  }

  function nodeFunction(data) {
    if (! data.tags)
      return null;

    var is_one_of_queried=0; // for filtering out tagged nodes which are part of ways
    for ( var i = 0; i < overpass_config.q_array.length; i++) {
        var res = overpass_config.q_array[i][0].replace(/["]?/,"").replace(/["].*$/,"");
        if(data.tags[res]) {
            is_one_of_queried=1;
            break;
        }
    }
    if (! data.tags.name && ! is_one_of_queried)
        return;
    if (! data.tags.name && data.tags.entrance)
      return null;
    return bindPopupOnData(data);
  }
  function wayFunction(data) {

    //calculate centre of polygon

    var centroid;

    //determine if closed way: first an last point are the same:
    var last_node_nr = data.geometry.coordinates.length - 1;
    var lineString = data.geometry.coordinates

    if(lineString[0][0] == lineString[last_node_nr][0] && lineString[0][1] == lineString[last_node_nr][1])
      centroid = $.geo.centroid(data.geometry); //only works correct on closed ways

    else { //calculate a point in the middle of the linestring
      var overall_length = 0;

      /** thx @tyrasd
       *
       * Calculate the approximate distance between two coordinates (lat/lon)
       *
       * © Chris Veness, MIT-licensed,
       * http://www.movable-type.co.uk/scripts/latlong.html#equirectangular
       */
      function distance(λ1,φ1,λ2,φ2) {
          var R = 6371000;
          Δλ = (λ2 - λ1) * Math.PI / 180;
          φ1 = φ1 * Math.PI / 180;
          φ2 = φ2 * Math.PI / 180;
          var x = Δλ * Math.cos((φ1+φ2)/2);
          var y = (φ2-φ1);
          var d = Math.sqrt(x*x + y*y);
          return R * d;
      };

      for(var pointcointer=1; pointcointer <= last_node_nr; pointcointer++) {
        overall_length += distance(lineString[pointcointer-1][0],lineString[pointcointer-1][1],
                                       lineString[pointcointer][0],lineString[pointcointer][1]);
      }
      // go from the beginning, sum up lengths of segments until > overall/2
      // calculate percentage where the point should be, set it.
      var summed_length = 0;
      var target_length = overall_length/2;
      var middle_segment_start_nr = -1;
      var segment_length = 0;
      var distance_factor_from_middle_segment_start_nr = 0;

      for(var segment_nr = 0; segment_nr <= last_node_nr; segment_nr++) {
        segment_length = distance(lineString[segment_nr][0],lineString[segment_nr][1],
            lineString[segment_nr + 1][0],lineString[segment_nr + 1][1]);

        summed_length += segment_length;

        if(summed_length >= target_length) {
          middle_segment_start_nr = segment_nr;
          var distance_from_middle_segment_start_nr = segment_length - (summed_length - target_length);
          distance_factor_from_middle_segment_start_nr = distance_from_middle_segment_start_nr / segment_length;
          break;
        }
      }
      centroid = $.geo.centroid(data.geometry); //to create object
      centroid.coordinates[0] = lineString[middle_segment_start_nr][0] + 
        distance_factor_from_middle_segment_start_nr * (lineString[middle_segment_start_nr + 1][0] - lineString[middle_segment_start_nr][0]);
      centroid.coordinates[1] = lineString[middle_segment_start_nr][1] + 
        distance_factor_from_middle_segment_start_nr * (lineString[middle_segment_start_nr + 1][1] - lineString[middle_segment_start_nr][1]);
    }
     
    centroid.tags = data.tags;
    centroid.id = data.id;
    centroid.type = data.type;
    centroid.lon = centroid.coordinates[0];
    centroid.lat = centroid.coordinates[1];

    var style = {
      color: "#FF0000",
      fill:false, //set only true on areas
      fillColor:'blue',
      fillOpacity:0.5,
      weight: 6
    };

    geometry_layer.addData({ // bind on geometry
      type: 'Feature',
      geometry: data.geometry,
      properties: {name: fillPopup(data.tags,data.type,data.id,centroid.lat,centroid.lon), style: style}
    });

    return bindPopupOnData(centroid); //bind on centroid
  }
  function relationFunction(data) {
    // calculate mean coordinates as center
    // for all members, calculate centroid
    // then calculate mean over all nodes and centroids.
    var centroids = [];
    var sum_lon = 0;
    var sum_lat = 0;
    //console.log(data);
    for (var i = 0; i < data.members.length; i++) {
      var p = data.members[i];
      var centroid;
      switch (p.type) {
        case 'node':

          if(!p.obj) {
            console.log("!p.obj: ");
            console.log(p);
          } else {
            centroid = p.obj.coordinates;
            centroids.push(centroid);
          }
          break;
        case 'way':
          //console.log(p);
          if (p.role == "outer") {// FIXME add handling of rel members
            if(!p.obj) {
              console.log("!p.obj: ");
              console.log(p);
            } else {
              var centroid_point = $.geo.centroid(p.obj.geometry);
              centroid = centroid_point.coordinates;
              centroids.push(centroid);
            }
          } 
          break;
      }
      if(centroid){
        if(centroid.length != 0) {
          sum_lon += centroid[0];
          sum_lat += centroid[1];
        } else
          console.log("centroid empty!");
      } else
        console.log("centroid nonexisting!");

    }
    //console.log(centroids);
    var sum_centroid = { 
      id : data.id,
      lon : sum_lon / data.members.length,
      lat : sum_lat / data.members.length,
      tags : data.tags,
      type : data.type
    }

    //console.log(sum_centroid);
    return bindPopupOnData(sum_centroid);
    // todo: in the long term, all areas should be displayed as areas (as in overpass turbo)
  }

  function handleNodes(overpassJSON) {
    var pid;
    for(i_pid in pids.node.active) {
        if(pids.node.active[i_pid].state == "timeouted")
            continue;
        if(JSON.stringify(pids.node.active[i_pid].bounds) === JSON.stringify(overpassJSON.bounds)) {
            pid = i_pid;
            delete pids.node.active[i_pid];
            break;
        }
    }
    console.log("handleNodes called (pid " + pid + ")");

    var new_markers = [];
    for (var i = 0; i < overpassJSON.elements.length; i++) {
      var p = overpassJSON.elements[i];
      if(p.type != 'node')
        continue;
      p.coordinates = [p.lon, p.lat];
      p.geometry = {type: 'Point', coordinates: p.coordinates};

      var retval = nodeFunction(p);
      if (retval) {
        if(window.filters)
            retval.filtered = ! getFilterStatusOnPoi(retval);
        new_markers.push(retval);
      }
    }
    var number = new_markers.length;
    if(number) {
        markers.RegisterMarkers(new_markers);
        markers.ProcessView();
        if(window.createSideBar) {
            var json_date = new Date(overpassJSON.osm3s.timestamp_osm_base);
            $('#tnode').css("display", "block");
            $('#tnode').html(json_date.toLocaleString());
            updateElementCount();
            updatePOIlist();
            if(window.filters)
                updateFilterCount(); // TODO it is relatively inefficient to run check all filters every time a single entry is changed - later only the filters affected on change should be counted 
        }
        new_markers = [];
    }

    changeLoadingIndicator("loading_node", -1);
    if(! open_popup_on_load.already_shown && open_popup_on_load.type == "node") {
        open_popup_on_load.already_shown = true;
        setTimeout(function () {
              MytogglePopup(open_popup_on_load.type, open_popup_on_load.id);
        },200 );
    }
    console.log("handleNodes (pid " + pid + ") done, " + number + " added.");
  }
  function handleWays(overpassJSON) {
    var pid;
    for(i_pid in pids.way.active) {
        if(pids.way.active[i_pid].state == "timeouted")
            continue;
        if(JSON.stringify(pids.way.active[i_pid].bounds) === JSON.stringify(overpassJSON.bounds)) {
            pid = i_pid;
            delete pids.way.active[i_pid];
            break;
        }
    }
    if(!pid) {
        //console.log("handleWays: JSON bounds:");
        //console.log(overpassJSON.bounds);
        //console.log("handleWays: pid way objects:");
        //console.log(pids.way.active);

        //FIXME BUG: the french overpass server (used for ways) doesn't supply the bounds...
        for(i_pid in pids.way.active) {
            if(pids.way.active[i_pid].state == "timeouted")
                continue;
            pid = i_pid;
            break;// get first one
        }
        delete pids.way.active[pid];
    }
    console.log("handleWays called (pid " + pid + ")");

    var new_markers = [];
    var nodes = {};
    for (var i = 0; i < overpassJSON.elements.length; i++) {
      var p = overpassJSON.elements[i];
      switch (p.type) {
        case 'node':
          p.coordinates = [p.lon, p.lat];
          p.geometry = {type: 'Point', coordinates: p.coordinates};
          nodes[p.id] = p;
          break;
        case 'way':
          p.coordinates = p.nodes.map(function (id) {
            return nodes[id].coordinates;
          });
          p.geometry = {type: 'LineString', coordinates: p.coordinates};

          var retval = wayFunction(p);
          if (retval) {
            if(window.filters)
                retval.filtered = ! getFilterStatusOnPoi(retval);
            new_markers.push(retval);
          }
      }
    }

    var number = new_markers.length;
    if(number) {
        markers.RegisterMarkers(new_markers);
        markers.ProcessView();
        if(window.createSideBar) {
            var json_date = new Date(overpassJSON.osm3s.timestamp_osm_base);
            $('#tway').css("display", "block");
            $('#tway').html(json_date.toLocaleString());
            updateElementCount();
            updatePOIlist();
            if(window.filters)
                updateFilterCount(); // TODO it is relatively inefficient to run check all filters every time a single entry is changed - later only the filters affected on change should be counted 
        }
        new_markers = [];
    }

    changeLoadingIndicator("loading_way", -1);
    if(! open_popup_on_load.already_shown && open_popup_on_load.type == "way") {
        open_popup_on_load.already_shown = true;
        setTimeout(function () {
              MytogglePopup(open_popup_on_load.type, open_popup_on_load.id);
        },200 );
    }
    console.log("handleWays (pid " + pid + ") done, " + number + " added.");
  }
  function handleRelations(overpassJSON) {
    var pid;
    for(i_pid in pids.relation.active) {
        if(pids.relation.active[i_pid].state == "timeouted")
            continue;
        if(JSON.stringify(pids.relation.active[i_pid].bounds) === JSON.stringify(overpassJSON.bounds)) {
            pid = i_pid;
            delete pids.relation.active[i_pid];
            break;
        }
    }
    console.log("handleRelations called (pid " + pid + ")");
    var nodes = {}, ways = {};

    //overpass returns elements unsorted: rels, nodes, ways - should be nodes, ways, rels
    var rels = []; // to handle them last

    var new_markers = [];
    //console.log(overpassJSON.elements);
    for (var i = 0; i < overpassJSON.elements.length; i++) {
      var p = overpassJSON.elements[i];
      switch (p.type) {
        case 'node':
          p.coordinates = [p.lon, p.lat];
          p.geometry = {type: 'Point', coordinates: p.coordinates};
          nodes[p.id] = p;
          break;
        case 'way':
          p.coordinates = p.nodes.map(function (id) {
            return nodes[id].coordinates;
          });
          p.geometry = {type: 'LineString', coordinates: p.coordinates};
          ways[p.id] = p;
          break;
        case 'relation':
          rels.push(p);
          break;
      }
    }
    //console.log("nodes count:" + Object.keys(nodes).length + "; ways count:" + Object.keys(ways).length + "; rel count: " + rels.length);

    // handle relations last
    for (var i = 0; i < rels.length; i++) {
      var p = rels[i];
      p.members.map(function (mem) {
          if (mem.type == 'node') {

            if(!nodes[mem.ref])
              console.log("mem.type=node missing: " + mem.ref);

            mem.obj = nodes[mem.ref];
          } else if (mem.type == 'way') {

            if(!ways[mem.ref])
              console.log("mem.type=way missing: " + mem.ref); //FIXME this seems to come from overpass query not returning childs of rels... change query!

            mem.obj = ways[mem.ref];
          } else
            console.log("mem.type=" + mem.type);// FIXME handle rels of rels
      });
      // p has type=relaton, id, tags={k:v}, members=[{role, obj}]
      var retval = relationFunction(p);
      if (retval) {
          if(window.filters)
            retval.filtered = ! getFilterStatusOnPoi(retval);
          new_markers.push(retval);
      }
    }
    
    var number = new_markers.length;
    if(number) {
        markers.RegisterMarkers(new_markers);
        markers.ProcessView();
        if(window.createSideBar) {
            var json_date = new Date(overpassJSON.osm3s.timestamp_osm_base);
            $('#trel').css("display", "block");
            $('#trel').html(json_date.toLocaleString());
            updateElementCount();
            updatePOIlist();
            if(window.filters)
                updateFilterCount(); // TODO it is relatively inefficient to run check all filters every time a single entry is changed - later only the filters affected on change should be counted 
        }
        new_markers = [];
    }

    changeLoadingIndicator("loading_relation", -1);
    if(! open_popup_on_load.already_shown && open_popup_on_load.type == "relation") {
        open_popup_on_load.already_shown = true;
        setTimeout(function () {
              MytogglePopup(open_popup_on_load.type, open_popup_on_load.id);
        },200 );
    }
    console.log("handleRelations (pid " + pid + ") done, " + number + " added.");
  }

  var query = overpass_query;

  var node_query = overpass_query_nodes;
  var way_query = overpass_query_ways;
  var rel_query = overpass_query_rels;
  var op_bounds = bounds.toOverpassBBoxString();

  var allUrl = query.replace(/BBOX/g, op_bounds);

  var node_url = node_query.replace(/BBOX/g, op_bounds);
  var way_url = way_query.replace(/BBOX/g, op_bounds);
  var rel_url = rel_query.replace(/BBOX/g, op_bounds);

  var bounds_rounded = { // the 'bounds' is the only way where we can identify to which pid a returned overpassJSON belongs
      minlat : L.Util.formatNum(bounds._southWest.lat,4),
      minlon : L.Util.formatNum(bounds._southWest.lng,4),
      maxlat : L.Util.formatNum(bounds._northEast.lat,4),
      maxlon : L.Util.formatNum(bounds._northEast.lng,4)
  }

  changeLoadingIndicator("loading_node", +1);
  var this_pid = pids.node.counter++;
  pids.node.active[this_pid] = { state : "running", bounds : bounds_rounded } ;
  console.log("loadPOI: before JSON call pid node"+this_pid+": " + node_url);
  $.getJSON(node_url, handleNodes);
  setTimeout(function () {
      timeOutOverpassCall("node", this_pid);
  },1000*overpass_config.timeout);

  changeLoadingIndicator("loading_way", +1);
  this_pid = pids.way.counter++;
  pids.way.active[this_pid] = { state : "running", bounds : bounds_rounded } ;
  console.log("loadPOI: before JSON call pid way"+this_pid+": " + way_url);
  $.getJSON(way_url, handleWays);
  setTimeout(function () {
      timeOutOverpassCall("way", this_pid);
  },1000*overpass_config.timeout);

//  changeLoadingIndicator("loading_relation", +1);
//  this_pid = pids.relation.counter++;
//  pids.relation.active[this_pid] = { state : "running", bounds : bounds_rounded } ;
//  console.log("loadPOI: before JSON call pid rel"+this_pid+": " + rel_url);
//  $.getJSON(rel_url, handleRelations);
//  setTimeout(function () {
//      timeOutOverpassCall("relation", this_pid);
//  },1000*overpass_config.timeout);
}

function timeOutOverpassCall(osm_type,pid) {
    if (pids[osm_type].active[pid] && pids[osm_type].active[pid].state == "running") {
        changeLoadingIndicator("loading_" + osm_type, -1);
        pids[osm_type].active[pid].state = "timeouted";
        console.log("timeOutOverpassCall: pid " + osm_type + pid + " timeouted after " + overpass_config.timeout + " seconds.");
    }
}

function updateLinks() {
  var centre = map.getCenter();
  var query = encodeURIComponent(overpass_ql_text);
  turbolink = "<a href=\'http://overpass-turbo.eu/?Q=" 
      + query.replace(/BBOX/g, map.getBounds().toOverpassBBoxString()) 
      + '&R&C=' + centre.lat + ';' + centre.lng + ';' + map.getZoom() 
      + '\' title="Export OSM data with Overpass Turbo">Export data <img src="'+assethost+'assets/turbo.png" height=12px style="margin-bottom:-2px"/></a>';

  if(window.updateMapSwitcherLinks)
      updateMapSwitcherLinks();
}


/* taken from https://github.com/ardhi/Leaflet.MousePosition 
Licence: MIT, see file MIT-LICENCE-Leaflet.MousePosition.txt */


L.Control.MousePosition = L.Control.extend({
  options: {
    position: 'bottomright',
    separator: ' : ',
    emptyString: 'Unavailable',
    lngFirst: false,
    numDigits: 5,
    lngFormatter: undefined,
    latFormatter: undefined,
    prefix: ""
  },

  onAdd: function (map) {
    this._container = L.DomUtil.create('div', 'leaflet-control-mouseposition');
    L.DomEvent.disableClickPropagation(this._container);
    map.on('mousemove', this._onMouseMove, this);
    updateLinks();
    this._container.innerHTML= ' | ' + turbolink;
    return this._container;
  },

  onRemove: function (map) {
    map.off('mousemove', this._onMouseMove)
  },

  _onMouseMove: function (e) {
    var lng = this.options.lngFormatter ? this.options.lngFormatter(e.latlng.lng) : L.Util.formatNum(e.latlng.lng, this.options.numDigits);
    var lat = this.options.latFormatter ? this.options.latFormatter(e.latlng.lat) : L.Util.formatNum(e.latlng.lat, this.options.numDigits);
    var lng_length = lng.toString().split(".")[1].length; // it MAY be if you're on exactly one integer coordinate to throw an error, but I don't care
    var lat_length = lat.toString().split(".")[1].length;
    for(var i = 0; i < this.options.numDigits - lng_length; i++) {
        lng += "0";
    }
    for(var i = 0; i < this.options.numDigits - lat_length; i++) {
        lat += "0";
    }

    var value = this.options.lngFirst ? lng + this.options.separator + lat : lat + this.options.separator + lng;
    var prefixAndValue = this.options.prefix + ' ' + value;
    this._container.innerHTML = prefixAndValue + ' | ' + turbolink;
  }

});

L.Map.mergeOptions({
    positionControl: false
});

L.Map.addInitHook(function () {
    if (this.options.positionControl) {
        this.positionControl = new L.Control.MousePosition();
        this.addControl(this.positionControl);
    }
});

L.control.mousePosition = function (options) {
    return new L.Control.MousePosition(options);
};

var pois_lz;
if (window.url_pois_lz) { //TODO: must be called after map pois_lz set ... but how to have it in global namespace?
  var http_request_lz = new XMLHttpRequest();
  http_request_lz.open("GET", url_pois_lz, true);
  http_request_lz.onreadystatechange = function () {
        var done = 4, ok = 200;
        if (http_request_lz.readyState === done && http_request_lz.status === ok) {
            pois_lz = JSON.parse(http_request_lz.responseText);
            loadPoi();
        }
    };
  http_request_lz.send(null);
  console.log("XMLHttpRequest for pois_lz sent");
} else {
  console.log("XMLHttpRequest for pois_lz NOT sent, no url");
}

var wikipedia_images = {};

/**
 * jQuery.browser.mobile (http://detectmobilebrowser.com/)
 *
 * jQuery.browser.mobile will be true if the browser is a mobile device
 *
 **/
(function(a){(jQuery.browser=jQuery.browser||{}).mobile=/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))})(navigator.userAgent||navigator.vendor||window.opera);

window.onload = function () { 
    var text = 'Warning: You seem to use Internet Explorer, which is known to be buggy. This site may not work as expected. We recommend a standards-compliant free web-browser like <a href="https://www.mozilla.org/en-US/firefox/new/">Firefox</a> or <a href="http://chromium.woolyss.com/">Chromium</a>.',
        h;
    if(navigator.userAgent.toLowerCase().indexOf('msie') > -1) {
        var h = document.createElement("h1");
        h.setAttribute('style', 'text-align:center;color:red;background:white;position:absolute;top:5px;left:55px;right:55px;z-index:15000;padding:5px;margin:0;');
    } else if (navigator.userAgent.toLowerCase().indexOf('trident') > -1) {
        var h = document.createElement("h3");
        h.setAttribute('style', 'text-align:center;color:red;position:absolute;top:5px;left:55px;right:55px;z-index:15000;padding:5px;margin:0;background-color:rgba(255,255,255,0.7);');
    }
        else return;
    h.innerHTML = text;

    var map = document.getElementById('map');
    map.appendChild(h);
    map.setAttribute( 'class', map.getAttribute('class') + ' ie');
}

