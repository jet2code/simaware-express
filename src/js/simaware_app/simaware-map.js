r2server = 'https://r2.simaware.ca/';
dataserver = 'https://data.simaware.ca/';

const warnings = {
    'NAT0': 'Oceanic clearance required for entry.  See ganderoceanic.ca for more information.',
    'CZQO0': 'Oceanic clearance required for entry.  See ganderoceanic.ca for more information.',
    'EGGX0': 'Oceanic clearance required for entry.  See ganderoceanic.ca for more information.',
}

const wf = [
    'YSSY',
    'YMML',
    'YWKS',
    'SCGC',
    'SAWH',
    'SAVC',
    'SUMU',
    'SBBR',
    'SBEG',
    'TNCC',
    'MMUN',
    'MMGL',
    'KIAH',
    'KATL',
    'KBOS',
    'CYWG',
    'LPPD',
    'GMMN',
    'DAAG',
    'LPFR',
    'LIMC',
    'LFQQ',
    'EGFF',
    'ELLX',
    'ESGG',
    'EVRA',
    'UKBB',
    'LLBG',
    'HEGN',
    'ORBI',
    'OBBI',
    'OOMS',
    'VOHS',
    'VEPT',
    'VGHS',
    'ZULS',
    'ZLLL',
    'ZUTF',
    'RCTP',
    'VHHH',
    'VTBS',
    'WIMM',
    'WIDD',
    'WAHI',
    'YPDN',
    'YBCS',
    'YBBN',
    'YSSY',
]

// Initializes the map in the #map container
function initializeMap(manual = 0, landscape = 0)
{
    $('.os-host-flexbox').overlayScrollbars({ });
    // Set storage variables
    plane_array = [];
    active_uids = [];
    active_firs = [];
    active_tracons = [];
    tracons_array = [];
    vatglasses_array = [];
    active_vg_pos = [];
    active_vg_sectors = [];
    vgmarkers_array = [];
    tracmarkers_array = [];
    icons_array = [];
    firs_array  = [];
    firmarkers_array = [];
    sigmets_array = [];
    sigmarkers_array = [];
    active_flight = null; 

    // Initialize the icons that will be used
    initializeIcons();

    if(!$.cookie('init'))
    {
        $('#disclaimer').removeClass('d-none').addClass('d-flex');
    }

    // Initialize map data
    initializeFirData();

    var activearea = (landscape) ? 'active-area-landscape' : 'active-area';

    // Create the map if it exists.  If not, then it's just a stats page that doesn't need it.
    if($('#map').length)
    {
        map = L.map('map', { zoomControl: false, preferCanvas: true}).setView([30, 0], 3).setActiveArea(activearea);
        map.doubleClickZoom.disable();
        basemap = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}{r}.png', { attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a> | <a href="https://github.com/maiuswong/simaware-express"><i class="fab fa-github"></i> SimAware on GitHub</a> | <b>Not for real-world navigation.</b>', subdomains: 'abcd'}).addTo(map);
        map.attributionControl.setPosition('topright');

        if ($.cookie('mapView')) {
            var mapView = JSON.parse($.cookie('mapView'));
            map.setView([mapView.lat, mapView.lng], mapView.zoom, true);
        }

        // Make the search box clickable
        $.each(['controls', 'flights-sidebar', 'search-field', 'user-sidebar', 'footer-background', 'streamers-bar'], (idx, obj) => {
            el = document.getElementById(obj);
            if(el)
            {
                L.DomEvent.disableClickPropagation(el);
                L.DomEvent.disableScrollPropagation(el);
            }
        })

        map.on('moveend', function(e) {
            var view = {
                lat: map.getCenter().lat,
                lng: map.getCenter().lng,
                zoom: map.getZoom()
            };
            $.cookie('mapView', JSON.stringify(view));
        });
        // Set onclick functions
        map.on('click', function() {
            if(map.hasLayer(active_featuregroup))
            {
                returnToView();
            }
            $('#search-wrapper').hide();
        })
        $('#search-field').click(() => {
            $('#search-wrapper').show();
            var str = $('#search-field').val().toLowerCase();
            $('#search-results').html(compileSearchResults(str));
        });
    }

    // Set FeatureGroups
    plane_featuregroup = new L.FeatureGroup();
    if(!manual) { map.addLayer(plane_featuregroup); }
    atc_featuregroup = new L.FeatureGroup();
    atc_leg_featuregroup = new L.FeatureGroup();
    active_featuregroup = new L.FeatureGroup();
    tracons_featuregroup = new L.FeatureGroup();
    locals_featuregroup = new L.FeatureGroup();
    sigmets_featuregroup = new L.FeatureGroup();
    events_featuregroup = new L.FeatureGroup();
    nats_featuregroup = new L.FeatureGroup();
    wf_featuregroup = new L.FeatureGroup();
    vg_featuregroup = new L.FeatureGroup();
    atc_featuregroup.addLayer(atc_leg_featuregroup);
}

// Tells Leaflet what icons are available
function initializeIcons()
{
    var icons_list = ['B739'];
    $.each(icons_list, function(idx, icon) {
        icons_array[icon] = new L.divIcon({ className: icon, iconSize: [18, 18] , iconAnchor: [9, 9]});
    })
}

function initializeWorldFlight()
{
    $.each(wf, (idx, obj) => {
        if(idx > 0)
        {
            var oldap = airports[wf[idx - 1]];
            if(oldap && airports[obj])
            {
                if(getAirportLoad(oldap.icao) > 20)
                {
                    var ln = new L.Wrapped.Polyline([[oldap.lat, oldap.lon], [airports[obj].lat, airports[obj].lon]], {color: '#ffcc33', weight: 5, opacity: 1, nowrap: true});
                }
                else
                {
                    var ln = new L.Wrapped.Polyline([[oldap.lat, oldap.lon], [airports[obj].lat, airports[obj].lon]], {color: '#fff', weight: 5, opacity: 0.5, nowrap: true});
                }
                wf_featuregroup.addLayer(ln)
            }
        }
        var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getWfTooltip(airports[obj]), iconSize: 'auto'});
        var oloc = new L.marker([airports[obj].lat, airports[obj].lon],{ icon: di, });
        wf_featuregroup.addLayer(oloc);
    })
}

function returnSidebarToView(id, closeid)
{
    if($('#map').width() > 576)
    {
        var right = '1rem';
    }
    else
    {
        var right = (($('#map').width() - 350) / 2) + 'px';
    }
    el = $('#'+id).animate({right: right}, 250, 'easeOutSine');
    $('#'+closeid).hide();
}

function getBadge(rating)
{
    var txt = '';
    switch(rating)
    {
        case 1:
            txt = 'PPL'; break;
        case 3:
            txt = 'IFR'; break;
        case 7:
            txt = 'CMEL'; break;
        case 15:
            txt = 'ATPL'; break;
    }
    if(txt.length)
    {
        return '<span style="font-size: 0.8rem; font-weight: normal; color: #fff; border-radius: 2rem; " class="me-2 px-2 badge badge-sm bg-warning">'+txt+'</span>';
    }
    else
    {
        return '';
    }
}
// Initialize airports
async function initializeAirports()
{
    airportsByIata = [];
    airportsByPrefix = [];

    let response = await fetchRetry('/livedata/airports.json');
    airports = await response.json();

    $.each(airports, (idx, obj) => {
        airportsByIata[obj.iata] = obj;
        if(obj.prefix)
        {
            airportsByPrefix[obj.prefix] = obj;
        }
    })
}

async function initializeFirData()
{
    let response = await fetchRetry(dataserver + 'api/livedata/countries.json');
    countries = await response.json();

    response = await fetchRetry(dataserver + 'api/livedata/firs.json');
    firs = await response.json();

    response = await fetchRetry(dataserver + 'api/livedata/uirs.json');
    uirs = await response.json();
}

function getAirline(flight)
{
    if(flight.callsign.match(/[A-Z]+/) && typeof airlines[flight.callsign.match(/[A-Z]+/)[0]] !== 'undefined')
    {
        return airlines[flight.callsign.match(/[A-Z]+/)[0]];
    }
}

async function initializeNexrad()
{
    response = await fetchRetry('https://tilecache.rainviewer.com/api/maps.json');
    data = await response.json();
    ts = data[0];
    nexrad = L.tileLayer('https://tilecache.rainviewer.com/v2/radar/'+ts+'/512/{z}/{x}/{y}/6/0_1.png', {
              tileSize: 256,
              opacity: 0.4,
          });
}

async function initializePatrons()
{
    response = await fetchRetry(dataserver + 'api/livedata/patrons.json');
    ret = await response.json();
    patrons = {}
    $.each(ret, (obj) => {
        if(ret[obj].cid)
        {
            patrons[ret[obj].cid] = ret[obj];
        }
    })

    response = await fetchRetry(dataserver + 'api/livedata/streamers.json');
    streamers = await response.json();
}

// Initialize the FIR Boundaries map
async function initializeATC()
{
    // Load the GeoJSON file
    $.ajax({
        url: '/livedata/firboundaries.json',
        xhrFields: {withCredentials: false},
        success: function(data) {

        // Create the geoJSON layers for FIRs
        firmap = new L.geoJSON(data, {style: {fillColor: '#fff', fillOpacity: 0, weight: 1, color: '#333'}});

        // Store the geoJSON by ICAO and if it is a FSS
        $.each(firmap._layers, function(index, obj) {
        
            // Get the layer
            var layer = firmap.getLayer(index);
            
            // Get the layer properties
            var is_fss = obj.feature.properties.oceanic;
            var icao = obj.feature.properties.id;
            
            // Add to the array
            if(typeof firs_array[icao + is_fss] === 'undefined')
                firs_array[icao + is_fss] = [layer];
            else
                firs_array[icao + is_fss].push(layer);
        })

        atc_leg_featuregroup.addLayer(firmap);
    }})
    
    $.ajax({
        url: '/livedata/traconboundaries.json',
        xhrFields: {withCredentials: false},
        success: function(data) {

        // Create the geoJSON layers for FIRs
        traconmap = new L.geoJSON(data, {style: {fillColor: '#fff', fillOpacity: 0, weight: 0.01, color: '#222'}});

        // Store the geoJSON by ICAO and if it is a FSS
        $.each(traconmap._layers, function(index, obj) {

            var layer = traconmap.getLayer(index);
            var id = obj.feature.properties.prefix;
            var suffix = (typeof obj.feature.properties.suffix == 'undefined' || obj.feature.properties.suffix === null) ? 'APP' : obj.feature.properties.suffix;
            $.each(id, (idx, prefix) => {
                if(tracons_array[prefix] != undefined)
                {
                    tracons_array[prefix][suffix] = layer;
                }
                else
                {
                    var tracons_array_temp = [];
                    tracons_array_temp[suffix] = layer;
                    tracons_array[prefix] = tracons_array_temp;
                }
                
            })
        })

        atc_leg_featuregroup.addLayer(traconmap);
        atc_leg_featuregroup.addLayer(tracons_featuregroup);

    }});

    let response = await fetch('/livedata/glasses_positions.json');
    vg_positions = await response.json();

    $.ajax({
        url: '/livedata/vatglasses.json',
        xhrFields: {withCredentials: false},
        success: function(data) {

            glassesmap = new L.geoJSON(data, {style: {fillColor: '#fff', fillOpacity: 0, weight: 0, color: '#222'}});
            
            $.each(glassesmap._layers, function(index, obj) {
                var layer = glassesmap.getLayer(index);
                if(vatglasses_array[layer.feature.properties.country])
                {
                    vatglasses_array[layer.feature.properties.country].push(layer);
                }
                else
                {
                    vatglasses_array[layer.feature.properties.country] = [layer];
                }
            })
                
        }
    })
}

