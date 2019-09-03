//##############
// Global constants, variables
var NewStopColumnsList = ["new_stop_id","new_stop_code","new_stop_name","new_stop_desc","new_stop_lat","new_stop_lon","new_zone_id","new_stop_url","new_location_type","new_parent_station","new_stop_timezone","new_wheelchair_boarding","new_platform_code"];
var  databankLayer = new L.geoJson(null);

var GTFSDefinedColumns = ["stop_id","stop_code","stop_name","stop_desc","stop_lat","stop_lon","zone_id","stop_url","location_type","parent_station","stop_timezone","wheelchair_boarding","platform_code","level_id"];

// SVG rendered from https://stackoverflow.com/a/43019740/4355695 : A way to enable adding more points without crashing the browser. Will be useful in future if number of stops is above 500, 1000 or so.
var myRenderer = L.canvas({ padding: 0.5 });


// #########################################
// Function-variables to be used in tabulator

var stopsTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' stops total';
}


var footerHTML = DefaultTableFooter;
const saveButton = `<button class="btn btn-outline-primary" id="savetable" name="savetable" disabled>Save Stops to DB</button>`;
footerHTML = footerHTML.replace('{SaveButton}', saveButton);
footerHTML = footerHTML.replace('{FastAdd}','<button id="CopyStopIDtoZoneID" class="btn btn-secondary" data-toggle="popover" data-trigger="hover" data-placement="right" data-html="false" title="Copy stop_id to zone_id" data-content="Use this to copy the stop_id to zone_id for every row in the table.">Copy stop_id to zone_id</button>');
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
	footerElement:footerHTML,
	//clipboardCopySelector:"table",
	clipboardPasteAction: "replace",
	columns: [ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30},
		{ title: "stop_id", field: "stop_id", frozen: true, headerFilter: "input", validator: ["string", 3],download:true },
        { title: "stop_code", field: "stop_code", editor: "input",download:true},
        { title: "stop_name", field: "stop_name", editor: "input", headerFilter: "input", validator: ["required", "string", 3] ,download:true},
        { title: "stop_desc", field: "stop_desc", editor: "input",download:true,visible:false},
		{ title: "stop_lat", field: "stop_lat", headerSort: false, validator: "float",download:true },
		{ title: "stop_lon", field: "stop_lon", headerSort: false, validator: "float",download:true },
        { title: "zone_id", field: "zone_id", editor: "input",download:true },
        { title: "stop_url", field: "stop_url", editor: "input",download:true,visible:false },
        { title: "location_type", field: "location_type", editor: "input",download:true,visible:false },
        { title: "parent_station", field: "parent_station", editor: "input",download:true,visible:false },
        { title: "stop_timezone", field: "stop_timezone", editor: "input" ,download:true,visible:false},
        { title: "wheelchair_boarding", field: "wheelchair_boarding", editor: "select", headerSort: false, editorParams: { values: { 0: "No (0)", 1: "Yes (1)" } } ,download:true},
        { title: "level_id", field: "level_id", editor: "input",download:true,visible:false },
        { title: "platform_code", field: "platform_code", editor: "input",download:true,visible:false }
	],

	rowSelected: function (row) { //when a row is selected
		//console.log("Row " + row.getData().stop_id + " Clicked, index: " + row.getIndex() );
		// Change tab on select
		//$('.nav-tabs a[href="#edit"]').tab('show');
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
			AddExtraColumns(Object.keys(data[0]));			
		}
		else {
			console.log("No data so no columns");
		}
	},
	ajaxError: function (xhr, textStatus, errorThrown) {
		console.log('GET request to tableReadSave table=stops failed.  Returned status of: ' + errorThrown);
	},
	dataEdited:function(data){
		$('#savetable').removeClass().addClass('btn btn-primary');
		$('#savetable').prop('disabled', false);
	}
});

// redraw is needed for the table to get layout correct.
$('.nav-tabs a[href="#home"]').on('shown.bs.tab', function (event) {
	table.redraw(true);
});


$(document).on("click", "#LinkAddColumn", function () {
	addColumntoTable();
});

$(document).on("click", "#LinkDeleteColumn", function () {
	RemoveExtraColumns();
});

$(document).on("click", "#DeleteColumnButton", function () {
	DeleteExtraColumns();
});
$(document).on("click", "#LinkShowHideColumn", function () {
	ShowHideColumn();
});


