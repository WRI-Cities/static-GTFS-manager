//###################
// global variables
var operationalChoices = {1:"1 - Operating on this day", 0:"0 - Not operating"};
var service_id_list = [];
var globalIDs = {}; // Contains keys: stop_id_list, route_id_list, trip_id_list, shapeIDsJson, zone_id_list, service_id_list
var globalKey = '';
var globalValue = '';
var globalTables = '';
var globalSecondaryTables = '';

// for Maintenance Change UID function:
var globalValueFrom = '';
var globalValueTo = '';
var globalTableKeys = [];


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
		{title:"end_date", field:"end_date", editor:"input", headerFilter:"input", headerFilterPlaceholder:"yyyymmdd" },
		{formatter:"buttonCross", align:"center", title:"del", headerSort:false, cellClick:function(e, cell){
			if(confirm('Are you sure you want to delete this entry?'))
				cell.getRow().delete();
			}}
	]
});

$("#agency-table").tabulator({
	selectable:0,
	index: 'agency_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	// trans_id,lang,translation
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"agency_id", field:"agency_id", editor:"input", headerSort:false },
		{title:"agency_name", field:"agency_name", editor:"input", headerSort:false },
		{title:"agency_url", field:"agency_url", editor:"input", headerSort:false },
		{title:"agency_timezone", field:"agency_timezone", editor:"input", headerSort:false, tooltip:'Get your timezone from TZ column in https://en.wikipedia.org/wiki/List_of_tz_database_time_zones' },
		{formatter:"buttonCross", align:"center", title:"del", headerSort:false, cellClick:function(e, cell){
			if(confirm('Are you sure you want to delete this entry?')) {
				let agency_id = cell.getRow().getIndex();
				cell.getRow().delete();
				$('#agencyAddStatus').html('<span class="alert alert-warning">Deleted agency_id ' + agency_id + '</span>');
			}
		}}
	]
});

$("#translations-table").tabulator({
	selectable:0,
	index: 'trans_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	// agency_id,agency_name,agency_url,agency_timezone
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"trans_id", field:"trans_id", editor:"input", headerFilter:"input", headerSort:false, width:120 },
		{title:"lang", field:"lang", editor:"input", headerFilter:"input", headerSort:false },
		{title:"translation", field:"translation", editor:"input", headerFilter:"input", headerSort:false, width:150, formatter:function(cell, formatterParams){
			return "<big>" + cell.getValue() + '</big>'; //return the contents of the cell;
			}
		},
		{formatter:"buttonCross", align:"center", title:"del", headerSort:false, cellClick:function(e, cell){
			if(confirm('Are you sure you want to delete this entry?'))
				cell.getRow().delete();
			}}
	]
});

// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	// Setting accordion
	$( "#instructions" ).accordion({
		collapsible: true, active: false
	});
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	// tabs
	$( "#tabs" ).tabs({
		active:0
	});
	$( "#tabs2" ).tabs({
		active:0,
		activate: function(event ,ui){
			resetGlobals();
		}
	});
	getPythonAgency();
	getPythonCalendar();
	getPythonTranslations();
	getPythonAllIDs();
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

$('#saveAgencyButton').on('click', function(){
	saveAgency();
});

$('#addAgencyButton').on('click', function(){
	addAgency();
});

$('#delAgencyButton').on('click', function(){
	delAgency();
});

$('#addCalendarButton').on('click', function(){
	addCalendar();
});

$('#delCalendarButton').on('click', function(){
	delCalendar();
});

$('#addTranslationButton').on('click', function(){
	addTranslation();
});

$('#saveTranslationButton').on('click', function(){
	saveTranslation();
});

$('#deepActionsButton').on('click', function(){
	deleteByKey();
});

$('#replaceDryRunButton').on('click', function(){
	replaceIDDryRun();
});

$('#replaceIDButton').on('click', function(){
	replaceID();
});

$('#replaceIDButton').on('keyPress', function(){
	replaceID();
});

$("#renameDestination").bind("change keyup", function(){
	resetGlobals();
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
			$("#calendar-table").tabulator('setData', data); 
		}
		else {
			console.log('Server request to API/calendar failed. Returned status of ' + xhr.status + ', response: ' + xhr.responseText );
			$("#calendar-table").html('Failed to load data from server.');
		}
	};
	xhr.send();
}


function getPythonAgency() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}agency`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded agency data from Server API/agency .`);
			var data = JSON.parse(xhr.responseText);
			$('#agency-table').tabulator('setData',data);
		}
		else {
			console.log('Server request to API/agency failed.  Returned status of ' + xhr.status);
		}
	};
	xhr.send();
}


