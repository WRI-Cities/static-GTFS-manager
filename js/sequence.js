// #########################################
// Global variables
var allStops = [];
var selected_route_id = '', globalShapesList = [], uploadedShapePrefix = '';
var tmpfilecontent;

var shapes0List = [];
var shapes1List = [];

var trashIcon = function (cell, formatterParams, onRendered) { //plain text value
	return "<i class='fas fa-trash-alt'></i>";
};

// Format Select 2 ShapeBoxes

function ShapeformatState(state) {
	// Used to put a google icon for the gogle supported services.
	if (!state.id) {
		return state.text;
	}
	var $state = state.text;
	switch ($state.ShapeState) {
		case "uploaded":
			$state = $(
				'<span><i class="fas fa-upload"></i> ' + state.text + '</span>'
			);
			break;
		case "other":
			$state = $(
				'<span><i class="fas fa-shapes"></i> ' + state.text + '</span>'
			);
			break;
		case "current":
			$state = $(
				'<span><i class="fas fa-check"></i> ' + state.text + '</span>'
			);
			break;
		default: 
		$state = $(
			'<span> ' + state.text + '</span>'
		);

	}	
	return $state;
};

// #########################################
// Construct tables

var sequence0table = new Tabulator("#sequence-0-table", {
	selectable: 1,
	index: 'stop_id',
	movableRows: true,
	history: true,
	movableColumns: true,
	layout: "fitDataFill",
	columns: [
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "Num", width: 40, formatter: "rownum", headerSort: false }, // row numbering
		{ title: "stop_id", field: "stop_id", headerFilter: "input", headerFilterPlaceholder: "filter by id", headerSort: false },
		{ title: "stop_name", field: "stop_name", headerFilter: "input", headerFilterPlaceholder: "filter by name", headerSort: false },
		{
			formatter: trashIcon, align: "center", title: "del", headerSort: false, cellClick: function (e, cell) {
				map[0].closePopup();
				cell.getRow().delete();
				mapsUpdate();
			}
		}

	],
	rowSelected: function (row) {
		var stop_id = row.getIndex();
		mapPop(stop_id, 0);
	},
	rowMoved: function (row) {
		console.log("A stop has been moved in direction 0 sequence.");
		mapsUpdate();

	},
	rowDeselected: function (row) { //when a row is deselected
		map[0].closePopup();
	}
});

var sequence1table = new Tabulator("#sequence-1-table", {
	selectable: 1,
	index: 'stop_id',
	movableRows: true,
	history: true,
	movableColumns: true,
	layout: "fitDataFill",
	columns: [
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "Num", width: 40, formatter: "rownum", headerSort: false }, // row numbering
		{ title: "stop_id", field: "stop_id", headerFilter: "input", headerFilterPlaceholder: "filter by id", headerSort: false },
		{ title: "stop_name", field: "stop_name", headerFilter: "input", headerFilterPlaceholder: "filter by name", headerSort: false },
		{
			formatter: trashIcon, width: 40, align: "center", headerSort: false, cellClick: function (e, cell) {
				cell.getRow().delete();
				mapsUpdate();
			}
		}

	],
	rowSelected: function (row) {
		var stop_id = row.getIndex();
		mapPop(stop_id, 1);

		// to do: will have to declare this externally, after the two tables have been defined.
	},
	rowMoved: function (row) {
		console.log("A stop has been moved in direction 1 sequence.");
		mapsUpdate();
	},
	rowDeselected: function (row) { //when a row is deselected
		map[1].closePopup();
	}
});


// #################################
/* Initiate map */
var LayerOSM0 = L.tileLayer.provider('OpenStreetMap.Mapnik');
var LayerOSM1 = L.tileLayer.provider('OpenStreetMap.Mapnik');

var mapOptions0 = { 'center': [0, 0], 'zoom': 2, 'layers': LayerOSM0, scrollWheelZoom: false };
var mapOptions1 = { 'center': [0, 0], 'zoom': 2, 'layers': LayerOSM1, scrollWheelZoom: false };
//var mapOptionsClone = jQuery.extend(true, {}, mapOptions);

var map = [];
map[0] = new L.Map('map0', mapOptions0);
map[1] = new L.Map('map1', mapOptions1);

//$('.leaflet-container').css('cursor','crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs

L.control.scale({ metric: true, imperial: false }).addTo(map[0]);
L.control.scale({ metric: true, imperial: false }).addTo(map[1]);


var myRenderer = L.canvas({ padding: 0.5 });
// from https://stackoverflow.com/a/43019740/4355695 : A way to enable adding more points without crashing the browser. Will be useful in future if number of stops is above 500, 1000 or so.

