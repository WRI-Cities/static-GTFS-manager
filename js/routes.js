// #########################################
// Initial things to execute on page load

const route_type_options = {0:"0-Tram, Streetcar, Light rail", 1:"1-Subway, Metro", 2:"2-Rail", 3:"3-Bus",4:"4-Ferry" };

var allStops = [], sequence0=[], sequence1=[], stop_id_list =[], remaining0=[], remaining1=[], route_id_list=[], selected_route_id = '' ;

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
		{title:"route_text_color", field:"route_text_color", headerSort:false, editor:"input" }
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
		//console.log('selected', stop_id,'in sequence 0');
		mapPop(stop_id, 0);

		// to do: will have to declare this externally, after the two tables have been defined.
	},
	rowMoved:function(row){
		console.log("moved!");
		mapsUpdate();
			
	},
	rowDeselected:function(row){ //when a row is deselected
		//depopulateFields();
		map[0].closePopup();
	},
	rowDeleted:function(row) {
		sequence0 = $("#sequence-0-table").tabulator('getData');
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
		console.log("moved!");
		mapsUpdate();
		// redo the row numbering
		// $("#sequence-0-table").tabulator("redraw", true);
		// $("#sequence-1-table").tabulator("redraw", true);
		// not redoing numbering as it seems better to have it to help people know if they've messed up.
	},
	rowDeleted:function(row) {
		sequence1 = $("#sequence-1-table").tabulator('getData');
	}
});



/*
var sequenceOptionsCopy = jQuery.extend(true, {}, sequenceOptions); // deep copy of a json object. From https://stackoverflow.com/a/5164215/4355695. Simply doing var1=var2 ends up in both pointing to the same object, and tabulator tables have a problem with that.. they need separate objects as their options.

$("#sequence-0-table").tabulator(sequenceOptions);
$("#sequence-1-table").tabulator(sequenceOptionsCopy);
*/

// #########################################
// initiate bootstrap / jquery components like tabs, accordions
$( function() {
	// tabs
	$( "#tabs" ).tabs({
		active:0
	});
	// initiate accordion
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#instructions" ).accordion({
		collapsible: true, active: false
	});
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

	//.bindTooltip(idName, { className: "inSequence" }).bindPopup(idName, { className: "inSequence" });
}

// adding buttons to zoom to show all stops
L.easyButton('<span class="mapButton">&curren;</span>', function(btn, map){
	map.fitBounds(sequenceLayer[0].getBounds(), {padding:[20,20]});
}).addTo( map[0] );

L.easyButton('<span class="mapButton">&curren;</span>', function(btn, map){
	map.fitBounds(sequenceLayer[1].getBounds(), {padding:[20,20]});
}).addTo( map[1] );


//var sequence0Layer = new L.geoJson(null).bindTooltip(idName, { className: "inSequence" }).bindPopup(idName, { className: "inSequence" });
//var sequence1Layer = new L.geoJson(null).bindTooltip(idName, { className: "inSequence" }).bindPopup(idName, { className: "inSequence" });
//var remaining0Layer = new L.geoJson(null).bindTooltip(idName, { className: "notinSequence" }).bindPopup(markerAdd, { className: "notinSequence" });

function idName(layer) {
	return `${layer.properties.stop_id}: ${layer.properties.stop_name}`; //didn't know we can write strings like shell scripting!
}
function markerAdd(layer) {
	return `${layer.properties.stop_id}: ${layer.properties.stop_name}<br><button id="addSequence0">Add to sequence</button>`
}
function markerRemove(layer) {
	return `${layer.properties.stop_id}: ${layer.properties.stop_name}<br><button id="remove0" onclick="remove0(${layer.properties.stop_id})">Remove from sequence</button>`;
}

// #############################
//Run initiating commands

getPythonStops(); //load allStops array

getPythonRoutes(); // load routes.. for routes management.

// #########################################
// Listeners for button presses etc

$("#add-0").on("click", function(){
	add2sequence($('#stop2add-0').val(),0);
	$('#stop2add-0').val('');
});

$("#add-1").on("click", function(){
	add2sequence($('#stop2add-1').val(),1);
	$('#stop2add-1').val('');
});

