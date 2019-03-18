// #########################################
// Global variables
var allStops = [];
var selected_route_id = '', globalShapesList=[], uploadedShapePrefix = '';


// #########################################
// Construct tables

$("#sequence-0-table").tabulator({
	selectable:1,
	index: 'stop_id',
	movableRows: true,
	history:true,
	movableColumns: true,
	layout:"fitDataFill",
	columns: [
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"Num", width:40, formatter: "rownum", headerSort:false}, // row numbering
		{title:"stop_id", field:"stop_id", headerFilter:"input", headerFilterPlaceholder:"filter by id", headerSort:false },
		{title:"stop_name", field:"stop_name", headerFilter:"input", headerFilterPlaceholder:"filter by name", headerSort:false },
		{formatter:"buttonCross", align:"center", title:"del", headerSort:false, cellClick:function(e, cell){
			map[0].closePopup();
			cell.getRow().delete();
			mapsUpdate();
		}}
		
	],
	rowSelected:function(row){
		var stop_id = row.getIndex();
		mapPop(stop_id, 0);
	},
	rowMoved:function(row){
		console.log("A stop has been moved in direction 0 sequence.");
		mapsUpdate();
			
	},
	rowDeselected:function(row){ //when a row is deselected
		map[0].closePopup();
	}
});

$("#sequence-1-table").tabulator({
	selectable:1,
	index: 'stop_id',
	movableRows: true,
	history:true,
	movableColumns: true,
	layout:"fitDataFill",
	columns: [
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"Num", width:40, formatter: "rownum", headerSort:false}, // row numbering
		{title:"stop_id", field:"stop_id", headerFilter:"input", headerFilterPlaceholder:"filter by id", headerSort:false },
		{title:"stop_name", field:"stop_name", headerFilter:"input", headerFilterPlaceholder:"filter by name", headerSort:false },
		{formatter:"buttonCross", width:40, align:"center", headerSort:false, cellClick:function(e, cell){
    		cell.getRow().delete();
    		mapsUpdate();
		}}
		
	],
	rowSelected:function(row){
		var stop_id = row.getIndex();
		mapPop(stop_id, 1);

		// to do: will have to declare this externally, after the two tables have been defined.
	},
	rowMoved:function(row){
		console.log("A stop has been moved in direction 1 sequence.");
		mapsUpdate();
	},
	rowDeselected:function(row){ //when a row is deselected
		map[1].closePopup();
	}
});


// #################################
/* Initiate map */
var osmLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
var MBAttrib = '&copy; ' + osmLink + ' Contributors & <a href="https://www.mapbox.com/about/maps/">Mapbox</a>';
var mapboxUrl = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';
var scenicUrl = 'https://api.mapbox.com/styles/v1/nikhilsheth/cj8rdd7wu45nl2sps9teusbbr/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibmlraGlsc2hldGgiLCJhIjoiQTREVlJuOCJ9.YpMpVVbkxOFZW-bEq1_LIw' ; 

var MBdark = L.tileLayer(mapboxUrl, {id: 'nikhilsheth.jme9hi44', attribution: MBAttrib });
var scenic0 = L.tileLayer(scenicUrl, { attribution: MBAttrib });
var scenic1 = L.tileLayer(scenicUrl, { attribution: MBAttrib });

var mapOptions0 = { 	'center': [0,0], 'zoom': 2, 'layers': scenic0, scrollWheelZoom: false };
var mapOptions1 = { 	'center': [0,0], 'zoom': 2, 'layers': scenic1, scrollWheelZoom: false };
//var mapOptionsClone = jQuery.extend(true, {}, mapOptions);

var map = [];
map[0] = new L.Map('map0', mapOptions0);
map[1] = new L.Map('map1', mapOptions1);

//$('.leaflet-container').css('cursor','crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs

L.control.scale({metric:true, imperial:false}).addTo(map[0]);
L.control.scale({metric:true, imperial:false}).addTo(map[1]);


var myRenderer = L.canvas({ padding: 0.5 });
// from https://stackoverflow.com/a/43019740/4355695 : A way to enable adding more points without crashing the browser. Will be useful in future if number of stops is above 500, 1000 or so.

var sequenceLayer = [];
for ( i in [0,1] ) {
	sequenceLayer[i] = new L.geoJson(null);
}