var sequenceLayer = [];
for (i in [0, 1]) {
	sequenceLayer[i] = new L.geoJson(null);
}

// initiating layers for carrying shapes
var shapeLayer = [];
for (i in [0, 1]) {
	shapeLayer[i] = new L.geoJson(null);
	shapeLayer[i].addTo(map[i]);
}

// adding buttons to zoom to show all stops
L.easyButton('<i class="fas fa-home"></i>', function (btn, map) {
	map.fitBounds(sequenceLayer[0].getBounds(), { padding: [40, 20], maxZoom: 14 });
}, 'Filter stops').addTo(map[0]);

L.easyButton('<i class="fas fa-home"></i>', function (btn, map) {
	map.fitBounds(sequenceLayer[1].getBounds(), { padding: [40, 20], maxZoom: 14 });
}, 'Filter stops').addTo(map[1]);

// adding buttons to download shape
L.easyButton('<i class="fas fa-download"></i>', function (btn, map) {
	download_shapefile(0);
}, 'Download shape file').addTo(map[0]);

L.easyButton('<i class="fas fa-download"></i>', function (btn, map) {
	download_shapefile(1);
}, 'Download shape file').addTo(map[1]);


// #########################################
// Run initiating commands
$(document).ready(function () {
	getPythonStops(); //load allStops array
	//getPythonAgency(); // load agencies, for making the agency picker dropdown in routes table
	getPythonRoutes(); // load routes.. for routes management.
	getPythonAllShapesList();
	

});


// #########################################
// Listeners for button presses etc

$("#add-0").on("click", function () {
	//$('#stopChooser0').select2().val();
	add2sequence($('#stopChooser0').find(':selected').val(), 0);
	//$('#stop2add-0').val('');
});

$("#add-1").on("click", function () {
	add2sequence($('#stopChooser1').select2().val(), 1);
	//$('#stop2add-1').val('');
});

$("#saveSequence").on("click", function () {
	saveSequence();
});

$("#flipSequenceReplace").on("click", function () {
	flipSequence(true);
});

$("#flipSequenceInsert").on("click", function () {
	flipSequence(false);
});

$(document).on('click', '#uploadShapeButton', function () {
	uploadShape();
});

$(document).on('click', '#KMLAddSequence', function () {
	KMLAddSequence();
});

$('#shapes0List').on('select2:select', function (e) {
	var valueSelected = e.params.data.id;
	if (valueSelected == '') {
		shapeLayer[0].clearLayers();
		return;
	}
	loadShape(valueSelected, 0);
});

$('#shapes1List').on('select2:select', function (e) {
	var valueSelected = this.value;
	if (valueSelected == '') {
		shapeLayer[1].clearLayers();
		return;
	}
	loadShape(valueSelected, 1);
});

$('#routeSelect').on('select2:select', function (e) {
	// Do something
	//var data = e.params.data;

	var valueSelected = e.params.data.id;
	console.log(valueSelected)
	if (valueSelected == '') {
		return;
	}
	$('#openShapeModal').prop('disabled', false);
	$('#openKMLModal').prop('disabled', false);
	let route_id = valueSelected;
	// clear present sequence tables.. passing to a function to handle "save changes" action later.
	clearSequences();
	// execute function to load corresponding route's sequence(s)
	getPythonSequence(route_id);
	selected_route_id = route_id; // global variable

	// shapes related:
	uploadedShapePrefix = ''; // reset global shape uploaded variable.
	getPythonShapesList(route_id);
	$('#openShapeModalStatus').html('');

});

// #########################################
// Functions