$("#addRoute").on("click", function(){
	var route_id = $('#route2add').val();
	if(route_id.length < 2) {
		$('#routeAddStatus').text('Invalid entry, try again');
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

// #########################################
// Functions

function getPythonRoutes() {
	//load from python!
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/allRoutes`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/allRoutes .`);
			var data = JSON.parse(xhr.responseText);
			initiateRoutes(data);
		}
		else {
			console.log('Server request to API/allRoutes for all stops failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			var backup = [{"route_id":"R001","route_short_name":"R1","route_long_name":"Aluva to Maharaja College","route_type":1,"route_color":"00B7F3","route_text_color":"000000"}];
			initiateRoutes(backup);
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
			console.log('Server request to API/allStopsKeyed failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			var backup = {"ALVA":{"stop_name":"Aluva","stop_lat":10.1099,"stop_lon":76.3495,"zone_id":"ALVA","wheelchair_boarding":1},"PNCU":{"stop_name":"Pulinchudu","stop_lat":10.0951,"stop_lon":76.3466,"zone_id":"PNCU","wheelchair_boarding":1},"CPPY":{"stop_name":"CompanyPady","stop_lat":10.0873,"stop_lon":76.3428,"zone_id":"CPPY","wheelchair_boarding":1},"ATTK":{"stop_name":"Ambattukavu","stop_lat":10.0793,"stop_lon":76.3389,"zone_id":"ATTK","wheelchair_boarding":1},"MUTT":{"stop_name":"Muttom","stop_lat":10.0727,"stop_lon":76.3336,"zone_id":"MUTT","wheelchair_boarding":1},"KLMT":{"stop_name":"Kalamassery","stop_lat":10.0586,"stop_lon":76.322,"zone_id":"KLMT","wheelchair_boarding":1},"CCUV":{"stop_name":"Cusat","stop_lat":10.0467,"stop_lon":76.3182,"zone_id":"CCUV","wheelchair_boarding":1},"PDPM":{"stop_name":"Pathadipalam","stop_lat":10.0361,"stop_lon":76.3144,"zone_id":"PDPM","wheelchair_boarding":1},"EDAP":{"stop_name":"Edapally Jn.","stop_lat":10.0251,"stop_lon":76.3083,"zone_id":"EDAP","wheelchair_boarding":1},"CGPP":{"stop_name":"Changampuzha Park","stop_lat":10.0152,"stop_lon":76.3023,"zone_id":"CGPP","wheelchair_boarding":1},"PARV":{"stop_name":"Palarivattom","stop_lat":10.0064,"stop_lon":76.3048,"zone_id":"PARV","wheelchair_boarding":1},"JLSD":{"stop_name":"JLN Stadium","stop_lat":10.0002,"stop_lon":76.2989,"zone_id":"JLSD","wheelchair_boarding":1},"KALR":{"stop_name":"Kaloor","stop_lat":9.9943,"stop_lon":76.2914,"zone_id":"KALR","wheelchair_boarding":1},"LSSE":{"stop_name":"Lissie Jn","stop_lat":9.9914,"stop_lon":76.2884,"zone_id":"LSSE","wheelchair_boarding":1},"MGRD":{"stop_name":"MG Road","stop_lat":9.9834,"stop_lon":76.2823,"zone_id":"MGRD","wheelchair_boarding":1},"MACE":{"stop_name":"Maharaja College","stop_lat":9.9732,"stop_lon":76.2851,"zone_id":"MACE","wheelchair_boarding":1}};
			allStops = backup;
			stopidAutocomplete();
		}
	};
	xhr.send();
}

function stopidAutocomplete() {
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
			console.log('Server request to API/sequence for route_id ' + route_id + ' failed. Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			var backup = [
				['ALVA','PNCU','CPPY'],
				['MACE','MGRD','LSSE']
			];
			initiateSequence(backup);
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
	
	// allStops = [], sequence0=[], sequence1=[], remaining0=[], remaining1=[] ;
	// to do: look up allStops array, retrieve the stop_name for each id. Also, include population of the map also in this, similar to how its done in stops page.

	// clear the global sequence arrays to prevent loading mulitple routes. from https://stackoverflow.com/a/1232046/4355695 for optimal memory saving.
	sequence0.length=0;
	sequence1.length=0;

	for (stop in sequenceData[0]) {
		let stop_id = sequenceData[0][stop];
		let row = allStops[ stop_id ];
		row['stop_id'] = stop_id;
		sequence0.push(row);
	}
	for (stop in sequenceData[1]) {
		let stop_id = sequenceData[1][stop];
		let row = allStops[ stop_id ];
		row['stop_id'] = stop_id;
		sequence1.push(row);
	}

	$("#sequence-0-table").tabulator('setData',sequence0);
	$("#sequence-1-table").tabulator('setData',sequence1);
	mapsUpdate('firsttime'); //this would be an all-round full refresh of the maps based on the data in the global varibles.

}

/* // getting rid of this function by directly using the routes table to load sequence.
function setRouteIds() {
	// trigger this when routes table changes, and update the autocomplete in sequences (and shapes) tab directly from here.

	let data = $("#routes-table").tabulator("getData");
	route_id_list = data.map(a => a.route_id); 
	
	if ($('#routeSelector').data('uiAutocomplete')) {
		$( "#routeSelector" ).autocomplete( "destroy" );
	}
	$( "#routeSelector" ).autocomplete({
		minLength: 0,
		source: route_id_list,
		select: function( event, ui ) {
			//console.log(ui.item.value);
			let route_id = ui.item.value;
			getPythonSequence(route_id);
			// extra: show route name
			displayRouteName(route_id);
		}
	});

	// from https://stackoverflow.com/a/4604300/4355695 in combination with minLength: 0, this will list all the options when user clicks the box.
	$( "#routeSelector" ).on( "focus", function( event, ui ) {
		$(this).autocomplete("search", $(this).val());
	});	


	$( "#routeSelector" ).on( "autocompletechange", function( event, ui ) {
		preventOtherInputs(ui, '#routeSelector');
	});

}
*/

function checklatlng(lat,lon) {
	if ( typeof lat == 'number' && 
		typeof lon == 'number' &&
		lat != NaN &&
		lon != NaN ) {
		//console.log(lat,lon,'is valid');
		return true;
	}
	else {
		//console.log(lat,lon,'is not valid');
		return false;
	}
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
	console.log(`${route_id}: ${row['route_short_name']}: ${row['route_long_name']}`);
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

	var row = jQuery.extend(true, {}, allStops[stop_id]); //make a copy
	row['stop_id'] = stop_id;
	
	if(direction_id == 0) {

		//to do: check if stop already in sequence?
		
		$("#sequence-0-table").tabulator('addRow',row);
		mapsUpdate();
		$("#sequence-0-table").tabulator('selectRow',stop_id);
		sequence0 = $("#sequence-0-table").tabulator('getData');
	}
	else {
		$("#sequence-1-table").tabulator('addRow',row);
		mapsUpdate();
		$("#sequence-1-table").tabulator('selectRow',stop_id);
		sequence1 = $("#sequence-1-table").tabulator('getData');
	}
}

// ####################
// Save, send data to python server

function saveRoutes() {
	$('#routeSaveStatus').text('');

	var data=$('#routes-table').tabulator('getData');

	var pw = $("#password").val();

	console.log('sending routes table data to server via POST.');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `/API/saveRoutes?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server /API/saveRoutes, resonse received: ' + xhr.responseText);
			$('#routeSaveStatus').text('Saved changes to routes.txt.');
		} else {
			console.log('Server POST request to API/saveRoutes failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#routeSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

}

function saveSequence() {
	$('#sequenceSaveStatus').text('');

	//sequence0;
	//sequence1;
	//var selected = $("#routes-table").tabulator("getSelectedData");
	if(! selected_route_id.length) {
		$('#sequenceSaveStatus').text('Please select a route at the top table.');
		return;
	}
	//console.log(selected);
	var sequence0_list = sequence0.map(a => a.stop_id); 
	var sequence1_list = sequence1.map(a => a.stop_id); 
	
	var data=[sequence0_list, sequence1_list];
	
	var pw = $("#password").val();

	console.log('sending sequence data to server via POST: '+ JSON.stringify(data) );
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}sequence?pw=${pw}&route=${selected_route_id}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/sequence, resonse received: ' + xhr.responseText);
			$('#sequenceSaveStatus').text('Success. Message: ' + xhr.responseText);
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