// initiating layers for carrying shapes
var shapeLayer = [];
for ( i in [0,1] ) {
	shapeLayer[i] = new L.geoJson(null);
	shapeLayer[i].addTo(map[i]);
}

// adding buttons to zoom to show all stops
L.easyButton('<img src="extra_files/home.png" title="show all stops">', function(btn, map){
	map.fitBounds(sequenceLayer[0].getBounds(), {padding:[40,20], maxZoom:14});
}).addTo( map[0] );

L.easyButton('<img src="extra_files/home.png" title="show all stops">', function(btn, map){
	map.fitBounds(sequenceLayer[1].getBounds(), {padding:[40,20], maxZoom:14});
}).addTo( map[1] );

// adding buttons to download shape
L.easyButton('<img src="extra_files/downloadicon.svg" title="download shape">', function(btn, map){
	download_shapefile(0);
}).addTo( map[0] );

L.easyButton('<img src="extra_files/downloadicon.svg" title="download shape">', function(btn, map){
	download_shapefile(1);
}).addTo( map[1] );


// #########################################
// Run initiating commands
$(document).ready(function() {
	getPythonStops(); //load allStops array
	//getPythonAgency(); // load agencies, for making the agency picker dropdown in routes table
	getPythonRoutes(); // load routes.. for routes management.
	getPythonAllShapesList();

});


// #########################################
// Listeners for button presses etc

$("#add-0").on("click", function(){
	add2sequence($('#stopChooser0').val(),0);
	//$('#stop2add-0').val('');
});

$("#add-1").on("click", function(){
	add2sequence($('#stopChooser1').val(),1);
	//$('#stop2add-1').val('');
});

$("#saveSequence").on("click", function(){
	saveSequence();
});

$("#flipSequenceReplace").on("click", function(){
	flipSequence(true);
});

$("#flipSequenceInsert").on("click", function(){
	flipSequence(false);
});

$("#uploadShapeButton").on("click", function(){
	uploadShape();
});

$('#shapes0List').on('change', function (e) {
	var valueSelected = this.value;
	if( valueSelected == '') { 
		shapeLayer[0].clearLayers();
		return;
	}
	loadShape(valueSelected,0);
});

$('#shapes1List').on('change', function (e) {
	var valueSelected = this.value;
	if( valueSelected == '') { 
		shapeLayer[1].clearLayers();
		return;
	}
	loadShape(valueSelected,1);
});