function getPythonStops() {
	// loading stops.txt data, keyed by stop_id.
	
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/tableReadSave?table=stops`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/tableReadSave?table=stops .`);
			var data = JSON.parse(xhr.responseText);			
			allStops = data;
						
			var select2items = $.map(data, function (obj) {
				obj.id = obj.id || obj.route_id; // replace identifier
				obj.text = obj.text || obj.stop_id + " : " + obj.stop_name
				return obj;
			});

			$("#stopChooser0").select2({
				placeholder: "Pick a stop",
				theme: 'bootstrap4',
				data: select2items
			});
			$("#stopChooser1").select2({
				placeholder: "Pick a stop",
				theme: 'bootstrap4',
				data: select2items
			});	
		}
		else {
			console.log('Server request to API/tableReadSave?table=stops failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function getPythonSequence(route_id) {
	$.toast({
		title: 'Default Sequence',
		subtitle: 'Loading',
		content: 'Loading sequence from DB...',
		type: 'info',
		delay: 1000
	});		
	// load from python.
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/sequence?route=${route_id}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/sequence for route_id ${route_id}.`);
			var response = JSON.parse(xhr.responseText);
			console.log(response.data);
			initiateSequence(response.data);
			$.toast({
				title: 'Default Sequence',
				subtitle: 'Loaded',
				content: 'Sequence Loaded',
				type: 'info',
				delay: 1000
			});
		}
		else {
			console.log('Server request to API/sequence for route_id ' + route_id + ' failed. Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
			$.toast({
				title: 'Default Sequence',
				subtitle: 'Error',
				content: xhr.responseText,
				type: 'error',
				delay: 1000
			});			
		}
	};
	xhr.send();
}

function initiateSequence(sequenceData) {

	// allStops = [], remaining0=[], remaining1=[] ;
	// to do: look up allStops array, retrieve the stop_name for each id. Also, include population of the map also in this, similar to how its done in stops page.

	var sequence0 = [];
	var sequence1 = [];

	for (stop in sequenceData[0]) {
		let stop_id = sequenceData[0][stop];
		// check if stop_id is present in the sequence or not, and console log but errorlessly skip to next stop in loop if not present.
		var searchstop = allStops.find(x => x.stop_id === stop_id);
		console.log(searchstop);
		if (!searchstop) {
			console.log(stop_id + ' found in sequence DB but not present in the stops DB. So, skipping it.');
			continue;
		}
		else {			
			sequence0.push(searchstop);
		}
	}
	for (stop in sequenceData[1]) {
		let stop_id = sequenceData[1][stop];
		var searchstop = allStops.find(x => x.stop_id === stop_id);
		console.log(searchstop);
		if (!searchstop) {
			console.log(stop_id + ' found in sequence DB but not present in the stops DB. So, skipping it.');
			continue;
		}
		else {			
			sequence1.push(searchstop);
		}
		
	}

	sequence0table.setData(sequence0);
	sequence1table.setData(sequence1);
	mapsUpdate('firsttime'); //this would be an all-round full refresh of the maps based on the data in the global varibles.

}

function mapsUpdate(timeflag = 'normal') {
	// read the tabulator tables:
	var data = [];

	for (j in [0, 1]) {
		if (j == 0) {
			data[j] = sequence0table.getData();
		}
		else {
			data[j] = sequence1table.getData();
		}
		//data[j] = $(`#sequence-${j}-table`).tabulator("getData");
		sequenceLayer[j].clearLayers();

		// check and skip if empty sequence. And note, one sequence may be filled while other is empty.
		if (!data[j].length) continue;

		for (i in data[j]) {
			let lat = parseFloat(data[j][i]['stop_lat']);
			let lon = parseFloat(data[j][i]['stop_lon']);
			if (!checklatlng(lat, lon)) {
				continue;
			}
			//let stopmarker = L.circleMarker([lat,lon], sequenceStyle);
			let stopmarker = L.marker([lat, lon], {
				icon: L.divIcon({
					className: `sequence-${j}-divicon`,
					iconSize: [20, 20],
					html: (parseInt(i) + 1)
				})
			})
				.bindTooltip(data[j][i]['stop_id'] + ':' + data[j][i]['stop_name'])
				.on('click', function (e) {
					markerOnClick(e);
				});

			stopmarker.properties = data[j][i]; // transfer all properties of stop row to marker
			stopmarker.properties['sequence'] = j; // store which sequence table/map the marker belongs to, within the marker itself via an additional property. So that the value can be passed on in the .on('click') function.

			stopmarker.addTo(sequenceLayer[j]);
		}

		map[j].fitBounds(sequenceLayer[j].getBounds(), { padding: [40, 20], maxZoom: 14 });
		if (timeflag == 'firsttime') {
			sequenceLayer[j].addTo(map[j]);
		}

		// redo the row numbering, in case stops have been moved.
		if (j == 0) {
			data[j] = sequence0table.redraw(true);
		}
		else {
			data[j] = sequence1table.redraw(true);
		}
		//$(`#sequence-${j}-table`).tabulator("redraw", true);
		// to check: maybe this belongs elsewhere? -> No, the tabulators call this function when rows are moved. It's fine.
	}
}


// ##############################
/* Interlinking between table and map */

function mapPop(stop_id, i = 0) {
	sequenceLayer[i].eachLayer(function (layer) {
		if (layer.properties && (layer.properties.stop_id == stop_id)) {
			layer.bindPopup(function (layer) {
				return layer.properties.stop_id + ': ' + layer.properties.stop_name;
			});
			layer.openPopup();
			// decideZoom = map[i].getZoom() > 13 ? 16 : 13; // if zoomed in more, take it to 16. Else if very much out, zoom in to 13.
			// map[i].flyTo(layer.getLatLng(), decideZoom, {duration:1, animate:true});
			map[i].panTo(layer.getLatLng(), { duration: 1, animate: true });
		}
	});
}

