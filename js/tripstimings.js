// schedules

// global variables
var tripsLock = false;
var timingsLock = false;
var chosenTrip = '';
var globalRoutes = '';
var chosenRoute = '';
var chosenRouteShortName = '';
var chosenDirection = 0;
var trip_id_list = '';
var sequenceHolder = '';
var allStopsKeyed = '';

// #########################################
// Function-variables to be used in tabulator

var serviceListGlobal = {};
var serviceLister = function(cell) {
	return serviceListGlobal;
}

var shapeListGlobal = {};
var shapeLister = function(cell) {
	return shapeListGlobal;
}

var tripsTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' trips total';
}

// #########################################
// initializing tabulators
$("#trips-table").tabulator({
	selectable:1,
	index: 'trip_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	//pagination:"local", //enable local pagination.
	//groupBy: ['service_id','direction_id'],
	columns: [
		// route_id,service_id,trip_id,trip_headsign,direction_id,block_id,shape_id,wheelchair_accessible
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"Num", width:40, formatter: "rownum", headerSort:false, frozen:true }, // row numbering
		{title:"route_id", field:"route_id",headerSort:false, visible:true, frozen:true },
		{title:"trip_id", field:"trip_id", headerFilter:"input", headerSort:false, frozen:true },
		{title:"Calendar service", field:"service_id", editor:"select", editorParams:serviceLister, headerFilter:"input", validator:"required", headerSort:false },
		{title:"direction_id", field:"direction_id", editor:"select", editorParams:{0:"Onward(0)", 1:"Return(1)", '':"None(blank)"}, headerFilter:"input", headerSort:false, formatter:"lookup", formatterParams:{0:'Onward',1:'Return','':''} },
		{title:"trip_headsign", field:"trip_headsign", editor:"input", headerFilter:"input", headerSort:false },
		{title:"trip_short_name", field:"trip_short_name", editor:"input", headerFilter:"input", headerSort:false, bottomCalc:tripsTotal },
		{title:"block_id", field:"block_id", editor:"input", headerFilter:"input", tooltip:"Vehicle identifier", headerSort:false },
		{title:"shape_id", field:"shape_id", editor:"select", editorParams:shapeLister, headerFilter:"input", headerSort:false },
		{title:"wheelchair_accessible", field:"wheelchair_accessible", headerSort:false, 
			editor:"select", editorParams:wheelchairOptions, 
			formatter:"lookup", formatterParams:wheelchairOptionsFormat },
		{title:"bikes_allowed", field:"bikes_allowed", headerSort:false,
			editor:"select", editorParams:bikesAllowedOptions, 
			formatter:"lookup", formatterParams:bikesAllowedOptionsFormat }
	],
	rowSelected:function(row){
		chosenTrip = row.getIndex();
		chosenDirection = row.getData()['direction_id'];
		if(!chosenDirection) chosenDirection = 0;
		tripname = row.getData()['trip_short_name'] || row.getData()['trip_headsign'] || '';
		if(tripname) tripname = chosenTrip + ': ' + tripname;
		else tripname = chosenTrip;
		$('#chosenTrip').html('<big><big><span class="badge label-green">' + tripname + '</span></big></big>');
		$("#stop-times-table").tabulator('clearData'); // on changing selection, clear the stop_times table in Timings tab.
		$('#loadTimingsStatus').html('');

		// load up start time if in the format 
	},
	rowDeselected:function(row){
		;
	},
	dataLoaded: function(data){
		var list = [];
		data.forEach(function(row){
			list.push(row.trip_id);
		});
	},
	dataEdited: function(data){
		setSaveTrips(true);
		var list = [];
		data.forEach(function(row){
			list.push(row.trip_id);
		});
	}
});

