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
var TripsTableEdited = false;

// #########################################
// Function-variables to be used in tabulator

var serviceListGlobal = {};
var serviceLister = function (cell) {
	return serviceListGlobal;
}

var shapeListGlobal = {};
var shapeLister = function (cell) {
	return shapeListGlobal;
}

var Shapeselect = $("<select></select>");

var ShapeselectEditor = function (cell, onRendered, success, cancel, editorParams) {
    Shapeselect.css({
        "padding":"3px",
        "width":"100%",
        "box-sizing":"border-box",
    });

    //Set value of select to the current value of the cell
    Shapeselect.val(cell.getValue());

    //set focus on the select box when the select is selected (timeout allows for select to be added to DOM)
    onRendered(function(){
        Shapeselect.focus();
        Shapeselect.css("height","100%");
    });

    //when the value has been set, trigger the cell to update
    Shapeselect.on("change blur", function(e){
        success(Shapeselect.val());
    });

    //return the select element not the jquery wrapper.
    return Shapeselect[0];
}


var wheelchairLister = function (cell) {
	return wheelchairOptions;
}

var bikesAllowedLister = function (cell) {
	return bikesAllowedOptions;
}

var tripsTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' trips total';
}

// #########################################
// initializing tabulators
var tripsTable = new Tabulator("#trips-table", {
	selectable: 1,
	index: 'trip_id',
	movableRows: true,
	history: true,
	addRowPos: "top",
	movableColumns: true,
	layout: "fitDataFill",
	//pagination:"local", //enable local pagination.
	//groupBy: ['service_id','direction_id'],
	columns: [
		// route_id,service_id,trip_id,trip_headsign,direction_id,block_id,shape_id,wheelchair_accessible
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "Num", width: 40, formatter: "rownum", headerSort: false, frozen: true }, // row numbering
		{ title: "route_id", field: "route_id", headerSort: false, visible: true, frozen: true },
		{ title: "trip_id", field: "trip_id", headerFilter: "input", headerSort: false, frozen: true },
		{ title: "Calendar service", field: "service_id", editor: "select", editorParams: serviceLister, headerFilter: "input", validator: "required", headerSort: false },
		{ title: "direction_id", field: "direction_id", editor: "select", editorParams: { values: { 0: "Onward (0)", 1: "Return (1)", '': "None(blank)" } }, headerFilter: "input", headerSort: false, formatter: "lookup", formatterParams: { 0: 'Onward', 1: 'Return', '': '' } },
		{ title: "trip_headsign", field: "trip_headsign", editor: "input", headerFilter: "input", headerSort: false },
		{ title: "trip_short_name", field: "trip_short_name", editor: "input", headerFilter: "input", headerSort: false, bottomCalc: tripsTotal },
		{ title: "block_id", field: "block_id", editor: "input", headerFilter: "input", tooltip: "Vehicle identifier", headerSort: false },
		{ title: "shape_id", field: "shape_id", editor:ShapeselectEditor, headerFilter: "input", headerSort: false },
		{
			title: "wheelchair_accessible", field: "wheelchair_accessible", headerSort: false,
			editor: "select", editorParams: wheelchairLister			
		},
		{
			title: "bikes_allowed", field: "bikes_allowed", headerSort: false,
			editor: "select", editorParams: bikesAllowedLister			
		}
	],
	rowSelected: function (row) {
		// chosenTrip = row.getIndex();
		// chosenDirection = row.getData()['direction_id'];
		// if (!chosenDirection) chosenDirection = 0;
		// tripname = row.getData()['trip_short_name'] || row.getData()['trip_headsign'] || '';
		// if (tripname) tripname = chosenTrip + ': ' + tripname;
		// else tripname = chosenTrip;
		// $('#chosenTrip').html('<big><big><span class="badge label-green">' + tripname + '</span></big></big>');
		// stoptimesTable.clearData(); // on changing selection, clear the stop_times table in Timings tab.
		// $('#loadTimingsStatus').html('');

		// load up start time if in the format 
	},
	rowDeselected: function (row) {
		//
	},
	dataLoaded: function (data) {
		// var list = [];
		// data.forEach(function (row) {
		// 	list.push(row.trip_id);
		// });
	},
	dataEdited: function (data) {
		setSaveTrips(true);
		TripsTableEdited = true;
		// var list = [];
		// data.forEach(function (row) {
		// 	list.push(row.trip_id);
		// });
	}
});
// Tab seletion 
$('.nav-tabs a[href="#stoptimes"]').on('shown.bs.tab', function (event) {
	// Check if the table has unsaved data! 
	if (TripsTableEdited) {
		alert('There is unsaved data in the trips table. Please save it before going to the Stop times tab.');
	}
	else {
		// Check if a row is selected
		var selectedRows = tripsTable.getSelectedRows(); //get array of currently selected row components.
		if (selectedRows.length == 0) {
			alert('Please select a row in the rips table first');
			// select the trips tab
			$('.nav-tabs a[href="#trips"]').tab('show');
		}
		else {
			// loading stoptimes data for trip
			// select the values of the first selected trip.
			var row = selectedRows[0].getData();
			var trip_id = row.trip_id;
			var route_id = row.route_id;
			var direction = row.direction_id;
			var trip_short_name = row.trip_short_name;
			console.log(route_id);
			stoptimesTable.clearData();
			// loading stoptimings.
			getPythonStopTimes(trip_id, route_id, direction);

			// Setting table header info
			$("#StopTimesRoute").val($('#routeSelect').select2('data')[0].text);
			$("#StopTimesTrip").val(trip_id + ' - ' + trip_short_name);
			var directiontext;
			switch (direction) {
				case "0":
					directiontext = "Onward";
					break;
				case "1":
					directiontext = "Return"
					break;
				default:
					directiontext = "None"
					break;
			}
			$("#StopTimesDirection").val(directiontext);
		}
	}
});

