//const stopsfile = 'GTFS/stops.txt';
const UID_leastchars = 4;
const UID_maxchars = 8;


// #################################
/* 2. Tabulator initiation */

//create Tabulator on DOM element with id "stops-table"
$("#stops-table").tabulator({
	selectable:1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	index: "stop_id", 
	history:true,
	layout:"fitDataFill",
	addRowPos: "top",
	columns:[ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"stop_id", field:"stop_id", frozen:true, headerFilter:"input", validator:["string", "minLength:3"] },
		{title:"stop_name", field:"stop_name", editor:"input", headerFilter:"input", validator:["required","string", "minLength:3"] },
		{title:"stop_lat", field:"stop_lat", headerSort:false },
		{title:"stop_lon", field:"stop_lon", headerSort:false },
		{title:"zone_id", field:"zone_id", editor:"input", validator:["string", "minLength:3"] },
		{title:"wheelchair_boarding", field:"wheelchair_boarding", editor:"select", editorParams:{0:"No (0)", 1:"Yes (1)"}, headerSort:false }
	],
	rowSelected:function(row){ //when a row is selected
		//console.log("Row " + row.getData().stop_id + " Clicked, index: " + row.getIndex() );
		mapPop(row.getData().stop_id);
	},
	rowDeselected:function(row){ //when a row is deselected
		depopulateFields();
		map.closePopup();
	},
	historyUndo:function(action, component, data){
		var message = '';
		/*
		console.log(action);
		console.log(component);
		console.log(data);
		*/
		if(action == 'cellEdit') {
			message = 'Undid cellEdit for ' + component.cell.row.data.stop_id + ', ' + JSON.stringify(data);
			reloadData();
			mapPop(component.cell.row.data.stop_id);
		}
		else if(action == 'rowDelete') {
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
	},
	cellEditing:function(cell){
		// pop up the stop on the map when user starts editing
		mapPop(cell.getRow().getData().stop_id);
	},
	cellEdited:function(cell){
		// on editing a cell, display updated info 
		reloadData();
		var stop_id = cell.getRow().getData().stop_id; //get corresponding stop_id for that cell. Can also use cell.getRow().getIndex()
		mapPop(stop_id);
		logmessage('Changed "' + cell.getOldValue() + '" to "' + cell.getValue() + '" for stop_id: ' + stop_id);
    }
});

// #################################
// . load stops

//loadFromCsv(stopsfile,'setData');
getPythonStops();

// #################################
/* 3. Initiate map */
var osmLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
var MBAttrib = '&copy; ' + osmLink + ' Contributors & <a href="https://www.mapbox.com/about/maps/">Mapbox</a>';
var mapboxUrl = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';
var scenicUrl = 'https://api.mapbox.com/styles/v1/nikhilsheth/cj8rdd7wu45nl2sps9teusbbr/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibmlraGlsc2hldGgiLCJhIjoiQTREVlJuOCJ9.YpMpVVbkxOFZW-bEq1_LIw' ; 

var MBdark = L.tileLayer(mapboxUrl, {id: 'nikhilsheth.jme9hi44', attribution: MBAttrib });
var scenic = L.tileLayer(scenicUrl, { attribution: MBAttrib });

const startLocation = [10.030259357021862, 76.31446838378908];

var map = new L.Map('map', {
	'center': [0,0],
	'zoom': 2,
	'layers': [scenic],
	scrollWheelZoom: false
});