$("#stop-times-table").tabulator({
	selectable:0,
	index: 'stop_sequence',
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	persistentFilter:true,
	columns: [
		// fields: trip_id,arrival_time,departure_time,stop_id,stop_sequence,timepoint,shape_dist_traveled
		{rowHandle:true, formatter:"handle", frozen:true, width:30, minWidth:30, headerSort:false},
		{title:"trip_id", field:"trip_id", visible:true, frozen:true, headerSort:false, width:150 }, // keeping this visible to avoid confusions
		{title:"stop_sequence", field:"stop_sequence", headerFilter:"input", headerSort:false, sorter:"number" },
		{title:"stop_id", field:"stop_id", headerFilter:"input", headerSort:false },
		// to do: validation for hh:mm:ss and accepting hh>23
		{title:"arrival_time", field:"arrival_time", editor:"input", headerFilter:"input", headerSort:false },
		{title:"departure_time", field:"departure_time", editor:"input", headerFilter:"input", headerSort:false },
		{title:"timepoint", field:"timepoint", headerFilter:"input", editor:"select", editorParams:{0:"0 - Estimated", 1:"1 - Accurate", "":"blank - Accurate"}, headerSort:false},
		{title:"shape_dist_traveled", field:"shape_dist_traveled", editor:"input", headerFilter:"input", validator:["numeric", "min:0"], headerSort:false }
	],
	initialSort: [
	{column: "stop_sequence", dir:"asc" }
	],
	dataEdited:function(cell){
		setSaveTimings(true);
	}
});


// initiate bootstrap / jquery components like tabs, accordions
$( function() {
	$( "#accordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	// tabs
	$( "#tabs" ).tabs({
		active:0
	});

	getPythonRoutes();

	getPythonIDs();

	getPythonCalendar();
	getPythonAllShapesList();
	getPythonStopsKeyed();
});

// button actions
$("#saveTrips").on("click", function(){
	saveTrips();
});

$("#saveTimings").on("click", function(){
	saveTimings();
});

$("#loadTimingsButton").on("click", function(){
	loadTimings();
});

$("#addTripButton").on("click", function(){
	addTrip();
});

$("#defaultShapesApplyButton").on("click", function(){
	defaultShapesApply();
});

// ##########################################
// Functions:

function getPythonTrips(route_id) {
	$("#trips-table").tabulator('clearData');
	$('#routeSelectStatus').html('');  
	$("#noSequenceAlert").hide('slow');
	
	if(!route_id || route_id == 'No Selection') return; // exit if no route actually selected

	chosenRoute = route_id; // set global variable
	$('#routeSelectStatus').html('<span class="alert alert-warning">Loading trips for route ' + route_id + '...</span>');
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}trips?route=${route_id}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded trips data for the chosen route from Server API/trips .`);
			var data = JSON.parse(xhr.responseText);
			$("#trips-table").tabulator('setData',data.trips);
			$('#routeSelectStatus').html('<span class="alert alert-success">Loaded trips for route ' + route_id + '</span>');
			
			// resetting save to DB button if a new set of trips has been loaded from DB, clearing status text.
			setSaveTrips(false);
			$('#addTripStatus').html('');

			// SEQUENCE:
			sequenceHolder = data.sequence;
			console.log(sequenceHolder);
			if(!sequenceHolder) {
				$("#newTripHTML").hide('slow');
				$("#shapeApplyHTML").hide('slow');
				$("#noSequenceAlert").show('slow');
			} else $("#newTripHTML").show('slow');

			// Shape applying part
			var content = '';
			if( sequenceHolder.shape0 ) 
				content += 'Onward: <b>' + sequenceHolder.shape0 + '</b>';

			if( sequenceHolder.shape1 )
				content += '<br>Return: <b>' + sequenceHolder.shape1 + '</b>';

			$("#defaultShapesInfo").html(content);
			if( sequenceHolder.shape0 || sequenceHolder.shape1 )
				$("#shapeApplyHTML").show('slow');
		}
		else {
			console.log('Server request to API/trips failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
			$("#trips-table").html('<p class="alert alert-danger">Could not load trips data from server. Message: ' + xhr.responseText + '<br>Please try again or contact the developers.</p>');
		}
	};
	xhr.send();
}

function getPythonStopTimes(trip_id){
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}stopTimes?trip=${trip_id}&route=${chosenRoute}&direction=${chosenDirection}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded timings data for the chosen trip from Server API/stopTimes .`);
			var returndata = JSON.parse(xhr.responseText);
			$("#stop-times-table").tabulator('setData',returndata.data);
			if(returndata.newFlag) {
				setSaveTimings(true);
				populateStopTimesFromSequence(trip_id);
				$('#loadTimingsStatus').html('<div class="alert alert-warning">' + returndata.message + '</div>');
			}
			else {
				setSaveTimings(false);
				$('#loadTimingsStatus').html('<div class="alert alert-success">' + returndata.message + '</div>');
			}
		}
		else {
			console.log('Server request to API/stopTimes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			$('#loadTimingsStatus').html('<div class="alert alert-danger">' + xhr.responseText + '</div>');
			setSaveTimings(false);
		}
	};
	xhr.send();
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
	var content = '<option value="">No Selection</option>';
	// route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
	data.forEach(function(row){
			if(!row['route_long_name']) row['route_long_name'] = '(no long name)';
			content += `<option value="${row['route_id']}">${row['route_short_name']}-${row['route_long_name']}</option>`;
		});
	$('#routeSelect').html(content);
	$('#routeSelect').chosen({search_contains:true, width:300, placeholder_text_single:'Pick a Route'});
	$('#routeSelect').on('change', function(evt,params) {
		let route_id = params.selected;
		if( !route_id.length ) {
			$("#trips-table").tabulator('clearData');
			chosenRoute = '';
			chosenRouteShortName = '';
			$("#newTripHTML").hide('slow');
			$("#shapeApplyHTML").hide('slow');
			return;
		}
		getPythonTrips(route_id);
		resetTimings();
		// set globals
		chosenRoute = route_id;
		for(var i = 0; i < globalRoutes.length; i++) {
			if(globalRoutes[i].route_id == chosenRoute) {		
				chosenRouteShortName =  globalRoutes[i].route_short_name;
				break;
			}
		}

		console.log(chosenRouteShortName);
	});
}

