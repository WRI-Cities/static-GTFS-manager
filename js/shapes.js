// #########################################
// Function-variables to be used in tabulator

var shapeTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' agencies total';
}

var shapeLine;

var trip_id_list = {};
var allStops = [];
//####################
// Tabulator tables

var shapes_table = new Tabulator("#shapes-table", {
	selectable: 0,
	index: 'shape_id',
	movableRows: true,
	history: true,
	addRowPos: "top",
	movableColumns: true,
	layout: "fitDataFill",
	//ajaxURL: `${APIpath}tableReadSave?table=shapes`, //ajax URL
	//ajaxLoaderLoading: loaderHTML,
	columns: [
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "shape_id", field: "shape_id", editor: "input", width: 200, bottomCalc: shapeTotal },
		{ title: "shape_pt_lat", field: "shape_pt_lat", editor: "input", headerSort: false, validator: "float" },
		{ title: "shape_pt_lon", field: "shape_pt_lon", editor: "input", headerSort: false, validator: "float" },
		{ title: "shape_pt_sequence", field: "shape_pt_sequence", editor: "input", validator: "integer" },
		{ title: "shape_dist_traveled", field: "shape_dist_traveled", editor: "input", validator: "float" },

	],

});

// ####################
// MAP
// ####################

var defaultlayer = cfg.MapProviders.find(x => x.default === true);
var Extralayers = cfg.MapProviders.filter(x => x.default === false);
// Set openstreetmap as the defaultlayer if nothing is defined as default.
var defaultlayer = !defaultlayer ? 'OpenStreetMap.Mapnik' : defaultlayer.id;

var LayerOSM = L.tileLayer.provider(defaultlayer);

var stopsLayer = L.markerClusterGroup()
// .bindTooltip(function (layer) {
// 	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
// }, { sticky: false })
// .bindPopup(function (layer) {
// 	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
// })
//.on('click', markerOnClick);

var baseLayers = {
	"OpenStreetMap": LayerOSM
};
var overlays = {
	'stops': stopsLayer
}



Extralayers.forEach(function (layers, index) {
	// Add the extra layers in a loop
	// Filter out the paid 
	switch (layers.id) {
		case "HERE.terrainDay":
			baseLayers[layers.name] = L.tileLayer.provider(layers.id, {
				app_id: layers.apikey,
				app_code: layers.variant
			});
			break;
		case "MapBox":
			baseLayers[layers.name] = L.tileLayer.provider(layers.id, {
				id: layers.variant,
				accessToken: layers.apikey
			});
			break;
		case "TomTom":
			baseLayers[layers.name] = L.tileLayer.provider(layers.id, {
				apikey: layers.apikey
			});
			break;
		default:
			baseLayers[layers.name] = L.tileLayer.provider(layers.id);
	}

});

const startLocation = [10.030259357021862, 76.31446838378908];

var map = new L.Map('map', {
	center: [0, 0],
	zoom: 2,
	layers: [LayerOSM],
	scrollWheelZoom: true
});

var layerControl = L.control.layers(baseLayers, overlays, { collapsed: true, autoZIndex: false }).addTo(map);

map.pm.addControls({
	position: 'topleft',
	drawCircle: false,
	drawMarker: false,
	drawCircleMarker: false,
	drawRectangle: false,
	drawPolygon: false,
	drawCircle: false
});

// ###################
// commands to run on page load
$(document).ready(function () {
	// executes when HTML-Document is loaded and DOM is ready
	getPythonRoutes();
	getPythonStops(); //load allStops array
	getShapesList();
});

$("#shape_trip").select2({
	placeholder: "First select a route",
	theme: 'bootstrap4'
});

// #########################
// Buttons

$('#shape_shape').on('select2:select', function (e) {
	var valueSelected = e.params.data.id;
	if (valueSelected == '') {
		shapeLayer[0].clearLayers();
		return;
	}
	loadShape(valueSelected, 0);
});


// ###################
// Functions

function getShapesList() {
	var jqxhr = $.get(`${APIpath}allShapesList`, function (data) {
		list = JSON.parse(data);
		var select2list = [];
		console.log('GET request to API/tableReadSave for table=feed_info succesfull.');
		var content = '<option value="">Select a Shape</option>';

		list['all'].forEach(function (row) {
			select2list.push({ id: row, text: row });
		});

		$("#shape_shape").select2({
			placeholder: "Please select a shape to load",
			theme: 'bootstrap4',
			data: select2list
		});
	})
		.fail(function () {
			console.log('GET request to API/tableReadSave table=feed_info failed.')
		});
}

function loadShape(shape_id) {
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get(`${APIpath}shape?shape=${shape_id}`, function (data) {
		var shapeArray = JSON.parse(data);
		console.log('GET request to API/shape succesful.');
		console.log(shapeArray);
		shapes_table.setData(shapeArray);
		drawShape(shapeArray);
	})
		.fail(function () {
			console.log('GET request to API/shape failed.')
		});
}