function markerOnClick(e) {
	let stop_id = e.target.properties.stop_id;
	let seq = e.target.properties.sequence;
	console.log(seq);
	if (seq == 0){
		var row = sequence0table.getRow(stop_id);
		row.scrollTo();
		row.toggleSelect();
	}
	else {
		var row = sequence1table.getRow(stop_id);
		row.scrollTo();
		row.toggleSelect();
	}	
}


function add2sequence(stop_id, direction_id = 0) {
	if (stop_id == '') {
		console.log('Invalid stop_id. Not adding!');
		return false;
	}
	console.log('add2sequence function: Adding stop_id ' + stop_id + ' to direction ' + direction_id);
	var searchstop = allStops.find(x => x.stop_id === stop_id);
	if (direction_id == 0) {
		sequence0table.addRow(searchstop);
		mapsUpdate('firsttime'); // using firsttime as on new routes, on adding a stop, it needs to show on the map. Else it is staying invisible.
	}
	else {
		sequence1table.addRow(searchstop);
		mapsUpdate('firsttime');
	}
}

// ####################
// Save, send data to python server
function saveSequence() {

	$.toast({
		title: 'Default route sequence',
		subtitle: 'Saving',
		content: 'Saving sequence to DB, please wait...',
		type: 'info',
		delay: 1000
	});	
	
	// forget global sequences, retrieve latest sequence data straight from tables.
	var sequence0 = sequence0table.getData();
	var sequence1 = sequence1table.getData();

	//var selected = $("#routes-table").tabulator("getSelectedData");
	if (!selected_route_id.length) {
		$('#sequenceSaveStatus').html('Please select a route at the top table.');
		return;
	}
	var sequence0_list = sequence0.map(a => a.stop_id);
	var sequence1_list = sequence1.map(a => a.stop_id);

	var data = [sequence0_list, sequence1_list];

	var chosenShape0 = $('#shapes0List').val();
	var chosenShape1 = $('#shapes1List').val();
	if (!(chosenShape0.length && chosenShape1.length)) {
		if (!confirm('Are you sure you don\'t want to save any shape for the onward and/or return journey direction of this route?\nPress OK to proceed, Cancel to go back and set the shapes first.'))
			return;
	}

	var pw = $("#password").val();
	if (!pw) {
		$.toast({
			title: 'Default route sequence',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});		
		shakeIt('password'); return;
	}

	console.log('sending sequence data to server API/sequence via POST: ' + JSON.stringify(data));
	console.log('Also sending chosen shapes: ', chosenShape0, chosenShape1);
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}sequence?pw=${pw}&route=${selected_route_id}&shape0=${chosenShape0}&shape1=${chosenShape1}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/sequence, resonse received: ' + xhr.responseText);
			$.toast({
				title: 'Default route sequence',
				subtitle: 'Saved',
				content: xhr.responseText ,
				type: 'success',
				delay: 4000
			});

			uploadedShapePrefix = ''; // clearing uploaded shape global variable if any.

			console.log('Re-firing getPythonAllShapesList function after saving sequence to DB.');
			getPythonAllShapesList();
			mapsUpdate();

		} else {
			console.log('Server POST request to API/sequence failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText);
			$.toast({
				title: 'Default route sequence',
				subtitle: 'Error',
				content: 'Failed to save. Message: ' + xhr.responseText ,
				type: 'error',
				delay: 4000
			});			
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

}

function flipSequence(overwrite = false) {
	// flips the onward journey's sequence and inserts it into the return journey sequence. 
	//If there are stops already listed, then they will be pushed below or over-written depending on the overwrite flag.

	var onward = sequence0table.getData();

	if (overwrite) sequence1table.setData([]);

	for (i in onward) {
		sequence1table.addData(onward[i], true);
		// inserting into return sequence table at top, in effect reversing the onward sequence.
	}
	mapsUpdate('firsttime');
	//$("#sequence-1-table").tabulator('addRow',row);
}

function clearSequences() {
	sequence0table.setData([]);
	sequence1table.setData([]);		
}

function getPythonAllShapesList() {

	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get(`${APIpath}allShapesList`, function (data) {
		globalShapesList = JSON.parse(data);
		console.log('GET request to API/allShapesList succesful.');
		// console.log('globalShapesList: ' + JSON.stringify(globalShapesList) );
		if (selected_route_id) {
			// if a particular route is selected and global variable is holding a value
			// this block is skipped at page load time as no route has been selected at the time.

			// no, let's not re-fire route selection as that is erasing all the fresh sequence data created and not saved!
			/*
			console.log('Re-firing selection of route ' + selected_route_id + ' from getPythonAllShapesList function to update shape dropdowns.')
			$("#routes-table").tabulator("selectRow",selected_route_id);
			*/
			// should solve https://github.com/WRI-Cities/static-GTFS-manager/issues/34
			getPythonShapesList(selected_route_id);
		}

	})
		.fail(function () {
			console.log('GET request to API/allShapesList failed.')
		});
}

function getPythonShapesList(route_id) {
	$('#shapes0List').html('');
	$('#shapes1List').html('');
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get(`${APIpath}shapesList?route=${route_id}`, function (data) {
		var shapes = JSON.parse(data);
		console.log('GET request to API/shapesList succesful.');
		populateShapesLists(shapes);
	})
		.fail(function () {
			console.log('GET request to API/shapesList failed.')
		});
}



function populateShapesLists(shapes) {
	//use globalShapesList
	// use selected_route_id

	// clearing the shape layers
	shapeLayer[0].clearLayers();
	shapeLayer[1].clearLayers();

	if (!selected_route_id.length) return; //quietly exit if no route selected.

	var allShapesList = globalShapesList['all']; //global variable
	var thisRouteSaved = globalShapesList['saved'][selected_route_id];

	// direction 0:
	var content = '<option value="">No Shape</option>';
	var alreadySelected = false;
	var shapesSoFar = [];
	var Select2shapeList = [];
	//Select2shapeList.push({id: "", text: "No Shape"});
	//console.log(Select2shapeList);
	$("#shapes0List").select2({
		placeholder: "",
		theme: 'bootstrap4',
		data: Select2shapeList
	});
	var newOption = new Option("No Shape", "", false, false);
	$('#shapes0List').append(newOption).trigger('change');

	// check if there's just been a shape uploaded
	if (uploadedShapePrefix.length) {
		var valueid = uploadedShapePrefix + "_0";
		var valuetext = uploadedShapePrefix + "_0";
		var newOption = new Option(valueid, valuetext, false, true);
		$('#shapes0List').append(newOption);
		//content += `<option value="${uploadedShapePrefix}_0"  selected="selected">^ ${uploadedShapePrefix}_0</option>`;
		alreadySelected = true;
		shapesSoFar.push(uploadedShapePrefix + '_0');
		// load up the shape from backend
		loadShape(uploadedShapePrefix + '_0', 0);
	}
	if (thisRouteSaved) {
		if (thisRouteSaved[0]) {
			if (!alreadySelected) {
				selectFlag = true;;
				alreadySelected = true;
			}
			else selectFlag = false;
			var valueid = thisRouteSaved[0];
			var valuetext = "&#10004;" + thisRouteSaved[0];
			var newOption = new Option(valuetext, valueid, false, selectFlag);
			$('#shapes0List').append(newOption);
			//content += `<option value="${thisRouteSaved[0]}" ${selectFlag}>&#10004;${thisRouteSaved[0]}</option>`;
			shapesSoFar.push(thisRouteSaved[0]);
			loadShape(thisRouteSaved[0], 0);
		}
	}
	for (i in shapes[0]) {
		// selectFlag = ( ( !alreadySelected && i==0) ? ' selected="selected"' : '');
		selectFlag = false;
		if (shapesSoFar.indexOf(shapes[0][i]) < 0) {
			var valueid = shapes[0][i];
			var valuetext = "# " + shapes[0][i];
			var newOption = new Option(valuetext, valueid, false, selectFlag);
			$('#shapes0List').append(newOption);
			//content += `<option value="${shapes[0][i]}"${selectFlag}># ${shapes[0][i]}</option>`;
			shapesSoFar.push(shapes[0][i]);
		}
	}
	for (i in allShapesList) {
		if (shapesSoFar.indexOf(allShapesList[i]) < 0) {
			var valueid = allShapesList[i];
			var valuetext = allShapesList[i];
			var newOption = new Option(valuetext, valueid, false, false);
			$('#shapes0List').append(newOption);
		}
		//content += `<option value="${allShapesList[i]}">${allShapesList[i]}</option>`;
	}
	$('#shapes0List').trigger('change');
	//$('#shapes0List').html(content);
	//$('#shapes0List').trigger('chosen:updated'); // need to check if this errors on first run when .chosen not initialized yet.
	//fire chosen autocomplete after populating. 
	//$('#shapes0List').chosen({disable_search_threshold: 1, search_contains:true, width:100});

	//#######################
	// direction 1:
	var content = '<option value="">No Shape</option>';
	var alreadySelected = false;
	var shapesSoFar = [];
	$("#shapes1List").select2({
		placeholder: "",
		theme: 'bootstrap4'
	});
	var newOption = new Option("No Shape", "", false, false);
	$('#shapes1List').append(newOption).trigger('change');
	// check if there's just been a shape uploaded
	if (uploadedShapePrefix.length) {
		var valueid = uploadedShapePrefix + "_1";
		var valuetext = uploadedShapePrefix + "_1";
		var newOption = new Option(valuetext, valueid, false, true);
		//content += `<option value="${uploadedShapePrefix}_1"  selected="selected">^ ${uploadedShapePrefix}_1</option>`;
		alreadySelected = true;
		shapesSoFar.push(uploadedShapePrefix + '_1');
		loadShape(uploadedShapePrefix + '_1', 1);
	}

	if (thisRouteSaved) {
		if (thisRouteSaved[1]) {
			if (!alreadySelected) {
				selectFlag = true;
				alreadySelected = true;
			}
			else selectFlag = false;
			var valueid = thisRouteSaved[1];
			var valuetext = "&#10004;" + thisRouteSaved[1];
			var newOption = new Option(valuetext, valueid, false, selectFlag);
			$('#shapes1List').append(newOption);
			//content += `<option value="${thisRouteSaved[1]}"${selectFlag}>&#10004; ${thisRouteSaved[1]}</option>`;
			alreadySelected = true;
			shapesSoFar.push(thisRouteSaved[1]);
			loadShape(thisRouteSaved[1], 1);
		}
	}
	for (i in shapes[1]) {
		// selectFlag = ( ( !alreadySelected && i==0) ? ' selected="selected"' : '');
		selectFlag = false;

		if (shapesSoFar.indexOf(shapes[1][i]) < 0) {
			//content += `<option value="${shapes[1][i]}"${selectFlag}># ${shapes[1][i]}</option>`;
			var valueid = shapes[1][i];
			var valuetext = shapes[1][i];
			var newOption = new Option(valuetext, valueid, false, selectFlag);
			$('#shapes1List').append(newOption);
			shapesSoFar.push(shapes[1][i]);
		}
	}
	for (i in allShapesList) {
		if (shapesSoFar.indexOf(allShapesList[i]) < 0) {
			//content += `<option value="${allShapesList[i]}">${allShapesList[i]}</option>`;
			var valueid = allShapesList[i];
			var valuetext = allShapesList[i];
			var newOption = new Option(valuetext, valueid, false, false);
			$('#shapes1List').append(newOption);
		}

	}
	$('#shapes1List').trigger('change');
	//$('#shapes1List').html(content);
	//$('#shapes1List').trigger('chosen:updated');

	//fire chosen autocomplete after populating.
	//$('#shapes1List').chosen({disable_search_threshold: 1, search_contains:true, width:100});
}

//###############

function uploadShape() {

	$('#uploadShapeStatus').html('');
	// make POST request to API/XMLUpload

	// idiot-proofing: check if the files have been uploaded or not.
	// alert( ""==f.value ? "nothing selected" : "file selected");
	// from https://stackoverflow.com/a/1417489/4355695
	if ($('#uploadShape0').val() == '') {
		$.toast({
			title: 'Uplading shape',
			subtitle: 'Error',
			content: 'Please select a file to upload!',
			type: 'error',
			delay: 4000
		});
		shakeIt('uploadShape0');
		return;
	}

	var pw = $("#password").val();
	if (!pw) {
		shakeIt('password');
		$.toast({
			title: 'Upload shape',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});
		return;
	}
	var route_id = selected_route_id;
	var shape_id_prefix = $("#uploadShapeId").val().replace(/[^A-Za-z0-9-_]/g, "");
	$("#uploadShapeId").val(shape_id_prefix);

	if (!shape_id_prefix.length) {
		$.toast({
			title: 'Uplading shape',
			subtitle: 'Error',
			content: 'Please enter a proper shape id.',
			type: 'error',
			delay: 4000
		});		
		shakeIt('uploadShapeId');
		return;
	}

	if (globalShapesList['all'].indexOf(shape_id_prefix + '_0') > -1 || globalShapesList['all'].indexOf(shape_id_prefix + '_1') > -1) {
		//$('#uploadShapeStatus').html('Please choose some other id, this one\'s taken.');
		if (!confirm('The shape_id\'s:\n' + shape_id_prefix + '_0 and/or ' + shape_id_prefix + '_1\n..already exist in the shapes DB.\nAre you SURE you want to replace an existing shape?')) {
			$("#uploadShapeId").val('');
			return;
		}
	}

	$.toast({
			title: 'Uplading shape',
			subtitle: 'Upload',
			content: 'Uploading file(s), please wait...',
			type: 'info',
			delay: 4000
		});

	var reverseFlag = $('#reverseCheck').is(':checked');

	var filename = $('#uploadShape0')[0].files[0].name;
	var extension = filename.substring(filename.lastIndexOf('.') + 1, filename.length);


	const reader = new FileReader();
	reader.readAsText($('#uploadShape0')[0].files[0]);
	reader.onload = () => storeResults(reader.result, pw, route_id, shape_id_prefix, reverseFlag, filename, extension);


}

function KMLAddSequence() {
	var KMLDirection = $("#KMLDirection").val();
	var backfilename = $('#KMlFile')[0].files[0].name;
	var points = 0;
	var found = 0;
	var backextension = backfilename.substring(backfilename.lastIndexOf('.') + 1, backfilename.length);
	// Go and read contents of second file.
	const reader = new FileReader();
	reader.readAsText($('#KMlFile')[0].files[0]);
	reader.onload = function(e) {
		// The file's text will be printed here
		var parts = [e.target.result];
    	parts = convertToGeoJson(e.target.result, backextension);
		var geojson = JSON.parse(parts[0]);
		geojson.features.forEach(function(Feature)  {
			// Only process points			
			if (Feature.geometry.type == "Point"){
				points = points + 1;
				var name = Feature.properties.name;
				var searchstop = allStops.find(x => x.stop_name === name);
				if (searchstop){
					// stop found
					found = found + 1;	
					if (KMLDirection == 'sequence0table') {
						add2sequence(searchstop.stop_id, 0);
					}
					else {
						add2sequence(searchstop.stop_id, 1);
					}										
				}
			}
		});
		$('#ParseKMLModal').modal('hide');
		$.toast({
			title: 'Processed KML',
			subtitle: 'Matching',
			content: 'Points in KML: '+points + '<br />Matched: '+found,
			type: 'info',
			delay: 4000
		});
	};
	
	
}

function storeResults(result, pw, route_id, shape_id_prefix, reverseFlag, filename, extension) {
	var parts = [result];
	// first check if the reverse is checked
	if (reverseFlag) {
		if ($('#uploadShape1').val() != '') {
			var backfilename = $('#uploadShape1')[0].files[0].name;
			var backextension = backfilename.substring(backfilename.lastIndexOf('.') + 1, backfilename.length);
			// Go and read contents of second file.
			const reader = new FileReader();
			reader.readAsText($('#uploadShape1')[0].files[0]);
			reader.onload = () => storeResultsWithReverse(result, reader.result, pw, route_id, shape_id_prefix, reverseFlag, filename, extension, backextension);
		}
		else {
			$.toast({
				title: 'Upload Shapes',
				subtitle: 'Error',
				content: 'Please select the file for reverse direction, or check off that box.',
				type: 'error',
				delay: 5000
			});				
			shakeIt('uploadShape1');
			shakeIt('reverseCheck');
			return;
		}
	}
	else {
		var filenameupload = new Date().toISOString().replace(/\D/g, '') + '.geojson';

		parts = convertToGeoJson(result, extension);

		var geojsonfile = new File(parts, filenameupload, {
			lastModified: new Date(0), // optional - default = now
			type: "" // optional - default = ''
		});

		var formData = new FormData();
		formData.append('uploadShape0', geojsonfile);

		$.ajax({
			url: `${APIpath}shape?pw=${pw}&route=${route_id}&id=${shape_id_prefix}&reverseFlag=${reverseFlag}`,
			type: 'POST',
			data: formData,
			cache: false,
			processData: false,  // tell jQuery not to process the data
			contentType: false,  // tell jQuery not to set contentType
			success: function (returndata) {
				console.log('API/shape POST request with file upload successfully done.');
				$.toast({
					title: 'Upload Shapes',
					subtitle: 'Success',
					content: returndata,
					type: 'success',
					delay: 5000
				});					
				uploadedShapePrefix = shape_id_prefix; //assign to global variable
				$("#uploadShapeId").val('');
				//modal.style.display = "none";
				getPythonAllShapesList();
				$('#UploadShapeModal').modal('hide');
			},
			error: function (jqXHR, exception) {
				console.log('API/shape POST request failed.')
				$.toast({
					title: 'Upload Shapes',
					subtitle: 'Error',
					content: jqXHR.responseText,
					type: 'error',
					delay: 5000
				});				
			}
		});
	}
}

function storeResultsWithReverse(resultforward, resultback, pw, route_id, shape_id_prefix, reverseFlag, filename, forwardextension, backextension) {
	console.log("Forard and reverse shapes are different.");
	var filenameuploadforward = new Date().toISOString().replace(/\D/g, '') + '-forward.geojson';
	var filenameuploadback = new Date().toISOString().replace(/\D/g, '') + '-back.geojson';

	var fileforward = convertToGeoJson(resultforward, forwardextension);
	var fileback = convertToGeoJson(resultback, backextension);

	var geojsonfileforward = new File(fileforward, filenameuploadforward, {
		lastModified: new Date(0), // optional - default = now
		type: "" // optional - default = ''
	});

	var geojsonfileback = new File(fileback, filenameuploadback, {
		lastModified: new Date(0), // optional - default = now
		type: "" // optional - default = ''
	});


	var formData = new FormData();
	formData.append('uploadShape0', geojsonfileforward);
	formData.append('uploadShape1', geojsonfileback);

	$.ajax({
		url: `${APIpath}shape?pw=${pw}&route=${route_id}&id=${shape_id_prefix}&reverseFlag=${reverseFlag}`,
		type: 'POST',
		data: formData,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success: function (returndata) {
			console.log('API/shape POST request with file upload successfully done.');
			$.toast({
				title: 'Upload Shapes',
				subtitle: 'Success',
				content: returndata,
				type: 'success',
				delay: 5000
			});				
			uploadedShapePrefix = shape_id_prefix; //assign to global variable
			$("#uploadShapeId").val('');
			//modal.style.display = "none";
			getPythonAllShapesList();
			$('#UploadShapeModal').modal('hide');
		},
		error: function (jqXHR, exception) {
			console.log('API/shape POST request failed.')
			$.toast({
				title: 'Upload Shapes',
				subtitle: 'Error',
				content: jqXHR.responseText,
				type: 'error',
				delay: 5000
			});	
		}
	});
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
			parts = [result];
	}
	return parts;
}

