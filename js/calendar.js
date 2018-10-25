//###################
// global variables
var service_id_list = [];

// note: constants moved to config/settings.js
// #########################################
// Function-variables to be used in tabulator
var calendarTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' services total';
}

var calendarDatesTotal = function(values, data, calcParams){
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
	ajaxURL: `${APIpath}tableReadSave?table=calendar`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"service_id", field:"service_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", bottomCalc:calendarTotal, validator:tabulator_UID_leastchars },
		{title:"monday", field:"monday", editor:"select", editorParams:calendar_operationalChoices, headerSort:false },
		{title:"tuesday", field:"tuesday", editor:"select", editorParams:calendar_operationalChoices, headerSort:false },
		{title:"wednesday", field:"wednesday", editor:"select", editorParams:calendar_operationalChoices, headerSort:false },
		{title:"thursday", field:"thursday", editor:"select", editorParams:calendar_operationalChoices, headerSort:false },
		{title:"friday", field:"friday", editor:"select", editorParams:calendar_operationalChoices, headerSort:false },
		{title:"saturday", field:"saturday", editor:"select", editorParams:calendar_operationalChoices, headerSort:false },
		{title:"sunday", field:"sunday", editor:"select", editorParams:calendar_operationalChoices, headerSort:false },
		{title:"start_date", field:"start_date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd" },
		{title:"end_date", field:"end_date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd" }
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to calendar failed.  Returned status of: ' + errorThrown);
	}
});

$("#calendar-dates-table").tabulator({
	selectable:0,
	index: 'service_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}tableReadSave?table=calendar_dates`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"service_id", field:"service_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", bottomCalc:calendarDatesTotal, validator:tabulator_UID_leastchars },
		{title:"date", field:"date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd", width: 150 },
		{title:"exception_type", field:"exception_type", editor:"select", editorParams:calendar_exception_type_choices, headerFilter:"input", headerTooltip: "indicates whether service is available on the date specified in the date field."  }
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to calendar_dates failed.  Returned status of: ' + errorThrown);
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

/*
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
*/

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
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=calendar`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('<span class="alert alert-success">Successfully sent data via POST to server /API/tableReadSave for table=calendar, response received: ' + xhr.responseText + '</span>');
			$('#calendarSaveStatus').html('Success. Message: ' + xhr.responseText);
		} else {
			console.log('Server POST request to API/tableReadSave for table=calendar failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#calendarSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+ '</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
	
}

function addCalendar(table="calendar-table") {

	if(table == 'calendar-table') {
		statusHolder = 'calendarAddStatus';
		inputHolder = 'calendar2add';
	}
	else {
		statusHolder = 'calendarDatesAddStatus';
		inputHolder = 'calendarDates2add';
	}

	var data = $('#'+table).tabulator('getData');

	//var service_id = $('#calendar2add').val().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
	var service_id = $('#'+inputHolder).val().replace(/[ `,]/g, "");

	
	$('#calendar2add').val(service_id);
	if(! service_id.length) {
		$('#'+statusHolder).html('<span class="alert alert-warning">Give a valid id please.</span>');
		return;
	}
	
	var service_id_list = data.map(a => a.service_id);
	var isPresent = service_id_list.indexOf(service_id) > -1;
	if(isPresent) {
		$('#'+statusHolder).html('<span class="alert alert-danger">Sorry, ' + service_id + ' is already taken. Please try another value.</span>');
	} else {
		$('#'+table).tabulator("addRow",{ 'service_id': service_id } );
		$('#'+statusHolder).html('<span class="alert alert-success">Added service_id ' + service_id + '</span>');
	}
}

// ############################
// 23.10.18: Calendar_dates:

$('#addCalendarDatesButton').on('click', function(){
	addCalendar(table="calendar-dates-table");
});

$("#saveCalendarDatesButton").on("click", function(){
	$('#calendarDatesSaveStatus').html('Sending data to server.. Please wait..');

	var data = $("#calendar-dates-table").tabulator('getData');
	
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#calendarSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	console.log('sending calendarDates data to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=calendar_dates`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('<span class="alert alert-success">Successfully sent data via POST to server /API/tableReadSave&table=calendar_dates, response received: ' + xhr.responseText + '</span>');
			$('#calendarDatesSaveStatus').html('Success. Message: ' + xhr.responseText);
		} else {
			console.log('Server POST request to API/tableReadSave failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#calendarDatesSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+ '</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
	
});