function drawShape(shapeArray) {
	//shapeLine.clearLayers(); // clearing the layer
	if (map.hasLayer(shapeLine)) {
		map.removeLayer(shapeLine);
	}

	//var lineColor = ( whichMap==0? '#990000': '#006600');
	var lineColor = 'purple'; //switching the markers' colors
	var latlngs = [];
	shapeArray.forEach(function (row) {
		latlngs.push([row['shape_pt_lat'], row['shape_pt_lon']]);
	});
	shapeLine = L.polyline(latlngs, { color: lineColor, weight: 5 }).addTo(map);
	//const polygon = L.polygon(latlngs, {color: 'red'}).addTo(map);

	shapeLine.pm.enable();
	map.fitBounds(shapeLine.getBounds(), { padding: [40, 20], maxZoom: 14 });
}

function getPythonRoutes() {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', APIpath + `tableReadSave?table=routes`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`GET call to Server API/tableReadSave table=routes succesful.`);
			var data = JSON.parse(xhr.responseText);
			populateRouteSelect(data);
			globalRoutes = data; // save to global variable; needed for trip addtion
		}
		else {
			console.log('Server request to API/tableReadSave table=routes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function populateRouteSelect(data) {

	var select2items = $.map(data, function (obj) {
		obj.id = obj.id || obj.route_id; // replace identifier
		if (obj.route_long_name) {
			obj.text = obj.text || obj.route_short_name + " - " + obj.route_long_name
		}
		else {
			obj.text = obj.text || obj.route_short_name
		}
		return obj;
	});

	$("#shape_route").select2({
		placeholder: "Pick a Route",
		theme: 'bootstrap4',
		data: select2items,
		allowClear: true
	});

	if (data.length == 0) {
		console.log('No data!');
		return;
	}
	// 	
}

$('#shape_route').on('select2:select', function (e) {
	var route_id = e.params.data.id;
	if (route_id == '') {
		$.toast({
			title: 'Select route',
			subtitle: 'Failed to select',
			content: 'Please choose a valid route_id to load its trips.',
			type: 'error',
			delay: 5000
		});
		return;
	}
	var jqxhr = $.get(`${APIpath}trips?route=${route_id}`, function (data) {
		var temp = JSON.parse(data);
		trip_id_list = temp.trips;
		var select2Tripsitems = [];
		console.log('GET request to API/tableColumn table=trips successful.');
		// Clean Trip Options
		$('#shape_trip').prop('disabled', false);
		$("#shape_trip").select2('data', null);
		$("#shape_trip").empty().trigger("change");
		trip_id_list.forEach(function (item, index) {
			select2Tripsitems.push({ id: item.trip_id, text: item.trip_short_name })
		});
		$("#shape_trip").select2({
			placeholder: "Choose a trip",
			theme: 'bootstrap4',
			data: select2Tripsitems
		});
	})
		.fail(function () {
			console.log('GET request to API/tableColumn table=trips failed.')
		});
});

$('#shape_trip').on('select2:select', function (e) {
	$('#shape_direction').prop('disabled', false);
});

$('#shape_direction').on('change', function (e) {
	console.log('select direction');
	var direction = $('#shape_direction').val();
	var trip_id = $('#shape_trip').val();
	var route_id = $('#shape_route').val();
	getPythonStopTimes(trip_id, route_id, direction);
});

function getPythonStopTimes(trip_id, route_id, direction) {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}stopTimes?trip=${trip_id}&route=${route_id}&direction=${direction}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded timings data for the chosen trip from Server API/stopTimes .`);
			var returndata = JSON.parse(xhr.responseText);
			if (returndata.newFlag) {
				$.toast({
					title: 'Loading stoptimes',
					subtitle: 'There is no data!',
					content: 'This trip has not saved stop_times!',
					type: 'error',
					delay: 5000
				});
			}
			else {
				stopsLayer.clearLayers;
				returndata.data.forEach(function (stop, index) {
					// Cross referencinge stops/					
					var searchstop = allStops.find(x => x.stop_id === stop.stop_id);
					if (searchstop) {						
						let lat = parseFloat(searchstop.stop_lat);
						let lon = parseFloat(searchstop.stop_lon);						
						//let stopmarker = L.circleMarker([lat,lon], sequenceStyle);
						var marker = L.marker([lat, lon]).addTo(map);												
						//stopmarker.properties = data[j][i]; // transfer all properties of stop row to marker
						//stopmarker.properties['sequence'] = j; // store which sequence table/map the marker belongs to, within the marker itself via an additional property. So that the value can be passed on in the .on('click') function.

						//stopmarker.addTo(stopsLayer);
					}
				});
			}
		}
		else {
			console.log('Server request to API/stopTimes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			$.toast({
				title: 'Loading stoptimes',
				subtitle: 'There is no data!',
				content: xhr.responseText,
				type: 'error',
				delay: 5000
			});
		}
	};
	xhr.send();
}


function getPythonStops() {
	// loading stops.txt data, keyed by stop_id.

	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/tableReadSave?table=stops`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/tableReadSave?table=stops .`);
			var data = JSON.parse(xhr.responseText);
			allStops = data;
		}
		else {
			console.log('Server request to API/tableReadSave?table=stops failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}