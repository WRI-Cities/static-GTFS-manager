//##############
// Global constants, variables

var databankLayer = new L.geoJson(null);

// SVG rendered from https://stackoverflow.com/a/43019740/4355695 : A way to enable adding more points without crashing the browser. Will be useful in future if number of stops is above 500, 1000 or so.
var myRenderer = L.canvas({ padding: 0.5 });


// #########################################
// Function-variables to be used in tabulator

var stopsTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' stops total';
}



// #################################
/* 2. Tabulator initiation */

//create Tabulator on DOM element with id "stops-table"
var table = new Tabulator("#stops-table", {
	selectable: 1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	layout: "fitColumns", //fit columns to width of table (optional)
	index: "stop_id",
	history: true,
	//layout:"fitDataFill",
	addRowPos: "top",
	ajaxURL: APIpath + 'tableReadSave?table=stops', //ajax URL
	ajaxLoaderLoading: loaderHTML,
	clipboard: true,
	//clipboardCopySelector:"table",
	clipboardPasteAction: "replace",
	columns: [ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "stop_id", field: "stop_id", frozen: true, headerFilter: "input", validator: ["string", tabulator_UID_leastchars] },
		{ title: "stop_name", field: "stop_name", editor: "input", headerFilter: "input", validator: ["required", "string", tabulator_UID_leastchars], bottomCalc: stopsTotal },
		{ title: "stop_lat", field: "stop_lat", headerSort: false, validator: "float" },
		{ title: "stop_lon", field: "stop_lon", headerSort: false, validator: "float" },
		{ title: "zone_id", field: "zone_id", editor: "input" },
		{ title: "wheelchair_boarding", field: "wheelchair_boarding", editor: "select", headerSort: false, editorParams: { values: { 0: "No (0)", 1: "Yes (1)" } } }
	],

	rowSelected: function (row) { //when a row is selected
		//console.log("Row " + row.getData().stop_id + " Clicked, index: " + row.getIndex() );
		// Change tab on select
		$('.nav-tabs a[href="#edit"]').tab('show');
		mapPop(row.getData().stop_id);
	},
	rowDeselected: function (row) { //when a row is deselected
		depopulateFields();
		map.closePopup();
	},
	historyUndo: function (action, component, data) {
		var message = '';
		if (action == 'cellEdit') {
			message = 'Undid cellEdit for ' + component.cell.row.data.stop_id + ', ' + JSON.stringify(data);
			reloadData();
			mapPop(component.cell.row.data.stop_id);
		}
		else if (action == 'rowDelete') {
			message = 'Undid rowDelete for ' + data.data.stop_id;
			reloadData();
		}
		else if (action == 'rowAdd') {
			message = 'Undid rowAdd for ' + data.data.stop_id;
			reloadData();
			mapPop(data.data.stop_id);
		}

		logmessage(message);
	},
	/*
	historyRedo:function(action, component, data){
		var message = '';
		if(action == 'cellEdit') {
			message = 'Redid cellEdit for ' + component.cell.row.data.stop_id + ', ' + JSON.stringify(data);
			reloadData();
			mapPop(component.cell.row.data.stop_id);
		}
		else if(action == 'rowDelete') {
			message = 'Redid rowDelete for ' + data.data.stop_id;
			reloadData();
		}
		logmessage(message);
	},*/
	cellEditing: function (cell) {
		// pop up the stop on the map when user starts editing
		mapPop(cell.getRow().getData().stop_id);
	},
	cellEdited: function (cell) {
		// on editing a cell, display updated info 
		reloadData();
		var stop_id = cell.getRow().getData().stop_id; //get corresponding stop_id for that cell. Can also use cell.getRow().getIndex()
		mapPop(stop_id);
		logmessage('Changed "' + cell.getOldValue() + '" to "' + cell.getValue() + '" for stop_id: ' + stop_id);
		$("#undoredo").show('slow');
	},
	dataLoaded: function (data) {
		// this fires after the ajax response and after table has loaded the data. 
		console.log(`Loaded all stops data from Server API/tableReadSave table=stops .`);
		reloadData('firstTime');
	},
	ajaxError: function (xhr, textStatus, errorThrown) {
		console.log('GET request to tableReadSave table=stops failed.  Returned status of: ' + errorThrown);
	}
});

