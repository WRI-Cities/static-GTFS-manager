//###################
// global variables
const exact_timesChoices = {0:"0 - Not exactly scheduled", 1:"1 - Exactly scheduled", '':"blank - not exactly scheduled (default)"};
var service_id_list = [];

// #########################################
// Function-variables to be used in tabulator
var freqTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' frequencies total';
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
		{title:"trip_id", field:"trip_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", bottomCalc:freqTotal, width:200 },
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
	;
});

// #########################
// Buttons

$("#addFreqButton").on("click", function(){
	let trip_id = $("#freq2add").val();
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