$('#routeSelect').on('change', function (e) {
	var valueSelected = this.value;
	console.log(valueSelected)
	if( valueSelected == '') { 
		return;
	}

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


// ##################
// MODAL
var modal = document.getElementById('myModal');
// Get the button that opens the modal
var btn = document.getElementById("openShapeModal");
// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];
// When the user clicks the button, open the modal 
btn.onclick = function() {
	if(! selected_route_id)
		$('#openShapeModalStatus').html('<small><span class="alert alert-danger">Please select a route first from the table above.</span></small>');
	else
    	modal.style.display = "block";
}
// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}
// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


// #########################################
// Functions



function getPythonStops() {
	// loading KEYED JSON of the stops.txt data, keyed by stop_id.
		let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/allStopsKeyed`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/allStopsKeyed .`);
			var data = JSON.parse(xhr.responseText);
			allStops = data;
			stopidAutocomplete();
		
		}
		else {
			console.log('Server request to API/allStopsKeyed failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function stopidAutocomplete() {
	// chosen.js autocomplete.
	var content = '<option></option>';
	for(key in allStops) {
		content += `<option value="${key}">${key}-${allStops[key]['stop_name']}</option>`;
	}
	$('#stopChooser0').html(content);
	$('#stopChooser1').html(content);
	$('#stopChooser0').chosen({search_contains:true, width:225, placeholder_text_single:'Pick a stop'});
	$('#stopChooser1').chosen({search_contains:true, width:225, placeholder_text_single:'Pick a stop'});
}

function getPythonSequence(route_id) {
	$('#sequenceLoadStatus').html('<span class="alert alert-info">Loading sequence from DB...</span>');
	// load from python.
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/sequence?route=${route_id}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/sequence for route_id ${route_id}.`);
			var response = JSON.parse(xhr.responseText);
			initiateSequence(response.data);
			$('#sequenceLoadStatus').html(response.message);
		}
		else {
			console.log('Server request to API/sequence for route_id ' + route_id + ' failed. Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
			$('#sequenceLoadStatus').html('<span class="alert alert-danger">API call failed. Please see console and debug.</span>');
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
		if( !allStops[ stop_id ] ) {
			console.log(stop_id + ' found in sequence DB but not present in the stops DB. So, skipping it.');
			continue;
		}
		let row = allStops[ stop_id ];
		row['stop_id'] = stop_id;
		sequence0.push(row);
	}
	for (stop in sequenceData[1]) {
		let stop_id = sequenceData[1][stop];
		if( !allStops[ stop_id ] ) {
			console.log(stop_id + ' found in sequence DB but not present in the stops DB. So, skipping it.');
			continue;
		}
		let row = allStops[ stop_id ];
		row['stop_id'] = stop_id;
		sequence1.push(row);
	}

	$("#sequence-0-table").tabulator('setData',sequence0);
	$("#sequence-1-table").tabulator('setData',sequence1);
	mapsUpdate('firsttime'); //this would be an all-round full refresh of the maps based on the data in the global varibles.

}

function mapsUpdate(timeflag='normal') {
	// read the tabulator tables:
	var data = [];

	for (j in [0,1]) {
		data[j] = $(`#sequence-${j}-table`).tabulator("getData");
		sequenceLayer[j].clearLayers();

		// check and skip if empty sequence. And note, one sequence may be filled while other is empty.
		if( ! data[j].length ) continue;

		for (i in data[j]) {
			let lat = parseFloat( data[j][i]['stop_lat'] );
			let lon = parseFloat( data[j][i]['stop_lon'] );
			if( ! checklatlng(lat,lon) ) {
				continue;
			}
			//let stopmarker = L.circleMarker([lat,lon], sequenceStyle);
			let stopmarker = L.marker([lat,lon], { 
				icon: L.divIcon({
					className: `sequence-${j}-divicon`,
					iconSize: [20, 20],
					html: ( parseInt(i)+1 )
				}) 
			})
			.bindTooltip(data[j][i]['stop_id'] + ':' + data[j][i]['stop_name'])
			.on('click', function(e) {
				markerOnClick(e);
			});

			stopmarker.properties = data[j][i]; // transfer all properties of stop row to marker
			stopmarker.properties['sequence'] = j; // store which sequence table/map the marker belongs to, within the marker itself via an additional property. So that the value can be passed on in the .on('click') function.

			stopmarker.addTo(sequenceLayer[j]);
		}

		map[j].fitBounds(sequenceLayer[j].getBounds(), {padding:[40,20], maxZoom:14}); 
		if(timeflag == 'firsttime') {
			sequenceLayer[j].addTo(map[j]);
		}

		// redo the row numbering, in case stops have been moved.
		$(`#sequence-${j}-table`).tabulator("redraw", true);
		// to check: maybe this belongs elsewhere? -> No, the tabulators call this function when rows are moved. It's fine.
	}
}
	

// ##############################
/* Interlinking between table and map */

function mapPop(stop_id, i=0) {
	sequenceLayer[i].eachLayer( function(layer) {
    	if(layer.properties && (layer.properties.stop_id == stop_id) ) {
			layer.bindPopup(function (layer) {
				return layer.properties.stop_id + ': ' + layer.properties.stop_name;
			});
			layer.openPopup();
			// decideZoom = map[i].getZoom() > 13 ? 16 : 13; // if zoomed in more, take it to 16. Else if very much out, zoom in to 13.
			decideZoom = map[i].getZoom();
			map[i].flyTo(layer.getLatLng(), decideZoom, {duration:1, animate:true});
		}
	});
}

function markerOnClick(e) {
	let stop_id = e.target.properties.stop_id;
	let seq = e.target.properties.sequence;

	var row = $('#sequence-'+seq+'-table').tabulator("getRow", stop_id);
	row.scrollTo();
	row.toggleSelect();
	/*
	// load editing and deleting panes too
	$( "#targetStopid" ).val(stop_id);
	populateFields(stop_id);
	$( "#stop2delete" ).val(stop_id);
	*/
}


function add2sequence(stop_id, direction_id=0) {
	if(stop_id == '') {
		console.log('Invalid stop_id. Not adding!');
		return false;
	}
	console.log('add2sequence function: Adding stop_id ' + stop_id + ' to direction ' + direction_id);

	var row = jQuery.extend(true, {}, allStops[stop_id]); //make a copy
	row['stop_id'] = stop_id;

	if(direction_id == 0) {
		$("#sequence-0-table").tabulator('addRow',row);
		mapsUpdate('firsttime'); // using firsttime as on new routes, on adding a stop, it needs to show on the map. Else it is staying invisible.
	}
	else {
		$("#sequence-1-table").tabulator('addRow',row);
		mapsUpdate('firsttime');
	}
}

// ####################
// Save, send data to python server
function saveSequence() {
	$('#sequenceSaveStatus').html('<span class="alert alert-info">Saving sequence to DB, please wait...</span>');

	// forget global sequences, retrieve latest sequence data straight from tables.
	var sequence0 = $("#sequence-0-table").tabulator('getData');
	var sequence1 = $("#sequence-1-table").tabulator('getData');
	
	//var selected = $("#routes-table").tabulator("getSelectedData");
	if(! selected_route_id.length) {
		$('#sequenceSaveStatus').html('Please select a route at the top table.');
		return;
	}
	var sequence0_list = sequence0.map(a => a.stop_id); 
	var sequence1_list = sequence1.map(a => a.stop_id); 
	
	var data=[sequence0_list, sequence1_list];

	var chosenShape0 = $('#shapes0List').val();
	var chosenShape1 = $('#shapes1List').val();
	if( ! ( chosenShape0.length && chosenShape1.length )) {
		if(! confirm('Are you sure you don\'t want to save any shape for the onward and/or return journey direction of this route?\nPress OK to proceed, Cancel to go back and set the shapes first.') )
			return;
	}
	
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#sequenceSaveStatus').html('Please enter the password.');
		shakeIt('password'); return;
	}

	console.log('sending sequence data to server API/sequence via POST: '+ JSON.stringify(data) );
	console.log('Also sending chosen shapes: ',chosenShape0,chosenShape1);
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}sequence?pw=${pw}&route=${selected_route_id}&shape0=${chosenShape0}&shape1=${chosenShape1}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/sequence, resonse received: ' + xhr.responseText);
			$('#sequenceSaveStatus').html('<span class="alert alert-success">Success: ' + xhr.responseText + '</span>');
			uploadedShapePrefix = ''; // clearing uploaded shape global variable if any.
			
			console.log('Re-firing getPythonAllShapesList function after saving sequence to DB.');
			getPythonAllShapesList();
			mapsUpdate();

		} else {
			console.log('Server POST request to API/sequence failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#sequenceSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText + '</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
	
}	

function flipSequence(overwrite=false) {
	// flips the onward journey's sequence and inserts it into the return journey sequence. 
	//If there are stops already listed, then they will be pushed below or over-written depending on the overwrite flag.

	var onward = $("#sequence-0-table").tabulator('getData');
	
	if(overwrite) $("#sequence-1-table").tabulator('setData',[]);
	
	for (i in onward) {
		$("#sequence-1-table").tabulator("addData", onward[i], true);
		// inserting into return sequence table at top, in effect reversing the onward sequence.
	}
	mapsUpdate('firsttime');
	//$("#sequence-1-table").tabulator('addRow',row);
}

function clearSequences() {
	$("#sequence-0-table").tabulator('setData',[]);
	$("#sequence-1-table").tabulator('setData',[]);
	// ah we have a reset function. let's reset some more things
	$("#sequenceSaveStatus").html('');

}

function getPythonAllShapesList() {
	
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}allShapesList`, function( data ) {
		globalShapesList =  JSON.parse(data) ;
		console.log('GET request to API/allShapesList succesful.');
		// console.log('globalShapesList: ' + JSON.stringify(globalShapesList) );
		if(selected_route_id) {
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
	.fail( function() {
		console.log('GET request to API/allShapesList failed.')
	});
	
}

function getPythonShapesList(route_id) {
	$('#shapes0List').html('');
	$('#shapes1List').html('');
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}shapesList?route=${route_id}`, function( data ) {
		var shapes =  JSON.parse(data) ;
		console.log('GET request to API/shapesList succesful.');
		populateShapesLists(shapes);
	})
	.fail( function() {
		console.log('GET request to API/shapesList failed.')
	});
}