// Updates the data based on the current version of live.json
async function refreshFlights(filterName = null, filterCriteria = null)
{
    try
    {
        response = await fetchRetry(r2server + 'api/livedata/data.json', { credentials: 'omit' });
        livedata = await response.json();
    }
    catch(e)
    {
        return;
    }

    flights = livedata.pilots;
    sectors = livedata.onlinefirs;
    tracons = livedata.appdep;
    localsraw = livedata.locals;
    
    flights = applyFilter(flights, filterName, filterCriteria);
    bnfoairports = {};
    newactive_uids = [];
    
    $.each(flights, function(idx, obj)
    {
        // Update current connections
        if(typeof plane_array[obj.uid] !== 'undefined')
        {   
            updateLocation(obj);
        }
        else
        {
            addAircraft(obj);
        }
        if(obj.dep || obj.arr)
        {
            if(bnfoairports[obj.dep])
            {
                bnfoairports[obj.dep]['departures']++;
            }
            else
            {
                bnfoairports[obj.dep] = {
                    icao: obj.dep,
                    departures: 1,
                    arrivals: 0
                }
            }
            if(bnfoairports[obj.arr])
            {
                bnfoairports[obj.arr]['arrivals']++;
            }
            else
            {
                bnfoairports[obj.arr] = {
                    icao: obj.arr,
                    departures: 0,
                    arrivals: 1
                }
            }
        }
    });

    // Delete flights if they are no longer present
    for(let uid in plane_array)
    {
        if(!newactive_uids.includes(uid))
        {
            plane_featuregroup.removeLayer(plane_array[uid]);
            delete plane_array[uid];
        }
    }

    // Update the active flight if there is one
    if(active_flight)
    {
        updateFlightsBox(flights[active_flight]);
    }
    active_uids = newactive_uids;

    $('#navbar-pilots').html(Object.keys(plane_array).length);
    return flights;

}

function interpolateLoc()
{

    for(uid in plane_array)
    {
        var intervaltime = 1;
        var latlon = plane_array[uid].getLatLng();
        var R = 6378.1;
        var hdg_rad = Math.PI * plane_array[uid].flight.hdg / 180;
        var dist = 1.852 * plane_array[uid].flight.gndspd / 3600 * intervaltime;

        var lat1 = Math.PI * latlon.lat / 180;
        var lon1 = Math.PI * latlon.lng / 180;

        var lat2 = 180 * (Math.asin(Math.sin(lat1) * Math.cos(dist / R) + Math.cos(lat1) * Math.sin(dist / R) * Math.cos(hdg_rad))) / Math.PI;
        var lon2 = 180 * (lon1 + Math.atan2(Math.sin(hdg_rad) * Math.sin(dist / R) * Math.cos(lat1), Math.cos(dist / R) - Math.sin(lat1) * Math.sin(lat2))) / Math.PI;

        plane_array[uid].setLatLng(new L.LatLng(lat2, lon2));
    }
}

// Filter for specific pages
function applyFilter(data, filterName = null, filterCriteria = null)
{
    var filteredData = {};
    if(filterName)
    {
        $.each(data, (idx, obj) => {
            switch(filterName)
            {
                case 'airport':
                    if(obj.dep == filterCriteria || obj.arr == filterCriteria)
                        filteredData[obj.uid] = obj;
                case 'fleet':
                    if(obj.callsign.indexOf(filterCriteria) == 0)
                        filteredData[obj.uid] = obj;
            }
        })
        return filteredData;
    }
    else
    {
        return data;
    }
}

// Adds aircraft to the plane_array
function addAircraft(obj)
{
    var plane = createPlaneMarker(obj);

    // Add it to the feature group
    plane_array[plane.uid] = plane;
    plane_featuregroup.addLayer(plane_array[plane.uid]);

    markUID(obj);
}

function createPlaneMarker(obj)
{
    // Initialize and get variables
    var icon = new Image();
    var mkr = getMarker(obj.aircraft);
    var plane = L.canvasMarker(new L.LatLng(obj.lat, obj.lon), {
        radius: 16,
        img: {
            url: '/img/aircraft/'+mkr[2]+'.png',     //image link
            size: [1.2 * Math.pow(mkr[0], 3/4), 1.2 * Math.pow(mkr[1], 3/4)],     //image size ( default [40, 40] )
            rotate: ["BALL"].includes(obj.aircraft) ? 0 : obj.hdg,                //image base rotate ( default 0 )
            offset: { x: 0, y: 0 }, //image offset ( default { x: 0, y: 0 } )
        },
    });
    plane.uid = obj.uid;
    plane.flight = obj;
    [offset, dir] = getMarkerDirection(obj);
    
    // Set the tooltip
    plane.bindTooltip(getDatablock(obj), {
        offset: offset, 
        direction: dir, 
        permanent: false, 
        className: 'datablock' 
    });

    // Set the onclick action
    plane.on('click', function(e) { L.DomEvent.stopPropagation(e) ; zoomToFlight(this.uid); });

    return plane;
}

function getDatablock(obj)
{
    return '<div class="datablock">'+obj.callsign+' '+obj.aircraft+'<br>'+Math.round(Number(obj.alt)/100)*100+' '+obj.gndspd+'<br>'+obj.dep+' '+obj.arr+'</div>';
}

function updateLocation(obj)
{
    // Update the location, heading, and tooltip content
    try{
        plane_array[obj.uid].setLatLng(new L.LatLng(Number(obj.lat), Number(obj.lon)));
        plane_array[obj.uid].options.img.rotate = ["BALL"].includes(obj.aircraft) ? 0 : obj.hdg; // avoids rotating the icon for very specific aircraft such as Hot Air Balloons.
        plane_array[obj.uid]._update();
    } catch(err)
    {
    }
    plane_array[obj.uid].setTooltipContent(getDatablock(obj));

    // Include the new flight object with the markers
    plane_array[obj.uid].flight = obj;

    // If the flight is active, then update the flightpath
    if(typeof flightpath != 'undefined' && active_featuregroup.hasLayer(flightpath) && plane.flight.uid == obj.uid)
    {
        flightpath.addLatLng([obj.lat, obj.lon]);
    }

    // Mark the UID as "handled", i.e. remove it from the active uids list
    markUID(obj);
}

function getMarkerDirection(obj)
{
    // If the plane is heading east, open the tooltip to the right
    if(Number(obj.hdg) < 180)
    {
        offset = L.point(5, 12);
        dir = 'right';
    }
    // Else open to the left
    else
    {
        offset = L.point(-5, 12);
        dir = 'left';
    }
    return [offset, dir];
}

function markUID(obj)
{
    if($.inArray(obj, active_uids) >= 0)
    {
        active_uids.splice(active_uids.indexOf(obj.uid), 1);
    }
    newactive_uids.push(obj.uid);
}

function markFIR(obj)
{
    if($.inArray(obj, active_firs) >= 0)
    {
        active_firs.splice(active_firs.indexOf(obj), 1);
    }
}

function airportSearch(str)
{
    if(airportsByPrefix[str])
    {
        return airportsByPrefix[str];
    }
    if(airports[str])
    {
        return airports[str];
    }
    else if(airportsByIata[str]) // USA
    {
        return airportsByIata[str];
    }
}

function getActiveFIRs()
{
    let active_firs = [];
    for(let id in firs_array)
    {
        if(firs_array[id][0].options.color == '#fff')
        {
            active_firs.push(id);
        }
    }
    return active_firs;
}

function lightUpTracon(tracon, traconid)
{
    var tracon_handle = tracons_array[traconid.split('|')[0]][traconid.split('|')[1]];
    tracon_handle.setStyle({weight: 1.5, color: '#40e0d0'});
    if(tracmarkers_array[traconid] === undefined)
    {
        var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getTracTooltip(tracon_handle.feature.properties.id, traconid), iconSize: 'auto'});
        var latlng = getTraconMarkerLoc(tracon_handle);
        tracmarkers_array[traconid] = new L.marker(latlng, { icon: di });
        tracmarkers_array[traconid].bindTooltip(getTraconBlock(tracon, traconid.slice(-3) == 'DEP'), { opacity: 1, sticky: true });
        atc_leg_featuregroup.addLayer(tracmarkers_array[traconid]);
        tracon_handle.bringToFront();
    }
}

function lightUpGlass(glass, glassid)
{
    
}

function traconSearch(callsign)
{
    callsign.replace('__', '_');
    var prefix = callsign.slice(0,-4); // Removes _APP or _DEP
    var suffix = callsign.slice(-3);

    if(typeof(tracons_array[prefix]) != 'undefined' && typeof(tracons_array[prefix][suffix]) != 'undefined')
    {
        return [tracons_array[prefix][suffix], 'bounds', prefix + '|' + suffix];
    }
    // Default to APP
    else if(typeof(tracons_array[prefix]) != 'undefined' && typeof(tracons_array[prefix]['APP']) != 'undefined')
    {
        return [tracons_array[prefix]['APP'], 'bounds', prefix + '|APP'];
    }
    else if(typeof(airportsByIata[prefix]) != 'undefined')
    {
        return [airportsByIata[prefix], 'circles', prefix];
    }
    else if(typeof(airports[prefix]) != 'undefined')
    {
        return [airports[prefix], 'circles', prefix];
    }
    else
    {
        // Repeat with the first slice of the callsign
        prefix = callsign.split('_')[0];
        if(typeof(tracons_array[prefix]) != 'undefined' && typeof(tracons_array[prefix][suffix]) != 'undefined')
        {
            return [tracons_array[prefix][suffix], 'bounds', prefix + '|' + suffix];
        }
        // Default to APP
        else if(typeof(tracons_array[prefix]) != 'undefined' && typeof(tracons_array[prefix]['APP']) != 'undefined')
        {
            return [tracons_array[prefix]['APP'], 'bounds', prefix + '|APP'];
        }
        else if(typeof(airportsByIata[prefix]) != 'undefined')
        {
            return [airportsByIata[prefix], 'circles', prefix];
        }
        else if(typeof(airports[prefix]) != 'undefined')
        {
            return [airports[prefix], 'circles', prefix];
        }
        else
        {
            return null;
        }
    }
}

function groupTracons(tracons)
{
    traconsGrouped = [];
    traconsGrouped['bounds'] = [];
    traconsGrouped['circles'] = [];

    $.each(tracons, (idx, tracon) => {
        if(foundTracon = traconSearch(tracon.callsign))
        {
            if(traconsGrouped[foundTracon[1]][foundTracon[2]] == undefined)
            {
                var traconsGrouped_temp = [];
                traconsGrouped_temp['loc'] = foundTracon[2];
                traconsGrouped_temp['members'] = [tracon];
                if(foundTracon[1] == 'circles')
                {
                    traconsGrouped_temp['airport'] = foundTracon[0];
                    traconsGrouped_temp['name'] = (foundTracon[0].city == 'Unknown City') ? foundTracon[0].name : foundTracon[0].city.split(',')[0] + ' Approach';
                }
                else
                {
                    traconsGrouped_temp['name'] = foundTracon[0].feature.properties.name;
                }
                traconsGrouped[foundTracon[1]][foundTracon[2]] = traconsGrouped_temp;
            }
            else
            {
                traconsGrouped[foundTracon[1]][foundTracon[2]]['members'].push(tracon);
            }
        }
    })

    return traconsGrouped;

}

// Search for FIR based on callsign
function firSearch(str)
{
    // Brits add extra stuff for relief callsigns.  Remove CTR and FSS suffixes.
    if(str.search('_FSS') >= 0) { var type = 'FSS'; } else { var type = 'CTR' };
    var fstr = str.replace('__', '_').replace('_CTR', '').replace('_FSS', '');
    if(type == 'FSS') // Could be a UIR
    {
        if(typeof uirs[fstr] !== 'undefined')
        {
            return uirs[fstr];
        }
        if(typeof uirs[fstr.split('_')[0]] !== 'undefined')
        {
            return uirs[fstr.split('_')[0]];
        }
    }
    if(typeof firs[fstr] !== 'undefined')
    {
        return firs[fstr];
    }
    if(typeof firs[fstr.split('_')[0]] !== 'undefined')
    {
        return firs[fstr.split('_')[0]];
    }
    if(typeof uirs[fstr] !== 'undefined')
    {
        return uirs[fstr];
    }
    if(typeof uirs[fstr.split('_')[0]] !== 'undefined')
    {
        return uirs[fstr.split('_')[0]];
    }
}

function getCallsign(str)
{
    if(typeof uirs[str] !== 'undefined')
    {
        var fir = uirs[str];
    }
    else
    {
        var fir = firSearch(str);
    } 
    if(typeof fir !== 'undefined')
    {
        if(typeof fir.firs !== 'undefined') // UIRs already have the suffix added
        {
            return fir.name;
        }
        else
        {
            let country = getCountry(fir);
            if(!country || country.radar == '')
            {
                if(country && country.name == 'USA')
                {
                    return fir.name + ' Center';
                }
                else
                {   
                    if(str.search('_FSS'))
                    {
                        return fir.name + ' Radio';
                    }
                    else
                    {
                        return fir.name + ' Centre';
                    }
                }
            }
            else
            {
                return fir.name + ' ' + country.radar;
            }
        }
    }
    else
    {
        return null;
    }
}

