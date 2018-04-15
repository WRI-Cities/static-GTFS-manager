// schedules

// global variables
var tripsLock = false;
var timingsLock = false;
var chosenTrip = '';
var chosenRoute = '';
var chosenDirection = 0;
var trip_id_list = '';
var sequenceHolder = '';

// initializing tabulators
$("#trips-table").tabulator({
	selectable:1,
	index: 'trip_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	persistenceMode:true, persistentFilter:true, persistentSort:true, persistenceID:"trips",
	columns: [
		// route_id,service_id,trip_id,trip_headsign,direction_id,block_id,shape_id,wheelchair_accessible
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"Num", width:40, formatter: "rownum", headerSort:false}, // row numbering
		{title:"route_id", field:"route_id",headerSort:false, visible:true },
		{title:"trip_id", field:"trip_id", headerFilter:"input", headerSort:false },
		{title:"service_id", field:"service_id", editor:"input", headerFilter:"input", validator:"required", headerSort:false },
		{title:"direction_id", field:"direction_id", editor:"select", editorParams:{0:"0-Onward", 1:"1-Return"}, headerFilter:"input", headerSort:false },
		{title:"trip_headsign", field:"trip_headsign", editor:"input", headerFilter:"input", headerSort:false },
		{title:"block_id", field:"block_id", editor:"input", headerFilter:"input", tooltip:"Vehicle identifier", headerSort:false },
		{title:"shape_id", field:"shape_id", editor:"input", headerFilter:"input", headerSort:false },
		{title:"wheelchair_accessible", field:"wheelchair_accessible", editor:"select", editorParams:{0:"0-No info", 1:"1-Yes", 2:"2-No"}, headerSort:false },
		{title:"bikes_allowed", field:"bikes_allowed", editor:"select", editorParams:{0:"No info (0)", 1:"Yes (1)", 2:"No (2)"}, headerSort:false}
	],
	rowSelected:function(row){
		chosenTrip = row.getIndex();;
		chosenDirection = row.getData()['direction_id'];
		if(!chosenDirection) chosenDirection = 0;
		$('#chosenTrip').html(chosenTrip);
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
	selectable:1,
	index: 'stop_sequence',
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	persistentFilter:true,
	columns: [
		// fields: trip_id,arrival_time,departure_time,stop_id,stop_sequence,timepoint,shape_dist_traveled
		{rowHandle:true, formatter:"handle", frozen:true, width:30, minWidth:30, headerSort:false},
		{title:"trip_id", field:"trip_id", visible:true, headerSort:false, width:150 }, // keeping this visible to avoid confusions
		{title:"stop_sequence", field:"stop_sequence", headerFilter:"input", headerSort:false, sorter:"number" },
		{title:"stop_id", field:"stop_id", headerFilter:"input", headerSort:false },
		// to do: validation for hh:mm:ss and accepting hh>23
		{title:"arrival_time", field:"arrival_time", editor:"input", headerFilter:"input", headerSort:false },
		{title:"departure_time", field:"departure_time", editor:"input", headerFilter:"input", headerSort:false },
		{title:"timepoint", field:"timepoint", headerFilter:"input", editor:"select", editorParams:{0:"0 - Not accurate", 1:"1 - Accurate", "":"blank - accurate"}, headerSort:false},
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

	//getPythonTripIDs();
	getPythonIDs();
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

// ##########################################
// Functions:

function getPythonTrips(route_id) {
	$("#trips-table").tabulator('setData',[]);
	$('#routeSelectStatus').html('');
	
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
			sequenceHolder = data.sequence;
			if(!sequenceHolder) {
				$("#newTripHTML").html('<div class="alert alert-warning">Note: Cannot add new trips to this route right now as this route\'s sequence is not finalized yet. Please do so by visiting the <a class="btn btn-outline-info" href="routes.html">Routes section</a>.</div>');
			}
		}
		else {
			console.log('Server request to API/trips failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
			$("#trips-table").html('<p class="alert alert-danger">Could not load trips data from server. Message: ' + xhr.responseText + '<br>Please try again or contact the developers.</p>');
		}
	};
	xhr.send();
}

function initiateTrips(tripsData) {
	$("#trips-table").tabulator('setData',tripsData);
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

/*
function getPythonRouteIds() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}routeIdList`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded route ids list from Server API/routeIdList .`);
			var data = JSON.parse(xhr.responseText);
			initiateRouteIds(data);
		}
		else {
			console.log('Server request to API/routeIdList failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}
*/

function getPythonRoutes() {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/allRoutes`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`GET call to Server API/allRoutes succesful.`);
			var data = JSON.parse(xhr.responseText);
			populateRouteSelect(data);
		}
		else {
			console.log('Server request to API/allRoutes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function populateRouteSelect(data) {
	var content = '<option>No Selection</option>';
	// route_id,route_short_name,route_long_name,route_type,route_color,route_text_color
	data.forEach(function(row){
			content += `<option value="${row['route_id']}">${row['route_short_name']}-${row['route_long_name']}</option>`;
		});
	$('#routeSelect').html(content);
	$('#routeSelect').chosen({search_contains:true, width:300, placeholder_text_single:'Pick a Route'});
	$('#routeSelect').on('change', function(evt,params) {
		let route_id = params.selected;
		getPythonTrips(route_id);
	});
}

/*
function initiateRouteIds(route_id_list) {
	if ($('#routeSelector').data('uiAutocomplete')) {
		$( "#routeSelector" ).autocomplete( "destroy" );
	}
	$( "#routeSelector" ).autocomplete({
		minLength: 0, delay: 500,
		//source: route_id_list,
		source: function(request, response) {
		// limit results, to prevent browser hangups in large db situations
		// from https://stackoverflow.com/a/7617637/4355695
		var results = $.ui.autocomplete.filter(route_id_list, request.term);
		response(results.slice(0, 5));
		},
		select: function( event, ui ) {
			// trigger function when an option is chosen
			let route_id = ui.item.value;
			getPythonTrips(route_id);
			// extra: show route name
			//displayRouteName(route_id);
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

function saveTimings() {
	var selected = $("#trips-table").tabulator("getSelectedData");
	if(selected.length != 1) {
		console.log('Please select a trip_id and load the timings table first.');
		return;
	}
	var trip_id = selected[0].trip_id;
	var pw = $("#password").val();

	$('#timingsSaveStatus').text('Sending modified timings data to server, please wait..');

	var timingsData = $("#stop-times-table").tabulator("getData");
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}stopTimes?pw=${pw}&trip=${trip_id}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server /API/stopTimes, resonse received: ' + xhr.responseText);
			$('#timingsSaveStatus').text('Saved changes to stop_times table. Message: '+ xhr.responseText);
			setSaveTimings(false);
			
		} else {
			console.log('Server POST request to API/stopTimes failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#timingsSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
		}
	}
	console.log('Sending POST request, please wait for callback.');
	xhr.send(JSON.stringify(timingsData));
}

function saveTrips() {
	var pw = $("#password").val();

	var tripsData = $("#trips-table").tabulator("getData");
	var route_id = tripsData[0]['route_id'];

	$('#tripsSaveStatus').text('Sending modified trips data to server, please wait..');

	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}trips?pw=${pw}&route=${route_id}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server /API/trips, resonse received: ' + xhr.responseText);
			$('#tripsSaveStatus').html('<span class="alert alert-success">'+ xhr.responseText + '</span>');
			setSaveTrips(false);
		} else {
			console.log('Server POST request to API/trips failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#tripsSaveStatus').text('<span class="alert alert-danger">' + xhr.responseText + '</span>');
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
		document.getElementById("saveTrips").className = "btn btn-outline-success";
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
		document.getElementById("saveTimings").className = "btn btn-outline-success";
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
		$('#loadTimingsStatus').html('<div class="alert-warning">Choose the trip first from the table in Trips tab.</div>');
}

function addTrip() {
	route_id = chosenRoute ;
	trip_id = $('#trip2add').val().toUpperCase().replace(/[^A-Za-z0-9-_]/g, ""); // cleanup!
	
	$('#trip2add').val(trip_id);

	uniqueCheck = ( trip_id_list.indexOf(trip_id) < 0 );
	if( uniqueCheck ) {
		var tripRow = { 'trip_id':trip_id, 'route_id':route_id };
		$("#trips-table").tabulator('addRow', tripRow, true);
		$('#addTripStatus').html('Added ' + trip_id + ' to table at top. Please fill in the remaining columns and then save changes.');
		trip_id_list.push(trip_id); //adding to list to avoid repeat adds
		$('#trip2add').val(''); //resetting field
	} else {
		$('#addTripStatus').html('Sorry, this id is already taken by this or another route. Please choose another.');
	}
}

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
		$('#loadTimingsStatus').html('<div class="alert alert-danger">Error: Sequence for this route is missing. Please go to Routes page and finalize the sequence first.</div>');
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
