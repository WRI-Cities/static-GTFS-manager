//##############
// Global constants, variables
var NewStopColumnsList = ["new_stop_id", "new_stop_code", "new_stop_name", "new_stop_desc", "new_stop_lat", "new_stop_lon", "new_zone_id", "new_stop_url", "new_location_type", "new_parent_station", "new_stop_timezone", "new_wheelchair_boarding", "new_platform_code"];
var databankLayer = new L.geoJson(null);
var GTFSDefinedColumns = ["stop_id", "stop_code", "stop_name", "stop_desc", "stop_lat", "stop_lon", "zone_id", "stop_url", "location_type", "parent_station", "stop_timezone", "wheelchair_boarding", "platform_code", "level_id"];

// SVG rendered from https://stackoverflow.com/a/43019740/4355695 : A way to enable adding more points without crashing the browser. Will be useful in future if number of stops is above 500, 1000 or so.
var myRenderer = L.canvas({ padding: 0.5 });


// #########################################
// Function-variables to be used in tabulator

var footerHTML = DefaultTableFooter;
const saveButton = `<button class="btn btn-outline-primary" id="savetable" name="savetable" disabled>Save Stops to DB</button>`;
const FastAdd = `<div class="btn-group dropup" role="group" id="ToolsButtons">
<button id="btnGroupDropTools" type="button" class="btn btn-secondary dropdown-toggle mx-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title="Tools">
<i class="fas fa-tools"></i>
</button>
<div class="dropdown-menu" aria-labelledby="btnGroupDropTools" id="SelectToolsMenu">
<a class="dropdown-item" href="#" id="CopyStopIDtoZoneID" data-toggle="popover" data-trigger="hover" data-placement="right" data-html="false" data-content="Use this to copy the stop_id to zone_id for every row in the table.">Copy stop_id to zone_id</a>
<a class="dropdown-item" href="#" id="LinkCopyTimeZones" data-toggle="popover" data-trigger="hover" data-placement="right" data-html="false" data-content="Copy the timezone of the selected to all other stops.">Copy Timezone to all stops</a>
<a class="dropdown-item" href="#"  id="Split" data-toggle="modal" data-target="#SplitModal">Split Column</a>
<a class="dropdown-item" href="#" id="Splice" data-toggle="modal" data-target="#SpliceModal">Splice Column</a>
</div>
</div>`;

footerHTML = footerHTML.replace('{SaveButton}', saveButton);
footerHTML = footerHTML.replace('{FastAdd}', FastAdd);
// #################################
/* 2. Tabulator initiation */