function getTraconMarkerLoc(tracon)
{
    var poly = polylabel(tracon.feature.geometry.coordinates[0], 1.0);
    // Put lats in an array for the purpose of getting the max
    var lats = [];
    $.each(tracon.getLatLngs()[0][0], (idx, ll) => {
        lats.push(ll.lat);
    });
    return [Math.max(...lats), poly[1]];
}

function getCallsignByFir(fir, index)
{
    if(index == undefined)
    {
        index = fir.icao + '0';
    }
    if(fir !== null && typeof fir !== 'undefined') 
    {
        if(fir.icao == 'CZUL')
        {
            return 'Centre de Montréal';
        }
        if(typeof fir.firs !== 'undefined' || fir.name.search('Oceanic') > 0 || fir.name.search('Radar') > 0 || fir.name.search('Control') > 0 || fir.name.search('Centre') > 0) // UIRs already have the suffix added
        {
            return fir.name;
        }
        else
        {
            let country = getCountry(fir);
            if(index[index.length - 1] == '1')
            {
                return fir.name + ' Radio';
            }
            if(!country || country.radar == '')
            {
                if(country && country.name == 'USA')
                {
                    return fir.name + ' Center';
                }
                else
                {   
                    return fir.name + ' Centre';
                }
            }
            else
            {
                return fir.name + ' ' + country.radar;
            }
        }
    }
    else
    {
        return 'Unknown Position';
    }
}

function getTimeOnline(atc, unix = 1)
{
    let start = (unix) ? moment.unix(atc.created_at_timestamp) : moment(atc.created_at+'+0000');
    let diff = Math.abs(moment().diff(start, 'minutes', false));

    let hr = Math.floor(diff / 60).toString();
    let min = diff % 60;
    min = min.toString();

    if(min.length < 2)
    {
        min = '0' + min;
    }

    return hr + ':' + min;
    
}

function getCountry(fir)
{
    if(typeof(countries[fir.icao.substring(0, 2)]) !== 'undefined')
    {
        return countries[fir.icao.substring(0, 2)];
    }
    else
    {
        return null;
    }
}

// Online ATC
async function refreshATC()
{
    active_firs = getActiveFIRs();
    newdata = {};
    var atccount = 0;
    
    // $.each(data, (idx, fir) => {
    //     index = getFirIndex(fir);
    //     firObj = firs_array[index];
    //     firname = fir.fir.name;
    //     firicao = fir.fir.icao;
    //     lightupFIR(firObj, fir.members, firname, firicao, index);
    //     markFIR(index);
    // })

    // $.each(active_firs, (idx, fir) => {
    //     firObj = firs_array[fir];
    //     turnOffFIR(firObj);
    // })

    vg_pos = {};
    $.each(sectors, (idx, atc) => {
        
        if(pos = findVgPosition(atc))
        {
            if(vg_pos[pos.sectorid.split('/')[0]])
            {
                vg_pos[pos.sectorid.split('/')[0]][pos.sectorid] = pos;
            }
            else
            {
                vg_pos[pos.sectorid.split('/')[0]] = {};
                vg_pos[pos.sectorid.split('/')[0]][pos.sectorid] = pos;

            }
        }
    })

    $.each(tracons, (idx, atc) => {
        
        if(pos = findVgPosition(atc))
        {
            if(vg_pos[pos.sectorid.split('/')[0]])
            {
                vg_pos[pos.sectorid.split('/')[0]][pos.sectorid] = pos;
            }
            else
            {
                vg_pos[pos.sectorid.split('/')[0]] = {};
                vg_pos[pos.sectorid.split('/')[0]][pos.sectorid] = pos;

            }
        }
    })

    vg_sectors = findVgSectors(vg_pos);

    $.each(sectors, (idx, atc) => {
        let fir = firSearch(atc.callsign)
        if(fir && typeof fir.firs === 'undefined') // fir is null if we can't find anything.  Do UIRs after.
        {
            let index = getFirIndexByCallsign(atc.callsign);
            atc.time_online = getTimeOnline(atc);
            if(typeof newdata[index] === 'undefined')
            {
                let row = {};
                row.firname = getCallsignByFir(fir, index);
                row.members = [atc];
                row.firicao = fir.icao;
                row.firObj = firs_array[index];
                newdata[index] = row;
            }
            else
            {
                newdata[index].members.push(atc);
            }
            atccount++;
        }
    })
    $.each(sectors, (idx, atc) => {
        let fir = firSearch(atc.callsign)
        atc.time_online = getTimeOnline(atc);
        if(fir && typeof fir.firs !== 'undefined') // fir is null if we can't find anything.  Doing UIRs now.
        {
            atc.fssname = fir.name;
            atc.fssicao = fir.prefix;
            $.each(fir.firs, (idx, firicao) => {
                let index = getFirIndexByCallsign(firicao);
                if(typeof newdata[index] === 'undefined')
                {
                    let row = {};
                    row.firname = getCallsignByFir(firSearch(firicao), index);
                    row.members = [atc];
                    row.firicao = firicao;
                    row.firObj = firs_array[index];
                    newdata[index] = row;
                }
                else
                {
                    newdata[index].members.push(atc);
                }
                atccount++;
            })
        }
    })

    // Breaking it up into two since oceanics tend to overlap smaller facilities, rendering them un-hoverable
    $.each(newdata, (index, fir) => {
        if(fir.firname.search('Oceanic') > 1)
        {
            var firObj = fir.firObj;
            var firname = fir.firname;
            var firicao = fir.firicao;
            lightupFIR(firObj, fir.members, firname, firicao, index);
            markFIR(index);
        }
    })

    $.each(newdata, (index, fir) => {
        if(fir.firname.search('Oceanic') == -1)
        {
            var firObj = fir.firObj;
            var firname = fir.firname;
            var firicao = fir.firicao;
            lightupFIR(firObj, fir.members, firname, firicao, index);
            markFIR(index);
        }
    })

    $.each(active_firs, (idx, fir) => {
        firObj = firs_array[fir];
        turnOffFIR(firObj, fir);
    })

    if(typeof(tracons_circles_featuregroup) != 'undefined' && tracons_featuregroup.hasLayer(tracons_circles_featuregroup))
    {
        tracons_featuregroup.removeLayer(tracons_circles_featuregroup);
    }
    tracons_circles_featuregroup = new L.FeatureGroup();

    traconsGrouped = groupTracons(tracons);
    var newactive_tracons = [];
    for(traconid in traconsGrouped['bounds'])
    {
        var tracon = traconsGrouped['bounds'][traconid];
        if($.inArray(traconid, active_tracons) >= 0)
        {
            active_tracons.splice(active_tracons.indexOf(traconid), 1);
            tracmarkers_array[traconid].setTooltipContent(getTraconBlock(tracon));
        }
        else
        {
            lightUpTracon(tracon, traconid);
        }
        newactive_tracons.push(traconid);
    }
    $.each(active_tracons, (idx, traconid) => {
        turnOffTracon(traconid);
    })

    for(traconid in traconsGrouped['circles'])
    {
        trac = traconsGrouped['circles'][traconid];
        var newCircle = new L.circle([trac.airport.lat, trac.airport.lon],
        {
            radius: 60 * 1000,
            weight: 1.25,
            fillOpacity: 0,
            color: '#40e0d0'
        })
        newCircle.bindTooltip(getTraconBlock(trac), {opacity: 1});
        tracons_circles_featuregroup.addLayer(newCircle);
    }

    active_tracons = newactive_tracons;
    tracons_featuregroup.addLayer(tracons_circles_featuregroup);

    // response = await fetchRetry(dataserver + 'api/livedata/tracons.json');
    // tracons = await response.json();

    // var newactive_tracons = [];
    // $.each(tracons, (idx, trac) => {

    //     if(foundTracon = traconSearch(trac.loc))
    //     {
    //         if($.inArray(foundTracon, active_tracons) >= 0)
    //         {
    //             active_tracons.splice(active_tracons.indexOf(foundTracon), 1);
    //             tracmarkers_array[foundTracon].bindTooltip(getTraconBlock(trac), {opacity: 1});
    //         }
    //         else
    //         {
    //             lightUpTracon(tracons_array[foundTracon], trac, foundTracon);
    //         }
    //         newactive_tracons.push(foundTracon);
    //     }
    //     else
    //     {
    //         var newCircle = new L.circle([trac.loc.lat, trac.loc.lon],
    //         {
    //             radius: 60 * 1000,
    //             weight: 1.25,
    //             fillOpacity: 0,
    //             color: '#40e0d0'
    //         })
    //         newCircle.bindTooltip(getTraconBlock(trac), {opacity: 1});
    //         tracons_circles_featuregroup.addLayer(newCircle);
    //     }
    // })
    // $.each(active_tracons, (idx, obj) => {
    //     turnOffTracon(obj);
    // })
    // active_tracons = newactive_tracons;
    // tracons_featuregroup.addLayer(tracons_circles_featuregroup);

    $.each(localsraw, function(idx, obj) {
        if(!obj.callsign.includes('_ATIS'))
        {
            atccount++;
        }
    });
    
    locals = [];

    $.each(localsraw, (idx, local) => {
        let callsign = local.callsign.replace('__', '_').split('_');
        let prefix = callsign[0];
        let suffix = callsign[callsign.length - 1];
        let airport = airportSearch(prefix);

        if(typeof airport != 'undefined')
        {
            if(typeof locals[airport.icao] == 'undefined')
            {
                obj = {};
                obj.loc = airport;
                obj[suffix] = [local];
                locals[airport.icao] = obj;
            }
            else
            {
                if(typeof locals[airport.icao][suffix] != 'undefined')
                {
                    locals[airport.icao][suffix].push(local);
                }
                else
                {
                    locals[airport.icao][suffix] = [local];
                }
            }
        }
    })

    if(atc_leg_featuregroup.hasLayer(locals_featuregroup))
    {
        atc_leg_featuregroup.removeLayer(locals_featuregroup); locals_featuregroup = new L.FeatureGroup();
    }
    for(id in locals) {

        let local = locals[id];
        
        var lat = Number(local.loc.lat);
        var lon = Number(local.loc.lon);
        var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getLocalTooltip(local.loc.icao), iconSize: 'auto'});
        oloc = new L.marker([lat, lon],
        {
          icon: di,
        })
        oloc.bindTooltip(getLocalBlock(local.loc.icao), {opacity: 1, sticky: true});
        locals_featuregroup.addLayer(oloc);
    }
    for(icao in eventsByAirport) 
    {
        if(typeof locals[icao] == 'undefined' && airports[icao])
        {
            var lat = airports[icao].lat;
            var lon = airports[icao].lon;
            var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getLocalTooltip(icao), iconSize: 'auto'});
            oloc = new L.marker([lat, lon],
            {
                icon: di,
            })
            oloc.bindTooltip(getLocalBlock(icao), {opacity: 1, sticky: true});
            locals_featuregroup.addLayer(oloc);
        }
    }
    atc_leg_featuregroup.addLayer(locals_featuregroup);
    $('#navbar-atc').html(atccount);
}

// Update Convective Sigmets
async function updateSigmet()
{
    response = await fetchRetry(dataserver + 'api/livedata/sigmets.json');
    data = await response.json();
    
    for(let sigmet in sigmets_array)
    {
        sigmets_featuregroup.removeLayer(sigmets_array[sigmet]);
        sigmets_featuregroup.removeLayer(sigmarkers_array[sigmet]);
    }

    $.each(data.AIRSIGMET, (idx, sigmet) => {
        if(sigmet.hazard['@attributes'].type == 'CONVECTIVE')
        {
            let latlon = [];
            let latlon_polylabel = [];
            let code = getSigmetCode(sigmet);
            $.each(sigmet.area.point, (idx, point) => {
                latlon.push([Number(point.latitude), Number(point.longitude)]);
                latlon_polylabel.push([Number(point.longitude), Number(point.latitude)]);
            })
            if(code != '')
            {
                sigmets_array[code] = new L.Polygon(latlon, {color: '#ffcc33', weight: 1.5 });
                let di = new L.divIcon({className: 'simaware-ap-tooltip', html: '<div style="position: relative"><div style="position: absolute; top: -8px; right: -25%; font-family: \'Roboto Mono\'"><span onmouseenter="highlightSigmet(\''+code+'\')" onmouseleave="dehighlightSigmet(\''+code+'\')" style="color: #fc3">'+code+'</span></div></div>', iconSize: 'auto'});
                sigmets_featuregroup.addLayer(sigmets_array[code]);
                sigmarkers_array[code] = new L.marker(polylabel([latlon_polylabel], 1.0), { icon: di });
                sigmarkers_array[code].bindTooltip(getSigmetBlock(sigmet), {opacity: 0.9});
                sigmets_featuregroup.addLayer(sigmarkers_array[code]);
            }
        }
    })
}