// redraw is needed for the table to get layout correct.
$('.nav-tabs a[href="#home"]').on('shown.bs.tab', function (event) {
	table.redraw(true);
});

// #################################
// . load stops

//loadFromCsv(stopsfile,'setData');
//getPythonStops();

// #################################
/* 3. Initiate map */
var LayerOSM = L.tileLayer.provider('OpenStreetMap.Mapnik');

const startLocation = [10.030259357021862, 76.31446838378908];

var map = new L.Map('map', {
	center: [0, 0],
	zoom: 2,
	layers: [LayerOSM],
	scrollWheelZoom: true
});

$('.leaflet-container').css('cursor', 'crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs

L.control.scale({ metric: true, imperial: false }).addTo(map);

var stopsLayer = new L.geoJson(null)
	.bindTooltip(function (layer) {
		return layer.properties.stop_id + ': ' + layer.properties.stop_name;
	}, { sticky: false })
	.bindPopup(function (layer) {
		return layer.properties.stop_id + ': ' + layer.properties.stop_name;
	})
	.on('click', markerOnClick);

var baseLayers = {
	"OpenStreetMap": LayerOSM	
};

var overlays = {
	'stops': stopsLayer,
	'databank': databankLayer
}
var layerControl = L.control.layers(baseLayers, overlays, { collapsed: true, autoZIndex: false }).addTo(map);

var ZoomBoxOptions = {
	modal: false,
	title: "Box area zoom",
	position: "topright",
	addToZoomControl: true
};
var ZoomBoxControl = L.control.zoomBox(ZoomBoxOptions);
map.addControl(ZoomBoxControl);


// Marker for positioning new stop or changing location of stop
var dragmarkerOptions = {
	renderer: myRenderer,
	radius: 4,
	fillColor: "red",
	color: null,
	weight: 1,
	opacity: 1,
	fillOpacity: 0.8,
	//draggable: true // not provided for vector markers
};
var clickedflag = 0;

var dragmarker = L.circleMarker(startLocation, dragmarkerOptions);
/* we're not dragging anymore!
dragmarker.on('dragend', function(e) {
	updateLatLng();
});*/

map.on('click', function (e) {
	dragmarker.setLatLng(e.latlng);
	updateLatLng(dragmarker.getLatLng());
	if (clickedflag == 0) { dragmarker.addTo(map); clickedflag++; }
});
//http://overpass-api.de/api/interpreter?data=[out:json];(node[public_transport=stop_position](6.150497418334389,-75.68635940551758,6.332502948324705,-75.47212600708008););out;
var opl = new L.OverPassLayer({
	debug: true,
	endPoint: 'https://overpass-api.de/api/',
	query: '(node[public_transport=stop_position](6.150497418334389,-75.68635940551758,6.332502948324705,-75.47212600708008););out;',
	minZoomIndicatorOptions: {
		position: 'topright',
		minZoomMessage: 'Current zoom level: CURRENTZOOM - All data at level: MINZOOMLEVEL'
	}
});
map.addLayer(opl);


// #################################
/* 4. Loading stops on map */

var circleMarkerOptions = {
	renderer: myRenderer,
	radius: 5,
	//fillColor: "#00B7F3", // lightblue
	//fillColor: '#000096', // darkblue, same color as divIcon. Didn't look so good
	fillColor: 'yellow',
	color: 'black',
	weight: 1,
	opacity: 1,
	fillOpacity: 0.5
};

// adding buttons to zoom to show all stops
// L.easyButton('<span class="mapButton" title="fit all points">&curren;</span>', function(btn, map){
L.easyButton('<i class="fas fa-home"></i>', function (btn, map) {
	//map.fitBounds(stopsLayer.getBounds(), {padding:[20,20]});
	reloadMap('firstTime', false);
}, 'Show all stops').addTo(map);

//L.easyButton('<font size="5">&#9782;</font>', function(btn, map){
L.easyButton('<i class="fas fa-filter"></i>', function (btn, map) {
	console.log('filter!');
	reloadMap('firstTime', true);
}, 'Filter the map based on the filter of the list').addTo(map);


//##################
// Buttons:
//undo button
$("#history-undo").on("click", function () {
	table.undo();
});

//redo button
$("#history-redo").on("click", function () {
	table.redo();
});

//Save table
$("#savetable").on("click", function () {
	saveStops();
});

$("#copytable").on("click", function () {
	table.copyToClipboard();
});

// Clone zone_id
$("#targetStopid").bind("change keyup", function () {
	if (CAPSLOCK) this.value = this.value.toUpperCase();
	$("#zone_id").val(this.value);
});

$("#stop2delete").bind("change keyup", function () {
	if (CAPSLOCK) this.value = this.value.toUpperCase();
});



// onkeyup="this.value=this.value.toUpperCase()"
/*
//Delete stop
$("#removeStop").on("click", function(){
	var stop_id = $("#stop2delete").val();
	if ( $("#stops-table").tabulator("deleteRow", stop_id) ) {
		logmessage('Deleted stop: ' + stop_id);
	} else {
		logmessage('Delete: Did not find: ' + stop_id);
	}
	$("#stop2delete").val('');
	// reload stop ids list for autocomplete
	reloadData();
});
*/

// ##############################
/* Functions */

// Update or Add to table
function updateTable() {
	latlng = document.getElementById('newlatlng').value.split(',');
	let lat = parseFloat(latlng[0]);
	let lon = parseFloat(latlng[1]);
	//console.log('update table, checking',latlng);
	if (!checklatlng(lat, lon)) {
		alert('check lat-long values'); return 0;
	}
	stop_id = $("#targetStopid").val();
	stop_name = $("#stop_name").val();
	zone_id = $("#zone_id").val();
	if ($("#wheelchair").val() == null) {
		wheelchair_boarding = '';
	}
	else {
		wheelchair_boarding = parseInt($("#wheelchair").val());
	}


	if (stop_id.length < UID_leastchars || stop_id.length > UID_maxchars) {
		alert('check stop_id value, must be all caps, alphabets or numbers and between ' + UID_leastchars + ' and ' + UID_maxchars + ' chars long.'); return 0;
	}

	try {
		table.updateOrAddData([{ stop_id: stop_id, stop_lat: lat, stop_lon: lon, stop_name: stop_name, zone_id: zone_id, wheelchair_boarding: wheelchair_boarding }]);
	}
	catch (e) {
		console.log("exception caught in updateOrAddRow function call.", e);
	}

	// reload stop ids list for autocomplete
	// reloadData();

	logmessage('updateOrAddRow done for ' + stop_id);


	// switch to first tab. from https://getbootstrap.com/docs/4.0/components/navs/#via-javascript
	$(function () {
		$('#myTab li:first-child a').tab('show');
	})

	setTimeout(function () {
		//var row = $("#stops-table").tabulator("getRow",stop_id);
		//row.scrollTo();
		//$("#stops-table").tabulator("selectRow", stop_id);
		table.selectRow(stop_id);
		//$("#stops-table").tabulator("scrollToRow", stop_id);
		//table.selectRow(stop_id);
		// clearing values
		// $("#targetStopid").val('');
		// $('#targetStopid').select2().trigger('change');
		// $("#stop_name").val('');
		// $("#wheelchair").val('');
		// $("#newlatlng").val('');
		// $("#zone_id").val('');
	}, 1000);
}


function reloadData(timeflag = 'normal') {
	var data = table.getData();
	;// stop_id_list = data.map(a => a.stop_id); 

	var select2items = $.map(data, function (obj) {
		obj.id = obj.id || obj.stop_id; // replace identifier
		obj.text = obj.text || obj.stop_id + " - " + obj.stop_name
		return obj;
	});
	console.log($("#targetStopid").val())
	$("#targetStopid").select2({
		tags: true,
		placeholder: "",
		theme: 'bootstrap4',
		createTag: function (params) {
			var term = $.trim(params.term);

			if (term === '') {
				return null;
			}

			return {
				id: term,
				text: term,
				newTag: true // add additional parameters
			}
		},
		data: select2items
	});

	if (data.length == 0) {
		console.log('No data!');
		return;
	}
	// 
	$('#targetStopid').on("select2:select", function (e) {
		if (e.params.data.isNew) {
			// New value typed in the select2 box.
			var newOption = new Option(e.params.data.id, e.params.data.id, false, false);
			$('#targetStopid').append(newOption).trigger('change');
			//table.updateOrAddData([{stop_id:e.params.data.id, stop_lat:null, stop_lon:null } ]);
		}
		var stop_id = e.params.data.id;
		populateFields(stop_id);
		mapPop(stop_id);
	});
	console.log($("#targetStopid").val())
	// Map update
	reloadMap(timeflag);

}

function reloadMap(timeflag = 'normal', filterFlag = false) {
	stopsLayer.clearLayers();

	var data = [];
	if (filterFlag)
		data = table.getData(true); // gets filtered data from table
	else
		data = table.getData(); // gets full data from table

	loadonmap(data, stopsLayer);
	if (timeflag == 'firstTime') {
		map.flyToBounds(stopsLayer.getBounds(), { padding: [20, 20], maxZoom: 16 });
		//Zoom map to see all stops only the first time. Later when making changes, don't bother.
	}
	stopsLayer.addTo(map);
}

function loadonmap(stopsjson, stopsLayer) {
	var renderFlag = (stopsjson.length > MARKERSLIMIT ? true : false);
	console.log('total stops: ' + stopsjson.length);
	// if there's too many stops, then use the SVG renderer way. Else if not too many stops, then use the divIcon way.

	for (stoprow in stopsjson) {
		let lat = parseFloat(stopsjson[stoprow]['stop_lat']);
		let lon = parseFloat(stopsjson[stoprow]['stop_lon']);
		if (!checklatlng(lat, lon)) {
			//console.log('You shall not pass!', stopsjson[stoprow]);
			continue;
		}

		if (renderFlag) {
			// renderFlag is set earlier. If too many stops, then use the lighter custom SVG renderer.
			var stopmarker = L.circleMarker([lat, lon], circleMarkerOptions);
		}
		else {
			// making label as initial of stop name, and handling in case its a number.
			var label = stopsjson[stoprow]['stop_name'];
			var labelShort;
			if (isNaN(label))  // check if not a number. from https://www.mkyong.com/javascript/check-if-variable-is-a-number-in-javascript/
				labelShort = label.substring(0, 2);
			else {
				label = label.toString();
				// We can show upto 3 chars. So use that. 
				if (label.length > 3)
					label = label.substring(0, 2) + '_'; // from https://www.w3schools.com/jsref/jsref_substring.asp
				labelShort = label;
			}

			var stopmarker = L.marker([lat, lon], {
				icon: L.divIcon({
					className: `stop-divicon`,
					iconSize: [17, 17],
					html: labelShort
				})
			});
		}
		stopmarker.properties = stopsjson[stoprow];
		//console.log( JSON.stringify(stopmarker) );
		stopmarker.addTo(stopsLayer);
	}
}

function updateLatLng(latlong, revflag) {
	if (revflag) {
		lat = parseFloat(latlong.split(',')[0]);
		lng = parseFloat(latlong.split(',')[1]);
		dragmarker.setLatLng([lat, lng]);
		map.panTo([lat, lng]);
	} else {
		lat = Math.round((dragmarker.getLatLng().lat + 0.0000001) * 10000) / 10000;
		// Rounding, from https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary. The +0.000.. is to trip forward a number hinging on x.9999999...
		lng = Math.round((dragmarker.getLatLng().lng + 0.0000001) * 10000) / 10000;
		document.getElementById('newlatlng').value = lat + ',' + lng;
		//document.getElementById('longitude').value = marker.getLatLng().lng;
		//map.panTo(dragmarker.getLatLng());
	}
}


// ##############################
/* Interlinking between table and map */
function mapPop(stop_id) {
	//console.log('Looking for ' + stop_id);
	stopsLayer.eachLayer(function (layer) {
		if (layer.properties && (layer.properties.stop_id == stop_id)) {
			layer.bindPopup(function (layer) {
				return layer.properties.stop_id + ': ' + layer.properties.stop_name;
			});
			layer.openPopup();
			// decideZoom = map.getZoom() > 13 ? 16 : 13; // if zoomed in more, take it to 16. Else if very much out, zoom in to 13.
			// map.flyTo(layer.getLatLng(), decideZoom, {duration:1, animate:true});
			map.panTo(layer.getLatLng(), { duration: 1, animate: true });
		}
	});

	// load editing and deleting panes too
	$("#targetStopid").val(stop_id).trigger('change');
	populateFields(stop_id);
	$("#stop2delete").val(stop_id);
}

function markerOnClick(e) {
	//console.log("Clicked marker", e.layer.properties.stop_id, e.latlng );
	stop_id = e.layer.properties.stop_id;
	var row = table.getRow(stop_id);
	row.scrollTo();
	row.toggleSelect();
	// load editing and deleting panes too
	$("#targetStopid").val(stop_id).trigger('change');;
	populateFields(stop_id);
	$("#stop2delete").val(stop_id);
}

function populateFields(stop_id) {
	var row = table.getRow(stop_id); //return row compoenent with index of 1		
	if (!row) {
		// New row
		$('#zone_id').val('');
		$('#newlatlng').val('');
		$('#wheelchair').val('');
		$('#stop_name').val('');
		$('#targetStopid').val(null);
		$('#targetStopid').select2().trigger('change');
	}
	else {
		var rowData = row.getData();
		console.log(JSON.stringify(rowData, null, 2));
		$('#targetStopid').val(rowData['stop_id']);
		$('#targetStopid').select2().trigger('change');
		$('#stop_name').val(rowData['stop_name']);
		$('#zone_id').val(rowData['zone_id']);
		if (rowData['stop_lat'] == null || rowData['stop_lon'] == null) {
			$('#newlatlng').val('');
		}
		else {
			$('#newlatlng').val(rowData['stop_lat'] + ',' + rowData['stop_lon']);
		}
		$('#wheelchair').val(rowData['wheelchair_boarding']);
	}
}

function depopulateFields() {
	$('#stop_name').val('');
	$('#zone_id').val('');
	$('#newlatlng').val('');
	$('#wheelchair').val('');
	$("#targetStopid").val('');
	$('#targetStopid').select2().trigger('change');
	$("#stop2delete").val('');
}
// ##############################
// Smaller functions
function isInArray(value, array) {
	return array.indexOf(value) > -1;
}

function logmessage(message) {
	document.getElementById('trackChanges').value += timestamp() + ': ' + message + '\n';
}

function timestamp() {
	let today = new Date();
	let timestring = today.toLocaleString();
	return timestring;
}

function saveStops() {
	$.toast({
		title: 'Save Stops',
		subtitle: 'Sending data',
		content: 'Sending data, please wait...',
		type: 'info',
		delay: 3000
	});
	//$('#stopSaveStatus').html('<span class="alert alert-info">Sending data, please wait...</span>');

	var data = table.getData();

	var pw = $("#password").val();
	if (!pw) {
		$('#stopSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	console.log('sending stops table data to server via POST.');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?table=stops&pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server /API/tableReadSave table=stops, resonse received: ' + xhr.responseText);
			//$('#stopSaveStatus').html('<span class="alert alert-success">' + xhr.responseText + '</span>');
			$.toast({
				title: 'Save Stops',
				subtitle: 'Success',
				content: xhr.responseText,
				type: 'success',
				delay: 3000
			});
		} else {
			console.log('Server POST request to API/tableReadSave table=stops failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText);
			$.toast({
				title: 'Save Stops',
				subtitle: 'Error',
				content: xhr.responseText,
				type: 'error',
				delay: 3000
			});
			//$('#stopSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText + '</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

}

function databank() {
	if (document.getElementById('databank').files.length != 1) {
		alert('Please select a proper file first');
		return;
	}
	databankLayer.clearLayers();

	Papa.parse(document.getElementById('databank').files[0], {
		header: true,
		skipEmptyLines: true,
		dynamicTyping: true, // this reads numbers as numerical; set false to read everything as string
		complete: function (results) {
			console.log(results.data);
			var databankCounter = 0;
			results.data.forEach(r => {
				if (!(r.hasOwnProperty('stop_lat') && r.hasOwnProperty('stop_lon'))) return;

				if (!checklatlng(r.stop_lat, r.stop_lon)) return;

				var databank_marker_options = {
					renderer: myRenderer,
					radius: 3,
					fillColor: "brown",
					color: null,
					weight: 0,
					opacity: 0,
					fillOpacity: 0.5,
				};
				var databankMarker = L.circleMarker([r.stop_lat, r.stop_lon], databank_marker_options).bindTooltip(r.stop_name, { sticky: false }).addTo(databankLayer);
				databankCounter++;
			});
			console.log(databankCounter, 'locations found in databank.');

			// removing all and adding consecutively so stops are always on top
			map.removeLayer(stopsLayer);
			if (!map.hasLayer(databankLayer)) databankLayer.addTo(map);
			map.addLayer(stopsLayer);

			map.flyToBounds(databankLayer.getBounds(), { padding: [10, 10], maxZoom: 14 });
		}
	});
}

// Openstreetmap search code:
var geocoder = L.Control.geocoder({
	defaultMarkGeocode: false,
	position: 'topleft'
})
	.on('markgeocode', function (e) {
		var stop_name = e.geocode.name;
		var latlng = e.geocode.center;

		// Generate stop_ID
		let data = table.getData();
		stop_id_list = data.map(a => a.stop_id);

		var counter = 1;
		while (stop_id_list.indexOf("STOP-" + pad(counter)) > -1) counter++;
		var stop_id = "STOP-" + pad(counter);
		var stop_text = stop_id + " - " + stop_name;
		console.log(stop_id);



		// Add stop_id to list

		var newOption = new Option(stop_text, stop_id, false, true);
		$('#targetStopid').append(newOption);

		// Trigger the change

		$('#mySelect2').val(stop_id); // Change the value or make some change to the internal state
		$('#mySelect2').trigger('change.select2');

		//$("#targetStopid").val(null).trigger('change');
		$("#stop_name").val(e.geocode.name);
		$("#wheelchair").val('');
		$("#newlatlng").val('');
		$("#zone_id").val('');

		// Show the Edit tab:
		$('#myTab a[href="#edit"]').tab('show');

		console.log(latlng);
		dragmarker.setLatLng(e.geocode.center);
		updateLatLng(dragmarker.getLatLng());
		dragmarker.addTo(map);
		//var bbox = e.geocode.bbox;
		//   var poly = L.polygon([
		// 	bbox.getSouthEast(),
		// 	bbox.getNorthEast(),
		// 	bbox.getNorthWest(),
		// 	bbox.getSouthWest()
		//   ]).addTo(map);
		//map.fitBounds(bbox);
	})
	.addTo(map);