function populateShapesLists(shapes) {
	//use globalShapesList
	// use selected_route_id

	// clearing the shape layers
	shapeLayer[0].clearLayers(); 
	shapeLayer[1].clearLayers(); 

	if(! selected_route_id.length) return; //quietly exit if no route selected.

	var allShapesList = globalShapesList['all']; //global variable
	var thisRouteSaved = globalShapesList['saved'][selected_route_id];

	// direction 0:
	var content = '<option value="">No Shape</option>';
	var alreadySelected = false;
	var shapesSoFar = [];

	// check if there's just been a shape uploaded
	if( uploadedShapePrefix.length ) {
		content += `<option value="${uploadedShapePrefix}_0"  selected="selected">^ ${uploadedShapePrefix}_0</option>`;
			alreadySelected = true;
			shapesSoFar.push(uploadedShapePrefix + '_0');
			// load up the shape from backend
			loadShape(uploadedShapePrefix+'_0',0);
	}
	if( thisRouteSaved ) {
		if( thisRouteSaved[0]) {
			if(! alreadySelected ) {
				selectFlag = ' selected="selected"';
				alreadySelected = true;
			}
			else selectFlag = '';
			content += `<option value="${thisRouteSaved[0]}" ${selectFlag}>&#10004;${thisRouteSaved[0]}</option>`;
			shapesSoFar.push(thisRouteSaved[0]);
			loadShape(thisRouteSaved[0],0);
		}
	}
	for (i in shapes[0]) {
		// selectFlag = ( ( !alreadySelected && i==0) ? ' selected="selected"' : '');
		selectFlag = '';

		if( shapesSoFar.indexOf(shapes[0][i]) < 0 ) {
			content += `<option value="${shapes[0][i]}"${selectFlag}># ${shapes[0][i]}</option>`;
			shapesSoFar.push(shapes[0][i]);
		}
	}
	for(i in allShapesList) {
		if( shapesSoFar.indexOf(allShapesList[i]) < 0 ) 
			content += `<option value="${allShapesList[i]}">${allShapesList[i]}</option>`;
	}

	$('#shapes0List').html(content);
	$('#shapes0List').trigger('chosen:updated'); // need to check if this errors on first run when .chosen not initialized yet.
	//fire chosen autocomplete after populating. 
	$('#shapes0List').chosen({disable_search_threshold: 1, search_contains:true, width:100});

	//#######################
	// direction 1:
	var content = '<option value="">No Shape</option>';
	var alreadySelected = false;
	var shapesSoFar = [];

	// check if there's just been a shape uploaded
	if( uploadedShapePrefix.length ) {
		content += `<option value="${uploadedShapePrefix}_1"  selected="selected">^ ${uploadedShapePrefix}_1</option>`;
			alreadySelected = true;
			shapesSoFar.push(uploadedShapePrefix + '_1');
			loadShape(uploadedShapePrefix+'_1',1);
	}

	if( thisRouteSaved ) {
		if( thisRouteSaved[1]) {
			if(! alreadySelected ) {
				selectFlag = ' selected="selected"';
				alreadySelected = true;
			}
			else selectFlag = '';
			content += `<option value="${thisRouteSaved[1]}"${selectFlag}>&#10004; ${thisRouteSaved[1]}</option>`;
			alreadySelected = true;
			shapesSoFar.push(thisRouteSaved[1]);
			loadShape(thisRouteSaved[1],1);
		}
	}
	for (i in shapes[1]) {
		// selectFlag = ( ( !alreadySelected && i==0) ? ' selected="selected"' : '');
		selectFlag = '';

		if( shapesSoFar.indexOf(shapes[1][i]) < 0 ) {
			content += `<option value="${shapes[1][i]}"${selectFlag}># ${shapes[1][i]}</option>`;
			shapesSoFar.push(shapes[1][i]);
		}
	}
	for(i in allShapesList) {
		if( shapesSoFar.indexOf(allShapesList[i]) < 0 ) 
			content += `<option value="${allShapesList[i]}">${allShapesList[i]}</option>`;
	}

	$('#shapes1List').html(content);
	$('#shapes1List').trigger('chosen:updated');

	//fire chosen autocomplete after populating.
	$('#shapes1List').chosen({disable_search_threshold: 1, search_contains:true, width:100});

}

