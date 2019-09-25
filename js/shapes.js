// #########################################
// Function-variables to be used in tabulator

var shapeTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' agencies total';
}

var trip_id_list = {};

// Holder of all stops from stops table.
var allStops = [];
// holder for the stop_times loaded for the route, trip, direction.
var stop_times = [];

// Global var for holding multilple layers if in the source file of geojosn after conversion.
var LineStringlayers;
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

var stopsLayer = L.markerClusterGroup();
var OnlineRouteLayer;
var LoadedShape;
var FileShapeLayer;


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
	'Stops': stopsLayer
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


$(document).on('click', '#OnlineRoute', function () {
	OnlineRoute();
});

$(document).on('click', '#uploadShapeButton', function () {
	$("#uploadLayerButton").hide();
	uploadShape();
});

$(document).on('click', '#uploadLayerButton', function () {
	uploadLayer();
});

$(document).on('click', '#SaveShapeButton', function () {
	SaveShape();
});

$('#UploadShapeModal').on('show.bs.modal', function (e) {
	$("#uploadShapeButton").show();
	$("#uploadLayerButton").hide();
	$('#FoundLayers').empty();
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
		//shapes_table.setData(shapeArray);
		drawShape(shapeArray);
	})
		.fail(function () {
			console.log('GET request to API/shape failed.')
		});
}