var stoptimesTable = new Tabulator("#stop-times-table", {
	selectable: 0,
	index: 'stop_sequence',
	history: true,
	addRowPos: "top",
	movableColumns: true,
	layout: "fitDataFill",
	persistentFilter: true,
	columns: [
		// fields: trip_id,arrival_time,departure_time,stop_id,stop_sequence,timepoint,shape_dist_traveled
		{ rowHandle: true, formatter: "handle", frozen: true, width: 30, minWidth: 30, headerSort: false },
		{ title: "trip_id", field: "trip_id", visible: true, frozen: true, headerSort: false, width: 150 }, // keeping this visible to avoid confusions
		{ title: "stop_sequence", field: "stop_sequence", headerFilter: "input", headerSort: false, sorter: "number" },
		{ title: "stop_id", field: "stop_id", headerFilter: "input", headerSort: false },
		// to do: validation for hh:mm:ss and accepting hh>23
		{ title: "arrival_time", field: "arrival_time", editor: "input", headerFilter: "input", validator: "regex:\\(?:[012345]\d):(?:[012345]\d):(?:[012345]\d)", headerSort: false },
		{ title: "departure_time", field: "departure_time", editor: "input", headerFilter: "input", validator: "regex:\\(?:[012345]\d):(?:[012345]\d):(?:[012345]\d)", headerSort: false },
		{ title: "timepoint", field: "timepoint", headerFilter: "input", editor: "select", editorParams: { values: { 0: "0 - Estimated", 1: "1 - Accurate", "": "blank - Accurate" } }, headerSort: false },
		{ title: "shape_dist_traveled", field: "shape_dist_traveled", editor: "input", headerFilter: "input", validator: ["numeric", "min:0"], headerSort: false }
	],
	initialSort: [
		{ column: "stop_sequence", dir: "asc" }
	],
	dataEdited: function (cell) {
		setSaveTimings(true);
	}
});


// initiate bootstrap / jquery components like tabs, accordions
$(function () {
	// Hide things not needed until route selected.
	$("#noSequenceAlert").hide();
	$("#newTripHTML").hide();
	getPythonRoutes();
	getPythonIDs();
	getPythonCalendar();
	getPythonAllShapesList();
	getPythonStopsKeyed();
});

// button actions
$("#saveTrips").on("click", function () {
	saveTrips();
});