function saveCalendar() {
	$('#calendarSaveStatus').html('Sending data to server.. Please wait..');

	var data = $("#calendar-table").tabulator('getData');
	
	var pw = $("#password").val();

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

function saveAgency() {
	$('#agencySaveStatus').html('Sending data to server.. please wait..');
	var pw = $("#password").val();
	var data = $('#agency-table').tabulator('getData');

	console.log('sending to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}agency?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/agency, response received: ' + xhr.responseText);
			$('#agencySaveStatus').html('<span class="alert alert-success">Success. Message: ' + xhr.responseText + '</span>');
		} else {
			console.log('Server POST request to API/agency failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#agencySaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+'</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
}

function addAgency() {
	var data = $('#agency-table').tabulator('getData');
	var agency_id = $('#agency2add').val().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
	$('#agency2add').val(agency_id);
	if(! agency_id.length) {
		$('#agencyAddStatus').html('<span class="alert alert-warning">Give a valid id please.</span>');
		return;

	}
	
	var agency_id_list = data.map(a => a.agency_id);
	var isPresent = agency_id_list.indexOf(agency_id) > -1;
	if(isPresent) {
		$('#agencyAddStatus').html('<span class="alert alert-danger">' + agency_id + ' is already there.</span>');
	} else {
		$("#agency-table").tabulator("addRow",{ 'agency_id': agency_id, 'agency_timezone':'Asia/Kolkata' } );
		$('#agencyAddStatus').html('<span class="alert alert-success">Added agency_id ' + agency_id + '</span>');
	}

}

function delAgency() {
	var agency_id = $('#agency2add').val().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
	$('#agency2add').val(agency_id);

	if( $("#agency-table").tabulator("deleteRow", agency_id ) )
		$('#agencyAddStatus').html('<span class="alert alert-warning">Deleted agency_id ' + agency_id + '</span>');
	else
		$('#agencyAddStatus').html('<span class="alert alert-danger">' + agency_id + ' is not there.</span>');
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

function delCalendar() {
	var service_id = $('#calendar2add').val().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
	$('#calendar2add').val(service_id);

	if( $("#calendar-table").tabulator("deleteRow", service_id ) )
		$('#calendarAddStatus').html('<span class="alert alert-warning">Deleted service_id ' + service_id + '</span>');
	else
		$('#calendarAddStatus').html('<span class="alert alert-danger">' + service_id + ' is not there.</span>');
}

function getPythonTranslations() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}translations`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded translations data from Server API/translations .`);
			var data = JSON.parse(xhr.responseText);
			$('#translations-table').tabulator('setData',data);
		}
		else {
			console.log('Server request to API/translations failed.  Returned status of ' + xhr.status);
		}
	};
	xhr.send();
}

function addTranslation() {
	$('#translationSaveStatus').html('&nbsp;');
	
	var trans_id = $('#trans_id').val().trim();
	var lang = $('#lang').val().trim();
	var translation = $('#translation').val().trim();
	// autocorrect
	$('#trans_id').val(trans_id);
	$('#lang').val(lang);
	$('#translation').val(translation);
	//validation
	if(!trans_id.length || !lang.length || !translation.length || lang.length>2) {
		$('#translationAddStatus').html('<span class="alert alert-warning">Please enter valid inputs.</span>');
		return;
	}

	var data = $('#translations-table').tabulator('getData');
	var translist = []
	data.forEach(function(row){
			translist.push(row.trans_id + '|' + row.lang);
		});
	let concat = trans_id + '|' + lang;
	var isPresent = translist.indexOf(concat) > -1;
	if(isPresent){
		$('#translationAddStatus').html('<span class="alert alert-warning">This translation is already present. Please find it in the table and edit it there.</span>');
	} else {
		$('#translations-table').tabulator('addRow', {'trans_id':trans_id, 'lang':lang, 'translation':translation},true );
		$('#translationAddStatus').html('<span class="alert alert-success">Added translation.</span>');
	}

	//$('#translations-table').tabulator('addRow', );
	// translationAddStatus
}

