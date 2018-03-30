// schedules

var tripsLock = false;
var timingsLock = false;

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
		{title:"direction_id", field:"direction_id", editor:"select", editorParams:{0:"Up (0)", 1:"Down (1)"}, headerFilter:"input", headerSort:false },
		{title:"trip_headsign", field:"trip_headsign", editor:"input", headerFilter:"input", headerSort:false },
		{title:"block_id", field:"block_id", editor:"input", headerFilter:"input", tooltip:"Vehicle identifier", headerSort:false },
		{title:"shape_id", field:"shape_id", editor:"input", headerFilter:"input", headerSort:false },
		{title:"wheelchair_accessible", field:"wheelchair_accessible", editor:"select", editorParams:{0:"No info (0)", 1:"Yes (1)", 2:"No (2)"}, headerSort:false },
		{title:"bikes_allowed", field:"bikes_allowed", editor:"select", editorParams:{0:"No info (0)", 1:"Yes (1)", 2:"No (2)"}, headerSort:false}
	],
	rowSelected:function(row){
		var trip_id = row.getIndex();
		console.log('selected', trip_id);
		getPythonStopTimes(trip_id);
	},
	rowDeselected:function(row){
		$("#stop-times-table").tabulator('setData',[]);
	},
	cellEdited:function(cell){
		setSaveTrips(true);
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
		{title:"trip_id", field:"trip_id", visible:true, headerSort:false }, // keeping this visible to avoid confusions
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
	cellEdited:function(cell){
		setSaveTimings(true);
	}
});

getPythonRouteIds();

// setting accordion
$( function() {
	$( "#accordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
} );

// button actions
$("#saveTrips").on("click", function(){
	saveTrips();
});

$("#saveTimings").on("click", function(){
	saveTimings();
});

// ##########################################
// Functions:

function getPythonTrips(route_id) {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}trips?route=${route_id}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded trips data for the chosen route from Server API/trips .`);
			var data = JSON.parse(xhr.responseText);
			initiateTrips(data);
		}
		else {
			console.log('Server request to API/trips failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			var backup = [];
			initiateTrips(backup);
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
	xhr.open('GET', `${APIpath}stopTimes?trip=${trip_id}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded timings data for the chosen trip from Server API/stopTimes .`);
			var data = JSON.parse(xhr.responseText);
			initiateStopTimes(data);
		}
		else {
			console.log('Server request to API/stopTimes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			var backup = [];
			initiateStopTimes(backup);
		}
	};
	xhr.send();
}

function initiateStopTimes(timesData) {
	$("#stop-times-table").tabulator('setData',timesData);
	setSaveTimings(false);
}

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
			console.log('Server request to API/routeIdList failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			var backup = ['R001'];
			initiateRouteIds(backup);
		}
	};
	xhr.send();
}

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
			$('#tripsSaveStatus').text('Saved changes to trips table. Message: '+ xhr.responseText);
			setSaveTrips(false);
		} else {
			console.log('Server POST request to API/trips failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#tripsSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
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
		document.getElementById("saveTrips").className = "btn btn-danger";
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
		document.getElementById("saveTimings").className = "btn btn-danger";
	} else {
		timingsLock = false;
		document.getElementById("saveTimings").disabled = true;
		document.getElementById("saveTimings").className = "btn";	
	}	
}