function getSigmetBlock(sigmet)
{
    list = '<div class="card bg-dark text-white"><div class="card-header ps-2" style="background-color: #efa31d"><h5 class="mb-0" style="color: #fff">Convective SIGMET '+getSigmetCode(sigmet)+'</h5></div><div class="p-2"><small style="font-family: \'JetBrains Mono\', sans-serif; font-size: 0.65rem; color: #aaa">'+nl2br(sigmet.raw_text)+'</div></div>';
    return list;
}

function getSigmetCode(sigmet)
{
    var spl = sigmet.raw_text.split(/\r?\n/);
    return spl[2].split(' ')[2];
}

// Light up a FIR on the firmap
function lightupFIR(obj, firMembers, firname, firicao, index)
{
    if(typeof obj === 'object')
    {
        var firmarkers_array_temp = [];
        for(idx in obj)
        {
            obj[idx].setStyle({color: '#fff', weight: 1.5, fillColor: '#fff', fillOpacity: 0.1});

            // Add a marker and tooltip
            latlng = [Number(obj[idx].feature.properties.label_lat), Number(obj[idx].feature.properties.label_lon)];
            var di = new L.divIcon({className: 'simaware-ap-tooltip', html: getFirTooltip(firicao, index, firMembers), iconSize: 'auto'});

            // Add a marker if it doesn't exist
            if(firmarkers_array[index] === undefined)
            {
                firmarkers_array_temp[idx] = new L.marker(latlng, { icon: di });
                firmarkers_array_temp[idx].bindTooltip(getControllerBlock(obj[idx], firMembers, firname, firicao, index), {opacity: 1, sticky: true});
            }
            // If it does, just update the text of the marker.
            else
            {
                $.each(firmarkers_array[index], (idx2, obj) => {
                    obj.setTooltipContent(getControllerBlock(obj[idx], firMembers, firname, firicao, index));
                })
            }
            
            obj[idx].bringToFront();
        }
        if(firmarkers_array[index] === undefined)
        {
            firmarkers_array[index] = firmarkers_array_temp;
            for(idx in firmarkers_array[index])
            {
                atc_leg_featuregroup.addLayer(firmarkers_array[index][idx]);
            }
        }
    }
}

// Disable a FIR on the firmap
function turnOffFIR(obj, index)
{
    if(typeof obj === 'object')
    {
        $.each(obj, function(idx, fir)
        {
            fir.setStyle({color: '#333', weight: 1, fillOpacity: 0}).bringToBack();
            for(idx in firmarkers_array[index])
            {
                atc_leg_featuregroup.removeLayer(firmarkers_array[index][idx]);
            }
            firmarkers_array[index] = undefined;
        });
    }
}

// Disable a TRACON
function turnOffTracon(traconid)
{
    var tracon_handle = tracons_array[traconid.split('|')[0]][traconid.split('|')[1]];
    tracon_handle.setStyle({weight: 0, color: '#000'});
    atc_leg_featuregroup.removeLayer(tracmarkers_array[traconid]);
    tracmarkers_array[traconid] = undefined;
}

function getFirIndex(fir)
{
    var index = fir.fir.icao + Number(fir.fir.is_fss);
    if(typeof firs_array[index] === 'undefined')
    {
        // Try is_fss = 0
        index = fir.fir.icao + '0';
    }
    return index;
}

function getFirIndexByCallsign(callsign)
{
    if(callsign.search('_FSS') > 0)
    {
        var type = 1;
    }
    else
    {
        var type = 0;
    }
    let fir = firSearch(callsign);
    if(fir !== null && typeof fir !== 'undefined')
    {
        if(typeof firs_array[fir.icao + type] !== 'undefined')
        {
            return fir.icao + type;
        }
        else if(typeof firs_array[fir.icao + '0'] !== 'undefined')
        {
            return fir.icao + '0';
        }
    }
    return null;
}

// Get the local colour
function getLocalColor(obj)
{
    if(obj.TWR)
    {
        return red;
    }
    else if(obj.GND)
    {
        return green;
    }
    else if(obj.DEL)
    {
        return blue;
    }
    else if(obj.ATIS)
    {
        return yellow;
    }
    else
    {
        return '#999';
    }
}

function getFirTooltip(icao, index, firMembers)
{
    var is_fss = 0;
    var fssicao = '';
    $.each(firMembers, function(idx, member) 
    {
        if(member.fssname && is_fss == 0)
        {
            is_fss = 1;
            fssicao = member.fssicao;
        }
        else
        {
            is_fss = 0;
        }
    })

    var tt = '<div style="position: relative"><div class="firlabel" onmouseenter="highlightFIR(\''+index+'\')" onmouseleave="dehighlightFIR(\''+index+'\')" style="position: relative; display: flex; flex-direction: column; justify-content: center;"><table style="margin: 0.2rem; align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.75rem; overflow: hidden; font-weight: bold"><tr><td class="text-light" style="padding: 0px 5px; white-space: nowrap; text-align: center">'+icao;
    if(is_fss)
    {
        tt += '<br><span class="rounded px-1" style="background-color: #9370db">'+fssicao+'</span>';
    }
    tt += '</td></tr></table></div></div>';
    return tt;
}

function getTracTooltip(index, traconid)
{
    var tt = '<div style="position: relative"><div class="traclabel" onmouseenter="highlightTracon(\''+traconid+'\')" onmouseleave="dehighlightTracon(\''+traconid+'\')" style="position: relative; display: flex; flex-direction: column; justify-content: center;"><table style="margin: 0.2rem; align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold"><tr><td style="color: #40e0d0; padding: 0px 5px; white-space: nowrap; text-align: center">'+index+'</td></tr></table></div></div>';
    return tt;
}

function highlightFIR(index)
{
    $.each(firs_array[index], (idx, obj) => {
        obj.setStyle({fillColor: '#fff', fillOpacity: 0.4});
    })
}
function dehighlightFIR(index)
{
    $.each(firs_array[index], (idx, obj) => {
        obj.setStyle({fillOpacity: 0.1});
    })
}

function highlightTracon(index)
{
    var split = index.split('|');
    for(idx in tracons_array[split[0]])
    {
        if(idx == split[1])
        {
            tracons_array[split[0]][split[1]].setStyle({fillColor: '#40d0e0', fillOpacity: 0.2});
        }
    }
}
function dehighlightTracon(index)
{
    var split = index.split('|');
    for(idx in tracons_array[split[0]])
    {
        if(idx == split[1])
        {
            tracons_array[split[0]][split[1]].setStyle({fillOpacity: 0});
        }
    }
}

function highlightSigmet(index)
{
    sigmets_array[index].setStyle({fillOpacity: 0.4});
}
function dehighlightSigmet(index)
{
    sigmets_array[index].setStyle({fillOpacity: 0.1});
}

// Get Local Tooltip
// function getLocalTooltip(obj)
// {
//     var tt = '<table class="bg-white" style="font-family: \'Figtree\', sans-serif; font-size: 0.7rem; border-radius: 1rem; overflow: hidden;"><tr><td style="padding: 0px 5px;">'+obj.loc.icao+'</td>';
//     if(obj.DEL)
//     {
//         tt += '<td class="text-white bg-primary" style="padding: 0px 5px">D</td>';
//     }
//     if(obj.GND)
//     {
//         tt += '<td class="text-white bg-success" style="padding: 0px 5px">G</td>';
//     }
//     if(obj.TWR)
//     {
//         tt += '<td class="text-white bg-danger" style="padding: 0px 5px">T</td>';
//     }
//     if(obj.ATIS)
//     {
//         tt += '<td class="text-white bg-warning" style="padding: 0px 5px">A</td>';
//     }

//     tt += '</tr></table>';

//     return tt;
// }

function getLocalTooltip(icao)
{
    if(locals[icao])
    {
        var obj = locals[icao];
    }
    else
    {
        var obj = [];
        obj.loc = [];
        obj.loc.icao = icao;
    }
    ct = 0;
    tt = '';
    let icao_text_style = 'text-white-50'; // ATC offline
    let icao_background_color = 'rgba(0,0,0,0)'
    if(obj.DEL)
    {
        tt += '<td class="text-white" style="background-color: '+blue+'; text-align: center; padding: 0px 5px">D</td>';
        ct += 1;
    }
    if(obj.GND)
    {
        tt += '<td class="text-white" style="background-color: '+green+'; text-align: center; padding: 0px 5px">G</td>';
        ct += 1;
    }
    if(obj.TWR)
    {
        tt += '<td class="text-white" style="background-color: '+red+'; text-align: center; padding: 0px 5px">T</td>';
        ct += 1;
    }
    if(obj.ATIS)
    {
        tt += '<td class="text-white" style="background-color: '+yellow+'; text-align: center; padding: 0px 5px">A</td>';
        ct += 1;
    }
    if(tt != '')
    {
        tt = '<table style="margin: 0.2rem; margin-top: 0rem; flex: 1; overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold; border-radius: 5px;"><tr>'+tt+'</tr></table>';
        icao_text_style = 'text-light'; // ATC online
        icao_background_color = 'rgba(255,255,255,0.1)'
    }    
    // If event, show "notification dot"
    let event = '';
    if(eventsByAirport[icao])
    {
        days_rem = 999
        for(id in eventsByAirport[icao])
        {
            event = eventsByAirport[icao][id];
            days_rem = Math.min(moment.duration(moment(event.start).diff(moment())).asDays(),days_rem);
        }
        let style = '';
        if (days_rem < 1)
        {
            style = 'background-color: '+red; // Today
        }
        else if (days_rem < 7)
        {
            style = 'border: 2px solid rgba(218,41,46,0.5);background-color: rgba(0,0,0,0.5)'; // This week
        }
        else
        {
            style = 'border: 2px solid rgba(218,41,46,0.25);background-color: rgba(0,0,0,0.25)'; // In >1 week
        }
        event = '<div style="position: absolute; top: -5px; left: -5px; border-radius: 5px; width: 10px; height: 10px; '+style+'"></div>';
    }
    var tt = '<div ondblclick="zoomToAirport(\''+icao+'\', true)" style="position: relative; background-color: '+icao_background_color+'; display: flex; flex-direction: column; justify-content: center; border-radius: 5px;">'+event+'<table style="margin: 0.2rem; align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.6rem; overflow: hidden; font-weight: bold"><tr><td colspan="'+ct+'" class="'+icao_text_style+'" style="padding: 0px 5px">'+obj.loc.icao+'</td></tr></table>'+tt+'</div>';

    return tt;
}