function saveTimings() {
	var selected = $("#trips-table").tabulator("getSelectedData");
	if(selected.length != 1) {
		console.log('Please select a trip_id and load the timings table first.');
		return;
	}
	var trip_id = selected[0].trip_id;
	var pw = $("#password").val();
	if ( ! pw.length ) { 
		$('#timingsSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	$('#timingsSaveStatus').html('<span class="alert alert-info">Sending modified timings data to server, please wait..</span>');

	var timingsData = $("#stop-times-table").tabulator("getData");
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=stop_times&key=trip_id&value=${trip_id}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/tableReadSave table=stop_times, resonse received: ' + xhr.responseText);
			$('#timingsSaveStatus').html('<span class="alert alert-success">Saved changes to stop_times table. Message: '+ xhr.responseText + '</span>');
			setSaveTimings(false);
			
		} else {
			console.log('Server POST request to API/tableReadSave table=stop_times failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#timingsSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText + '</span>');
		}
	}
	console.log('Sending POST request, please wait for callback.');
	xhr.send(JSON.stringify(timingsData));
}

function saveTrips() {
	var pw = $("#password").val();
	if ( ! pw.length ) { 
		$('#tripsSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	var tripsData = $("#trips-table").tabulator("getData");
	var route_id = tripsData[0]['route_id'];

	$('#tripsSaveStatus').html('<span class="alert alert-info">Sending modified trips data to server, please wait..</span>');

	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=trips&key=route_id&value=${route_id}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/tableReadSave, resonse received: ' + xhr.responseText);
			$('#tripsSaveStatus').html('<span class="alert alert-success">'+ xhr.responseText + '</span>');
			setSaveTrips(false);
		} else {
			console.log('Server POST request to API/tableReadSave failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#tripsSaveStatus').html('<span class="alert alert-danger">' + xhr.responseText + '</span>');
		}
	}
	console.log('Sending POST request, please wait for callback.');
	xhr.send(JSON.stringify(tripsData));
}



function setSaveTrips(lock = true) {
	// to do: enable or diable the save changes button
	if (lock) {
		tripsLock = true;
		document.getElementById("saveTrips").disabled = false;
		document.getElementById("saveTrips").className = "btn btn-success";
	} else {
		tripsLock = false;
		document.getElementById("saveTrips").disabled = true;
		document.getElementById("saveTrips").className = "btn";
	}
}

function setSaveTimings(lock = true) {
	// to do: enable or diable the save changes button
	// className changing from https://stackoverflow.com/a/196038/4355695
	if (lock) {
		timingsLock = true;
		document.getElementById("saveTimings").disabled = false;
		document.getElementById("saveTimings").className = "btn btn-success";
	} else {
		timingsLock = false;
		document.getElementById("saveTimings").disabled = true;
		document.getElementById("saveTimings").className = "btn";	
	}	
}

function loadTimings() {
	if( chosenTrip != '') {
		$("#stop-times-table").tabulator('clearData');
		getPythonStopTimes(chosenTrip);
		$('#loadTimingsStatus').html('<div class="alert alert-info">Loading timings..</div>');
	}
	else 
		$('#loadTimingsStatus').html('<div class="alert alert-warning">Choose the trip first from the table in Trips tab.</div>');
}

function addTrip() {
	route_id = chosenRoute ;
	if(! chosenRoute.length) return;

	var trip_time = $('#trip_time').val();
	console.log(trip_time);
	if(! trip_time.length) { shakeIt('trip_time'); return; }
	
	var service_id = $('#trip_calendar').val();

	var direction = $('#trip_direction').val();
	// if "both" is selected then we need to loop. Hence, array.
	// 5.9.18: addind in support for blank direction
	if (direction == 'both') directionsArray = [0,1];
	else if (parseInt(direction) == 0) directionsArray = [0];
	else if (parseInt(direction) == 1) directionsArray = [1];
	else directionsArray = [''];

	// console.log(directionsArray);

	var counter = 1;
	var message = '';

	for( i in directionsArray) { // looping through directions. If just one direction then fine.

		// search next available id
		var tripsTableList = $("#trips-table").tabulator('getData').map(a => a.trip_id);
		var allTrips = trip_id_list.concat(tripsTableList);

		// loop till you find an available id:
		while ( allTrips.indexOf(route_id + pad(counter) ) > -1 ) 
			counter++;

		dirIndex = ( directionsArray[i] == '' ? 0 : directionsArray[i]);

		var trip_id = route_id + pad(counter);
		// to do: change this, adopt naming conventions.
		//var trip_id = `${route_id}.${service_id}.${dirIndex}.${}` + '.'pad(counter);
		

		let sequence = sequenceHolder[dirIndex];
		var last_stop_id = sequence[ sequence.length - 1];
		var trip_headsign = allStopsKeyed[ last_stop_id ]['stop_name'];
		var trip_short_name = chosenRouteShortName + ' ' + trip_time + ' to ' + trip_headsign;
		var shape_id = '';
		if(sequenceHolder[ 'shape' + dirIndex ] ) shape_id = sequenceHolder[ 'shape' + dirIndex ];
		
		$("#trips-table").tabulator('addRow',{ route_id:route_id, trip_id: trip_id, 
			service_id:service_id, direction_id:directionsArray[i], shape_id:shape_id,
			trip_short_name: trip_short_name, trip_headsign:trip_headsign },true);

	}
	
	$('#addTripStatus').html('<span class="alert alert-success">Trip(s) added with id ' + trip_id + '. Fill its info in the table and then save changes.</span>');

	$("#trips-table").tabulator('redraw', true);

}
/*
function getPythonTripIDs() {
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}tripIdList`, function( data ) {
		trip_id_list =  JSON.parse(data) ;
		console.log('All trip ids list loaded after GET request to API/tripIdList.');
	})
	.fail( function() {
		console.log('GET request to API/tripIdList failed.')
	});

}
*/
function getPythonIDs() {
	// replacement for getPythonTripIDs(). Apart from tripIDs, fetch all serviceIDs, blockIDs, shapeIDs and bring with relevant adjoining info if any.
	// since we are mandating that the route have  sequence saved, and 
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}tripIdList`, function( data ) {
		trip_id_list =  JSON.parse(data) ;
		console.log('All trip ids list loaded after GET request to API/tripIdList.');
	})
	.fail( function() {
		console.log('GET request to API/tripIdList failed.')
	});

}


function populateStopTimesFromSequence(trip_id) {
	if(!sequenceHolder) {
		$('#loadTimingsStatus').html('<div class="alert alert-danger">Error: Sequence for this route is missing. Please go to <a href="sequence.html">Default Sequence</a> page and finalize the sequence first.</div>');
		return;
	}
		var timesArray = [];
	
	var list = sequenceHolder[parseInt(chosenDirection)];
	for( i in list) {
		let row = {};
		row['trip_id'] = trip_id;
		row['stop_sequence'] = parseInt(i) + 1;
		row['stop_id'] = list[i];
		row['timepoint'] = 0;
		row['arrival_time'] = '';
		row['departure_time'] = '';
		//row['shape_dist_traveled'] = '';
		timesArray.push(row);
	}
	timesArray[0]['arrival_time'] = timesArray[0]['departure_time'] = '00:00:00';
	timesArray[list.length-1]['arrival_time'] = timesArray[list.length-1]['departure_time'] = '01:00:00';
	$("#stop-times-table").tabulator('setData', timesArray);
	
}

function getPythonCalendar() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}calendar?current=y`);
	// &current=y : exclude expired calendar entries
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/calendar .`);
			var data = JSON.parse(xhr.responseText);

			var dropdown = ''; var selectedFlag = false;
			data.forEach(function(row){
				var start = row['start_date'];
				var end = row['end_date'];
				//if(!start || !end) continue; // didn't work

				days = '';
				days += ( row['monday']? 'M':'_')
				days += ( row['tuesday']? 'T':'_')
				days += ( row['wednesday']? 'W':'_')
				days += ( row['thursday']? 'T':'_')
				days += ( row['friday']? 'F':'_')
				days += ' ';
				days += ( row['saturday']? 'S':'_')
				days += ( row['sunday']? 'S':'_')
				
				serviceListGlobal[row['service_id']] = row['service_id'] + ': ' + days + ', ' + start + '-' + end;
				
				// populate dropdown for new trip creation
				var select = '';
				if(!selectedFlag) {
					select = '  selected="selected"'; selectedFlag = true;
				}
				dropdown += '<option value="' + row['service_id'] + '"' + select + '>' + row['service_id'] + ': ' + days + ', ' + start + '-' + end + '</option>';
			});
			$('#trip_calendar').html(dropdown);

		}
		else {
			console.log('Server request to API/calendar failed. Returned status of ' + xhr.status + ', response: ' + xhr.responseText );
		}
	};
	xhr.send();
}

function getPythonAllShapesList() {
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}allShapesList`, function( data ) {
		list =  JSON.parse(data)['all'] ;
		console.log('GET request to API/allShapesList succesful.');
		list.forEach(function(row){
			shapeListGlobal[row] = row;
		});
	})
	.fail( function() {
		console.log('GET request to API/allShapesList failed.')
	});
	
}

function resetTimings() {
	$("#stop-times-table").tabulator('clearData');
	$('#chosenTrip').html('[select in Trips tab]');
	chosenTrip = '';
	$('#loadTimingsStatus').html('');
}

function getPythonStopsKeyed() {
	// loading KEYED JSON of the stops.txt data, keyed by stop_id.
		let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/allStopsKeyed`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/allStopsKeyed .`);
			var data = JSON.parse(xhr.responseText);
			allStopsKeyed = data;
		}
		else {
			console.log('Server request to API/allStopsKeyed failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}


function defaultShapesApply() {
	var tripsData = $("#trips-table").tabulator("getData");

	tripsData.forEach(function(row){
		
		if(sequenceHolder.shape0)
			if(row.direction_id == 0) 
				row.shape_id = sequenceHolder.shape0;
		
		if(sequenceHolder.shape1)
			if(row.direction_id == 1) 
				row.shape_id = sequenceHolder.shape1;

	});
	
	$("#trips-table").tabulator("setData", tripsData);
	$("#trips-table").tabulator('redraw', true);
	
	$("#defaultShapesApplyStatus").html( '<font color="green"><b><font size="5">&#10004;</font></b> Done!</font> Save Changes to save to DB.');
	setSaveTrips(true);
}