$('.leaflet-container').css('cursor','crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs

L.control.scale({metric:true, imperial:false}).addTo(map);

var dragmarkerOptions = {
	renderer: myRenderer,
	radius: 5,
	fillColor: "red",
	color: null,
	weight: 1,
	opacity: 1,
	fillOpacity: 0.8,
	//draggable: true // not provided for vector markers
};
var clickedflag = 0;

var dragmarker = L.circleMarker(startLocation, dragmarkerOptions);
dragmarker.on('dragend', function(e) {
	updateLatLng();
});
map.on('click', function(e) {
	dragmarker.setLatLng(e.latlng);
	updateLatLng( dragmarker.getLatLng() );
	if(clickedflag == 0) { dragmarker.addTo(map); clickedflag++; }
});


// #################################
/* 4. Loading stops on map */

var myRenderer = L.canvas({ padding: 0.5 });
// from https://stackoverflow.com/a/43019740/4355695 : A way to enable adding more points without crashing the browser. Will be useful in future if number of stops is above 500, 1000 or so.

var circleMarkerOptions = {
	renderer: myRenderer,
	radius: 7,
	fillColor: "#00B7F3",
	//color: null,
	weight: 1,
	opacity: 1,
	fillOpacity: 0.5
};

var stopsLayer = new L.geoJson(null).bindTooltip(function (layer) {
	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
}, { sticky: false })
.bindPopup(function (layer) {
	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
})
.on('click',markerOnClick);

// adding buttons to zoom to show all stops
L.easyButton('<span class="mapButton">&curren;</span>', function(btn, map){
	map.fitBounds(stopsLayer.getBounds(), {padding:[20,20]});
}).addTo(map);



//###########################
// initiate bootstrap / jquery components like tabs, accordions
$( function() {
	// tabs
	$( "#tabs" ).tabs({
		active:0
	});
	// Setting accordion
	$( "#instructions" ).accordion({
		collapsible: true, active: false
	});
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	//getParking();
});


//##################
// Buttons:
//undo button
$("#history-undo").on("click", function(){
	$("#stops-table").tabulator("undo");
});

//redo button
$("#history-redo").on("click", function(){
	$("#stops-table").tabulator("redo");
});

//Save table
$("#savetable").on("click", function(){
	saveStops();
});

// Clone zone_id
$("#targetStopid").bind("change keyup", function(){
	this.value=this.value.toUpperCase();
	$("#zone_id").val(this.value);
});

$("#stop2delete").bind("change keyup", function(){
	this.value=this.value.toUpperCase();
});

// onkeyup="this.value=this.value.toUpperCase()"

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

// Reset sorting
$("#resetSort").on("click", function(){
	console.log('attempting clearSort');
	$("#stops-table").tabulator("clearSort");
});

// Testing if scrollToRow is working
$("#test").on("click", function(){
	$("#stops-table").tabulator("scrollToRow", 'MACE');
	$("#stops-table").tabulator("selectRow", 'MACE');
});



	/* Functions */
/* // deprecated here, keep for other csv reading versions
function loadFromCsv(chosen1,mode='setData') {
	// Note: Consider this temporary. Probably we'll have python doing this job.
	// chosen1 will be the file path, mode will be setData or other option for possible appending
	Papa.parse(chosen1, {
		download: true,
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
		complete: function(results) {
			console.log('loaded',chosen1);
			logmessage('loaded ' + chosen1);

			initiateStops(results.data, mode);

		}, // END of Papa.parse complete() function
		
		error: function() {
			console.log("Error. Could not load", chosen1);
			logmessage("Error. Could not load "+ chosen1);
			
		}
	}); // END of Papa.parse
	
}
*/

/* Deprecated, function for saving local file.
$("#saveCSV").on("click", function(){
	// Adapted from https://stackoverflow.com/a/35251739/4355695
	var csvContent = Papa.unparse( $('#dump').val() );
	var blob = new Blob([csvContent], {type: "text/plain"});
	var dlink = document.createElement('a');
	dlink.download = 'stops.txt'
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
});

*/

// ##############################
// Update or Add to table
function updateTable() {
	latlng = document.getElementById('newlatlng').value.split(',');
	let lat = parseFloat(latlng[0]);
	let lon = parseFloat(latlng[1]);
	//console.log('update table, checking',latlng);
	if( ! checklatlng(lat,lon) ) {
		alert('check lat-long values'); return 0; 
	}
	stop_id = $("#targetStopid").val();
	stop_name = $("#stop_name").val();
	zone_id = $("#zone_id").val();
	wheelchair_boarding = parseInt( $("#wheelchair").val() );
	
	if (stop_id.length < UID_leastchars || stop_id.length > UID_maxchars ) {
		alert('check stop_id value, must be all caps, alphabets or numbers and between '+UID_leastchars + ' and ' + UID_maxchars + 'long.'); return 0; 
	}
	
	try {
		$("#stops-table").tabulator("updateOrAddRow", stop_id, {stop_id:stop_id, stop_lat:lat, stop_lon:lon, stop_name:stop_name, zone_id:zone_id, wheelchair_boarding:wheelchair_boarding  } );
	}
	catch(e) {
		console.log("exception caught in updateOrAddRow function call.", e);
	}

	// reload stop ids list for autocomplete
	reloadData();

	logmessage('updateOrAddRow done for ' + stop_id);


	// switch to first tab. from https://getbootstrap.com/docs/4.0/components/navs/#via-javascript
	$(function () { 
    $('#myTab li:first-child a').tab('show');
  })

  setTimeout(function(){
		//var row = $("#stops-table").tabulator("getRow",stop_id);
		//row.scrollTo();
		$("#stops-table").tabulator("selectRow", stop_id);
		$("#stops-table").tabulator("scrollToRow", stop_id);
		// clearing values
		$("#targetStopid").val('');
		$("#stop_name").val('');
		$("#wheelchair").val('');
		$("#newlatlng").val('');
		$("#zone_id").val('');
  }, 1000);		
}

function getPythonStops() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}allStops`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded all stops data from Server API/allStops .`);
			var data = JSON.parse(xhr.responseText);
			initiateStops(data);
		}
		else {
			console.log('Server request to API/allStops for all stops failed.  Returned status of ' + xhr.status + '\nLoading backup.');
			var backup = [{"stop_id":"ALVA","stop_name":"Aluva","stop_lat":10.1099,"stop_lon":76.3495,"zone_id":"ALVA","wheelchair_boarding":1},{"stop_id":"PNCU","stop_name":"Pulinchudu","stop_lat":10.0951,"stop_lon":76.3466,"zone_id":"PNCU","wheelchair_boarding":1},{"stop_id":"CPPY","stop_name":"CompanyPady","stop_lat":10.0873,"stop_lon":76.3428,"zone_id":"CPPY","wheelchair_boarding":1},{"stop_id":"ATTK","stop_name":"Ambattukavu","stop_lat":10.0793,"stop_lon":76.3389,"zone_id":"ATTK","wheelchair_boarding":1},{"stop_id":"MUTT","stop_name":"Muttom","stop_lat":10.0727,"stop_lon":76.3336,"zone_id":"MUTT","wheelchair_boarding":1},{"stop_id":"KLMT","stop_name":"Kalamassery","stop_lat":10.0586,"stop_lon":76.322,"zone_id":"KLMT","wheelchair_boarding":1},{"stop_id":"CCUV","stop_name":"Cusat","stop_lat":10.0467,"stop_lon":76.3182,"zone_id":"CCUV","wheelchair_boarding":1},{"stop_id":"PDPM","stop_name":"Pathadipalam","stop_lat":10.0361,"stop_lon":76.3144,"zone_id":"PDPM","wheelchair_boarding":1},{"stop_id":"EDAP","stop_name":"Edapally Jn.","stop_lat":10.0251,"stop_lon":76.3083,"zone_id":"EDAP","wheelchair_boarding":1},{"stop_id":"CGPP","stop_name":"Changampuzha Park","stop_lat":10.0152,"stop_lon":76.3023,"zone_id":"CGPP","wheelchair_boarding":1},{"stop_id":"PARV","stop_name":"Palarivattom","stop_lat":10.0064,"stop_lon":76.3048,"zone_id":"PARV","wheelchair_boarding":1},{"stop_id":"JLSD","stop_name":"JLN Stadium","stop_lat":10.0002,"stop_lon":76.2989,"zone_id":"JLSD","wheelchair_boarding":1},{"stop_id":"KALR","stop_name":"Kaloor","stop_lat":9.9943,"stop_lon":76.2914,"zone_id":"KALR","wheelchair_boarding":1},{"stop_id":"LSSE","stop_name":"Lissie Jn","stop_lat":9.9914,"stop_lon":76.2884,"zone_id":"LSSE","wheelchair_boarding":1},{"stop_id":"MGRD","stop_name":"MG Road","stop_lat":9.9834,"stop_lon":76.2823,"zone_id":"MGRD","wheelchair_boarding":1},{"stop_id":"MACE","stop_name":"Maharaja College","stop_lat":9.9732,"stop_lon":76.2851,"zone_id":"MACE","wheelchair_boarding":1}];
			initiateStops(backup);
		}
	};
	xhr.send();
}