function saveTranslation() {
	
	$('#translationSaveStatus').html('<span class="alert alert-secondary">Sending data to server.. please wait..</span>');
	$('#translationAddStatus').html('&nbsp;');
	var pw = $("#password").val();
	var data = $('#translations-table').tabulator('getData');

	console.log('sending to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}translations?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/translations, response received: ' + xhr.responseText);
			$('#translationSaveStatus').html('<span class="alert alert-success">Success. Message: ' + xhr.responseText + '</span>');
		} else {
			console.log('Server POST request to API/translations failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#translationSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+'</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
}

function getPythonAllIDs() {
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}listAll`, function( data ) {
		globalIDs =  JSON.parse(data) ;
		console.log('listAll API GET request successful. Loaed lists of all ids.');
		populateMaintenanceLists();
	})
	.fail( function() {
		console.log('GET request to API/tripIdList failed.')
	});

}

// #################################
function populateMaintenanceLists() {
	//globalIDs
	var renameContent = '<option>No Selection</option>';
	// stop2Delete
	var content = '<option>No Selection</option>';
	globalIDs['stop_id_list'].forEach(function(row){
		content += `<option value="${row}">${row}</option>`;
		renameContent+= `<option value='{"stop_id":"${row}"}'>stop: ${row}</option>`;
	});

	$('#stop2Delete').html(content);
	$('#stop2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Stop'});
	$('#stop2Delete').on('change', function(evt,params) {
		if(!params) return;
		let stop_id = params.selected;
		console.log(stop_id);
		globalKey = 'stop_id';
		globalValue = stop_id;
		globalTables = 'stops,stop_times';
		globalSecondaryTables='';
		diagnoseID(globalKey,globalValue,globalTables,globalSecondaryTables);
	});

	// route2Delete
	var content = '<option>No Selection</option>';
	globalIDs['route_id_list'].forEach(function(row){
		content += `<option value="${row}">${row}</option>`;
		renameContent+= `<option value='{"route_id":"${row}"}'>route: ${row}</option>`;
	});

	$('#route2Delete').html(content);
	$('#route2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Route' });
	$('#route2Delete').on('change', function(evt,params) {
		if(!params) return;
		let route = params.selected;
		console.log(route);
		globalKey = 'route_id';
		globalValue = route;
		globalTables = 'routes,trips';
		globalSecondaryTables = '';
		diagnoseID(globalKey,globalValue,globalTables,globalSecondaryTables);
	});

	// trip2Delete
	var content = '<option>No Selection</option>';
	globalIDs['trip_id_list'].forEach(function(row){
		content += `<option value="${row}">${row}</option>`;
		renameContent+= `<option value='{"trip_id":"${row}"}'>trip: ${row}</option>`;
	});

	$('#trip2Delete').html(content);
	$('#trip2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Trip'});
	$('#trip2Delete').on('change', function(evt,params) {
		if(!params) return;
		let trip = params.selected;
		console.log(trip);
		globalKey = 'trip_id';
		globalValue = trip;
		globalTables = 'trips,stop_times';
		globalSecondaryTables = '';
		diagnoseID(globalKey,globalValue,globalTables,globalSecondaryTables);
	});

	// shape2Delete
	var content = '<option>No Selection</option>';
	globalIDs['shapeIDsJson']['all'].forEach(function(row){
			content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"shape_id":"${row}"}'>shape: ${row}</option>`;
	});
	$('#shape2Delete').html(content);
	$('#shape2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Shape'});
	$('#shape2Delete').on('change', function(evt,params) {
		if(!params) return;
		let shape = params.selected;
		console.log(shape);
		globalKey = 'shape_id';
		globalValue = shape;
		globalTables = 'shapes';
		globalSecondaryTables = 'trips'
		diagnoseID(globalKey,globalValue,globalTables,globalSecondaryTables);
	});

	// zone2Delete
	var content = '<option>No Selection</option>';
	globalIDs['zone_id_list'].forEach(function(row){
			content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"zone_id":"${row}"}'>fare zone: ${row}</option>`;
	});
	$('#zone2Delete').html(content);
	$('#zone2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Fare Zone'});
	$('#zone2Delete').on('change', function(evt,params) {
		if(!params) return;
		let zone = params.selected;
		console.log(zone);
		globalKey = 'zone_id';
		globalValue = zone;
		globalTables = '';
		globalSecondaryTables = 'stops'
		diagnoseID(globalKey,globalValue,globalTables,globalSecondaryTables);

	});

	// service2Delete
	var content = '<option>No Selection</option>';
	globalIDs['service_id_list'].forEach(function(row){
			content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"service_id":"${row}"}'>calendar service: ${row}</option>`;
	});
	$('#service2Delete').html(content);
	$('#service2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Calendar Service'});
	$('#service2Delete').on('change', function(evt,params) {
		if(!params) return;
		let service = params.selected;
		console.log(service);
		globalKey = 'service_id';
		globalValue = service;
		globalTables = 'calendar';
		globalSecondaryTables = 'trips'
		diagnoseID(globalKey,globalValue,globalTables,globalSecondaryTables);
	});

	$('#renameSource').html(renameContent);
	$('#renameSource').chosen({search_contains:true, allow_single_deselect:true, width:200, placeholder_text_single:'Pick a UID'});
	$('#renameSource').on('change', function(evt,params) {
		if(!params) return;
		let uid = params.selected;
		if(uid == 'No Selection') return;
		console.log(JSON.parse(uid));
		// reset the rename button when selection has changed.
		resetGlobals();
	});
}