$("#saveTimings").on("click", function () {
	saveTimings();
});

$("#loadTimingsButton").on("click", function () {
	loadTimings();
});

$("#addTripButton").on("click", function () {
	addTrip();
});

$("#defaultShapesApplyButton").on("click", function () {
	defaultShapesApply();
});

// ##########################################
// Functions:

function getPythonTrips(route_id) {
	tripsTable.clearData();
	//$('#routeSelectStatus').html('');  
	$("#noSequenceAlert").hide();
	$("#newTripHTML").hide();

	if (!route_id || route_id == 'No Selection') return; // exit if no route actually selected

	chosenRoute = route_id; // set global variable
	$.toast({
		title: 'Trips',
		subtitle: 'Loading',
		content: 'Loading trips for route ' + route_id,
		type: 'info',
		delay: 1000
	});	
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}trips?route=${route_id}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded trips data for the chosen route from Server API/trips .`);
			var data = JSON.parse(xhr.responseText);
			tripsTable.setData(data.trips);
			$.toast({
				title: 'Trips',
				subtitle: 'Loaded',
				content: 'Loaded trips for route ' + route_id,
				type: 'success',
				delay: 5000
			});
			
			// resetting save to DB button if a new set of trips has been loaded from DB, clearing status text.
			setSaveTrips(false);
			$('#addTripStatus').html('');

			// SEQUENCE:
			sequenceHolder = data.sequence;
			console.log(sequenceHolder);
			if (!sequenceHolder) {
				$("#newTripHTML").hide('slow');
				$("#shapeApplyHTML").hide('slow');
				$("#noSequenceAlert").show('slow');
			} else $("#newTripHTML").show('slow');

			// Shape applying part
			var content = '';
			if (sequenceHolder.shape0)
				content += 'Onward: <b>' + sequenceHolder.shape0 + '</b>';

			if (sequenceHolder.shape1)
				content += '<br>Return: <b>' + sequenceHolder.shape1 + '</b>';

			$("#defaultShapesInfo").html(content);
			if (sequenceHolder.shape0 || sequenceHolder.shape1)
				$("#shapeApplyHTML").show('slow');
		}
		else {
			console.log('Server request to API/trips failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
			$.toast({
				title: 'Trips',
				subtitle: 'Loading',
				content: 'Could not load trips data from server. Message: ' + xhr.responseText,
				type: 'error',
				delay: 5000
			});			
		}
	};
	xhr.send();
}

function getPythonStopTimes(trip_id, route_id, direction) {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}stopTimes?trip=${trip_id}&route=${route_id}&direction=${direction}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded timings data for the chosen trip from Server API/stopTimes .`);
			var returndata = JSON.parse(xhr.responseText);
			if (returndata.newFlag) {
				setSaveTimings(true);
				populateStopTimesFromSequence(trip_id, direction);				
			}
			else {
				stoptimesTable.setData(returndata.data);
				setSaveTimings(false);
			}
		}
		else {
			console.log('Server request to API/stopTimes failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			$.toast({
				title: 'Loading stoptimes',
				subtitle: 'There is no data!',
				content: xhr.responseText,
				type: 'error',
				delay: 5000
			});
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

	var select2items = $.map(data, function (obj) {
		obj.id = obj.id || obj.route_id; // replace identifier
		if (obj.route_long_name) {
			obj.text = obj.text || obj.route_short_name + " - " + obj.route_long_name
		}
		else {
			obj.text = obj.text || obj.route_short_name
		}
		return obj;
	});

	$("#routeSelect").select2({
		placeholder: "Pick a Route",
		theme: 'bootstrap4',
		data: select2items,
		allowClear: true
	});

	if (data.length == 0) {
		console.log('No data!');
		return;
	}
	// 
	$('#routeSelect').on("select2:select", function (e) {
		let route_id = e.params.data.id;
		console.log(route_id);
		if (!route_id.length) {
			tripsTable.clearData();
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
		for (var i = 0; i < globalRoutes.length; i++) {
			if (globalRoutes[i].route_id == chosenRoute) {
				chosenRouteShortName = globalRoutes[i].route_short_name;
				break;
			}
		}
		console.log(chosenRouteShortName);
	});
}

