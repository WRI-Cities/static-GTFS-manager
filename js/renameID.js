//###################
// global variables
var operationalChoices = {1:"1 - Operating on this day", 0:"0 - Not operating"};
var service_id_list = [];
var globalIDs = {}; // Contains keys: stop_id_list, route_id_list, trip_id_list, shapeIDsJson, zone_id_list, service_id_list
var globalKey = '';
var globalValue = '';

// for Maintenance Change UID function:
var globalValueFrom = '';
var globalValueTo = '';
var globalTableKeys = [];

/*
// #########################################
// Function-variables to be used in tabulator
var translationsTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' translations total';
}

var calendarTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' services total';
}

var agencyTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' agencies total';
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

$("#agency-table").tabulator({
	selectable:0,
	index: 'agency_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}agency`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"agency_id", field:"agency_id", editor:"input", headerSort:false },
		{title:"agency_name", field:"agency_name", editor:"input", headerSort:false, bottomCalc:agencyTotal },
		{title:"agency_url", field:"agency_url", editor:"input", headerSort:false },
		{title:"agency_timezone", field:"agency_timezone", editor:"input", headerSort:false, tooltip:'Get your timezone from TZ column in https://en.wikipedia.org/wiki/List_of_tz_database_time_zones' }
		
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to agency failed.  Returned status of: ' + errorThrown);
	}
});

$("#translations-table").tabulator({
	selectable:0,
	index: 'trans_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}translations`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"trans_id", field:"trans_id", editor:"input", headerFilter:"input", headerSort:false, width:120, bottomCalc:translationsTotal },
		{title:"lang", field:"lang", editor:"input", headerFilter:"input", headerSort:false },
		{title:"translation", field:"translation", editor:"input", headerFilter:"input", headerSort:false, width:150, formatter:function(cell, formatterParams){
			return "<big>" + cell.getValue() + '</big>'; //return the contents of the cell;
			}
		},
		{formatter:"buttonCross", align:"center", title:"del", headerSort:false, cellClick:function(e, cell){
			if(confirm('Are you sure you want to delete this entry?'))
				cell.getRow().delete();
			}}
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to translations failed.  Returned status of: ' + errorThrown);
	}
});
*/
// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	// tabs
	$( "#tabs2" ).tabs({
		active:0,
		activate: function(event ,ui){
			resetGlobals();
		}
	});
	//getPythonAgency();
	//getPythonCalendar();
	//getPythonTranslations();
	getPythonAllIDs();  
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
*/
$('#replaceDryRunButton').on('click', function(){
	replaceIDDryRun();
});

$('#replaceIDButton').on('click', function(){
	replaceID();
});

