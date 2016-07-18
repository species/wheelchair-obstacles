if(!assethost)
    var assethost = "http://demo.transformap.co/";

var about = {
    overpass : '<p>Items are loaded via <a href="https://wiki.openstreetmap.org/wiki/Overpass_API">Overpass API</a>, it may take some minutes for newly added items to appear.</p>',
    osm_edit : '<p>You can improve this map with the “Edit” Button in the top right corner!</p>',
    export_opendata : '<p>All data displayed is Open Data, you can get it with the “Export Data” link in the bottom right corner.</p>'
}

var different_maps = [ 
    { url : "identities.html" ,
      name : "TransforMap of Identities",
      image: assethost+"assets/transformap/pngs/" + 24 + "/political_identity.png"
    } ,
    /*   { url : "transformap.html" ,
      name : "Needs-based TransforMap" } , */
    { url : "organic.html" ,
      name : "Organic TransforMap",
      image : assethost+"assets/transformap/pngs/pois/" + 24 + "/shop=supermarket.png"
    } ,
    { url : "regional.html" ,
      name : "Regional TransforMap",
      image : assethost+"assets/transformap/pngs/pois/" + 24 + "/shop=convenience.png"
    } ,
    { url : "fairtrade.html" ,
      name : "Fairtrade TransforMap",
      image : assethost+"assets/transformap/pngs/pois/" + 24 + "/shop=fairtrade.png"
    } ,
    { url : "secondhand.html" ,
      name : "Second Hand TransforMap",
      image : assethost+"assets/transformap/pngs/pois/" + 24 + "/shop=second_hand.png"
    } ,
    { url : "greenmap.html" ,
      name : "Green TransforMap",
      image : assethost+"assets/greenmap/png/" + 24  + "/Park-_Recreation_Area.png"
    } 
];

function getVisibleMarkers() {
    var bounds = map.getBounds();
    var marker_array = markers.GetMarkers();
    var visible_markers = [];
    for(var i = 0; i < marker_array.length; i++) {
        var marker = marker_array[i];
        var latlng = L.latLng(marker.data.lat, marker.data.lon);
        if( bounds.contains(latlng) )
            visible_markers.push(marker);
    }
    return visible_markers;
}


function updatePOIlist(force) {
  return; // for wheelchair, POIlist not needed
    if(!force && open_sidebox != "sidebox-list") //run only when menu open
        return;

    $('#POIlist').html("");
    var list_of_POIs = [], list_of_unnamed_POIs = [];
    visible_markers = getVisibleMarkers();
    for(var i = 0; i < visible_markers.length; i++) {
        var marker = visible_markers[i];
        if( ! marker.hasOwnProperty("filtered") )
            continue;
        if( ! marker.filtered) {
            if(marker.data.tags.name)
                list_of_POIs.push(marker);
            else
                list_of_unnamed_POIs.push(marker);
        }
    }
    list_of_POIs.sort(function (a,b) {
        var nameA = a.data.tags.name.toLowerCase(), nameB = b.data.tags.name.toLowerCase();
        if (nameA < nameB) //sort string ascending
            return -1
        if (nameA > nameB)
            return 1
        return 0 //default return value (no sorting)
        });
    for(var i = 0; i < list_of_POIs.length; i++) {
        marker = list_of_POIs[i];
        var src = chooseIconSrc(marker.data.tags, 16);
        $('#POIlist').append("<li onClick='MytogglePopup(\""+marker.data.type+"\",\""+marker.data.id+"\");'><img src='" + src + "' />" + marker.data.tags.name + "</li>");
    }
    for(var i = 0; i < list_of_unnamed_POIs.length; i++) {
        marker = list_of_unnamed_POIs[i];
        var src = chooseIconSrc(marker.data.tags, 16);
        var main_tag = getIconTag(marker.data.tags);
        var ersatz_name = (marker.data.tags[main_tag] || "unknown");
        $('#POIlist').append("<li onClick='MytogglePopup(\""+marker.data.type+"\",\""+marker.data.id+"\");'><img src='" + src + "' />" + ersatz_name + "</li>");
    }
}

var open_sidebox = "";
function toggleSideBox(id) {//TODO rewrite with jQuery toggleClass
    var clicked_element = document.getElementById(id);
    var clicked_on_open_item = ( clicked_element.getAttribute("class").indexOf("shown") >= 0 ) ? 1 : 0; 

    //close all
    var sidebar = document.getElementById("tmap_sidebar");
    var childs = sidebar.childNodes;
    for ( var i=0; i < childs.length; i++) {
        var item_child = childs[i];
        if ( item_child.hasAttribute("class") ) {
            if( item_child.getAttribute("class").indexOf("box") >= 0 ) {
                item_child.setAttribute("class", "box hidden");
            }
        }
    }

    if( ! clicked_on_open_item) {
        clicked_element.setAttribute("class", "box shown");
        open_sidebox = id;
    }
}

function toggleInfoBox(id) {
    var element = document.getElementById(id);
    element.style.display = ( element.style.display == "block" ) ? "none" : "block";
}
function toggleSideBar() { //TODO rewrite with jQuery toggleClass
    var sidebar = document.getElementById("tmap_sidebar");
    var sidebar_toggle = document.getElementById("sidebar_toggle");
    if(!sidebar_toggle || !sidebar) {
        console.log("Error, no sidebar found");
        return;
    }
    var content = document.getElementById("tmapcontent");
    if( sidebar_toggle.hasAttribute("class") ) { // is hidden, show
        sidebar_toggle.removeAttribute("class");
        sidebar.removeAttribute("class");
        content.setAttribute("class", "sidebar");
        /* disabled meanwhile because n steps overpass queries get fired
        for (var t=100; t <= 800; t = t+100) {
            setTimeout(reDrawMap, t);
        }*/
        setTimeout(reDrawMap, 810);
    } else { //hide
        sidebar_toggle.setAttribute("class", "hidden");
        sidebar.setAttribute("class", "hidden");
        content.removeAttribute("class");
        /*
        for (var t=100; t <= 800; t = t+100) {
            setTimeout(reDrawMap, t);
        }*/
        setTimeout(reDrawMap, 810);
    }
}