// #################################
// . load stops

//loadFromCsv(stopsfile,'setData');
//getPythonStops();

// #################################
/* 3. Initiate map */
// find default map layer
var defaultlayer = cfg.MapProviders.find(x => x.default === true);
// Set openstreetmap as the defaultlayer if nothing is defined as default.
var defaultlayer = !defaultlayer ? 'OpenStreetMap.Mapnik' : defaultlayer.id;

var LayerOSM = L.tileLayer.provider(defaultlayer);

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
		classHandler: function(ParsleyField) {
		  return ParsleyField.$element.closest('.form-group');
		},
		errorsContainer: function(ParsleyField) {
		  return ParsleyField.$element.closest('.form-group');
		},
		errorsWrapper: '<span class="form-text text-danger"></span>',
		errorTemplate: '<span></span>'
	  }).validate()
	if ( $form.parsley().validate() ) {
		// Process adding the value
		addTable();
	}       
	
});

$("#copytable").on("click", function () {
	table.copyToClipboard();
});

// Toggles for show hide columns in stop table.

$('body').on('change', 'input[type="checkbox"]', function() {
	var column = this.id.replace('check','');
	if(this.checked) {		
		table.showColumn(column);
        table.redraw();
    }
    else {		
		table.hideColumn(column);
        table.redraw();
       
    }
});

$(document).on("click","#LinkDownloadCSV", function () {
	table.download("csv", "stops.csv");
});

$(document).on("click","#LinkDownloadJSON", function () {
	table.download("json", "stops.json");
});

