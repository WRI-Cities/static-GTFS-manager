// #########################################
// Function-variables to be used in tabulator

var agencyTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' agencies total';
}

//####################
// Tabulator tables

$("#agency-table").tabulator({
	selectable:0,
	index: 'agency_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}tableReadSave?table=agency`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"agency_id", field:"agency_id", editor:"input", headerSort:false, validator:tabulator_UID_leastchars },
		{title:"agency_name", field:"agency_name", editor:"input", headerSort:false, bottomCalc:agencyTotal },
		{title:"agency_url", field:"agency_url", editor:"input", headerSort:false },
		{title:"agency_timezone", field:"agency_timezone", editor:"input", headerSort:false, tooltip:'Get your timezone from TZ column in https://en.wikipedia.org/wiki/List_of_tz_database_time_zones' }
		
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to agency failed.  Returned status of: ' + errorThrown);
	}
});

// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	loadFeedInfo();
});

// #########################
// Buttons

$('#saveAgencyButton').on('click', function(){
	saveAgency();
});

$('#addAgencyButton').on('click', function(){
	addAgency();
});

$("#agency2add").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});


// #########################
// Functions

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
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=agency`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/tableReadSave table=agency, response received: ' + xhr.responseText);
			$('#agencySaveStatus').html('<span class="alert alert-success">Success. Message: ' + xhr.responseText + '</span>');
		} else {
			console.log('Server POST request to API/tableReadSave table=agency failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
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

// ###############
// feed_info table

function loadFeedInfo() {
	var jqxhr = $.get( `${APIpath}tableReadSave?table=feed_info`, function( data ) {
		list =  JSON.parse(data);
		console.log('GET request to API/tableReadSave for table=feed_info succesfull.');

		for (var p in list[0]) {
			if( list[0].hasOwnProperty(p) ) {
				$('#'+p).val(list[0][p]);
			} 
		}              
	})
	.fail( function() {
		console.log('GET request to API/tableReadSave table=feed_info failed.')
	});
}


$('#saveFeedInfoButton').on('click', function(){
	$('#feedInfoSaveStatus').html('Sending data to server.. please wait..');
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#feedInfoSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	var data = [{ 
		'feed_publisher_name': $('#feed_publisher_name').val(),
		'feed_publisher_url': $('#feed_publisher_url').val(),
		'feed_lang': $('#feed_lang').val(),
		'feed_start_date': $('#feed_start_date').val(),
		'feed_end_date': $('#feed_end_date').val(),
		'feed_version': $('#feed_version').val(),
		'feed_contact_email': $('#feed_contact_email').val(),
		'feed_contact_url': $('#feed_contact_url').val(),
	}];

	console.log('sending to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=feed_info`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/tableReadSave table=agency, response received: ' + xhr.responseText);
			$('#feedInfoSaveStatus').html('<span class="alert alert-success">Success. Message: ' + xhr.responseText + '</span>');
		} else {
			console.log('Server POST request to API/tableReadSave table=agency failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#feedInfoSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+'</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

});