function loadShape(shape_id, whichMap) {
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get(`${APIpath}shape?shape=${shape_id}`, function (data) {
		var shapeArray = JSON.parse(data);
		console.log('GET request to API/shape succesful.');
		drawShape(shapeArray, whichMap);
	})
		.fail(function () {
			console.log('GET request to API/shape failed.')
		});
}

function drawShape(shapeArray, whichMap) {
	shapeLayer[whichMap].clearLayers(); // clearing the layer

	//var lineColor = ( whichMap==0? '#990000': '#006600');
	var lineColor = (whichMap == 0 ? 'purple' : 'blue'); //switching the markers' colors
	var latlngs = [];
	shapeArray.forEach(function (row) {
		latlngs.push([row['shape_pt_lat'], row['shape_pt_lon']]);
	});
	var shapeLine = L.polyline.antPath(latlngs, { color: lineColor, weight: 5 }).addTo(shapeLayer[whichMap]);
	map[whichMap].fitBounds(shapeLine.getBounds(), { padding: [40, 20], maxZoom: 14 });


}

function download_shapefile(direction = 0) {
	filename = $(`#shapes${direction}List`).val();
	if (!filename.length) {
		console.log(`Direction ${direction}: no shape selected.`);
		return;
	}
	filename += '.geojson';
	var contentString = JSON.stringify(shapeLayer[direction].toGeoJSON(), null, 2);

	// Adapted from https://stackoverflow.com/a/35251739/4355695
	var mime_type = "text/plain";
	var dlink = document.createElement('a');
	dlink.download = filename;
	var blob = new Blob([contentString], { type: mime_type });
	dlink.href = window.URL.createObjectURL(blob);
	dlink.onclick = function (e) {
		// revokeObjectURL needs a delay to work properly
		var that = this;
		setTimeout(function () {
			window.URL.revokeObjectURL(that.href);
		}, 1500);
	};

	dlink.click();
	dlink.remove();
}


function getPythonRoutes() {
	//load from python!
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/tableReadSave?table=routes`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`GET call to Server API/tableReadSave?table=routes succesful.`);
			var data = JSON.parse(xhr.responseText);

			var select2items = $.map(data, function (obj) {
				obj.id = obj.id || obj.route_id; // replace identifier
				var longname = "";
				if(obj.route_long_name) {longname = " : " + obj.route_long_name}
				obj.text = obj.text || obj.route_id + " : " + obj.route_short_name + longname
				return obj;
			});
			//console.log($("#targetStopid").val())
			$("#routeSelect").select2({
				placeholder: "Select a route",
				allowClear: true,
				theme: 'bootstrap4',
				data: select2items
			});						
		}
		else {
			console.log('Server request to API/tableReadSave?table=routes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}