function drawShape(shapeArray) {
	//shapeLine.clearLayers(); // clearing the layer
	if (map.hasLayer(LoadedShape)) {
		map.removeLayer(LoadedShape);
	}
	//var lineColor = ( whichMap==0? '#990000': '#006600');
	var lineColor = 'purple'; //switching the markers' colors
	var latlngs = [];
	shapeArray.forEach(function (row) {
		latlngs.push([row['shape_pt_lat'], row['shape_pt_lon']]);
	});
	LoadedShape = L.polyline(latlngs, { color: lineColor, weight: 3 })
	//const polygon = L.polygon(latlngs, {color: 'red'}).addTo(map);
	layerControl.addOverlay(LoadedShape, 'Loaded Shape');
	map.addLayer(LoadedShape);
	LoadedShape.pm.enable();
	map.fitBounds(LoadedShape.getBounds(), { padding: [40, 20], maxZoom: 20 });
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
		select2Tripsitems.push({ id: '', text: '' })
		trip_id_list.forEach(function (item, index) {
			select2Tripsitems.push({ id: item.trip_id, text: item.trip_short_name })
		});
		$("#shape_trip").select2({
			placeholder: "Choose a trip",
			allowClear: true,
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
	if ($('#shape_direction').val() != '') {
		var direction = $('#shape_direction').val();
		var trip_id = $('#shape_trip').val();
		var route_id = $('#shape_route').val();
		getPythonStopTimes(trip_id, route_id, direction);
	}
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
				stopsLayer.clearLayers();
				stop_times = returndata.data;
				returndata.data.forEach(function (stop, index) {
					// Cross referencinge stops/					
					var searchstop = allStops.find(x => x.stop_id === stop.stop_id);
					if (searchstop) {
						let lat = parseFloat(searchstop.stop_lat);
						let lon = parseFloat(searchstop.stop_lon);
						//let stopmarker = L.circleMarker([lat,lon], sequenceStyle);
						let stopmarker = L.marker([lat, lon], {
							icon: L.divIcon({
								className: `stop-divicon`,
								iconSize: [20, 20],
								html: (parseInt(index) + 1)
							})
						})
							.bindTooltip(searchstop.stop_id + ':' + searchstop.stop_name)
							.on('click', function (e) {
								markerOnClick(e);
							});
						//var marker = L.marker([lat, lon]).addTo(map);												
						//stopmarker.properties = data[j][i]; // transfer all properties of stop row to marker
						//stopmarker.properties['sequence'] = j; // store which sequence table/map the marker belongs to, within the marker itself via an additional property. So that the value can be passed on in the .on('click') function.

						stopmarker.addTo(stopsLayer);
					}

				});
				map.addLayer(stopsLayer);
				map.fitBounds(stopsLayer.getBounds(), { padding: [40, 20], maxZoom: 20 });
				$.toast({
					title: 'Added Stops to Map',
					subtitle: 'Stops Loaded',
					content: 'This trips stops has been added to the map.',
					type: 'success',
					delay: 3000
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

// ##################
// ## Online Routing
// ##################


function OnlineRoute() {
	if ($("#RoutingUseService").val() == 'Mapbox') {
		if (!cfg.MAPBOXAPI) {
			$.toast({
				title: 'Online Routing',
				subtitle: 'Mapbox',
				content: 'No API Key configured in the config page!',
				type: 'error',
				delay: 1000
			});
			return;
		}
		mapboxrouting(stop_times);
	}
}

function mapboxrouting(stop_times) {
	// get array data
	if (stop_times.length > 0) {
		var depart = stop_times[0];
		var arrival = stop_times[stop_times.length - 1];
		var between = stop_times;
		between.shift(); // remove first entry
		between.pop(); // remove last entry		
		// if (between.length > 23) {
		// 	$.toast({
		// 		title: 'Online Routing',
		// 		subtitle: 'Mapbox',
		// 		content: 'More than 25 stops is not allowed...',
		// 		type: 'error',
		// 		delay: 5000
		// 	});
		// }
		// else {
		var from;
		var to;
		var searchstopfrom = allStops.find(x => x.stop_id === depart.stop_id);
		if (searchstopfrom) {
			from = searchstopfrom.stop_lon + "," + searchstopfrom.stop_lat;
		}
		var searchstopto = allStops.find(x => x.stop_id === arrival.stop_id);
		if (searchstopto) {
			to = searchstopto.stop_lon + "," + searchstopto.stop_lat;
		}

		// var from = depart.stop_lon + "," + depart.stop_lat;
		// var to = arrival.stop_lon + "," + arrival.stop_lat;
		var MapboxDrivingApiUrl = "https://api.mapbox.com/directions/v5/mapbox/driving/";
		var MapboxApiKey = cfg.MAPBOXAPI;
		GenerateUrl = MapboxDrivingApiUrl + from + ';' + to + ".json?access_token=" + MapboxApiKey + "&geometries=polyline&overview=full";
		GenerateUrl = GenerateUrl.replace(";;", ";");
		$.get(GenerateUrl, function (data) {
			//console.log(data);
			if (data.code == 'Ok') {
				var Polyline = data.routes[0].geometry;
				console.log(Polyline);
				polyline.decode(Polyline);
				// returns an array of lat, lon pairs from polyline6 by passing a precision parameter
				//polyline.decode('cxl_cBqwvnS|Dy@ogFyxmAf`IsnA|CjFzCsHluD_k@hi@ljL', 6);
				// returns a GeoJSON LineString feature
				//polyline.toGeoJSON(Polyline);
				OnlineRouteLayer = L.polyline(polyline.decode(Polyline), { color: 'red', weight: 3 });
				//var myLayer = L.geoJSON().addTo(map);
				//myLayer.addData(polyline.toGeoJSON(Polyline));				
				map.addLayer(OnlineRouteLayer);
				layerControl.addOverlay(OnlineRouteLayer, 'Online Routing');
				map.fitBounds(OnlineRouteLayer.getBounds(), { padding: [40, 20], maxZoom: 20 });
				OnlineRouteLayer.pm.enable();
			}
			else {
				$.toast({
					title: 'Online Routing',
					subtitle: 'Mapbox',
					content: 'There was not a correct result!',
					type: 'error',
					delay: 5000
				});
			}
		})
			.fail(function (jqXHR, textStatus, errorThrown) {
				if (jqXHR.status == '401') {
					$.toast({
						title: 'Online Routing',
						subtitle: 'Mapbox',
						content: jqXHR.status + ' - The provided API key is not "Unauthorized"',
						type: 'error',
						delay: 5000
					});
				}
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
			});
		// }
	}
}

// ###########################
// #### Shape uploading
// ###########################

function uploadShape() {
	// make POST request to API/XMLUpload

	// idiot-proofing: check if the files have been uploaded or not.
	// alert( ""==f.value ? "nothing selected" : "file selected");
	// from https://stackoverflow.com/a/1417489/4355695
	if ($('#uploadShape').val() == '') {
		$.toast({
			title: 'Uplading shape',
			subtitle: 'Error',
			content: 'Please select a file to upload!',
			type: 'error',
			delay: 4000
		});
		shakeIt('uploadShape');
		return;
	}
	$.toast({
		title: 'Uplading shape',
		subtitle: 'Upload',
		content: 'Uploading file(s), please wait...',
		type: 'info',
		delay: 4000
	});
	var filename = $('#uploadShape')[0].files[0].name;
	var extension = filename.substring(filename.lastIndexOf('.') + 1, filename.length);

	// HTML File reading
	const reader = new FileReader();
	reader.readAsText($('#uploadShape')[0].files[0]);
	reader.onload = () => storeResults(reader.result, filename, extension);
}

function storeResults(result, filename, extension) {
	var GeojsonLayer = convertToGeoJson(result, extension);
	var geojsonFeature = JSON.parse(GeojsonLayer[0]);
	// Filter out all the linestrings.
	LineStringlayers = geojsonFeature.features.filter(x => x.geometry.type == "LineString");

	if (LineStringlayers.length > 1) {
		// Need to filter the Linestring layers
		$.toast({
			title: 'Uplading shape',
			subtitle: 'Layers',
			content: 'More then one Layer Found select a layer to import',
			type: 'info',
			delay: 4000
		});
		// Hide Upload Button
		$("#uploadShapeButton").hide();
		// Add Layers button
		$("#uploadLayerButton").show();
		LineStringlayers.forEach(function (feature, index) {
			var name = feature.properties.name;
			var CheckboxHTML = `<div class="form-check">
				<input class="form-check-input" type="checkbox" id="Layer${index}" name="CheckLayer" value="${index}">
				<label class="form-check-label" for="Layer${index}">
					${name}
				</label>
				</div>`;
			$('#FoundLayers').append(CheckboxHTML);
		});
		// The ticking of the checklayer is process with the button click so don't clode the modal window
	}
	else {
		// Only 1 layer. Import only the LineStrings
		// Swap the lat, lon of the geojson.
		var coords = []
		LineStringlayers[0].geometry.coordinates.forEach(function (coord) {
			coords.push([coord[1], coord[0]]);
		});
		FileShapeLayer = new L.Polyline(coords, { color: 'orange', weight: 5 });
		map.addLayer(FileShapeLayer);
		layerControl.addOverlay(FileShapeLayer, 'File Based Shape')
		map.fitBounds(FileShapeLayer.getBounds());
		$('#UploadShapeModal').modal('hide');
	}
}

function uploadLayer() {
	// Loop thhrough each selected layer This is called when there are more then 1 linestrings.
	var multicoords = [];
	$.each($("input[name='CheckLayer']:checked"), function () {
		var coords = [];
		LineStringlayers[$(this).val()].geometry.coordinates.forEach(function (coord) {
			coords.push([coord[1], coord[0]]);
		});
		multicoords.push(coords);
	});
	FileShapeLayer = L.polyline(multicoords, { color: 'orange', weight: 3 });
	map.addLayer(FileShapeLayer);
	layerControl.addOverlay(FileShapeLayer, 'File Based Shape')
	map.fitBounds(FileShapeLayer.getBounds());
	$('#UploadShapeModal').modal('hide');
}

function LineStringFilter(feature) {
	if (feature.geometry.type === "LineString") return true;
}

function convertToGeoJson(filecontent, extension) {
	switch (extension) {
		case "kml":
			console.log("converting KML to geoJSON");
			var dom = (new DOMParser()).parseFromString(filecontent, 'text/xml');
			console.log("XML:" + dom)
			var newgeojson = JSON.stringify(toGeoJSON.kml(dom));
			//console.log("Geojosn:" + newgeojson);
			parts = [newgeojson];
			break;
		case "gpx":
			console.log("converting GPX to geoJSON");
			var dom = (new DOMParser()).parseFromString(filecontent, 'text/xml');
			var newgeojson = JSON.stringify(toGeoJSON.gpx(dom));
			//console.log("Geojosn:" + newgeojson);
			parts = [newgeojson];
			break;
		default:
			// geojson
			parts = [filecontent];
	}
	return parts;
}

// Saving layer to tabulator table
function SaveShape() {

	var selectedforexport = $("#shape_save").val();
	console.log(selectedforexport);
	var shape_id = $("#shape_id").val();
	console.log(shape_id);
	var shapearray = [];
	switch (selectedforexport) {
		case "Drawn":
			// code block
			break;
		case "File":
			// code block
			shapearray = FileShapeLayer.getLatLngs();
			break;
		case "Loaded":
			// code block
			shapearray = LoadedShape.getLatLngs();
			break;
		case "Routing":
			shapearray = OnlineRouteLayer.getLatLngs();
			break;
		default:
		// code block
	}
	// Clean the table first.
	shapes_table.clearData();
	// add the data to the table
	shapearray.forEach(function (shaperow, index) {
		shapes_table.addData([{ shape_id: shape_id, shape_pt_lat: shaperow.lat, shape_pt_lon: shaperow.lng, shape_pt_sequence: index, shape_dist_traveled: '' }], false);
	});
	// console.log('Online Router');
	// console.log(OnlineRouteLayer.getLatLngs());
	// console.log('Loaded Shape');
	// console.log(LoadedShape.getLatLngs());
	//console.log('File based Shape');
	//console.log(FileShapeLayer.getLatLngs());
	// map.eachLayer(function(layer){
	// 	console.log(layer)//.bindPopup('Hello');
	// });
}