// Get the Local Block
function getLocalBlock(icao)
{
    if(typeof airports[icao] != 'undefined')
    {
        city = airports[icao].city;
    }
    if(typeof locals[icao] != 'undefined')
    {
        var obj = locals[icao];
    }
    else
    {
        obj = [];
        obj.loc = airports[icao];
    }
    ct = 0;
    tt = '';

    var list = '<table style="color: #eee; font-size: 0.9rem"><tr><td colspan="6" class="pb-1" style="font-size: 1rem; font-weight: 400; white-space: nowrap"><p class="mb-0">'+obj.loc.name+'</p><small class="text-muted mt-0" style="font-size: 0.8rem">'+city+'</small></td></tr>';
    if(obj.DEL)
    {
        $.each(obj.DEL, (idx, item) => {
            list += '<tr><td style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+blue+'; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">DEL</div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="ps-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td class="ps-1" style="text-align: right">' + getControllerRating(item.rating) +'</td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+getTimeOnline(item)+'</td></tr>';
        })
    }
    if(obj.GND)
    {
        $.each(obj.GND, (idx, item) => {
            list += '<tr><td style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+green+'; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">GND</div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="ps-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td class="ps-1" style="text-align: right">' + getControllerRating(item.rating) +'</td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+getTimeOnline(item)+'</td></tr>';
        })
    }
    if(obj.TWR)
    {
        $.each(obj.TWR, (idx, item) => {
            list += '<tr><td style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+red+'; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">TWR</div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="ps-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td class="ps-1" style="text-align: right">' + getControllerRating(item.rating) +'</td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+getTimeOnline(item)+'</td></tr>';
        })
    }
    if(obj.ATIS)
    {
        $.each(obj.ATIS, (idx, item) => {
            list += '<tr><td rowspan="2" style="vertical-align:top"><div style="display: flex; flex-direction: column"><div class="badge" style="background-color: '+yellow+'; border-bottom-left-radius: 0; border-bottom-right-radius: 0; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;">ATIS</div><div class="badge" style="background-color: #181818; border-top-left-radius: 0; border-top-right-radius: 0; font-size: 1.6rem; margin-right: 0.4rem; font-family: \'JetBrains Mono\', sans-serif;"">'+getAtisCode(item.atis, icao)+'</div></div></td><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+item.callsign+'</td><td class="ps-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+item.name+'</td><td></td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+item.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem; white-space: normal;">'+getTimeOnline(item)+'</td></tr><tr><td colspan="5" style="white-space: normal; color: #ccc; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem">'+item.atis+'</td></tr>';
        })
    }

    eventslist = '';
    if(eventsByAirport[icao])
    {
        eventslist = '<tr><td colspan="2" style="position: relative"><div style="position: absolute; top: 50%; left: 0px; right: 0px; height: 2px; background-color: #999; z-index: 1"></div><span style="position: relative; color: #999; background-color: #282828; z-index: 2" class="ms-3 px-1">Upcoming Events</span></td></tr>';
        for(id in eventsByAirport[icao])
        {
            eventslist += '<tr><td class="pe-3 pt-1" width="15%"><table class="rounded-2" style="overflow: hidden; font-family: \'JetBrains Mono\', sans-serif; background-color: #eee"><tr><td style="color: rgb(169,56,72); text-transform: uppercase; font-size: 0.6rem; text-align: center">'+moment(eventsByAirport[icao][id].start).format('MMM')+'</td></tr><tr><td style="min-width: 35px; text-align: center; font-size: 1rem; color: #222">'+moment(eventsByAirport[icao][id].start).format('D')+'</td></tr></table></td><td style="font-size: 0.9rem; color: #aaa; white-space: nowrap; line-height: normal">'+eventsByAirport[icao][id].name+'<br><small class="text-muted" style="font-family: \'JetBrains Mono\', sans-serif">'+moment(eventsByAirport[icao][id].start).utc().format('HHmm')+' - '+ moment(eventsByAirport[icao][id].end).utc().format('HHmm') +'Z</small></td></tr>';
        }
    }
    

    list = '<div class="card border border-secondary" style="background-color: #282828; min-width: 300px; overflow: hidden; border-radius: 5px;"><div class="p-2">'+list+'</table></div>';
    if(eventsByAirport[icao])
    {
        list += '<div class="p-2 pt-0" style="background-color: #282828"><table style="width: 100%">'+eventslist+'</table></div>';
    }
    list += '</div>';
    return list;
}

function getNatBlock(nat)
{
    var route = '';
    $.each(nat.route, (idx, fix) => {
        if(idx != 0)
        {
            route += ' <i class="fas fa-angle-right"></i> ';
        }
        route += fix.name;
    })
    var table = '<table style="width: 300px; color: #ccc" class="mb-2"><tr><td style="width: 60px; border: 1px solid #ccc; text-align: center; font-size: 0.9rem"><h1 style="font-weight: bold; font-family: \'JetBrains Mono\', sans-serif;" class="mb-0">'+nat.id+'</h1></td><td rowspan="2" class="px-2"><small style="font-weight: bold">North Atlantic Track</small><hr class="my-1"><span style="font-family: \'JetBrains Mono\', sans-serif; font-size: 0.9rem">'+route+'</span></td></tr><tr><td style="border: 1px solid #ccc; text-align: center"><small>TMI '+nat.tmi+'</small>';
    table += '</td></tr></table>';
    return '<div class="card" style="background-color: #282828; border: 1px solid #ccc"><div class="p-2" style="font-size: 1rem; font-weight: bold">'+table+'<small class="text-muted mb-0" style="font-weight: normal">Data courtesy of Gander Oceanic OCA</small></div></div>';
}

// Get the controller block
function getControllerBlock(firObj, firMembers, firname, firicao, index)
{
    var list = '<table style="width: 100%; color: #333; font-size: 0.9rem"><tr><td colspan="4" style="font-size: 1rem; font-weight: 600; white-space: nowrap"><span class="text-muted">'+firicao+'</span> '+firname+'</td></tr>';
    if(warnings[index])
    {
        list += '<tr><td colspan="3" class="small text-muted pt-0"><i class="fas fa-info-circle"></i> '+warnings[index]+'</td></tr>';
    }
    $.each(firMembers, function(idx, member) {
        if(member.fssname)
        {
            list = list+'<tr><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; color: #9370DB; white-space: nowrap">'+member.callsign+'<i style="display: inline; color: #9370db" class="ms-1 fas fa-caret-square-down"></i></td><td class="ps-3" style="vertical-align: middle; text-align: right; white-space: nowrap">'+member.name+'</td><td class="ps-3">'+getControllerRating(member.rating)+'</td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.time_online+'</td></tr>';
            list = list+'<tr><td colspan="4" class="small text-muted pt-0" style="line-height: 0.9rem;"><b style="color: #9370db">'+member.fssname+'</b> covers '+firicao+' above FL245</td></tr>';
        }
        else
        {
            list = list+'<tr><td style="vertical-align: middle; font-family: \'JetBrains Mono\', sans-serif; white-space: nowrap">'+member.callsign+'</td><td class="ps-3" style="vertical-align: middle; text-align: right; white-space: nowrap;">'+member.name+'</td><td class="ps-3">'+getControllerRating(member.rating)+'</td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.freq+'</td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+member.time_online+'</td></tr>';
        }
    })
    list = '<div class="card"><div class="p-2" style="color: #222; background-color: #eee">'+list+'</table></div></div>';
    return list;
}

function getTraconBlock(obj, dep = false)
{
    tracon_name = obj.name;
    list = '<table style="width: 100%; color: #333; font-size: 0.9rem"><tr><td colspan="3" style="font-size: 1rem; font-weight: 600">'+tracon_name+'</td></tr>';
    $.each(obj.members, function(idx, subobj) {
        list = list+'<tr><td style="font-family: \'JetBrains Mono\', sans-serif">'+subobj.callsign+'</td><td class="ps-3" style="text-align: right; white-space: nowrap;">'+subobj.name+'</td><td class="ps-3">'+getControllerRating(subobj.rating)+'</td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+subobj.freq+'</td><td class="text-muted" style="font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem"></td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+getTimeOnline(subobj)+'</td></tr>';
    })
    list = '<div class="card"><div class="p-2" style="color: #222; background-color: #eee">'+list+'</table></div></div>';
    return list;
}

async function loadAirlines()
{
    response = await fetchRetry('/livedata/airlines.json');
    airlines = await response.json();
    airlinesByIcao = {};
    $.each(airlines, (idx, airline) => {
        if(typeof airlinesByIcao[airline.icao] === 'undefined')
        {
            airlinesByIcao[airline.icao] = [airline];
        }
        else
        {
            airlinesByIcao[airline.icao].push(airline);
        }
    })
    return airlinesByIcao;
}

async function loadRegprefixes()
{
response = await fetchRetry('/livedata/regprefixes.json');
    return await response.json();
}

async function loadAircraft()
{
    response = await fetchRetry('/livedata/aircraft.json');
    aircraft = await response.json();
    aircraftByIcao = {};
    $.each(aircraft, (idx, ac) => {
        aircraftByIcao[ac.icao] = ac;
    })
    return aircraftByIcao;
}

async function initializeNat()
{
    // response = await fetchRetry(apiserver + 'api/livedata/nats');
    // nats = await response.json();

    // $.each(nats, (idx, nat) => {
    //     latlons = [];
    //     $.each(nat.route, (idx2, fix) => {
    //         if(fix.name == 'SOORY')
    //         {
    //             latlons.push([-fix.longitude, -fix.latitude]);
    //         }
    //         else
    //         {
    //             latlons.push([fix.latitude, fix.longitude]);
    //         }
    //     })
    //     var natline = new L.Polyline.AntPath(latlons, {weight: 5, color: '#fff'});
    //     natline.bindTooltip(getNatBlock(nat), {opacity: 1, sticky: true});
    //     nats_featuregroup.addLayer(natline);
    //     $.each(nat.route, (idx2, fix) => {
    //         if(fix.name == 'SOORY')
    //         {
    //             var latlon = [-fix.longitude, -fix.latitude];
    //         }
    //         else
    //         {
    //             var latlon = [fix.latitude, fix.longitude];
    //         }
    //         var return_point = L.circleMarker(latlon, {
    //             radius: 5,
    //             stroke: true,
    //             weight: 3,
    //             color: '#2196F3',
    //             fillColor: '#eee',
    //             fillOpacity: 1,
    //         });
    //         nats_featuregroup.addLayer(return_point);
    //     })
    // })
}

// Zoom to a flight
async function zoomToFlight(uid)
{

    // If the map isn't available, will need to redirect to a page that does.
    if(!$('#map').length)
    {
        window.location.href = '/?uid='+uid;
    }

    // If streamerrs bar visible, hide it
    if($('#streamers-bar').is(':visible'))
    {
        $('#streamers-bar').addClass('d-none').removeClass('d-flex');
    }

    historical = (typeof(plane_array[uid]) === 'undefined') ? 1 : 0;

    if(typeof plane != 'undefined')
    {
        active_featuregroup.removeLayer(plane); delete plane;
    }
    if(typeof dep_point != 'undefined')
    {
        active_featuregroup.removeLayer(dep_point); delete dep_point;
    }
    if(typeof arr_point != 'undefined')
    {
        active_featuregroup.removeLayer(arr_point); delete arr_point;
    }
    if(typeof flightpath != 'undefined')
    {
        active_featuregroup.removeLayer(flightpath); delete flightpath;
    }

    if(historical) 
    {
        response = await fetchRetry(apiserver + 'api/flight/' + uid);
        planedata = await response.json();
        bounds = [planedata.flight.lat, planedata.flight.lon];
        plane = createPlaneMarker(planedata.flight);
        plane.flight.historical = true;
    } 
    else 
    { 
        plane = plane_array[uid];
        bounds = []; bounds.push(plane.getLatLng());
    }
    active_flight = uid;
    

    // Refresh the flights before showing
    if(!historical)
    {
        refreshFlights(filterName, filterCriteria);
    }

    // If the searchbox is showing, hide it
    $('#search-wrapper').hide();

    // If currently in the airports view, hide ap appropriately
    if(typeof ap_featuregroup !== 'undefined')
    {
        $('#airport-sidebar').hide();
    }

    // If currently in the users view, hide appropriately
    if(typeof(user_sidebar) != 'undefined' && user_sidebar)
    {
        $('#user-sidebar').hide();
    }

    $('#events-container').hide();

    // Handle departure/arrival airports
    [dep_airport, dep_point, dep_name, dep_city] = processAirport(plane.flight.dep);
    [arr_airport, arr_point, arr_name, arr_city] = processAirport(plane.flight.arr);
    if(dep_point && arr_point)
    {   
        [dep_point, arr_point] = processAirportForAntimeridian(plane.flight, airports[dep_airport], airports[arr_airport], dep_point, arr_point);
    }

    if(dep_point && dep_point != null)
    {
        active_featuregroup.addLayer(dep_point); bounds.push(dep_point.getLatLng());
    }
    if(arr_point && arr_point != null)
    {
        active_featuregroup.addLayer(arr_point); bounds.push(arr_point.getLatLng());
    }

    //map.fitBounds(bounds);

    // Swap the layers
    map.addLayer(active_featuregroup);

    // If it's the ap layer, hide that; else hide plane_featuregroup
    if(typeof ap_featuregroup !== 'undefined' && map.hasLayer(ap_featuregroup))
    {
        map.removeLayer(ap_featuregroup);
    }
    else
    {
        map.removeLayer(plane_featuregroup);
    }
    

    if(typeof polyline_featuregroup != 'undefined' && map.hasLayer(polyline_featuregroup))
    {
        map.removeLayer(polyline_featuregroup);
    }
    
    // Add the plane
    active_featuregroup.addLayer(plane);
    plane.bringToFront();

    // Make the tooltip permanent
    togglePlaneTooltip(plane, true);

    // Show the flights box
    $('#flights-sidebar').show().addClass('d-flex');

    // Update the flights box
    updateFlightsBox(plane.flight);

    // Hide the sidebar
    $('#sidebar').hide();

    if(historical)
    {
        flightpath = await new L.Polyline(adjustLogsForAntimeridian(planedata.flight, airports[dep_airport], airports[arr_airport], planedata.logs), {smoothFactor: 1, color: '#00D300', weight: 1, nowrap: true});
        await active_featuregroup.addLayer(flightpath);
    }
    else
    {
        addedFlightPathPromise = addFlightPath(dataserver +'api/livedata/logs/' + uid + '.json', airports[dep_airport], airports[arr_airport], plane.flight);
        await addedFlightPathPromise;
    }

    // Set the permalink for the URL
    window.history.pushState(uid, uid, '/?uid=' + uid);
}