// #################################

function diagnoseID(key,value,tables,secondarytables) {
	if(value == 'No Selection' || value == '') {
		resetGlobals();
		return;
	}

		// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}diagnoseID?key=${key}&value=${value}&tables=${tables}&secondarytables=${secondarytables}`, function( data ) {
		console.log('diagnoseID API GET request successful.');
		returndata = JSON.parse(data);
		var content = 'Listing changes that will happen for deleting ' + key + ' = ' + value + '\n';

		if(Object.keys(returndata['main']).length) {
			content += '\n' + Array(100).join("#") + '\nThe following table entries will be deleted:\n\n';
			for(tablename in returndata['main']) {
				content += tablename + ' (' + returndata['main'][tablename].length + ' rows):\n' + Papa.unparse(returndata['main'][tablename], {delimiter: "\t"}) + '\n\n';
			}
		}

		if(key == 'route_id') content += '\n' + Array(100).join("#") + '\nNOTE: Since it is a route being deleted, all trips under it will be deleted and all the timings data in stop_times table for each of these trips will also be deleted.\n\n';

		if(Object.keys(returndata['zap']).length) {
			content+= '\n' + Array(100).join("#") + '\nThe following table entries will have "' + value + '" zapped (replaced with blank) in the '+key+' column:\n\n';

			for(tablename in returndata['zap']) {
				content += tablename + ' (' + returndata['zap'][tablename].length + ' rows):\n' + Papa.unparse(returndata['zap'][tablename], {delimiter: "\t"}) + '\n\n';
			}
		}

		$('#dryRunResults').val(content);
	})
	.fail( function() {
		console.log('GET request to API/diagnoseID failed.')
	});
}

function deleteByKey() {

	var consent = $('#deepActionsConfirm').is(':checked');
	if(!consent) {
		$('#deepActionsStatus').html('Check ON the confirmation box first.');
		return;
	}

	// shorter GET request. from https://api.jquery.com/jQuery.get/
	if( ! confirm('Are you sure you want to do this? Press Cancel to go back, take backup export etc.') ) {
		$('#deepActionsStatus').html('Okay, not this time. Make a fresh selection again if you change your mind.');
		globalKey = '';
		globalValue = '';
		globalTables = '';
		globalSecondaryTables = '';
		return;
	}

	var pw = $("#password").val();
	if ( ! pw.length ) { 
		$('#deepActionsStatus').html('Please enter the password.');
		shakeIt('password'); return;
	}

	$('#deepActionsStatus').html('Processing.. please wait..');
	
	key = globalKey;
	value = globalValue;
	tables = globalTables;
	console.log(key,value,tables);

	if( ! (key.length && value.length ) ) {
		$('#deepActionsStatus').html('All values have not been properly set. Please check and try again.');
		shakeIt('deepActionsButton'); return;
	}
	var jqxhr = $.get( `${APIpath}deleteByKey?pw=${pw}&key=${key}&value=${value}&tables=${tables}`, function( data ) {
		console.log('deleteByKey API GET request successful. Message: ' + data);
		$('#deepActionsStatus').html(data);
		
		// resetting global vars and emptying of dry run textbox so that pressing this button again doesn't send the API request. 
		resetGlobals();

		getPythonAllIDs();
	})
	.fail( function() {
		console.log('GET request to API/deleteByKey failed.');
		$('#deepActionsStatus').html('Error at backend, please debug.');

	});
}

function resetGlobals() {
	globalKey = ''; globalValue = ''; globalTables='';
	globalSecondaryTables = '';
	$('#dryRunResults').val('');

	// even Change UID:
	var globalValueFrom = '';
	var globalValueTo = '';
	var globalTableKeys = [];
	$('#renameTablesInfo').html('');
	$('#renameStatus').html('');
	document.getElementById("replaceIDButton").disabled = true;
	document.getElementById("replaceIDButton").className = "btn";
}