$(document).ready(function() {
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
	DownloadLinks.forEach(function(downloadtype) {
		DownloadContent += '<a class="dropdown-item" href="#" id="LinkDownload'+downloadtype+'">Download '+downloadtype+'</a>';		                
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

$("#new_location_type").on('change', function() {
	console.log($(this).val());
	if ($(this).val() === '0' || $(this).val() === '1' || $(this).val()=== '2') {
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
	rows.forEach(function(row){		
		// Copy all the arrival_times to the departure times.
		table.updateRow(row, {zone_id: row.getData().stop_id});		
	});		
}

function addTable() {
	// Loop through all stops columns and add it tho a temp object for insert.
	var stop_id = $("#new_stop_id").val();
	var jsonData = {};
	NewStopColumnsList.forEach(function(selectcolumn) {            
		// get the column selectbox value
		var importcolumn = $("#" + selectcolumn).val();
		var gtfscolumnname = selectcolumn.replace('new_','');
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
	logmessage('updateOrAddRow done for ' + stop_id);

	// switch to first tab. from https://getbootstrap.com/docs/4.0/components/navs/#via-javascript
	
	setTimeout(function () {		
		table.selectRow(stop_id);		
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
		// Check if row is selected in table.
		var selectedRows = table.getSelectedData();
		if (selectedRows.length > 0) {
			// If a row is selected update the lat en lon
			var rowdata = selectedRows[0];			
			stop_lat = Math.round((dragmarker.getLatLng().lat + 0.0000001) * 10000) / 10000;
			stop_lng = Math.round((dragmarker.getLatLng().lng + 0.0000001) * 10000) / 10000;
			table.updateRow(rowdata.stop_id, {stop_lat:stop_lat, stop_lon:stop_lng});			
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
			layer.openPopup();
			// decideZoom = map.getZoom() > 13 ? 16 : 13; // if zoomed in more, take it to 16. Else if very much out, zoom in to 13.
			// map.flyTo(layer.getLatLng(), decideZoom, {duration:1, animate:true});
			map.panTo(layer.getLatLng(), { duration: 1, animate: true });
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
	})
	.addTo(map);


	function addColumntoTable() {
		var CurrentColumns = [];
		var ColumntoAdd = prompt("Please enter are title for the column you ant to add", "Column Add");
		// replace special chars and spaces.
		ColumntoAdd = ColumntoAdd.replace(/[^A-Z0-9]+/ig, "_");
		// Current Columns
		table.getColumnLayout().forEach(function (selectcolumn) {
			// get the column selectbox value
			if (selectcolumn.field) {
				CurrentColumns.push(selectcolumn.field);
			}
		});
		// Check 
		if (CurrentColumns.indexOf(ColumntoAdd) == -1) {
			table.addColumn({ title: ColumntoAdd, field: ColumntoAdd, editor: true });
			$.toast({
				title: 'Add Column',
				subtitle: 'Columns Added',
				content: "Please add values to the newly added column. Without it it won't save it to the database.",
				type: 'success',
				delay: 5000
			});
			$('#saveAgencyButton').removeClass().addClass('btn btn-primary');
			$('#saveAgencyButton').prop('disabled', false);
		}
		else {
			$.toast({
				title: 'Add Column',
				subtitle: 'Failed to Add',
				content: ColumntoAdd + ' is already there.',
				type: 'error',
				delay: 5000
			});
		}
	}
	

function ShowHideColumn() {
	var ColumnSelectionContent = "";
	table.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			var columnname = selectcolumn.field;
			var checked = '';
			if (selectcolumn.visible == true) {
				checked = 'checked';
			}
			ColumnSelectionContent += '<div class="form-check"><input class="form-check-input" type="checkbox" value="" id="check' + columnname + '" ' + checked + '><label class="form-check-label" for="check' + columnname + '">' + columnname + '</label></div>';
		}
	});
	$("#DeleteColumnButton").hide();
	$("#DeleteColumnModalTitle").html("Show / Hide columns");
	$("#DeleteColumnModalBody").html(ColumnSelectionContent);
	// Show the Modal
	$('#DeleteColumnModal').modal('show');
}

function RemoveExtraColumns() {
	// first load all the columns currenty active in the tabel.
	var CurrentColumns = [];
	table.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			var columnname = selectcolumn.field;
			CurrentColumns.push(columnname);
		}
	});
	// Remove gtfs columns:
	GTFSDefinedColumns.forEach(function (element) {
		for (var i = 0; i < CurrentColumns.length; i++) {
			if (CurrentColumns[i] === element) {
				// Remove the predefined columns.
				CurrentColumns.splice(i, 1);
				i--;
			}
		}
	});
	// Currentcolumns now holds all defined columns.
	var ColumnSelectionContent = "";
	CurrentColumns.forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn) {
			var columnname = selectcolumn;
			ColumnSelectionContent += '<div class="form-check"><input class="form-check-input" type="checkbox" value="' + columnname + '" name="DeleteColumns" id="DeleteColumns' + columnname + '"><label class="form-check-label" for="DeleteColumns' + columnname + '">' + columnname + '</label></div>';
		}
	});
	$("#DeleteColumnButton").show();
	$("#DeleteColumnModalTitle").html("Delete Non standard columns");
	$("#DeleteColumnModalBody").html(ColumnSelectionContent);
	// Show the Modal
	$('#DeleteColumnModal').modal('show');

}

function DeleteExtraColumns() {
	// The getdata funtion will not delete the column from the data but only hides it. 
	var data = table.getData();	
	var filteredData = [];
	var columns = table.getColumns();
	data.forEach(function (row) {
		var outputRow = {};

		columns.forEach(function (col) {
			var field = col.getField();
			if (field) {
				$("input[name=DeleteColumns]:checked").each(function () {
					if (field != $(this).val()) {
						outputRow[field] = row[field];
					}
				});
			}
		});
		// Now we have the row without the delete columns.
		filteredData.push(outputRow);
	});
	$("input[name=DeleteColumns]:checked").each(function () {
		// Efectifly delete the columns from the table. But this will not delete the columns from the data!
		table.deleteColumn($(this).val());
	});
	// Replace all of the table data with the new json array. This will not contain the deleted columns!
	table.replaceData(filteredData);
	table.redraw();	
	$('#saveAgencyButton').removeClass().addClass('btn btn-primary');
	$('#saveAgencyButton').prop('disabled', false);
	$('#DeleteColumnModal').modal('hide');
	$.toast({
		title: 'Delete Column',
		subtitle: 'Columns Deleted',
		content: 'Save the table save the changes to the database.',
		type: 'success',
		delay: 5000
	});
}

function AddExtraColumns(loadeddata) {
	var filtered = loadeddata;
	GTFSDefinedColumns.forEach(function (element) {
		for (var i = 0; i < filtered.length; i++) {
			if (filtered[i] === element) {
				// Remove the predefined columns.
				filtered.splice(i, 1);
				i--;
			}
		}
	});
	// Filtered contains now the columns that aren't in the gtfs specs.	
	filtered.forEach(function (addcolumn) {
		//add the column to the table.
		table.addColumn({ title: addcolumn, field: addcolumn, editor: true });
	});
}