async function addFlightPath(url, dep, arr, flight)
{
    var response = await fetchRetry(url);
    var latlons = await response.json();
    flightpath = await new L.Polyline(adjustLogsForAntimeridian(flight, dep, arr, latlons), {smoothFactor: 1, color: '#00D300', weight: 1.5, nowrap: true});
    await active_featuregroup.addLayer(flightpath);
}

function toggleStreamers()
{
    if($('.map-button#streamers').hasClass('map-button-active'))
    {
        $('#streamers-bar').removeClass('d-flex').addClass('d-none');
        $('.map-button#streamers').removeClass('map-button-active');
    }
    else
    {
        $('#streamers-bar').removeClass('d-none').addClass('d-flex');
        $('.map-button#streamers').addClass('map-button-active');
    }
}

function toggleWorldflight()
{
    if(map.hasLayer(wf_featuregroup))
    {
        $('.map-button#wf').removeClass('map-button-active');
        map.removeLayer(wf_featuregroup);
    }
    else
    {
        $('.map-button#wf').addClass('map-button-active');
        map.addLayer(wf_featuregroup);
    }
}

function toggleLabels()
{
    if(typeof(locLabels) == 'undefined')
    {
        if(typeof basemap == 'undefined')
        {
            locLabels = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);
        }
        else
        {
            locLabels = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);
        }
        $('.map-button#labels').addClass('map-button-active');
        $.cookie('labels', 'true', {expires: 180});
    }
    else
    {
        map.removeLayer(locLabels);
        delete locLabels;
        $('.map-button#labels').removeClass('map-button-active');
        $.cookie('labels', 'false', {expires: 180});
    }
}

function flipLabels(delim)
{
    map.removeLayer(locLabels);

    if(delim == 'dark')
    {
        locLabels = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/dark_only_labels/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);
    }
    else
    {
        locLabels = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(map);
    }
}

function toggleBasemap()
{
  if(typeof basemap == 'undefined')
  {
    map.removeLayer(lightbasemap);
    basemap = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}{r}.png', {
    	attribution: '',
    	subdomains: 'abcd',
    }).addTo(map);
    $('.map-button#light').removeClass('map-button-active');
    setLayerOrder();
    setBasemapOrder();
    lightbasemap = undefined;
    $.cookie('lightmap', 'false', {expires: 180});
    if(map.hasLayer(locLabels))
    {
        flipLabels('dark');
    }
  }
  else
  {
    map.removeLayer(basemap);
    lightbasemap =  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    	attribution: ''
    }).addTo(map);
    $('.map-button#light').addClass('map-button-active');
    setLayerOrder();
    setBasemapOrder();
    basemap = undefined;
    $.cookie('lightmap', 'true');
    if(typeof(locLabels) != 'undefined' && map.hasLayer(locLabels))
    {
        flipLabels('light');
    }
  }
}

// Toggles the plane tooltip's <permanent> property
function togglePlaneTooltip(plane, tf)
{
    plane.unbindTooltip();
    [offset, dir] = getMarkerDirection(plane.flight);
    plane.bindTooltip(getDatablock(plane.flight), {permanent: tf, direction: dir, offset: offset});
}

// Get airports
function processAirport(icao)
{
    if(airports[icao])
    {
        var return_point = L.circleMarker(new L.LatLng(airports[icao].lat, airports[icao].lon), {
            radius: 2,
            stroke: false,
            fillColor: '#00d300',
            fillOpacity: 1,
        });
        return_point.bindTooltip(airports[icao].iata, {permanent: true, className: 'tooltip-airport'})
        var return_array = [icao, return_point, airports[icao].name, airports[icao].city];
    }
    else
    {
        return_array = [icao, null, 'Unknown Airport', 'Unknown City'];
    }
    return return_array;
}

function getColor(num)
    {
        if(num < 80)
        {
            return 'text-success';
        }
        else if(num < 100)
        {
            return 'text-warning';
        }
        else
        {
            return 'text-danger';
        }
    }

    function getFlightColor(inp)
    {
      inp = (inp - 15) / 35;
      if(inp > 1){ inp = 1; }
      else if(inp < 0) { inp = 0; }
      var g = 1 - 2 * inp;
      var r = -g;
      if(r < 0)
      {
        r = 0;
      }
      if(g < 0)
      {
        g = 0;
      }
      var y = 1 - 2 * Math.abs(inp - 0.5);

      var t = r + g + y;
      var r = r / t;
      g = g / t;
      y = y / t;

      var rc = [255, 77, 77];
      var gc = [51, 204, 51];
      var yc = [255, 179, 26];
      var rg = Math.floor(r * rc[0] + g * gc[0] + y * yc[0]);
      var gg = Math.floor(r * rc[1] + g * gc[1] + y * yc[1]);
      var yg = Math.floor(r * rc[2] + g * gc[2] + y * yc[2]);

      return 'rgb('+rg+','+gg+','+yg+')';
    }

async function returnToView()
{
    // Wait for the map to finish loading
    if(map.hasLayer(active_featuregroup))
    {
        // Get the plane object ready to be placed back
        togglePlaneTooltip(plane, false);
        if(!plane.flight.historical)
        {
            plane_featuregroup.addLayer(plane);
        }

        // Switch the layers
        map.removeLayer(active_featuregroup);
        if(!manual) {
            if(typeof ap_featuregroup !== 'undefined')
            {
                map.addLayer(ap_featuregroup);
                $('#airport-sidebar').show();
            }
            else
            {
                map.addLayer(plane_featuregroup); 
            }
            if(typeof(user_sidebar) != 'undefined' && user_sidebar)
            {
                $('#user-sidebar').show();
            }
        }

        // Delete the active featuregroup
        delete active_featuregroup;
        active_featuregroup = new L.FeatureGroup();

        // Hide the flight information box
        $('#flights-sidebar').hide().removeClass('d-flex');

        // Return the sidebar if it exists on the page
        $('#sidebar').show();
        $('#events-container').show();

        // If streamers bar was active, re-show it
        if($('.map-button#streamers').hasClass('map-button-active'))
        {
            $('#streamers-bar').addClass('d-flex').removeClass('d-none');
        }

        // Remove active flight tag
        active_flight = null;
    }
    if(typeof polyline_featuregroup != 'undefined')
    {
        map.addLayer(polyline_featuregroup);
    }

    window.history.pushState('home', 'home', '/');
}

function handleCookies()
{
    if($.cookie('atc') == 'true')
    {
        toggleATC();
    }
    if($.cookie('lightmap') == 'true')
    {
        toggleBasemap();
    }
    if($.cookie('sigmet') == 'true')
    {
        toggleSigmet();
    }
    if($.cookie('nat') == 'true')
    {
        toggleNat();
    }
    if($.cookie('wx') == 'true')
    {
        toggleNexrad();
    }
    if($.cookie('labels') == 'true')
    {
        toggleLabels();
    }
    $('.map-button').removeClass('d-none');
    $('.loading').addClass('d-none');
}

// Update the flights box
function updateFlightsBox(flight)
{

    // Update the callsign
    $('#flights-callsign').html(flight.callsign);

    // Get status of the flight
    flight_status = getStatus(flight);

    // Update the live stats
    $('.flights-liveitem#spd').html(flight.gndspd+' kt');
    $('.flights-liveitem#alt').html(flight.alt+' ft');
    $('.flights-liveitem#togo').html(Math.round(getDtg(flight))+' nm');

    // Update status text and colors
    $('#flights-status').html(flight_status.status);
    $('#flights-status').css({ 'background-color': flight_status.color });
    $('#flights-progressbar-plane').css({ 'color': flight_status.color });
    $('#flights-progressbar-elapsed').css({ 'background-color': flight_status.color });
    if(flight_status.blink)
    {
        $('#flights-progressbar-plane').addClass('blinking');
    }
    else
    {
        $('#flights-progressbar-plane').removeClass('blinking');
    }

    updateAirlines(flight);

    // Do the time online
    var timeairborne = getTimeAirborne(flight);
    if(timeairborne.status != 'nodep')
    {
        $('#flights-airborne-container').addClass('d-flex').removeClass('d-none');
        hrstring = (timeairborne.timeonline[0] == 1) ? timeairborne.timeonline[0] + ' hour, ' : timeairborne.timeonline[0] + ' hours, '
        mnstring = (timeairborne.timeonline[1] == 1) ? timeairborne.timeonline[1] + ' minute' : timeairborne.timeonline[1] + ' minutes'
        timestring = (timeairborne.timeonline[0] == 0) ? mnstring : hrstring + mnstring;
        $('#flights-timeairborne').addClass('mt-2').html('Time Airborne: ' + timestring);
    }
    else
    {
        $('#flights-airborne-container').addClass('d-none').removeClass('d-flex');
        $('#flights-timeairborne').removeClass('mt-2').html('');
    }

    // Update the airports
    [dep_airport, dep_point_, dep_name, dep_city] = processAirport(plane.flight.dep);
    [arr_airport, arr_point_, arr_name, arr_city] = processAirport(plane.flight.arr);

    $('#flights-dep-icao').html('<div class="flights-link-item" onclick="zoomToAirport(\''+dep_airport+'\')">'+dep_airport+'</div>');
    $('#flights-airport-dep').html('<div class="flights-link-item" onclick="zoomToAirport(\''+dep_airport+'\')">'+dep_name+'<br><span class="text-muted">'+dep_city+'</span></div>');
    
    $('#flights-arr-icao').html('<div class="flights-link-item" onclick="zoomToAirport(\''+arr_airport+'\')">'+arr_airport+'</div>');
    $('#flights-airport-arr').html('<div class="flights-link-item" onclick="zoomToAirport(\''+arr_airport+'\')">'+arr_name+'<br><span class="text-muted">'+arr_city+'</span></div>');

    // Set the progress bar correctly
    $('#flights-progressbar-elapsed').css({ width: getElapsedWidth(flight) + '%' });

    // Route
    $('#flights-route').html(flight.route);

    // Equipment
    $('#flights-equipment').html(flight.aircraft);

    // Name
    $('#flights-name').html('<span class="me-2">'+flight.name+'</span>'+getBadge(flight.rating)+' '+ getPatron(flight.cid));

    // Squawk
    flight.xpdr = padToFourDigits(flight.xpdr);
    flight.axpdr = padToFourDigits(flight.axpdr);

    $('#flights-squawk').html(flight.xpdr + ' / ' + flight.axpdr);
}

function padToFourDigits(value) {
    return value.toString().padStart(4, '0');
}

function updateAirlines(flight)
{
    for(i in regprefixes)
    {
        if(flight.callsign.match(regprefixes[i].regex))
        {
            $('#flights-airline').html('Privately Registered (' + regprefixes[i].country + ')');
            return;
        }
    }

    if(flight.callsign.length > 3 && $.isNumeric(flight.callsign[3]) && airlinesByIcao && airlinesByIcao[flight.callsign.substring(0,3)])
    {
        let airline = airlinesByIcao[flight.callsign.substring(0,3)];
        var html = [];
        $.each(airline, (idx, al) => {
            var st = al.name;
            if(al.va)
            {
                st += ' <span class="strong small text-muted">VA</span>';
            }
            html.push(st);
        })
        var ret = html.join('<br>');
        if(html.length > 1)
        {
            ret = '<small class="strong" style="color: #FFA500; font-size: 0.7rem"><i class="fas fa-info-circle"></i> Multiple Airlines</small><br>' + ret;
        }
        $('#flights-airline').html(ret);
    }
    else
    {
        $('#flights-airline').html('');
    }
}

