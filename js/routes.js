// #########################################
// Initial things to execute on page load
const shapeAutocompleteOptions = {disable_search_threshold: 1, search_contains:true, width:100};

const stopAutocompleteOptions = {disable_search_threshold: 4, search_contains:true, width:225, placeholder_text_single:'Pick a stop'};

var allStops = [], stop_id_list =[], remaining0=[], remaining1=[], route_id_list=[], selected_route_id = '', globalShapesList=[];

// #########################################
// Construct tables

$("#routes-table").tabulator({
	selectable:1,
	index: 'route_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",

	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"Num", width:40, formatter: "rownum",  frozen:true,}, // row numbering
		{title:"route_id", field:"route_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", validator:["string", "minLength:2"] },
		{title:"route_short_name", field:"route_short_name", editor:"input", headerFilter:"input", headerFilterPlaceholder:"filter by name", validator:["required","string", "minLength:2"] },
		{title:"route_long_name", field:"route_long_name", editor:"input", headerFilter:"input", headerFilterPlaceholder:"filter by name" },
		{title:"route_type", field:"route_type", editor:"select", editorParams:route_type_options, headerSort:false },
		{title:"route_color", field:"route_color", headerSort:false, editor:"input" },
		{title:"route_text_color", field:"route_text_color", headerSort:false, editor:"input" },
		{title:"agency_id", field:"agency_id", headerSort:false, editor:"input", tooltip:"Needed to fill when there is more than one agency." }
	],
	cellEdited:function(cell){
		// discarding as now we'll directly trigger routes selection from this table
		//setRouteIds(); // refresh the autocomplete for route picker
	},
	rowSelected:function(row){ //when a row is selected
		let route_id = row.getIndex();
		// clear present sequence tables.. passing to a function to handle "save changes" action later.
		clearSequences();
		// execute function to load corresponding route's sequence(s)
		getPythonSequence(route_id);
		displayRouteName(route_id);
		selected_route_id = route_id;
		getPythonShapesList(route_id);
		$('#openShapeModalStatus').html('');
	},
	rowDeselected:function(row){ //when a row is deselected
		//to do: clear out sequence? naah, let it be till another route gets selected!
		/*
		$( "#routeSelector" ).val('');
		sequenceLayer[0].clearLayers();
		sequenceLayer[1].clearLayers();
		$("#sequence-0-table").tabulator('setData',[] );
		$("#sequence-1-table").tabulator('setData',[] );
		*/
	}
});

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
		//depopulateFields();
		map[0].closePopup();
	}/*,

	rowDeleted:function(row) {
		//sequence0 = $("#sequence-0-table").tabulator('getData');
	}*/
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
		console.log("A stop has been moved in direction 0 sequence.");
		mapsUpdate();
		// redo the row numbering
		// $("#sequence-0-table").tabulator("redraw", true);
		// $("#sequence-1-table").tabulator("redraw", true);
		// not redoing numbering as it seems better to have it to help people know if they've messed up.
	}/*,
	rowDeleted:function(row) {
		//sequence1 = $("#sequence-1-table").tabulator('getData');
	}*/
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

//var scenicClone = jQuery.extend(true, {}, scenic);

var mapOptions0 = { 	'center': [0,0], 'zoom': 2, 'layers': scenic0, scrollWheelZoom: false };
var mapOptions1 = { 	'center': [0,0], 'zoom': 2, 'layers': scenic1, scrollWheelZoom: false };
//var mapOptionsClone = jQuery.extend(true, {}, mapOptions);

const startLocation = [10.030259357021862, 76.31446838378908];

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

// adding buttons to zoom to show all stops
L.easyButton('<span class="mapButton" title="zoom to see all stops">&curren;</span>', function(btn, map){
	map.fitBounds(sequenceLayer[0].getBounds(), {padding:[20,20]});
}).addTo( map[0] );

