//###################
// global variables
const exact_timesChoices = {0:"0 - Not exactly scheduled", 1:"1 - Exactly scheduled", '':"blank - not exactly scheduled (default)"};

// #########################################
// Function-variables to be used in tabulator
var freqTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' frequencies total';
}

var tripListGlobal = {};
var tripLister = function(cell) {
	return tripListGlobal;
}

//####################
// Tabulator tables
$("#frequencies-table").tabulator({
	selectable:0,
	index: 'trip_id',
	movableRows: true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}tableReadSave?table=frequencies`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"trip_id", field:"trip_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", bottomCalc:freqTotal, width:200, editor:"select", editorParams:tripLister },
		{title:"start_time", field:"start_time", editor:"input", headerFilter:"input", headerFilterPlaceholder:"HH:MM:SS" },
		{title:"end_time", field:"end_time", editor:"input", headerFilter:"input", headerFilterPlaceholder:"HH:MM:SS"},
		{title:"headway_secs", field:"headway_secs", editor:"input", headerFilter:"input", headerTooltip:"time between departures"},
		{title:"exact_times", field:"exact_times", editor:"select", editorParams:exact_timesChoices, headerFilter:"input"},
		
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to tableReadSave table=frequencies failed.  Returned status of: ' + errorThrown);
	}
});

// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	getPythonRoutesList();
});

// #########################
// Buttons

$("#addFreqButton").on("click", function(){
	let trip_id = $("#tripSelect").val();
	if(!trip_id) {
		$("#freqAddStatus").html('Please choose a valid trip_id value.');
		setTimeout(function(){ $("#freqAddStatus").html(''); },10000);
		return;
	}
	$("#frequencies-table").tabulator("addRow", {trip_id:trip_id}, true);
	$("#freqAddStatus").html('Added.');
	setTimeout(function(){ $("#freqAddStatus").html(''); },10000);
});


$("#saveFreqButton").on("click", function(){
	$('#freqSaveStatus').html('Sending data to server.. Please wait..');

	var data = $("#frequencies-table").tabulator('getData');
	
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#freqSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	console.log('sending frequencies data to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?table=frequencies&pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('<span class="alert alert-success">Successfully sent data via POST to server API/tableReadSave?table=frequencies, response received: ' + xhr.responseText + '</span>');
			$('#freqSaveStatus').html('Success. Message: ' + xhr.responseText);
		} else {
			console.log('Server POST request to API/tableReadSave?table=frequencies failed. Returned status of ' + xhr.status + ', response: ' + xhr.responseText );
			$('#freqSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+ '</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
	
});

function getPythonRoutesList() {
	/* to do:
	get list of trip_ids from trips table
	populate a dropdown with it for new frequency adding. It must be an existing trip.
	*/
	var jqxhr = $.get( `${APIpath}tableColumn?table=routes&column=route_id`, function( data ) {
		trip_id_list =  JSON.parse(data) ;
		console.log('GET request to API/tableColumn table=routes successful.');
		var content = '<option value="">Choose a Route</option>';
		trip_id_list.forEach(element => {
			//tripListGlobal[element] = element;
			content += `<option value="${element}">${element}</option>`;
		});
		$('#routeSelect').html(content);
		$('#routeSelect').trigger('chosen:updated'); // update if re-populating
		$('#routeSelect').chosen({search_contains:true, width:200, placeholder_text_single:'Pick a Route'});
	})
	.fail( function() {
		console.log('GET request to API/tableColumn table=routes failed.')
	});
}

function getPythonTripsList() {
	var route_id = $('#routeSelect').val();
	if(!route_id.length) {
		$("#freqAddStatus").html('Please choose a valid route_id to load its trips.');
		//shakeIt('routeSelect'); // doesn't seem to work well on chosen dropdowns
		return;
	}

	var jqxhr = $.get( `${APIpath}tableColumn?table=trips&column=trip_id&key=route_id&value=${route_id}`, function( data ) {
		trip_id_list =  JSON.parse(data) ;
		console.log('GET request to API/tableColumn table=trips successful.');
		var content = '<option value="">Choose a Trip</option>';
		trip_id_list.forEach(element => {
			//tripListGlobal[element] = element;
			content += `<option value="${element}">${element}</option>`;
		});
		$('#tripSelect').html(content);
		$('#tripSelect').trigger('chosen:updated'); // update if re-populating
		$('#tripSelect').chosen({search_contains:true, width:200, placeholder_text_single:'Pick a Trip'});
	})
	.fail( function() {
		console.log('GET request to API/tableColumn table=trips failed.')
	});
}