function getPatron(cid)
{
    if(patrons[cid])
    {
        switch(patrons[cid].tier)
        {
            case 1:
                return '<span style="font-size: 0.8rem; font-weight: normal; background-color: #FF424D; color: #fff; border-radius: 1rem;" class="px-2 badge badge-sm"><i class="fab fa-patreon"></i> Supporter</span>';
            case 2:
                return '<span style="font-size: 0.8rem; font-weight: normal; background-color: #FF424D; color: #fff; border-radius: 1rem;" class="px-2 badge badge-sm"><i class="fab fa-patreon"></i> Streamer</span>';
            case 3:
                return '<span style="font-size: 0.8rem; font-weight: normal; background-color: #5C859E; color: #fff; border-radius: 1rem;" class="px-2 badge badge-sm"><i class="far fa-gem"></i> Diamond</span>';
            default:
                return '';
        }
    }
    else
    {
        return '';
    }
}

function processAirportForAntimeridian(flight, dep, arr, dep_point, arr_point)
{
    if(crossesAntimeridian(dep, arr))
    {

        dep_latlon = dep_point.getLatLng();
        arr_latlon = arr_point.getLatLng();
        if(Number(flight.lon) > 0)
        {
            if(Number(arr_latlon.lng) < 0) { arr_latlon.lng += 360; }
            if(Number(dep_latlon.lng) < 0) { dep_latlon.lng += 360; }
        }
        if(Number(flight.lon) < 0)
        {
            if(Number(arr_latlon.lng) > 0) { arr_latlon.lng -= 360; }
            if(Number(dep_latlon.lng) > 0) { dep_latlon.lng -= 360; }
        }

        dep_point.setLatLng(dep_latlon);
        arr_point.setLatLng(arr_latlon);

    }

    return [dep_point, arr_point];
}

function crossesAntimeridian(dep, arr)
{
  flag = 0;
  if(dep == null || arr == null)
  {
    return 0;
  }
  if(Number(arr.lon) < Number(dep.lon) && getRhumbLineBearing(Number(dep.lat), Number(dep.lon), Number(arr.lat), Number(arr.lon)) < 180)
  {
    // Probably crossing antimeridian eastbound
    flag = 1;
  }
  else if(Number(arr.lon) > Number(dep.lon) && getRhumbLineBearing(Number(dep.lat), Number(dep.lon), Number(arr.lat), Number(arr.lon)) >= 180)
  {
    // Probably crossing antimeridian westbound
    flag = -1;
  }
  return flag;
}

function adjustLogsForAntimeridian(flight, dep, arr, logs)
{
    newLogs = [];
    if(crossesAntimeridian(dep, arr))
    {
        newLogs = [];
        $.each(logs, function(idx, obj) {
            lat = Number(obj[0]);
            if(Number(flight.lon) < 0 && Number(obj[1]) > 0)
            {
                lon = Number(obj[1]) - 360;
            }
            else if(Number(flight.lon) > 0 && Number(obj[1]) < 0)
            {
                lon = Number(obj[1]) + 360;
            }
            else
            {
                lon = Number(obj[1]);
            }
            newLogs.push([lat, lon]);
        })
    }
    else
    {
        newLogs = logs;
    }
    return newLogs;
}

async function toggleATC()
{
    if(!map.hasLayer(atc_featuregroup))
    {
        map.addLayer(atc_featuregroup);
        await refreshATC();
        setLayerOrder();
        $('.map-button#atc').addClass('map-button-active');
        $.cookie('atc', 'true', {expires: 180});
    }
    else
    {
        map.removeLayer(atc_featuregroup);
        $('.map-button#atc').removeClass('map-button-active');
        $.cookie('atc', 'false', {expires: 180});
    }
}

function setBasemapOrder()
{
    if(typeof(locLabels) != 'undefined' && map.hasLayer(locLabels))
    {
        locLabels.bringToFront();
    }
    if(map.hasLayer(nexrad))
    {
        nexrad.bringToFront();
    }
}

function setLayerOrder()
{
    // Don't do anything unless the map is loaded
    if($('#map').length)
    {
        if(map.hasLayer(sigmets_featuregroup))
        {
            sigmets_featuregroup.bringToFront();
        }
        if(map.hasLayer(nats_featuregroup))
        {
            nats_featuregroup.bringToFront();
        }
        if(map.hasLayer(plane_featuregroup))
        {
            plane_featuregroup.bringToFront();
        }
        else if(map.hasLayer(active_featuregroup))
        {
            active_featuregroup.bringToFront();
        }
    }
}

function toggleNexrad()
{
    if(!map.hasLayer(nexrad))
    {
        map.addLayer(nexrad);
        $('.map-button#wx').addClass('map-button-active');
        $.cookie('wx', 'true', {expires: 180});
    }
    else
    {
        map.removeLayer(nexrad);
        $('.map-button#wx').removeClass('map-button-active');
        $.cookie('wx', 'false', {expires: 180});
    }
}

function toggleSigmet()
{
    if(!map.hasLayer(sigmets_featuregroup))
    {
        map.addLayer(sigmets_featuregroup);
        $('.map-button#sigmet').addClass('map-button-active');
        setLayerOrder();
        $.cookie('sigmet', 'true', {expires: 180});
    }
    else
    {
        map.removeLayer(sigmets_featuregroup);
        $('.map-button#sigmet').removeClass('map-button-active');
        setLayerOrder();
        $.cookie('sigmet', 'false', {expires: 180});

    }
}

function toggleNat()
{
    if(!map.hasLayer(nats_featuregroup))
    {
        map.addLayer(nats_featuregroup);
        $('.map-button#nat').addClass('map-button-active');
        setLayerOrder();
        $.cookie('nat', 'true', {expires: 180});
    }
    else
    {
        map.removeLayer(nats_featuregroup);
        $('.map-button#nat').removeClass('map-button-active');
        setLayerOrder();
        $.cookie('nat', 'false', {expires: 180});
    }
}

function getAircraftIcao(str)
{
  ac = str.split('/');
  if(ac.length >= 3)
  {
    return ac[1];
  }
  else
  {
    return ac[0];
  }
}

function getMarker(str)
{
  ac = getAircraftIcao(str);
  switch(ac)
  {
    case 'A3ST':
        return [45, 56, 'A3ST'];
    case 'A30B':
    case 'A306':
        return [45, 54, 'A300'];
    case 'A310':
        return [44, 47, 'A310'];
    case 'A318':
        return [34, 32, 'A318'];
    case 'A319':
    case 'A19N':
        return [34, 34, 'A319'];
    case 'A320':
    case 'A20N':
        return [36, 40, 'A320'];
    case 'A321':
    case 'A21N':
        return [36, 47, 'A321'];
    case 'A332':
        return [60, 59, 'A332'];
    case 'A333':
    case 'A338':
    case 'A339':
        return [60, 64, 'A333'];
    case 'A342':
        return [60, 60, 'A342'];
    case 'A343':
        return [60, 64, 'A343'];
    case 'A345':
        return [63, 67, 'A345'];
    case 'A346':
        return [63, 74, 'A346'];
    case 'A359':
        return [65, 62, 'A359'];
    case 'A35K':
        return [65, 69, 'A35K'];
    case 'A388':
        return [80, 74, 'A388'];
    case 'B703':
        return [44, 47, 'B703'];
    case 'B720':
        return [40, 41, 'B720'];
    case 'B712':
        return [28, 38, 'B712'];
    case 'B721':
        return [33, 41, 'B721'];
    case 'B722':
        return [33, 46, 'B722'];
    case 'B731':
        return [28, 28, 'B731'];
    case 'B732':
        return [28, 31, 'B732'];
    case 'B733':
        return [29, 34, 'B733'];
    case 'B734':
        return [29, 37, 'B734'];
    case 'B735':
        return [29, 32, 'B735'];
    case 'B736':
        return [35, 33, 'B736'];
    case 'B737':
        return [35, 35, 'B737'];
    case 'B738':
        return [35, 41, 'B738'];
    case 'B739':
        return [35, 43, 'B739'];
    case 'B74S':
        return [60, 70, 'B74S'];
    case 'B741':
        return [60, 70, 'B741'];
    case 'B742':
        return [60, 70, 'B742'];
    case 'B743':
        return [60, 70, 'B743'];
    case 'B744':
        return [64, 70, 'B744'];
    case 'B748':
        return [68, 76, 'B748'];
    case 'BCLF':
        return [64, 72, 'BCLF'];
    case 'B752':
        return [38, 47, 'B752'];
    case 'B753':
        return [38, 54, 'B753'];
    case 'B762':
        return [48, 52, 'B762'];
    case 'B763':
        return [48, 58, 'B763'];
    case 'B764':
        return [52, 61, 'B764'];
    case 'B772':
        return [60, 64, 'B772'];
    case 'B773':
        return [60, 74, 'B773'];
    case 'B77L':
        return [64, 64, 'B77L'];
    case 'B77W':
        return [65, 74, 'B77W'];
    case 'B788':
        return [60, 57, 'B788'];
    case 'B789':
        return [60, 63, 'B789'];
    case 'B78X':
        return [60, 66, 'B78X'];
    case 'CONC':
        return [26, 60, 'CONC'];
    case 'A124':
        return [73, 69, 'A124'];
    case 'A225':
        return [88, 83, 'A225'];
    case 'AT43':
    case 'AT44':
    case 'AT45':
    case 'AT46':
        return [30, 28, 'AT4x'];
    case 'AT72':
    case 'AT73':
    case 'AT75':
    case 'AT76':
        return [32, 32, 'AT7x'];
    case 'B461':
    case 'B462':
    case 'B463':
    case 'RJ70':
    case 'RJ85':
    case 'RJ1H':
        return [28, 33, 'B46x'];
    case 'BA11':
        return [33, 33, 'BA11'];
    case 'BALL':
        return [73, 100, 'BALL'];
    case 'BN2P':
        return [28, 20, 'BN2P'];
    case 'C25C':
        return [28, 30, 'C25C'];
    case 'C152':
        return [26, 19, 'C152'];
    case 'C172':
        return [28, 21, 'C172'];
    case 'C700':
        return [27, 27, 'C700'];
    case 'COMT':
        return [34, 35, 'COMT'];
    case 'DA40':
        return [28, 19, 'DA40'];
    case 'DA42':
        return [28, 18, 'DA42'];
    case 'DA62':
        return [30, 19, 'DA62'];
    case 'DC6':
        return [36, 31, 'DC6'];
    case 'DC10':
        return [50, 55, 'DC10'];
    case 'DH8A':
    case 'DH8B':
        return [30, 27, 'DH8A'];
    case 'DH8C':
    case 'DH8D':
        return [28, 33, 'DH8D'];
    case 'DHC6':
        return [28, 22, 'DHC6'];
    case 'E170':
    case 'E175':
        return [28, 33, 'E17x'];
    case 'E190':
    case 'E195':
        return [27, 36, 'E19x'];
    case 'E290':
    case 'E295':
        return [36, 39, 'E29x'];
    case 'E75S':
    case 'E75L':
        return [31, 32, 'E75x'];
    case 'E120':
        return [27, 28, 'E120'];
    case 'E135':
    case 'E145':
        return [24, 31, 'E135'];
    case 'EC35':
    case 'EC45':
        return [27, 27, 'EC45'];
    case 'EUFI':
        return [21, 30, 'EUFI'];
    case 'F22':
        return [22, 30, 'F22'];
    case 'GLID':
        return [38, 19, 'GLID'];
    case 'L101':
        return [50, 50, 'L101'];
    case 'MD82':
    case 'MD83':
    case 'MD88':
    case 'MD90':
        return [32, 45, 'MD8x'];
    case 'MD11':
        return [51, 61, 'MD11'];
    case 'PA28A':
    case 'PA28B':
    case 'PA28R':
    case 'PA28S':
    case 'PA28T':
    case 'PA28U':
        return [28, 22, 'PA28x'];
    case 'SB20':
        return [27, 30, 'SB20'];
    case 'SB34':
        return [29, 27, 'SB34'];
    case 'SF50':
        return [28, 21, 'SF50'];
    case 'SR22':
    case 'S22T':
        return [28, 20, 'SR22'];
    case 'T154':
        return [37, 48, 'T154'];
    case 'TBM9':
        return [28, 23, 'TBM9'];
    case 'VC10':
        return [48, 41, 'VC10'];
    case 'VISC':
        return [28, 24, 'VISC'];
    case 'A748':
        return [31, 22, 'A748'];
    case 'BCS1':
        return [35, 35, 'BCS1'];
    case 'BCS3':
        return [39, 34, 'BCS3'];
    case 'CP10':
        return [28, 24, 'CP10'];
    case 'JS41':
        return [27, 28, 'JS41'];
    case 'BE58':
        return [28, 22, 'BE58'];
    case 'BR31':
        return [43, 36, 'BR31'];
    case 'SH36':
        return [28, 27, 'SH36'];
    case 'TRI':
        return [30, 35, 'TRI'];
    case 'ME08':
        return [28, 22, 'ME08'];
    case 'DC86':
        return [43, 57, 'DC86'];
    case 'CL60':
        return [33, 35, 'CL60'];
    case 'F18':
    case 'F18':
        return [20, 30, 'F18'];
    case 'F35':
        return [21, 30, 'F35'];
    case 'R22':
        return [14, 37, 'R22'];
    case 'R44':
        return [12, 43, 'R44'];
    case 'R66':
        return [20, 40, 'R66'];
    case 'F15':
        return [21, 30, 'F15'];
    case 'F16':
        return [19, 30, 'F16'];
    case 'U2':
        return [36, 25, 'U2'];
    case 'SR71':
        return [19, 37, 'SR71'];
    case 'C130':
        return [40, 27, 'C130'];
    case 'B06':
        return [12, 40, 'B06'];
    case 'B407':
        return [21, 30, 'B407'];
    case 'V22':
        return [30, 20, 'V22'];
	case 'ATP':
        return [31, 28, 'ATP'];
    case 'H160':
        return [29, 34, 'H160'];
    case 'B37M':
        return [36, 36, 'B37M'];
    case 'B38M':
        return [36, 39, 'B38M'];
    case 'B39M':
        return [36, 42, 'B39M'];
    case 'B3XM':
        return [36, 44, 'B3XM'];
    case 'C510':
        return [29, 28, 'C510'];
    case 'C750':
        return [28, 33, 'C750'];
    case 'C17':
        return [52, 53, 'C17'];
    case 'DC3':
        return [30, 21, 'DC3'];
	case 'A400':
        return [42, 46, 'A400'];
    case 'CRJ1':
        return [24, 30, 'CRJ1'];
    case 'CRJ7':
        return [25, 35, 'CRJ7'];
    case 'CRJ9':
        return [25, 38, 'CRJ9'];
    case 'CRJX':
        return [27, 40, 'CRJX'];
    case 'C208':
        return [28, 20, 'C208'];
    case 'E55P':
        return [28, 28, 'E55P'];
    case 'PC12':
        return [28, 23, 'PC12'];
    case 'GLEX':
        return [34, 35, 'GLEX'];
    case 'GLF5':
        return [31, 32, 'GLF5'];
    case 'FA50':
        return [31, 30, 'FA50'];
    case 'TBM8':
        return [28, 24, 'TBM8'];
    case 'H47':
        return [24, 35, 'H47'];
    case 'DHC7':
        return [34, 30, 'DHC7'];
    case 'RFAL':
        return [21, 30, 'RFAL'];
    case 'SHIP':
        return [125, 26, 'SHIP'];
    case 'RFAL':
        return [23, 33, 'RFAL'];
	case 'VULC':
        return [36, 33, 'VULC'];
	case 'B190':
        return [27, 28, 'B190'];
	case 'C182':
        return [26, 20, 'C182'];
	case 'DHC2':
        return [35, 22, 'DHC2'];
	case 'DR40':
        return [28, 22, 'DR40'];
	case 'F14':
        return [34, 33, 'F14'];
	case 'F28':
        return [30, 34, 'F28'];
	case 'J328':
        return [31, 31, 'J328'];
	case 'P212':
        return [27, 21, 'P212'];
	case 'PC6T':
        return [29, 20, 'PC6T'];
	case 'T134':
        return [29, 37, 'T134'];
	case 'T144':
        return [29, 66, 'T144'];
	case 'TEX2':
        return [24, 23, 'TEX2'];
    default:
        return [40, 40, 'A320'];
  }
    
}