function initiateStops(data, mode='setData') {
	$("#stops-table").tabulator(mode, data); 
	reloadData('firstTime');
}

function reloadData(timeflag='normal') {
	var data = $("#stops-table").tabulator("getData");
	stop_id_list = data.map(a => a.stop_id); 
	
	if ($('.autocomplete').data('uiAutocomplete')) {
	$( ".autocomplete" ).autocomplete( "destroy" );
	}
	// auto-populating the targetStopid text field. from http://jqueryui.com/autocomplete/ . Make sure jquery-ui css and js are included.
	$( ".autocomplete" ).autocomplete({
		source: stop_id_list
	});

	// For Add/Edit section, Auto-populate other fields on selecting a stop id
	// have to declare it inside the reloadData() function because of Destroy command above. After destroying it needs to be re-initiated.
	$( "#targetStopid" ).autocomplete({
	  select: function( event, ui ) {
	  	//console.log(ui.item.value);
	  	stop_id = ui.item.value;
	  	populateFields(stop_id);
	  	mapPop(stop_id);
	  }
	});

	// Map update
	stopsLayer.clearLayers();
	loadonmap(data,stopsLayer);
	if(timeflag == 'firstTime') {
		map.fitBounds(stopsLayer.getBounds()); 
		//Zoom map to see all stops only the first time. Later when making changes, don't bother.
	}
	stopsLayer.addTo(map);
		
}

