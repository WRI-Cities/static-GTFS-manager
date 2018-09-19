//###################
// global variables
const operationalChoices = {1:"1 - Operating on this day", 0:"0 - Not operating"};
var service_id_list = [];

// #########################################
// Function-variables to be used in tabulator
var calendarTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' services total';
}

//####################
// Tabulator tables
$("#calendar-table").tabulator({
	selectable:0,
	index: 'service_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}calendar`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"service_id", field:"service_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", bottomCalc:calendarTotal },
		{title:"monday", field:"monday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"tuesday", field:"tuesday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"wednesday", field:"wednesday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"thursday", field:"thursday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"friday", field:"friday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"saturday", field:"saturday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"sunday", field:"sunday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"start_date", field:"start_date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd" },
		{title:"end_date", field:"end_date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd" }
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to calendar failed.  Returned status of: ' + errorThrown);
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

$("#addService").on("click", function(){
	var service_id = $('#service2add').val();
	
	if(service_id.length < 1) { //validation
		$('#serviceAdfunctiondStatus').text('Invalid entry, try again');
		return;
	}

	let data = $("#calendar-table").tabulator("getData");
	service_id_list = data.map(a => a.service_id); 
	
	if ( service_id_list.indexOf(service_id) > -1) {
		$('#serviceAddStatus').text('This id is already taken. Try another value.');
		return;
	}
	$("#calendar-table").tabulator('addRow',{service_id: service_id},true);
	$('#service2add').val('');
	$('#serviceAddStatus').text('Calendar service added with id ' + service_id + '. Fill its info in the table and then save changes.');
});

$("#saveCalendarButton").on("click", function(){
	saveCalendar();
});

$("#calendar2add").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});


$('#addCalendarButton').on('click', function(){
	addCalendar();
});

// #########################
// Functions

function saveCalendar() {
	$('#calendarSaveStatus').html('Sending data to server.. Please wait..');

	var data = $("#calendar-table").tabulator('getData');
	
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#calendarSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	console.log('sending calendar data to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}calendar?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('<span class="alert alert-success">Successfully sent data via POST to server /API/calendar, resonse received: ' + xhr.responseText + '</span>');
			$('#calendarSaveStatus').html('Success. Message: ' + xhr.responseText);
		} else {
			console.log('Server POST request to API/calendar failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#calendarSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+ '</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
	
}

function addCalendar() {
	var data = $('#calendar-table').tabulator('getData');
	var service_id = $('#calendar2add').val().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
	$('#calendar2add').val(service_id);
	if(! service_id.length) {
		$('#calendarAddStatus').html('<span class="alert alert-warning">Give a valid id please.</span>');
		return;
	}
	
	var service_id_list = data.map(a => a.service_id);
	var isPresent = service_id_list.indexOf(service_id) > -1;
	if(isPresent) {
		$('#calendarAddStatus').html('<span class="alert alert-danger">' + service_id + ' is already there.</span>');
	} else {
		$("#calendar-table").tabulator("addRow",{ 'service_id': service_id } );
		$('#calendarAddStatus').html('<span class="alert alert-success">Added service_id ' + service_id + '</span>');
	}
}