//###############

function uploadShape() {
	$('#uploadShapeStatus').html('');
	// make POST request to API/XMLUpload

	// idiot-proofing: check if the files have been uploaded or not.
	// alert( ""==f.value ? "nothing selected" : "file selected");
	// from https://stackoverflow.com/a/1417489/4355695
	if( $('#uploadShape0').val() == '' ) {
		$('#uploadShapeStatus').html('Please select a file to upload! ;)');
		shakeIt('uploadShape0');
		return;
	}

	var pw = $("#password").val();
	if ( ! pw ) { 
		shakeIt('password'); 
		$('#uploadShapeStatus').html('Please enter the password.');
		return;
	}
	var route_id = selected_route_id;
	var shape_id_prefix = $("#uploadShapeId").val().replace(/[^A-Za-z0-9-_]/g, "");
	$("#uploadShapeId").val(shape_id_prefix);

	if(! shape_id_prefix.length) {
		$('#uploadShapeStatus').html('Please enter a proper shape id.');
		shakeIt('uploadShapeId');
		return;
	}

	if( globalShapesList['all'].indexOf(shape_id_prefix+'_0') > -1 || globalShapesList['all'].indexOf(shape_id_prefix+'_1') > -1 ) {
		//$('#uploadShapeStatus').html('Please choose some other id, this one\'s taken.');
		if( !confirm('The shape_id\'s:\n' + shape_id_prefix+'_0 and/or ' + shape_id_prefix+'_1\n..already exist in the shapes DB.\nAre you SURE you want to replace an existing shape?') ) {
				$("#uploadShapeId").val('');
				return;
		}
	}

	$('#uploadShapeStatus').html( 'Uploading file(s), please wait.. ');

	var reverseFlag = $('#reverseCheck').is(':checked');
	
	var formData = new FormData();
	formData.append('uploadShape0', $('#uploadShape0')[0].files[0] );
	
	if(reverseFlag) {
		if ($('#uploadShape1').val() != '') {
			formData.append('uploadShape1', $('#uploadShape1')[0].files[0] );
		}
		else {
			$('#uploadShapeStatus').html('Please select the file for reverse direction, or check off that box.');
			shakeIt('uploadShape1');
			shakeIt('reverseCheck');
			return;
		}
	}
		
	
	$.ajax({
		url : `${APIpath}shape?pw=${pw}&route=${route_id}&id=${shape_id_prefix}&reverseFlag=${reverseFlag}`,
		type : 'POST',
		data : formData,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success : function(returndata) {
			console.log('API/shape POST request with file upload successfully done.');
			$('#openShapeModalStatus').html('<span class="alert alert-success">Upload successful. ' + returndata + '</span>');
			//exit modal.
			uploadedShapePrefix = shape_id_prefix; //assign to global variable
			modal.style.display = "none";
			getPythonAllShapesList();
			
		},
		error: function(jqXHR, exception) {
			console.log('API/shape POST request failed.')
			$('#uploadShapeStatus').html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>' );
		}
	});
	
}