//create Tabulator on DOM element with id "stops-table"
var table = new Tabulator("#stops-table", {
	selectable: 1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	layout: "fitColumns", //fit columns to width of table (optional)
	index: "stop_id",
	history: true,
	addRowPos: "top",
	ajaxURL: APIpath + 'tableReadSave?table=stops', //ajax URL
	ajaxLoaderLoading: loaderHTML,
	clipboard: true,
	footerElement: footerHTML,
	//clipboardCopySelector:"table",
	clipboardPasteAction: "replace",
	columns: [ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "stop_id", field: "stop_id", frozen: true, headerFilter: "input", validator: ["string", 3], download: true },
		{ title: "stop_code", field: "stop_code", editor: "input", download: true },
		{ title: "stop_name", field: "stop_name", editor: "input", headerFilter: "input", validator: ["required", "string", 3], download: true },
		{ title: "stop_desc", field: "stop_desc", editor: "input", download: true, visible: false },
		{ title: "stop_lat", field: "stop_lat", headerSort: false, validator: "float", download: true },
		{ title: "stop_lon", field: "stop_lon", headerSort: false, validator: "float", download: true },
		{ title: "zone_id", field: "zone_id", editor: "input", download: true },
		{ title: "stop_url", field: "stop_url", editor: "input", download: true, visible: false },
		{ title: "location_type", field: "location_type", editor: "select", editorParams: { values: { 0: 'Stop (or "Platform")', 1: "Station", 2: "Station entrance or exit", 3:  "Generic node", 4: "Boarding area"} }, download: true, visible: false },
		{ title: "parent_station", field: "parent_station", editor: "input", download: true, visible: false },
		{ title: "stop_timezone", field: "stop_timezone", editor: select2TZEditor, download: true, visible: false },
		{ title: "wheelchair_boarding", field: "wheelchair_boarding", editor: "select", headerSort: false, editorParams: { values: { 0: "No (0)", 1: "Yes (1)" } }, download: true },
		{ title: "level_id", field: "level_id", editor: "input", download: true, visible: false },
		{ title: "platform_code", field: "platform_code", editor: "input", download: true, visible: false }
	],

	rowSelected: function (row) { //when a row is selected
		//console.log("Row " + row.getData().stop_id + " Clicked, index: " + row.getIndex() );
		// Change tab on select
		//$('.nav-tabs a[href="#edit"]').tab('show');
		mapPop(row.getData().stop_id);
	},
	rowDeselected: function (row) { //when a row is deselected
		//depopulateFields();
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
	},
	cellEditing: function (cell) {
		// pop up the stop on the map when user starts editing
		mapPop(cell.getRow().getData().stop_id);
	},
	cellEdited: function (cell) {
		// on editing a cell, display updated info 
		reloadData();
		var stop_id = cell.getRow().getData().stop_id; //get corresponding stop_id for that cell. Can also use cell.getRow().getIndex()
		mapPop(stop_id);		
		$("#undoredo").show('slow');
	},
	dataLoaded: function (data) {
		// this fires after the ajax response and after table has loaded the data. 
		console.log(`Loaded all stops data from Server API/tableReadSave table=stops .`);
		reloadData('firstTime');
		// create new optons for parentstation selection
		// Filter only stattions
		var Stations = data.filter(function (stop) {
			return stop.location_type === "1";
		});
		console.log(Stations);
		var stationsselect2 = $.map(Stations, function (obj) {
			obj.id = obj.id || obj.stop_id; // replace identifier
			obj.text = obj.text || obj.stop_name
			return obj;
		});
		console.log(stationsselect2);
		$("#new_parent_station").select2({
			placeholder: "Select a parent station",
			allowClear: true,
			theme: 'bootstrap4',
			data: stationsselect2
		});
		// parse the first row keys if data exists.
		if (data.length > 0) {
			AddExtraColumns(Object.keys(data[0]), GTFSDefinedColumns, table);
		}
		else {
			console.log("No data so no columns");
		}
		var NumberofRows = data.length + ' row(s)';
		$("#NumberofRows").html(NumberofRows);
	},
	ajaxError: function (xhr, textStatus, errorThrown) {
		console.log('GET request to tableReadSave table=stops failed.  Returned status of: ' + errorThrown);
	},
	dataEdited: function (data) {
		// The dataEdited callback is triggered whenever the table data is changed by the user. Triggers for this include editing any cell in the table, adding a row and deleting a row.
		$('#savetable').removeClass().addClass('btn btn-primary');
		$('#savetable').prop('disabled', false);
	},
	rowUpdated:function(row){
		// The rowUpdated callback is triggered when a row is updated by the updateRow, updateOrAddRow, updateData or updateOrAddData, functions.
		$('#savetable').removeClass().addClass('btn btn-primary');
		$('#savetable').prop('disabled', false);
	}
});

// redraw is needed for the table to get layout correct.
$('.nav-tabs a[href="#home"]').on('shown.bs.tab', function (event) {
	table.redraw(true);
});


$(document).on("click", "#LinkAddColumn", function () {
	addColumntoTable(table);
});

$(document).on("click", "#LinkDeleteColumn", function () {
	RemoveExtraColumns(table, GTFSDefinedColumns, 'table');
});

$(document).on("click", "#DeleteColumnButton", function () {
	DeleteExtraColumns(table);
});
$(document).on("click", "#LinkShowHideColumn", function () {
	ShowHideColumn(table);
});

$(document).on("click", "#LinkCopyTimeZones", function () {
	CopyTimeZone();
});


// #################################
// . load stops

//loadFromCsv(stopsfile,'setData');
//getPythonStops();

// #################################
/* 3. Initiate map */
// find default map layer
var defaultlayer = cfg.MapProviders.find(x => x.default === true);
var Extralayers = cfg.MapProviders.filter(x => x.default === false);
// Set openstreetmap as the defaultlayer if nothing is defined as default.
var defaultlayer = !defaultlayer ? 'OpenStreetMap.Mapnik' : defaultlayer.id;

var LayerOSM = L.tileLayer.provider(defaultlayer);

var baseLayers = {
	"OpenStreetMap": LayerOSM
};