function createSideBar() {
  if(!$) {
      $=jQuery;
  }
  $('#tmapcontent').append('<div id="tmap_sidebar" class=hidden><h1>' + document.title + '</h1></div>');
  $('#tmapcontent').append('<div id="sidebar_toggle" class=hidden onClick="toggleSideBar()">»</div>');

  // switching to other maps
  $('#tmap_sidebar').append('<div id="sidebox-maps" class="box hidden"></div>');
  $('#sidebox-maps').append('<h2 onClick="toggleSideBox(\'sidebox-maps\');">Explore other Maps</h2>');
  $('#sidebox-maps').append('<ul id="mapswitcher" class="boxcontent"></ul>');

  for (var i = 0; i < different_maps.length; i++) {
    var current_item = different_maps[i];
    $('#mapswitcher').append(
        $('<li>')
            .attr('class', current_item["name"] == document.title ?  "current" : "")
            .append( $('<a>')
                .attr('href', current_item["url"])
                .append('<img src="' + current_item["image"] + '" />' + current_item["name"])
            )
    );
  }
  // Filters
  if(window.filters) {
      $('#tmap_sidebar').append('<div id="sidebox-filters" class="box hidden"></div>');
      $('#sidebox-filters').append('<h2 onClick="updatePOIlist();updateFilterCount(true);toggleSideBox(\'sidebox-filters\');">Filters</h2>');
      $('#sidebox-filters').append('<ul id="filters" class="boxcontent"></ul>');
      for (filtername in filters) {
          $('#filters').append(createFilterHTML(filtername));
      }
      // filters derived from taxonomy get added when taxonomy.json is loaded
  }

  // List of POIs
//  $('#tmap_sidebar').append('<div id="sidebox-list" class="box hidden"></div>');
//  $('#sidebox-list').append('<h2 onClick="updatePOIlist(true);toggleSideBox(\'sidebox-list\');">List of <span title="Point of Interest">POIs</span></h2>');
//  $('#sidebox-list').append('<ul id="POIlist" class="boxcontent"></ul>');

  // Map Key
  $('#tmap_sidebar').append('<div id="sidebox-mapkey" class="box hidden"></div>');
  $('#sidebox-mapkey').append('<h2 onClick="toggleSideBox(\'sidebox-mapkey\');">Map Key</h2>');
  $('#sidebox-mapkey').append('<ul id="mapkey" class="boxcontent"></ul>');

  // extra mapkey for maps not deriving from taxonomy.json
  if(window.mapkey) {
      $('#mapkey').append(window.mapkey);
      $('#mapkey li').attr('class','manual');
  }
  // map key derived from taxonomy gets added when taxonomy.json is loaded

  // About
  $('#tmap_sidebar').append('<div id="sidebox-about" class="box hidden"></div>');
  $('#sidebox-about').append('<h2 onClick="toggleSideBox(\'sidebox-about\');">About this Map</h2>');
  $('#sidebox-about').append('<div id="about" class="boxcontent"></div>');
  if(window.about_text)
      $('#about').append(window.about_text);

  $('#tmap_sidebar').append('<div id="timestamp"></div>');
  $('#timestamp').append('<div id="tall" title="Local copy"></div>'); // alert() is only for dev, works only in FF if you SELECT TEXT.
  $('#timestamp').append('<div id="tnode" onmouseover="alert(\'' + overpass_config.servers[0].replace(/^http:\/\//,"") + '\');"></div>');
  $('#timestamp').append('<div id="tway"  onmouseover="alert(\'' + overpass_config.servers[1].replace(/^http:\/\//,"") + '\');"></div>');
  $('#timestamp').append('<div id="trel"  onmouseover="alert(\'' + overpass_config.servers[2].replace(/^http:\/\//,"") + '\');"></div>');
}

function updateElementCount() {
    var visible_markers = getVisibleMarkers();
    var nr_pois = { node: 0, way: 0, relation:0 };

    for(var i = 0; i < visible_markers.length; i++) 
        nr_pois[visible_markers[i].data.type]++;

    $('#tnode').attr('element-nrs',nr_pois.node);
    $('#tway').attr('element-nrs',nr_pois.way);
    $('#trel').attr('element-nrs',nr_pois.relation);
}

function updateMapSwitcherLinks() {
  var centre = map.getCenter();
  var maps_container = document.getElementById("mapswitcher");
  var childs = maps_container.childNodes;
  for ( var i=0; i < childs.length; i++) {
    var li_child = childs[i];
    var a_child = li_child.firstChild;
    var href = a_child.getAttribute ("href");
    var splitstr = href.split('#');
    href = splitstr[0] + "#" + map.getZoom() + "/" + centre.lat + "/" + centre.lng;
    a_child.setAttribute("href",href);
  }
}

function reDrawMap() {
        map.invalidateSize(true);
}

function toggleSideBarOnLoad() {
  if(! jQuery.browser.mobile && ! window.hide_sidebar)
    toggleSideBar();
}