function loadShape(shape_id, whichMap) {
		// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}shape?shape=${shape_id}`, function( data ) {
		var shapeArray =  JSON.parse(data) ;
		console.log('GET request to API/shape succesful.');
		drawShape(shapeArray, whichMap);
	})
	.fail( function() {
		console.log('GET request to API/shape failed.')
	});
}

function drawShape(shapeArray, whichMap) {
	shapeLayer[whichMap].clearLayers(); // clearing the layer
	
	//var lineColor = ( whichMap==0? '#990000': '#006600');
	var lineColor = ( whichMap==0? 'purple': 'blue'); //switching the markers' colors
	var latlngs = [];
	shapeArray.forEach(function(row){
			latlngs.push([ row['shape_pt_lat'], row['shape_pt_lon'] ]);
		});
	var shapeLine = L.polyline.antPath(latlngs, {color: lineColor, weight:5}).addTo(shapeLayer[whichMap]);
	map[whichMap].fitBounds(shapeLine.getBounds(), {padding:[40,20], maxZoom:14});
	

}

function download_shapefile(direction=0) {
	filename = $(`#shapes${direction}List`).val();
	if(!filename.length) {
		console.log(`Direction ${direction}: no shape selected.`);
		return;
	}
	filename += '.geojson';
	var contentString = JSON.stringify(shapeLayer[direction].toGeoJSON(), null, 2);
	
	// Adapted from https://stackoverflow.com/a/35251739/4355695
	var mime_type = "text/plain";
	var dlink = document.createElement('a');
	dlink.download = filename;
	var blob = new Blob([contentString], {type: mime_type});
	dlink.href = window.URL.createObjectURL(blob);
	dlink.onclick = function(e) {
	// revokeObjectURL needs a delay to work properly
	var that = this;
	setTimeout(function() {
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
			
			// populating route select for sequence:
			var dropdown = '<option value="">Select a route</option>';
			dropdown += '<option value="">{id}: {short name}: {long name}</option>';
			data.forEach(function(row){
				let title = `${row['route_id'] || ''}: ${row['route_short_name'] || ''}: ${row['route_long_name'] || ''}`;
				dropdown += '<option value="' + row['route_id'] + '">' + title + '</option>';
			});

			$("#routeSelect").html(dropdown);
			$('#routeSelect').trigger('chosen:updated'); // update if re-populating
			$('#routeSelect').chosen({disable_search_threshold: 1, search_contains:true, width:300});

		}
		else {
			console.log('Server request to API/tableReadSave?table=routes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

/* Discarded functions 

$("#addRoute").on("click", function(){
	var agency_id = $('#agencySelect').val().replace(/[^A-Za-z0-9-_.]/g, "");
	if(! agency_id.length) return;
	let data = $("#routes-table").tabulator("getData");
	route_id_list = data.map(a => a.route_id); 

	var counter = 1;
	while ( route_id_list.indexOf(agency_id + pad(counter) ) > -1 ) counter++;

	var route_id = agency_id + pad(counter);
	
	console.log(route_id);

	$("#routes-table").tabulator('addRow',{route_id: route_id, agency_id:agency_id, route_short_name:route_id},true);
	$('#route2add').val('');
	$('#routeAddStatus').html('Route added with id ' + route_id + '. Fill its info in the table and then save changes.');
});

$("#route-undo").on("click", function(){
	$("#routes-table").tabulator('undo');
	
});
$("#route-redo").on("click", function(){
	$("#routes-table").tabulator('redo');
	
});

$("#saveRoutes").on("click", function(){
	saveRoutes();
});

###############
map line arrows:
// removing arrows as they were conflicting with the animation antPath that was brought in later.
	var spacer = Array(5).join(" "); // repeater. from https://stackoverflow.com/a/1877479/4355695
	shapeLine.setText(spacer+'►'+spacer, {repeat: true,
		offset: 5,
		attributes: {'font-weight': 'bold',
			'font-size': '14', 'fill':lineColor}
		}
	); // arrows! https://github.com/makinacorpus/Leaflet.TextPath/tree/gh-pages

function getPythonAgency() {
	//to do: load agencies info, and store it in a global variable.
	// for routes table, set a function for picking agency.
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}agency`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded agency data from Server API/agency .`);
			var data = JSON.parse(xhr.responseText);
			var dropdown = '<option value="">Select agency</option>'
			var selectedFlag = false;
			data.forEach(function(row){
				agencyListGlobal[''] = '(None)';
				agencyListGlobal[row['agency_id']] = row['agency_id'] + ': ' + row['agency_name'];
				var select = '';
				if(!selectedFlag) {
					select = '  selected="selected"'; selectedFlag = true;
				}
				dropdown += '<option value="' + row['agency_id'] + '"' + select + '>' + row['agency_id'] + ': ' + row['agency_name'] + '</option>';
			});
			$('#agencySelect').html(dropdown);
			$('#agencySelect').trigger('chosen:updated');
			$('#agencySelect').chosen({disable_search_threshold: 1, search_contains:true, width:200});

		}
		else {
			console.log('Server request to API/agency failed.  Returned status of ' + xhr.status);
		}
	};
	xhr.send();
}

function saveRoutes() {
	$('#routeSaveStatus').html('');

	var data=$('#routes-table').tabulator('getData');

	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#routeSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	console.log('sending routes table data to server API/saveRoutes via POST.');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}routes?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API routes, resonse received: ' + xhr.responseText);
			$('#routeSaveStatus').html('<span class="alert alert-success">Saved changes to routes DB.</span>');
			// reload routes data from DB, and repopulate route selector for sequence
			$("#routes-table").tabulator("setData");
		} else {
			console.log('Server POST request to routes failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#routeSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText + '</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

}
*/