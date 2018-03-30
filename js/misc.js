var operationalChoices = {1:"1 - Operating on this day", 0:"0 - Not operating"};
var service_id_list = [];

$("#calendar-table").tabulator({
	selectable:1,
	index: 'service_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",

	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"service_id", field:"service_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id" },
		{title:"monday", field:"monday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"tuesday", field:"tuesday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"wednesday", field:"wednesday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"thursday", field:"thursday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"friday", field:"friday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"saturday", field:"saturday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"sunday", field:"sunday", editor:"select", editorParams:operationalChoices, headerSort:false },
		{title:"start_date", field:"start_date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd" },
		{title:"end_date", field:"end_date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd" }
	]
});

$(document).ready(function() {
 // executes when HTML-Document is loaded and DOM is ready
	getPythonAgency();
	getPythonCalendar();
});

// Setting accordion
$( "#instructions" ).accordion({
	collapsible: true, active: false
});
$( "#logaccordion" ).accordion({
	collapsible: true, active: false
});

// #########################
// Buttons

$("#addService").on("click", function(){
	var service_id = $('#service2add').val();
	
	if(service_id.length < 1) { //validation
		$('#serviceAddStatus').text('Invalid entry, try again');
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

$("#saveCalendar").on("click", function(){
	saveCalendar();
});

// #########################
// Functions

function getPythonCalendar() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}calendar`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/calendar .`);
			var data = JSON.parse(xhr.responseText);
			initiateCalendar(data);
		}
		else {
			console.log('Server request to API/allStops for all stops failed.  Returned status of ' + xhr.status + '\nLoading backup.');
			var backup = [{"service_id":"WK","monday":1,"tuesday":1,"wednesday":1,"thursday":1,"friday":1,"saturday":1,"sunday":0,"start_date":"20180101","end_date":"20990101"},{"service_id":"SU","monday":0,"tuesday":0,"wednesday":0,"thursday":0,"friday":0,"saturday":0,"sunday":1,"start_date":"20180101","end_date":"20990101"}];
			initiateCalendar(backup);
		}
	};
	xhr.send();
}

function initiateCalendar(data) {
	$("#calendar-table").tabulator('setData', data); 
}

function saveCalendar() {
	$('#calendarSaveStatus').text('');

	var data = $("#calendar-table").tabulator('getData');
	
	var pw = $("#password").val();

	console.log('sending calendar data to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `/API/calendar?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server /API/calendar, resonse received: ' + xhr.responseText);
			$('#calendarSaveStatus').text('Success. Message: ' + xhr.responseText);
		} else {
			console.log('Server POST request to API/calendar failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#calendarSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
	
}

function addVar(row, id) {
	row[id] = $('#'+id).val();
}

function getPythonAgency() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}agency`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded agency data from Server API/agency .`);
			var data = JSON.parse(xhr.responseText);
			initiateAgency(data);
		}
		else {
			console.log('Server request to API/agency failed.  Returned status of ' + xhr.status + '\nLoading backup.');
			var backup = [{"agency_id": "KMRL", "agency_name": "Kochi Metro", "agency_url": "http://www.kochimetro.org/", "agency_timezone": "Asia/Kolkata"}];
			initiateAgency(backup);
		}
	};
	xhr.send();
}

function initiateAgency (data) {
	$('#agency_id').val(data[0].agency_id);
	$('#agency_name').val(data[0].agency_name);
	$('#agency_url').val(data[0].agency_url);
	$('#agency_timezone').val(data[0].agency_timezone);
}

$('#saveAgency').on('click', function(){
	saveAgency();
});

function saveAgency() {
	$('#agencySaveStatus').text('');

	var row = {};
	addVar(row, 'agency_id');
	addVar(row, 'agency_name');
	addVar(row, 'agency_url');
	addVar(row, 'agency_timezone');
	var data=[];
	data.push(row);

	var pw = $("#password").val();

	console.log('sending to server via POST: '+ JSON.stringify(data));
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `/API/saveAgency?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server /API/saveAgency, resonse received: ' + xhr.responseText);
			$('#agencySaveStatus').text('Saved changes to agency.txt.');
		} else {
			console.log('Server POST request to API/saveAgency failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#agencySaveStatus').text('Failed to save. Message: ' + xhr.responseText);
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
}