L.easyButton('<span class="mapButton" title="zoom to see all stops">&curren;</span>', function(btn, map){
	map.fitBounds(sequenceLayer[1].getBounds(), {padding:[20,20]});
}).addTo( map[1] );

// initiating layers for carrying shapes
var shapeLayer = [];
for ( i in [0,1] ) {
	shapeLayer[i] = new L.geoJson(null);
	shapeLayer[i].addTo(map[i]);
}

// #########################################
// initiate bootstrap / jquery components like tabs, accordions
$(document).ready(function() {
	// tabs
	$( "#tabs" ).tabs({
		active:0
	});
	// popover
	$('[data-toggle="popover"]').popover(); 

	// initiate accordion
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#instructions" ).accordion({
		collapsible: true, active: false
	});

	//############
	//Run initiating commands
	getPythonStops(); //load allStops array
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

$("#addRoute").on("click", function(){
	var route_id = $('#route2add').val();
	if(route_id.length < 2) {
		$('#routeAddStatus').text('Invalid entry, try again');
		shakeIt('route2add');
		return;
	}

	let data = $("#routes-table").tabulator("getData");
	route_id_list = data.map(a => a.route_id); 

	//var index = ;
	if ( route_id_list.indexOf(route_id) > -1) {
	    $('#routeAddStatus').text('This id is already taken. Try another value.');
	    return;
	}
	$("#routes-table").tabulator('addRow',{route_id: route_id},true);
	$('#route2add').val('');
	$('#routeAddStatus').text('Route added with id ' + route_id + '. Fill its info in the table and then save changes.');
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
	var optionSelected = $("option:selected", this);
	var valueSelected = this.value;
	if( valueSelected == '') { 
		shapeLayer[0].clearLayers();
		return;
	}
	loadShape(valueSelected,0);
});

$('#shapes1List').on('change', function (e) {
	var optionSelected = $("option:selected", this);
	var valueSelected = this.value;
	if( valueSelected == '') { 
		shapeLayer[1].clearLayers();
		return;
	}
	loadShape(valueSelected,1);
});

// #########################################
// auto-capitalize inputs
$("#stop2add-0").bind("change keyup", function(){
	this.value=this.value.toUpperCase();
});

$("#stop2add-1").bind("change keyup", function(){
	this.value=this.value.toUpperCase();
});