$("#renameDestination").bind("change keyup", function(){
	resetGlobals();
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});
/*
$("#calendar2add").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});

$("#agency2add").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});
*/
// #########################
// Functions
/*
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

function saveAgency() {
	$('#agencySaveStatus').html('Sending data to server.. please wait..');
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#agencySaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
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
		if ( ! pw ) { 
		$('#translationSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
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
*/
function getPythonAllIDs() {
	// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}listAll`, function( data ) {
		globalIDs =  JSON.parse(data) ;
		console.log('listAll API GET request successful. Loaded lists of all ids.');
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
	//var content = '<option>No Selection</option>';
	globalIDs['stop_id_list'].forEach(function(row){
		//content += `<option value="${row}">${row}</option>`;
		renameContent+= `<option value='{"stop_id":"${row}"}'>stop: ${row}</option>`;
	});
	/*
	$('#stop2Delete').html(content);
	$('#stop2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Stop'});
	$('#stop2Delete').trigger('chosen:updated'); // if the function is called again, then update it
	$('#stop2Delete').on('change', function(evt,params) {
		if(!params) return;
		let stop_id = params.selected;
		console.log(stop_id);
		globalKey = 'stop_id';
		globalValue = stop_id;
		diagnoseID(globalKey,globalValue);
	});
	*/

	// route2Delete
	//var content = '<option>No Selection</option>';
	globalIDs['route_id_list'].forEach(function(row){
		//content += `<option value="${row}">${row}</option>`;
		renameContent+= `<option value='{"route_id":"${row}"}'>route: ${row}</option>`;
	});
	/*
	$('#route2Delete').html(content);
	$('#route2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Route' });
	$('#route2Delete').trigger('chosen:updated');
	$('#route2Delete').on('change', function(evt,params) {
		if(!params) return;
		let route = params.selected;
		console.log(route);
		globalKey = 'route_id';
		globalValue = route;
		diagnoseID(globalKey,globalValue);
	});*/

	// trip2Delete
	//var content = '<option>No Selection</option>';
	globalIDs['trip_id_list'].forEach(function(row){
		//content += `<option value="${row}">${row}</option>`;
		renameContent+= `<option value='{"trip_id":"${row}"}'>trip: ${row}</option>`;
	});
	/*
	$('#trip2Delete').html(content);
	$('#trip2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Trip'});
	$('#trip2Delete').trigger('chosen:updated');
	$('#trip2Delete').on('change', function(evt,params) {
		if(!params) return;
		let trip = params.selected;
		console.log(trip);
		globalKey = 'trip_id';
		globalValue = trip;
		diagnoseID(globalKey,globalValue);
	});*/

	// shape2Delete
	//var content = '<option>No Selection</option>';
	globalIDs['shapeIDsJson']['all'].forEach(function(row){
			//content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"shape_id":"${row}"}'>shape: ${row}</option>`;
	});
	/*
	$('#shape2Delete').html(content);
	$('#shape2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Shape'});
	$('#shape2Delete').trigger('chosen:updated');
	$('#shape2Delete').on('change', function(evt,params) {
		if(!params) return;
		let shape = params.selected;
		console.log(shape);
		globalKey = 'shape_id';
		globalValue = shape;
		diagnoseID(globalKey,globalValue);
	});*/

	// service2Delete
	//var content = '<option>No Selection</option>';
	globalIDs['service_id_list'].forEach(function(row){
			//content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"service_id":"${row}"}'>calendar service: ${row}</option>`;
	});
	/*
	$('#service2Delete').html(content);
	$('#service2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Calendar Service'});
	$('#service2Delete').trigger('chosen:updated');
	$('#service2Delete').on('change', function(evt,params) {
		if(!params) return;
		let service = params.selected;
		console.log(service);
		globalKey = 'service_id';
		globalValue = service;
		diagnoseID(globalKey,globalValue);
	});*/


	// zone2Delete
	//var content = '<option>No Selection</option>';
	globalIDs['zone_id_list'].forEach(function(row){
			//content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"zone_id":"${row}"}'>fare zone: ${row}</option>`;
	});
	/*
	$('#zone2Delete').html(content);
	$('#zone2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Fare Zone'});
	$('#zone2Delete').trigger('chosen:updated');
	$('#zone2Delete').on('change', function(evt,params) {
		if(!params) return;
		let zone = params.selected;
		console.log(zone);
		globalKey = 'zone_id';
		globalValue = zone;
		diagnoseID(globalKey,globalValue);

	});*/

	// fareID2Delete
	//var content = '<option>No Selection</option>';
	globalIDs['fare_id_list'].forEach(function(row){
			//content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"fare_id":"${row}"}'>fare id: ${row}</option>`;
	});
	/*
	$('#fareID2Delete').html(content);
	$('#fareID2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick a Fare ID'});
	$('#fareID2Delete').trigger('chosen:updated');
	$('#fareID2Delete').on('change', function(evt,params) {
		if(!params) return;
		let fare = params.selected;
		console.log(fare);
		globalKey = 'fare_id';
		globalValue = fare;
		diagnoseID(globalKey,globalValue);

	});*/

	// agency2Delete
	//var content = '<option>No Selection</option>';
	globalIDs['agency_id_list'].forEach(function(row){
			//content += `<option value="${row}">${row}</option>`;
			renameContent+= `<option value='{"agency_id":"${row}"}'>agency id: ${row}</option>`;
	});
	/*
	$('#agency2Delete').html(content);
	$('#agency2Delete').chosen({search_contains:true, allow_single_deselect:true, width:300, placeholder_text_single:'Pick an Agency ID'});
	$('#agency2Delete').trigger('chosen:updated');
	$('#agency2Delete').on('change', function(evt,params) {
		if(!params) return;
		let agency = params.selected;
		console.log(agency);
		globalKey = 'agency_id';
		globalValue = agency;
		diagnoseID(globalKey,globalValue);

	});*/


	$('#renameSource').html(renameContent);
	$('#renameSource').chosen({search_contains:true, allow_single_deselect:true, width:200, placeholder_text_single:'Pick a UID'});
	$('#renameSource').trigger('chosen:updated');
	$('#renameSource').on('change', function(evt,params) {
		if(!params) return;
		let uid = params.selected;
		if(uid == 'No Selection') return;
		// console.log(JSON.parse(uid));
		// reset the rename button when selection has changed.
		resetGlobals();
	});
}