Extralayers.forEach(function(layers, index) {
	// Add the extra layers in a loop
	// Filter out the paid 
	switch(layers.id) {
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

$('.leaflet-container').css('cursor', 'crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs

L.control.scale({ metric: true, imperial: false }).addTo(map);

var stopsLayer = L.markerClusterGroup()
	// .bindTooltip(function (layer) {
	// 	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
	// }, { sticky: false })
	// .bindPopup(function (layer) {
	// 	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
	// })
	.on('click', markerOnClick);



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

$("#AddStopButton").on("click", function () {
	var $form = $('#Form-AddAgency');
	$form.parsley({
		errorClass: 'has-danger',
		successClass: 'has-success',
		classHandler: function (ParsleyField) {
			return ParsleyField.$element.closest('.form-group');
		},
		errorsContainer: function (ParsleyField) {
			return ParsleyField.$element.closest('.form-group');
		},
		errorsWrapper: '<span class="form-text text-danger"></span>',
		errorTemplate: '<span></span>'
	}).validate()
	if ($form.parsley().validate()) {
		// Process adding the value
		addTable();
	}

});

$("#copytable").on("click", function () {
	table.copyToClipboard();
});

// Toggles for show hide columns in stop table.

$('body').on('change', 'input[id^="check"]', function () {
	var column = this.id.replace('check', '');
	if (this.checked) {
		table.showColumn(column);
		table.redraw();
	}
	else {
		table.hideColumn(column);
		table.redraw();

	}
});

$(document).on("click", "#LinkDownloadCSV", function () {
	table.download("csv", "stops.csv");
});

$(document).on("click", "#LinkDownloadJSON", function () {
	table.download("json", "stops.json");
});

$(document).ready(function () {
	// executes when HTML-Document is loaded and DOM is ready
	$("#new_stop_timezone").select2({
		placeholder: "Select a timezone",
		allowClear: true,
		theme: 'bootstrap4',
		data: TimeZoneList
	});
	// Set the default timezone from the settings.js file.
	$("#new_stop_timezone").val(cfg.GTFS.Timezone).trigger("change");

	var DownloadContent = "";
	DownloadLinks.forEach(function (downloadtype) {
		DownloadContent += '<a class="dropdown-item" href="#" id="LinkDownload' + downloadtype + '">Download ' + downloadtype + '</a>';
	});
	$("#DownloadsMenu").html(DownloadContent);

});


// On new stop deselect all rows of the table.
$('.nav-tabs a[href="#new"]').on('shown.bs.tab', function (event) {
	table.deselectRow();
});

// Clone zone_id

$("#stop2delete").bind("change keyup", function () {
	if (CAPSLOCK) this.value = this.value.toUpperCase();
});

$("#CopyStopIDtoZoneID").on("click", function () {
	CopyStopIDtoZoneID();
});

// Form validations

$("#new_location_type").on('change', function () {
	console.log($(this).val());
	if ($(this).val() === '0' || $(this).val() === '1' || $(this).val() === '2') {
		// location type = 0,1,2 then lat,lon is required
		$("#new_stop_lat").attr('data-parsley-required', 'true');
		//$("#new_stop_lat").attr('data-parsley-pattern','^(\+|-)?(?:90(?:(?:\.0{1,6})?)|(?:[0-9]|[1-8][0-9])(?:(?:\.[0-9]{1,6})?))$');
		$("#new_stop_lon").attr('data-parsley-required', 'true');
		//$("#new_stop_lon").attr('data-parsley-pattern','^(\+|-)?(?:180(?:(?:\.0{1,6})?)|(?:[0-9]|[1-9][0-9]|1[0-7][0-9])(?:(?:\.[0-9]{1,6})?))$');
		// location type = 0,1,2 then stop_name is required
		$("new_stop_name").attr('data-parsley-required', 'true');
	}
	else {
		$("#new_stop_lat").attr('data-parsley-required', 'false');
		$("#new_stop_lat").removeAttr("data-parsley-pattern");
		$("#new_stop_lon").attr('data-parsley-required', 'false');
		$("#new_stop_lon").removeAttr("data-parsley-pattern");
		$("#new_stop_name").attr('data-parsley-required', 'false');
	}
	if ($(this).val() === '0') {
		// parent_station can't be different than 0
		$("#new_parent_station").val('0');
	}
	if ($(this).val() === '1') {
		// parent_station must be filled
		$("#new_parent_station").attr('data-parsley-required', 'true');
	}
});

// ##############################
/* Functions */

function CopyStopIDtoZoneID() {
	// Select all rows
	var rows = table.getRows();
	rows.forEach(function (row) {
		// Copy all the arrival_times to the departure times.
		table.updateRow(row, { zone_id: row.getData().stop_id });
	});
}

function addTable() {
	// Loop through all stops columns and add it tho a temp object for insert.
	var stop_id = $("#new_stop_id").val();
	var jsonData = {};
	NewStopColumnsList.forEach(function (selectcolumn) {
		// get the column selectbox value
		var importcolumn = $("#" + selectcolumn).val();
		var gtfscolumnname = selectcolumn.replace('new_', '');
		jsonData[gtfscolumnname] = importcolumn;
	});
	console.log(jsonData);
	try {
		table.addData(jsonData);
		reloadData();		
	}
	catch (e) {
		console.log("exception caught in updateOrAddRow function call.", e);
	}
	

	// switch to first tab. from https://getbootstrap.com/docs/4.0/components/navs/#via-javascript

	setTimeout(function () {
		table.selectRow(stop_id);
		//Clean out new value's
	}, 1000);

}

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
	// var data = table.getData();
	// ;// stop_id_list = data.map(a => a.stop_id); 

	// var select2items = $.map(data, function (obj) {
	// 	obj.id = obj.id || obj.stop_id; // replace identifier
	// 	obj.text = obj.text || obj.stop_id + " - " + obj.stop_name
	// 	return obj;
	// });	
	// $("#targetStopid").select2({		
	// 	placeholder: "Pick a stop",
	// 	allowClear: true,
	// 	theme: 'bootstrap4',		
	// 	data: select2items
	// });

	// if (data.length == 0) {
	// 	console.log('No data!');
	// 	return;
	// }
	// 

	// console.log($("#targetStopid").val())
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
	// var renderFlag = (stopsjson.length > MARKERSLIMIT ? true : false);
	console.log('total stops: ' + stopsjson.length);
	// if there's too many stops, then use the SVG renderer way. Else if not too many stops, then use the divIcon way.

	for (stoprow in stopsjson) {
		let lat = parseFloat(stopsjson[stoprow]['stop_lat']);
		let lon = parseFloat(stopsjson[stoprow]['stop_lon']);
		if (!checklatlng(lat, lon)) {
			//console.log('You shall not pass!', stopsjson[stoprow]);
			continue;
		}

		// if (renderFlag) {
		// 	// renderFlag is set earlier. If too many stops, then use the lighter custom SVG renderer.
		// 	var stopmarker = L.circleMarker([lat, lon], circleMarkerOptions);
		// }
		// else {
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
		// }
		stopmarker.properties = stopsjson[stoprow];
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
		// Check if row is selected in table.
		var selectedRows = table.getSelectedData();
		if (selectedRows.length > 0) {
			// If a row is selected update the lat en lon
			var rowdata = selectedRows[0];
			stop_lat = Math.round((dragmarker.getLatLng().lat + 0.0000001) * 10000) / 10000;
			stop_lng = Math.round((dragmarker.getLatLng().lng + 0.0000001) * 10000) / 10000;
			table.updateRow(rowdata.stop_id, { stop_lat: stop_lat, stop_lon: stop_lng });
		}
		lat = Math.round((dragmarker.getLatLng().lat + 0.0000001) * 10000) / 10000;
		// Rounding, from https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary. The +0.000.. is to trip forward a number hinging on x.9999999...
		lng = Math.round((dragmarker.getLatLng().lng + 0.0000001) * 10000) / 10000;
		// document.getElementById('newlatlng').value = lat + ',' + lng;
		$("#new_stop_lon").val(lng);
		$("#new_stop_lat").val(lat);
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
			stopsLayer.zoomToShowLayer(layer, function () {
				layer.openPopup();
			});			
		}
	});

	// load editing and deleting panes too
	//$("#targetStopid").val(stop_id).trigger('change');
	//populateFields(stop_id);
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
	//populateFields(stop_id);
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
	
	var data = table.getData();

	var pw = $("#password").val();
	if (!pw) {
		$.toast({
			title: 'Save Stops',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});
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
		$("#new_stop_id").val(stop_id);
		$("#new_stop_name").val(e.geocode.name);
		$("#new_wheelchair").val('');
		$("#new_stop_lat").val(latlng.lat);
		$("#new_stop_lon").val(latlng.lng);
		$("#new_zone_id").val('');

		// Show the new tab:
		$('#myTab a[href="#new"]').tab('show');

		console.log(latlng);
		dragmarker.setLatLng(e.geocode.center);		
		dragmarker.addTo(map);
		map.panTo(e.geocode.center);
	})
	.addTo(map);

function CopyTimeZone() {
	// if not selected the popup
	var selectedData = table.getSelectedData();
	if (selectedData.length > 0) {
		// there is a row selected
		// Get the value.
		var selected_timezone = selectedData[0].stop_timezone;
		if (selected_timezone) {
			// there is a value.
			var rows = table.getRows();
			rows.forEach(function (row) {
				// Copy all the arrival_times to the departure times.
				table.updateRow(row, { stop_timezone: selected_timezone });
			});
			$.toast({
				title: 'Copy Timezone',
				subtitle: 'Copy OK',
				content: 'The selected timezone ' + selected_timezone + ' has been copied to all the stops in table',
				type: 'success',
				delay: 5000
			});
		}
		else {
			$.toast({
				title: 'Copy Timezone',
				subtitle: 'No value',
				content: 'There is no timezone in the selected row.',
				type: 'error',
				delay: 5000
			});
		}
	}
	else {
		$('.nonstandardbutton').hide();	
		$("#ApplyTimeZoneButton").show();		
		$("#DeleteColumnModalTitle").html("Select a timezone to use");
		$("#DeleteColumnModalBody").html(`<div class="form-group row">
		<label for="DynamicTimzeZone" class="col-sm-2 col-form-label">Timezone</label>
		<div class="col-sm-10">
		 <select id="DynamicTimzeZone"><option></option></select>
		</div>
	  </div>`);
	  $("#DynamicTimzeZone").select2({
		placeholder: "Select a timezone",
		allowClear: true,
		theme: 'bootstrap4',
		data: TimeZoneList
	  });
	  	// Show the Modal
		$('#DeleteColumnModal').modal('show');		
	}
}

$(document).on("click", "#ApplyTimeZoneButton", function () {
	var selected_timezone = $("#DynamicTimzeZone").val();
	if (selected_timezone) {
		// there is a value.
		var rows = table.getRows();
		rows.forEach(function (row) {
			// Copy all the arrival_times to the departure times.
			table.updateRow(row, { stop_timezone: selected_timezone });
		});
		$.toast({
			title: 'Copy Timezone',
			subtitle: 'Copy OK',
			content: 'The selected timezone ' + selected_timezone + ' has been copied to all the stops in table',
			type: 'success',
			delay: 5000
		});		
	}
	else {
		$.toast({
			title: 'Copy Timezone',
			subtitle: 'No value',
			content: 'There is no timezone in the selected row.',
			type: 'error',
			delay: 5000
		});
	}
	$('#DeleteColumnModal').modal('hide');
  });


// Split Functions
$('#SplitModal').on('show.bs.modal', function (event) {
    table.getColumnLayout().forEach(function(selectcolumn) {
        if (selectcolumn.field) {          
            var newOptionSoource = new Option(selectcolumn.field, selectcolumn.field, false, false);
            var newOptionDestination = new Option(selectcolumn.field, selectcolumn.field, false, false);
            // add the option to the selectbox. We have to use 2 vars, because with 1 it will populate only the last.
            $("#SplitSourceColumn").append(newOptionSoource);
            $("#SplitDestinationColumn").append(newOptionDestination);
        }
    });
});

  $(document).on('click', '#SplitButton', function () {
    // Select all rows
    var SourceColumn = $("#SplitSourceColumn").val();
    var DestinationColumn = $("#SplitDestinationColumn").val();
    var NumberofChar = $("#SplitFirst").val(); 
    var SplitPostition = $("#SplitPostition").val();
    if (NumberofChar) {
        var rows = table.getRows();
        rows.forEach(function(row){
            var jsonData = {};	
            var sourcestring = row.getData();
            var splitstring = sourcestring[SourceColumn];
            // create json with the changes.
            jsonData[DestinationColumn] = splitstring.substring(SplitPostition,NumberofChar);	
            // update the tables.
            table.updateRow(row, jsonData);
        });
    }
});

$('#SpliceModal').on('show.bs.modal', function (event) {
    table.getColumnLayout().forEach(function(selectcolumn) { 
        if (selectcolumn.field) {          
            var newOptionSoource = new Option(selectcolumn.field, selectcolumn.field, false, false);
            $("#SpliceSourceColumn").append(newOptionSoource);            
        }
    });
});

$(document).on('click', '#SpliceButton', function () {
	// Select all rows
	alert('splice');
   var SourceColumn = $("#SpliceSourceColumn").val();
   var SliceStart = $("#SliceStart").val();
   var NumberofChar = $("#SliceEnd").val();   
	   var rows = table.getRows();
	   rows.forEach(function(row){
		   var jsonData = {};	
		   var sourcestring = row.getData();
		   var splitstring = sourcestring[SourceColumn];		   
		   if ($('#SliceTillEndofString').is(':checked')) {
		   	   NumberofChar = splitstring.length;
		   }		   
		   // create json with the changes.
		   var tempstring = splitstring.slice(SliceStart,NumberofChar)
		   jsonData[SourceColumn] = tempstring;		  
		   // update the tables.
		   table.updateRow(row, jsonData);
	   });
});