$("#route2add").bind("change keyup", function(){
	this.value=this.value.toUpperCase();
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

function getPythonRoutes() {
	//load from python!
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/allRoutes`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`GET call to Server API/allRoutes succesful.`);
			var data = JSON.parse(xhr.responseText);
			initiateRoutes(data);
		}
		else {
			console.log('Server request to API/allRoutes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

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
	/*
	stop_id_list = Object.keys(allStops); //get all keys, in this case, stop_id's. from https://stackoverflow.com/a/3068720/4355695

	if ($('.stop_id').data('uiAutocomplete')) {
		$( ".stop_id" ).autocomplete( "destroy" );
	}
	$( ".stop_id" ).autocomplete({
		minLength: 0, delay: 500,
		// source: stop_id_list
		source: function(request, response) {
		// limit results, to prevent browser hangups in large db situations
		// from https://stackoverflow.com/a/7617637/4355695
		var results = $.ui.autocomplete.filter(stop_id_list, request.term);
		response(results.slice(0, 5));
		}
	});

	$( ".stop_id" ).on( "autocompletechange", function( event, ui ) {
		preventOtherInputs(ui, '.stop_id');
	});

	//making list appear without having to start typing
	$( ".stop_id" ).on( "focus", function( event, ui ) {
		$(this).autocomplete("search", $(this).val());
	});	
	*/
	//############################
	// Trying chosen.js autocomplete.
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
	// load from python.
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/sequence?route=${route_id}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/sequence for route_id ${route_id}.`);
			var data = JSON.parse(xhr.responseText);
			initiateSequence(data);
		}
		else {
			console.log('Server request to API/sequence for route_id ' + route_id + ' failed. Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function initiateRoutes(routesData) {
	
	// Load the data
	$("#routes-table").tabulator('setData',routesData);

	//setRouteIds(); //initiate the autocomplete for route picker
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

		if(timeflag == 'firsttime') {
			sequenceLayer[j].addTo(map[j]);
			map[j].fitBounds(sequenceLayer[j].getBounds(), {padding:[20,20]}); 
		}

		// redo the row numbering
		$(`#sequence-${j}-table`).tabulator("redraw", true);
		// $("#sequence-1-table").tabulator("redraw", true);
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
			decideZoom = map[i].getZoom() > 13 ? 16 : 13; // if zoomed in more, take it to 16. Else if very much out, zoom in to 13.
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

function displayRouteName(route_id) {
	var row = $("#routes-table").tabulator("getRow", route_id).getData();
	$("#displayRouteName").html(`${row['route_short_name']}: ${row['route_long_name']}`);
}


// discarded for now.
function moveAround( stop_id, direction_id, provision=true ) {
	// provision will be true if the stop is to be "provisioned" ie added to the sequence; false if to be removed.
	/* Splice method, From https://stackoverflow.com/a/5767357/4355695 
	var array = [2, 5, 9];
	var index = array.indexOf(5);
	if (index > -1) {
	    array.splice(index, 1);
	}
	*/

	// After all is said and done,
	mapsUpdate();
	// and so the maps reflect the global data arrays, not the other way around.
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

		//to do: check if stop already in sequence?
		
		$("#sequence-0-table").tabulator('addRow',row);
		mapsUpdate();
		$("#sequence-0-table").tabulator('selectRow',stop_id);
		//sequence0 = $("#sequence-0-table").tabulator('getData');
	}
	else {
		$("#sequence-1-table").tabulator('addRow',row);
		mapsUpdate();
		$("#sequence-1-table").tabulator('selectRow',stop_id);
		//sequence1 = $("#sequence-1-table").tabulator('getData');
	}
}

// ####################
// Save, send data to python server

function saveRoutes() {
	$('#routeSaveStatus').html('');

	var data=$('#routes-table').tabulator('getData');

	var pw = $("#password").val();
	if ( ! pw.length ) { 
		$('#routeSaveStatus').html('Please enter the password.');
		shakeIt('password'); return;
	}

	console.log('sending routes table data to server API/saveRoutes via POST.');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}saveRoutes?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/saveRoutes, resonse received: ' + xhr.responseText);
			$('#routeSaveStatus').text('Saved changes to routes.txt.');
		} else {
			console.log('Server POST request to API/saveRoutes failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#routeSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

}

function saveSequence() {
	$('#sequenceSaveStatus').html('Saving sequence to DB, please wait...');

	// forget global sequences, retrieve latest sequence data straight from tables.
	var sequence0 = $("#sequence-0-table").tabulator('getData');
	var sequence1 = $("#sequence-1-table").tabulator('getData');
	
	//var selected = $("#routes-table").tabulator("getSelectedData");
	if(! selected_route_id.length) {
		$('#sequenceSaveStatus').text('Please select a route at the top table.');
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
	if ( ! pw.length ) { 
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
			$('#sequenceSaveStatus').html('Success. Message: ' + xhr.responseText);
			console.log('Re-firing getPythonAllShapesList function after saving sequence to DB.');
			getPythonAllShapesList();
			mapsUpdate();

		} else {
			console.log('Server POST request to API/sequence failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#sequenceSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
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
}

function getPythonAllShapesList() {
	
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}allShapesList`, function( data ) {
		globalShapesList =  JSON.parse(data) ;
		console.log('GET request to API/allShapesList succesful.');
		console.log('globalShapesList: ' + JSON.stringify(globalShapesList) );
		if(selected_route_id) {
			console.log('Re-firing selection of route ' + selected_route_id + ' from getPythonAllShapesList function to update shape dropdowns.')
			$("#routes-table").tabulator("selectRow",selected_route_id);
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
		console.log(shapes);
		populateShapesLists(shapes);
	})
	.fail( function() {
		console.log('GET request to API/shapesList failed.')
	});
}

function populateShapesLists(shapes) {
	//use globalShapesList
	// use selected_route_id
	
	var allShapesList = globalShapesList['all']; //global variable
	var thisRouteSaved = globalShapesList['saved'][selected_route_id];

	// direction 0:
	var content = '<option value="">No Shape</option>';
	var alreadySelected = false;
	var shapesSoFar = [];

	if( thisRouteSaved ) {
		if( thisRouteSaved[0]) {
			content += `<option value="${thisRouteSaved[0]}"  selected="selected">${thisRouteSaved[0]} &#10004;</option>`;
			alreadySelected = true;
			shapesSoFar.push(thisRouteSaved[0]);
		}
	}
	for (i in shapes[0]) {
		selectFlag = ( ( !alreadySelected && i==0) ? ' selected="selected"' : '');
		
		if( shapesSoFar.indexOf(shapes[0][i]) < 0 ) {
			content += `<option value="${shapes[0][i]}"${selectFlag}>${shapes[0][i]} #</option>`;
			shapesSoFar.push(shapes[0][i]);
		}
	}
	for(i in allShapesList) {
		if( shapesSoFar.indexOf(allShapesList[i]) < 0 ) 
			content += `<option value="${allShapesList[i]}">${allShapesList[i]}</option>`;
	}

	$('#shapes0List').html(content);
	$('#shapes0List').trigger('change');
	//fire chosen autocomplete after populating.
	$('#shapes0List').chosen(shapeAutocompleteOptions);

	// direction 1:
	var content = '<option value="">No Shape</option>';
	var alreadySelected = false;
	var shapesSoFar = [];

	if( thisRouteSaved ) {
		if( thisRouteSaved[1]) {
			content += `<option value="${thisRouteSaved[1]}"  selected="selected">${thisRouteSaved[1]} &#10004;</option>`;
			alreadySelected = true;
			shapesSoFar.push(thisRouteSaved[1]);
		}
	}
	for (i in shapes[1]) {
		selectFlag = ( ( !alreadySelected && i==0) ? ' selected="selected"' : '');
		
		if( shapesSoFar.indexOf(shapes[1][i]) < 0 ) {
			content += `<option value="${shapes[1][i]}"${selectFlag}>${shapes[1][i]} #</option>`;
			shapesSoFar.push(shapes[1][i]);
		}
	}
	for(i in allShapesList) {
		if( shapesSoFar.indexOf(allShapesList[i]) < 0 ) 
			content += `<option value="${allShapesList[i]}">${allShapesList[i]}</option>`;
	}

	$('#shapes1List').html(content);
	$('#shapes1List').trigger('change');

	//fire chosen autocomplete after populating.
	$('#shapes1List').chosen(shapeAutocompleteOptions);

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
	if ( ! pw.length ) { 
		shakeIt('password'); 
		$('#uploadShapeStatus').html('please enter the password.');
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
			$('#uploadShapeStatus').html("Upload successful." + returndata);
			//exit modal.
			modal.style.display = "none";
			getPythonAllShapesList();
			
		},
		error: function(jqXHR, exception) {
			console.log('API/shape POST request failed.')
			$('#uploadShapeStatus').text( jqXHR.responseText );
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
	var shapeLine = L.polyline(latlngs, {color: lineColor, weight:2, interactive:true}).addTo(shapeLayer[whichMap]);
	map[whichMap].fitBounds(shapeLine.getBounds());
	
	var spacer = Array(5).join(" "); // repeater. from https://stackoverflow.com/a/1877479/4355695
	shapeLine.setText(spacer+'►'+spacer, {repeat: true,
		offset: 5,
		attributes: {'font-weight': 'bold',
			'font-size': '14', 'fill':lineColor}
		}
	); // arrows! https://github.com/makinacorpus/Leaflet.TextPath/tree/gh-pages
}