// Helper functions
function nl2br (str, is_xhtml) {   
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';    
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
}

function getControllerRating(id)
{
    var ratings = ['SP', 'OBS', 'S1', 'S2', 'S3', 'C1', 'C2', 'C3', 'I1', 'I2', 'I3', 'SUP', 'ADM'];
    return ratings[id];
}

function wait(delay){
    return new Promise((resolve) => setTimeout(resolve, delay));
}

function fetchRetry(url, delay = 1000, tries = 3, fetchOptions = {}) {
    function onError(err){
        triesLeft = tries - 1;
        if(!triesLeft){
            throw err;
        }
        return wait(delay).then(() => fetchRetry(url, delay, triesLeft, fetchOptions));
    }
    return fetch(url,fetchOptions).catch(onError);
}

function findVgPosition(atc)
{
    var pfx = atc.callsign.split('_')[0];
    if(vg_positions[pfx])
    {
        for(var i in vg_positions[pfx])
        {
            if(atc.freq == vg_positions[pfx][i].freq)
            {
                var s = vg_positions[pfx][i];
                s.atc = atc;
                return s;
            }
        }
    }
    return null;
}

function findVgSectors(vg_pos)
{
    var vg_sectors = {};
    // eh
    for(i in vg_pos)
    {
        var vgkeys = Object.keys(vg_pos[i]);
        // 0 1 12
        for(j in vatglasses_array[i])
        {
            var taken = false
            for(k in vatglasses_array[i][j].feature.properties.owner)
            {
                if(vgkeys.includes(vatglasses_array[i][j].feature.properties.owner[k]) && !taken)
                {
                    if(vg_sectors[vatglasses_array[i][j].feature.properties.owner[k]])
                    {
                        vg_sectors[vatglasses_array[i][j].feature.properties.owner[k]].push(i + '|' + j);
                    }
                    else
                    {
                        vg_sectors[vatglasses_array[i][j].feature.properties.owner[k]] = [i + '|' + j];
                    }
                    taken = true;
                }
            }
        }
    }

    return vg_sectors;
}

function returnDisplaySectors(vg_sectors, alt)
{
    var d = []
    for(i in vg_sectors)
    {
        for(j in vg_sectors[i])
        {
            var l = vg_sectors[i][j].split('|');
            var vgl = vatglasses_array[l[0]][l[1]];
            if(((vgl.feature.properties.max && vgl.feature.properties.max > alt) || !vgl.feature.properties.max) &&
               ((vgl.feature.properties.min && vgl.feature.properties.min < alt) || !vgl.feature.properties.min))
                {
                    d.push(vg_sectors[i][j]);
                }
        }
    }
    return d;
}

function showGlassesView(alt)
{
    new_active_vg_pos = [];
    new_active_vg_sectors = [];
    var ds = returnDisplaySectors(vg_sectors, alt);
    for(i in vg_sectors)
    {
        ctr = [];
        for(j in vg_sectors[i])
        {
            var secid = vg_sectors[i][j].split('|');
            var pos = vg_pos[secid[0]][i];
            if(ds.includes(secid[0] + '|' + secid[1]))
            {
                vg_featuregroup.addLayer(vatglasses_array[secid[0]][secid[1]]);
                new_active_vg_sectors.push(secid[0] + '|' + secid[1]);

                // Mark as no delete
                if($.inArray(secid[0] + '|' + secid[1], active_vg_sectors) >= 0)
                {
                    active_vg_sectors.splice(active_vg_sectors.indexOf(secid[0] + '|' + secid[1]), 1);
                }

                if(pos.atc.callsign.includes('_CTR'))
                {
                    vatglasses_array[secid[0]][secid[1]].setStyle({fillColor: '#aaa', fillOpacity: 0, weight: 1, color: '#ddd'});
                }
                else
                {
                    vatglasses_array[secid[0]][secid[1]].setStyle({fillColor: '#40e0d0', fillOpacity: 0, weight: 1, color: '#40e0d0'});
                }
                ctr.push(vatglasses_array[secid[0]][secid[1]].feature.geometry.coordinates[0]);
            }
        }
        if(ctr.length)
        {
            var pt = turf.pointOnFeature(turf.multiPolygon(ctr));
            if($.inArray(i, active_vg_pos) >= 0)
            {
                active_vg_pos.splice(active_vg_pos.indexOf(i), 1);
            }
        
            if(pos.atc.callsign.includes('_CTR'))
            {
                var s = '<div onmouseenter="highlightVgObject(\''+i+'\')" onmouseleave="dehighlightVgObject(\''+i+'\')" style="position: relative"><div class="traclabel" style="position: relative; display: flex; flex-direction: column; justify-content: center;"><table style="margin: 0.2rem; align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold;background-color: #fff"><tr><td style="color: #000; padding: 0px 5px; white-space: nowrap; text-align: center">'+pos.atc.callsign.split('_')[0]+ '/' + i.split('/')[1] +'</td></tr></table></div></div>';
            }
            else
            {
                var s = '<div onmouseenter="highlightVgObject(\''+i+'\')" onmouseleave="dehighlightVgObject(\''+i+'\')" style="position: relative"><div class="traclabel" style="position: relative; display: flex; flex-direction: column; justify-content: center;"><table style="margin: 0.2rem; align-self: center; font-family: \'JetBrains Mono\', sans-serif; font-size: 0.7rem; overflow: hidden; font-weight: bold; background-color: #40e0d0"><tr><td style="color: #000; padding: 0px 5px; white-space: nowrap; text-align: center">'+pos.atc.callsign.split('_')[0]+ '/' + i.split('/')[1] +'</td></tr></table></div></div>';
            }
            var di = new L.divIcon({className: 'simaware-vg-tooltip', html: s, iconSize: 'auto'});
            if(vgmarkers_array[i])
            {
                vgmarkers_array[i].setLatLng([pt.geometry.coordinates[1], pt.geometry.coordinates[0]]);
            }
            else
            {
                vgmarkers_array[i] = new L.marker([pt.geometry.coordinates[1], pt.geometry.coordinates[0]], { icon: di });
            }
            vgmarkers_array[i].bindTooltip(getVgControllerBlock(pos), { opacity: 1, sticky: true });
            vg_featuregroup.addLayer(vgmarkers_array[i]);
        }
        new_active_vg_pos.push(i);
    }

    // Disable old stuff
    for(i in active_vg_sectors)
    {
        var secid = active_vg_sectors[i].split('|');
        vg_featuregroup.removeLayer(vatglasses_array[secid[0]][secid[1]]);
    }

    // Disable old stuff
    for(i in active_vg_pos)
    {
        vg_featuregroup.removeLayer(vgmarkers_array[active_vg_pos[i]]);
    }

    active_vg_pos = new_active_vg_pos;
    active_vg_sectors = new_active_vg_sectors;
}

function highlightVgObject(index)
{
    var split = vg_sectors[index];
    for(idx in split)
    {
        var sl = split[idx].split('|');
        vatglasses_array[sl[0]][sl[1]].setStyle({fillOpacity: 0.4});
    }
}
function dehighlightVgObject(index)
{
    var split = vg_sectors[index];
    for(idx in split)
    {
        var sl = split[idx].split('|');
        vatglasses_array[sl[0]][sl[1]].setStyle({fillOpacity: 0});
    }
}

function getVgControllerBlock(obj)
{
    tracon_name = obj.name;
    list = '<table style="width: 100%; color: #333; font-size: 0.9rem"><tr><td colspan="3" style="font-size: 1rem; font-weight: 600">'+obj.callsign+'</td></tr>';
    list += '<tr><td style="font-family: \'JetBrains Mono\', sans-serif">'+obj.atc.callsign+'</td><td class="ps-3" style="text-align: right; white-space: nowrap;">'+obj.atc.name+'</td><td class="ps-3">'+getControllerRating(obj.atc.rating)+'</td><td class="text-primary ps-3" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+obj.atc.freq+'</td><td class="text-muted" style="font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem"></td><td class="ps-3 text-muted" style="vertical-align: middle; font-family: \'JetBrains Mono\', monospace; letter-spacing: -0.05rem">'+getTimeOnline(obj.atc)+'</td></tr>';
    list = '<div class="card"><div class="p-2" style="color: #222; background-color: #eee">'+list+'</table></div></div>';
    return list;
}