function saveTimings() {
	var selected = tripsTable.getSelectedData();
	if (selected.length != 1) {
		console.log('Please select a trip_id and load the timings table first.');
		return;
	}
	var trip_id = selected[0].trip_id;
	var pw = $("#password").val();
	if (!pw.length) {
		$('#timingsSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	$.toast({
		title: 'Saving stop times',
		subtitle: 'Sending data',
		content: 'Sending modified timings data to server, please wait..',
		type: 'info',
		delay: 3000
	});	

	var timingsData = stoptimesTable.getData();
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=stop_times&key=trip_id&value=${trip_id}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			$.toast({
				title: 'Saved stop times',
				subtitle: 'Sucess',
				content: xhr.responseText,
				type: 'success',
				delay: 3000
			});	
			console.log('Successfully sent data via POST to server API/tableReadSave table=stop_times, resonse received: ' + xhr.responseText);			
			setSaveTimings(false);

		} else {
			$.toast({
				title: 'Saving stop times',
				subtitle: 'Error',
				content: xhr.responseText,
				type: 'error',
				delay: 3000
			});	
			console.log('Server POST request to API/tableReadSave table=stop_times failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText);			
		}
	}
	console.log('Sending POST request, please wait for callback.');
	xhr.send(JSON.stringify(timingsData));
}