// #################################
/*
function diagnoseID(column,value) {
	$('#dryRunResults').val('Loading...');
	if(value == 'No Selection' || value == '') {
		resetGlobals();
		return;
	}

		// shorter GET request. from https://api.jquery.com/jQuery.get/
	var jqxhr = $.get( `${APIpath}diagnoseID?column=${column}&value=${value}`, function( returndata ) {
		console.log('diagnoseID API GET request successful.');
		$('#dryRunResults').val(returndata);
	})
	.fail( function() {
		console.log('GET request to API/diagnoseID failed.');
		$('#dryRunResults').val('GET request to API/diagnoseID failed. Please check logs.');
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
		return;
	}

	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#deepActionsStatus').html('Please enter the password.');
		shakeIt('password'); return;
	}

	$('#deepActionsStatus').html('Processing.. please wait..');
	
	key = globalKey;
	value = globalValue;
	console.log(key,value);

	if( ! (key.length && value.length ) ) {
		$('#deepActionsStatus').html('All values have not been properly set. Please check and try again.');
		shakeIt('deepActionsButton'); return;
	}
	var jqxhr = $.get( `${APIpath}deleteByKey?pw=${pw}&key=${key}&value=${value}`, function( returndata ) {
		console.log('deleteByKey API GET request successful. Message: ' + returndata);
		$('#deepActionsStatus').html('<div class="alert alert-success">' + returndata +'</div>');
		
		// resetting global vars and emptying of dry run textbox so that pressing this button again doesn't send the API request. 
		resetGlobals();

		getPythonAllIDs();
	})
	.fail( function() {
		console.log('GET request to API/deleteByKey failed.');
		$('#deepActionsStatus').html('Error at backend, please debug.');
	});
}
*/
function resetGlobals() {
	globalKey = ''; globalValue = '';
	$('#dryRunResults').val('');

	// clear the consent checkbox
	//$('#deepActionsConfirm').removeAttr('checked');
	//document.getElementById("deepActionsConfirm").checked = false;

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
	valueTo = $('#renameDestination').val().replace(/[^A-Za-z0-9-_.]/g, ""); // cleanup!
	$('#renameDestination').val(valueTo);

	// validation: test if all selections and inputs are valid
	if( $('#renameSource').val() == '' || $('#renameSource').val() == 'No Selection' || $('#renameDestination').val().length<1 ) {
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
		'agency_id': globalIDs['agency_id_list'],
		'fare_id': ['fare_attributes','fare_rules']	
		//'origin_id': ['fare_rules'],	
		//'destination_id': ['fare_rules'],
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
		'fare_id': ['fare_attributes','fare_rules']	,
		'agency_id': ['agency']	
	};
	// [{'table':'stops','key':'stop_id'},{...}]
	//tablekeys = [{'table': keyTablesMap[key],'key':key}];
	//var tablekeys = [];
	var changeTablesList = [];

	for ( i in keyTablesMap[key]) {
		//tablekeys.push( { 'table': keyTablesMap[key][i],'key':key } );
		changeTablesList.push(keyTablesMap[key][i]);
	}
	if(key == 'zone_id') {
		//tablekeys.push( { 'table': 'fare_rules','key':'origin_id' } );
		//tablekeys.push( { 'table': 'fare_rules','key':'destination_id' } );
		changeTablesList.push('fare_rules');
	}
	//console.log(tablekeys);
	// assign global variable values that can be picked up by final function
	//globalTableKeys = tablekeys;
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
	if ( ! pw ) { 
		$('#renameStatus').html('Please enter the password.');
		shakeIt('password'); return;
	}
	var valueFrom =  globalValueFrom;
	var valueTo = globalValueTo;
	//var tablekeys = globalTableKeys;
	// [{'table':'stops','key':'stop_id'},{...}]
	sourceJson = JSON.parse( $('#renameSource').val() );
	key = Object.keys(sourceJson)[0];

	// validation: test if all parameters are valid. Ideally we should never get to this but still.
	if( valueFrom == '' || valueFrom == 'No Selection' || valueTo.length<1 || key.length<1 ) {
		resetGlobals();
		$('#renameTablesInfo').html('Invalid entries.');
		return;
	}
	$('#renameStatus').html( 'Processing.. please wait..' );

	$.ajax({
		url : `${APIpath}replaceID?pw=${pw}&key=${key}&valueFrom=${valueFrom}&valueTo=${valueTo}`,
		type : 'GET',
		//data : JSON.stringify(tablekeys),
		//cache: false,
		//processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8', 
		success : function(returndata) {
			console.log('API/replaceID GET request successful.');
			$('#renameStatus').html( returndata );
		},
		error: function(jqXHR, exception) {
			console.log('API/replaceID GET request failed.')
			$('#renameStatus').html( jqXHR.responseText );
		}
	});
}	





/* RETIRED FUNCTIONS
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
*/