function loadonmap(stopsjson,stopsLayer) {
	for (stoprow in stopsjson) {
		let lat = parseFloat(stopsjson[stoprow]['stop_lat']);
		let lon = parseFloat(stopsjson[stoprow]['stop_lon']);
		if( ! checklatlng(lat,lon) ) {
			//console.log('You shall not pass!', stopsjson[stoprow]);
			continue;
		}
		let stopmarker = L.circleMarker([lat,lon], circleMarkerOptions);
		stopmarker.properties = stopsjson[stoprow];
		//console.log( JSON.stringify(stopmarker) );
		stopmarker.addTo(stopsLayer);
	}
}

function updateLatLng(latlong, revflag) {
	if (revflag) {
		lat = parseFloat( latlong.split(',')[0] );
		lng = parseFloat( latlong.split(',')[1] );
		dragmarker.setLatLng([lat, lng]);
		map.panTo([lat, lng]);
	} else {
		lat = Math.round(( dragmarker.getLatLng().lat + 0.0000001) * 10000) / 10000;
		// Rounding, from https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary. The +0.000.. is to trip forward a number hinging on x.9999999...
		lng = Math.round(( dragmarker.getLatLng().lng + 0.0000001) * 10000) / 10000;
		document.getElementById('newlatlng').value = lat + ',' + lng;
		//document.getElementById('longitude').value = marker.getLatLng().lng;
		//map.panTo(dragmarker.getLatLng());
	}
}


// ##############################
/* Interlinking between table and map */
function mapPop(stop_id) {
	//console.log('Looking for ' + stop_id);
	stopsLayer.eachLayer( function(layer) {
    if(layer.properties && (layer.properties.stop_id == stop_id) ) {
			layer.bindPopup(function (layer) {
				return layer.properties.stop_id + ': ' + layer.properties.stop_name;
			});
			layer.openPopup();
			decideZoom = map.getZoom() > 13 ? 16 : 13; // if zoomed in more, take it to 16. Else if very much out, zoom in to 13.
			map.flyTo(layer.getLatLng(), decideZoom, {duration:1, animate:true});
		}
	});

	// load editing and deleting panes too
	$( "#targetStopid" ).val(stop_id);
	populateFields(stop_id);
	$( "#stop2delete" ).val(stop_id);
}

function markerOnClick(e) {
	//console.log("Clicked marker", e.layer.properties.stop_id, e.latlng );
	stop_id = e.layer.properties.stop_id;

	var row = $("#stops-table").tabulator("getRow", stop_id);
	row.scrollTo();
	row.toggleSelect();
	// load editing and deleting panes too
	$( "#targetStopid" ).val(stop_id);
	populateFields(stop_id);
	$( "#stop2delete" ).val(stop_id);
}

function populateFields(stop_id) {
	var row = $("#stops-table").tabulator("getRow", stop_id); //return row compoenent with index of 1
			var rowData = row.getData();
	  	//console.log(JSON.stringify(rowData,null,2));

	  	$('#stop_name').val(rowData['stop_name']);
	  	$('#zone_id').val(rowData['zone_id']);
	  	$('#newlatlng').val(rowData['stop_lat'] + ',' + rowData['stop_lon']);
	  	$('#wheelchair').val(rowData['wheelchair_boarding']);
}

function depopulateFields() {
	$('#stop_name').val('');
	$('#zone_id').val('');
	$('#newlatlng').val('');
	$('#wheelchair').val('');
	$( "#targetStopid" ).val('');
	$( "#stop2delete" ).val('');
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

function saveStops(){
	$('#stopSaveStatus').text('');

	var data = $("#stops-table").tabulator("getData");

	var pw = $("#password").val();

	console.log('sending stops table data to server via POST.');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}allStops?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server /API/allStops, resonse received: ' + xhr.responseText);
			$('#stopSaveStatus').text('Saved changes to stops. Message: ' + xhr.responseText);
		} else {
			console.log('Server POST request to API/allStops failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#stopSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

}