function saveTrips() {
	var pw = $("#password").val();
	if (!pw.length) {
		$('#tripsSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	var tripsData = tripsTable.getData();
	var route_id = tripsData[0]['route_id'];

	$.toast({
		title: 'Trips',
		subtitle: 'Sending',
		content: 'Sending modified trips data to server, please wait..',
		type: 'info',
		delay: 1000
	});

	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=trips&key=route_id&value=${route_id}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			$.toast({
				title: 'Trips',
				subtitle: 'Saved',
				content: xhr.responseText,
				type: 'success',
				delay: 4000
			});			
			setSaveTrips(false);
			TripsTableEdited = false;
		} else {
			$.toast({
				title: 'Trips',
				subtitle: 'Error saving',
				content: xhr.responseText,
				type: 'error',
				delay: 4000
			});	
			console.log('Server POST request to API/tableReadSave failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText);			
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
		document.getElementById("saveTrips").className = "btn btn-primary";
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

// function loadTimings() {
// 	if( chosenTrip != '') {
// 		stoptimesTable.clearData();
// 		getPythonStopTimes(chosenTrip);
// 		$('#loadTimingsStatus').html('<div class="alert alert-info">Loading timings..</div>');
// 	}
// 	else 
// 		$('#loadTimingsStatus').html('<div class="alert alert-warning">Choose the trip first from the table in Trips tab.</div>');
// }

function addTrip() {
	route_id = $("#routeSelect").val();
	if (!route_id) return;

	var trip_time = $('#trip_time').val();
	console.log(trip_time);
	if (!trip_time.length) { shakeIt('trip_time'); return; }

	var service_id = $('#trip_calendar').val();

	var direction = $('#trip_direction').val();
	// if "both" is selected then we need to loop. Hence, array.
	// 5.9.18: addind in support for blank direction
	if (direction == 'both') directionsArray = [0, 1];
	else if (parseInt(direction) == 0) directionsArray = [0];
	else if (parseInt(direction) == 1) directionsArray = [1];
	else directionsArray = [''];

	// console.log(directionsArray);

	var counter = 1;
	var message = '';

	for (i in directionsArray) { // looping through directions. If just one direction then fine.

		// search next available id
		var tripsTableList = tripsTable.getData().map(a => a.trip_id);
		var allTrips = trip_id_list.concat(tripsTableList);

		// loop till you find an available id:
		while (allTrips.indexOf(route_id + pad(counter)) > -1)
			counter++;

		dirIndex = (directionsArray[i] == '' ? 0 : directionsArray[i]);

		var trip_id = route_id + pad(counter);
		// to do: change this, adopt naming conventions.
		//var trip_id = `${route_id}.${service_id}.${dirIndex}.${}` + '.'pad(counter);


		let sequence = sequenceHolder[dirIndex];
		var last_stop_id = sequence[sequence.length - 1];
		var trip_headsign = allStopsKeyed[last_stop_id]['stop_name'];
		var trip_short_name = chosenRouteShortName + ' ' + trip_time + ' to ' + trip_headsign;
		var shape_id = '';
		if (sequenceHolder['shape' + dirIndex]) shape_id = sequenceHolder['shape' + dirIndex];

		tripsTable.addRow([{
			route_id: route_id, trip_id: trip_id,
			service_id: service_id, direction_id: directionsArray[i], shape_id: shape_id,
			trip_short_name: trip_short_name, trip_headsign: trip_headsign
		}], true);

	}

	$('#addTripStatus').html('<span class="alert alert-success">Trip(s) added with id ' + trip_id + '. Fill its info in the table and then save changes.</span>');

	tripsTable.redraw(true);

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
	var jqxhr = $.get(`${APIpath}tripIdList`, function (data) {
		trip_id_list = JSON.parse(data);
		console.log('All trip ids list loaded after GET request to API/tripIdList.');
	})
		.fail(function () {
			console.log('GET request to API/tripIdList failed.')
		});

}


function populateStopTimesFromSequence(trip_id, direction_id) {
	if (!sequenceHolder) {
		$('#loadTimingsStatus').html('<div class="alert alert-danger">Error: Sequence for this route is missing. Please go to <a href="sequence.html">Default Sequence</a> page and finalize the sequence first.</div>');
		return;
	}
	var timesArray = [];

	var list = sequenceHolder[parseInt(direction_id)];
	for (i in list) {
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
	timesArray[list.length - 1]['arrival_time'] = timesArray[list.length - 1]['departure_time'] = '01:00:00';
	stoptimesTable.setData(timesArray);
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
			data.forEach(function (row) {
				var start = row['start_date'];
				var end = row['end_date'];
				//if(!start || !end) continue; // didn't work

				days = '';
				days += ((row['monday'] == 1) ? 'M' : '_')
				days += ((row['tuesday'] == 1) ? 'T' : '_')
				days += ((row['wednesday'] == 1) ? 'W' : '_')
				days += ((row['thursday'] == 1) ? 'T' : '_')
				days += ((row['friday'] == 1) ? 'F' : '_')
				days += ' ';
				days += ((row['saturday'] == 1) ? 'S' : '_')
				days += ((row['sunday'] == 1) ? 'S' : '_')

				serviceListGlobal[row['service_id']] = row['service_id'] + ': ' + days + ', ' + start + '-' + end;

				// populate dropdown for new trip creation
				var select = '';
				if (!selectedFlag) {
					select = '  selected="selected"'; selectedFlag = true;
				}
				dropdown += '<option value="' + row['service_id'] + '"' + select + '>' + row['service_id'] + ': ' + days + ', ' + start + '-' + end + '</option>';
			});
			$('#trip_calendar').html(dropdown);

		}
		else {
			console.log('Server request to API/calendar failed. Returned status of ' + xhr.status + ', response: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function getPythonAllShapesList() {
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get(`${APIpath}allShapesList`, function (data) {
		list = JSON.parse(data)['all'];
		console.log('GET request to API/allShapesList succesful.');
		list.forEach(function (row) {
			var newOption = new Option(row, row, false, false);
			Shapeselect.append(newOption);			
		});
	})
		.fail(function () {
			console.log('GET request to API/allShapesList failed.')
		});

}

function resetTimings() {
	stoptimesTable.clearData();		
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
	var tripsData = tripsTable.getData();

	tripsData.forEach(function (row) {

		if (sequenceHolder.shape0)
			if (row.direction_id == 0)
				row.shape_id = sequenceHolder.shape0;

		if (sequenceHolder.shape1)
			if (row.direction_id == 1)
				row.shape_id = sequenceHolder.shape1;

	});

	tripsTable.setData(tripsData);
	tripsTable.redraw(true);

	$("#defaultShapesApplyStatus").html('<font color="green"><b><font size="5">&#10004;</font></b> Done!</font> Save Changes to save to DB.');
	setSaveTrips(true);
}