function replaceIDDryRun() {
	// globalIDs // Contains keys: stop_id_list, route_id_list, trip_id_list, shapeIDsJson, zone_id_list, service_id_list
	// renameSource renameDestination
	// replaceDryRunButton, replaceIDButton

	// clear statuses
	$('#renameTablesInfo').html('');
	$('#renameStatus').html('');
	
	// clean text input
	valueTo = $('#renameDestination').val().replace(/[^A-Za-z0-9-_]/g, ""); // cleanup!
	$('#renameDestination').val(valueTo);

	// validation: test if all selections and inputs are valid
	if( $('#renameSource').val() == '' || $('#renameSource').val() == 'No Selection' || $('#renameDestination').val().length<2 ) {
		resetGlobals();
		$('#renameTablesInfo').html('Invalid entries.');
		return;
	}

	sourceJson = JSON.parse( $('#renameSource').val() );
	for(key in sourceJson) {
		console.log(key, sourceJson[key]);
	}

	key = Object.keys(sourceJson)[0];
	valueFrom = sourceJson[key];
	
	//#############3
	// Validating that valueTo is non-repeating
	var keyListMap = {
		// globalIDs // Contains keys: stop_id_list, route_id_list, trip_id_list, shapeIDsJson, zone_id_list, service_id_list
		'stop_id': globalIDs['stop_id_list'],
		'trip_id': globalIDs['trip_id_list'],
		'route_id': globalIDs['route_id_list'],
		'shape_id': globalIDs['shapeIDsJson']['all'],
		'zone_id': globalIDs['zone_id_list'],
		'service_id': globalIDs['service_id_list'],
		//'origin_id': ['fare_rules'],	
		//'destination_id': ['fare_rules'],
		//'fare_id': ['fare_attributes','fare_rules']	
	}
	if ( keyListMap[key].indexOf(valueTo) > -1) {
		$('#renameTablesInfo').html('Sorry, that ID is already taken. Please make another.');
		return;
	}

	//#############3
	// Mapping to tables
	var keyTablesMap = { 
		'stop_id': ['stops','stop_times'],
		'trip_id': ['trips', 'stop_times'],
		'route_id': ['routes','trips'],
		'shape_id': ['shapes','trips'],
		'zone_id': ['stops'],
		'service_id': ['calendar','trips'],
		'origin_id': ['fare_rules'],	
		'destination_id': ['fare_rules'],
		'fare_id': ['fare_attributes','fare_rules']	
	};
	// [{'table':'stops','key':'stop_id'},{...}]
	//tablekeys = [{'table': keyTablesMap[key],'key':key}];
	var tablekeys = [];
	var changeTablesList = [];

	for ( i in keyTablesMap[key]) {
		tablekeys.push( { 'table': keyTablesMap[key][i],'key':key } );
		changeTablesList.push(keyTablesMap[key][i]);
	}
	if(key == 'zone_id') {
		tablekeys.push( { 'table': 'fare_rules','key':'origin_id' } );
		tablekeys.push( { 'table': 'fare_rules','key':'destination_id' } );
		changeTablesList.push('fare_rules');
	}
	console.log(tablekeys);
	// assign global variable values that can be picked up by final function
	globalTableKeys = tablekeys;
	globalValueTo = valueTo;
	globalValueFrom = valueFrom;

	document.getElementById("replaceIDButton").disabled = false;
	document.getElementById("replaceIDButton").className = "btn btn-danger";
	$('#renameTablesInfo').html('Checks out, we\'re good to go. Changes will be made to tables: <br><b>'+ changeTablesList.join(', ') + '</b>');
}	

function replaceID() {
	// globalIDs // Contains keys: stop_id_list, route_id_list, trip_id_list, shapeIDsJson, zone_id_list, service_id_list
	// renameSource renameDestination
	// replaceDryRunButton, replaceIDButton
	
	var pw = $("#password").val();
	if ( ! pw.length ) { 
		$('#renameStatus').html('Please enter the password.');
		shakeIt('password'); return;
	}
	var valueFrom =  globalValueFrom;
	var valueTo = globalValueTo;
	var tablekeys = globalTableKeys;
	// [{'table':'stops','key':'stop_id'},{...}]

	// validation: test if all parameters are valid. Ideally we should never get to this but still.
	if( valueFrom == '' || valueFrom == 'No Selection' || valueTo.length<2 || tablekeys.length<1 ) {
		resetGlobals();
		$('#renameTablesInfo').html('Invalid entries.');
		return;
	}
	$('#renameStatus').html( 'Processing.. please wait..' );

	$.ajax({
		url : `${APIpath}replaceID?pw=${pw}&valueFrom=${valueFrom}&valueTo=${valueTo}`,
		type : 'POST',
		data : JSON.stringify(tablekeys),
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8', 
		success : function(returndata) {
			console.log('API/replaceID POST request successful.');
			$('#renameStatus').html( returndata );
		},
		error: function(jqXHR, exception) {
			console.log('API/replaceID POST request failed.')
			$('#renameStatus').html( jqXHR.responseText );
		}
	});
}	