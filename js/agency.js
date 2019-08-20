// #########################################
// Function-variables to be used in tabulator

var agencyTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' agencies total';
}

//####################
// Tabulator tables

var table = new Tabulator("#agency-table", {
	selectable:0,
	index: 'agency_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}tableReadSave?table=agency`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	footerElement: "<button id='saveAgencyButton' class='btn btn-outline-primary' disabled>Save Agency Changes</button>",
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"agency_id", field:"agency_id", editor:"input", headerSort:false, validator:tabulator_UID_leastchars },
		{title:"agency_name", field:"agency_name", editor:"input", headerSort:false, bottomCalc:agencyTotal },
		{title:"agency_url", field:"agency_url", editor:"input", headerSort:false },
		{title:"agency_timezone", field:"agency_timezone", editor: select2TZEditor,width: 300, headerSort:false, tooltip:'Get your timezone from TZ column in https://en.wikipedia.org/wiki/List_of_tz_database_time_zones' }
		
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to agency failed.  Returned status of: ' + errorThrown);
	},
	dataEdited:function(data){
		$('#saveAgencyButton').removeClass().addClass('btn btn-primary');
		$('#saveAgencyButton').prop('disabled', false);
	}
});

// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	$("#agency_timezone").select2({				
		placeholder: "Select a timezone",
		allowClear: true,
		theme: 'bootstrap4',
		data: TimeZoneList
	  });
	  // Set the default timezone from the settings.js file.
	  $("#agency_timezone").val(defaultTimeZone).trigger("change");
});

// #########################
// Buttons

$('#saveAgencyButton').on('click', function(){
	saveAgency();
});

$('#addAgencyButton').on('click', function(){
	// First validate the form!
	var $form = $('#Form-AddAgency');
	$form.parsley({
		errorClass: 'has-danger',
		successClass: 'has-success',
		classHandler: function(ParsleyField) {
		  return ParsleyField.$element.closest('.form-group');
		},
		errorsContainer: function(ParsleyField) {
		  return ParsleyField.$element.closest('.form-group');
		},
		errorsWrapper: '<span class="form-text text-danger"></span>',
		errorTemplate: '<span></span>'
	  }).validate()
	if ( $form.parsley().validate() ) {
		// Process adding the value
		addAgency();
	}       
});

$("#agency_id").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});


// #########################
// Functions

function saveAgency() {		
	var pw = $("#password").val();
	if ( ! pw ) { 
		$.toast({
			title: 'Save Route',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});
		shakeIt('password'); return;
	}
	$.toast({
		title: 'Save Agency',
		subtitle: 'Saving',
		content: 'Sending data to server.. please wait..',
		type: 'info',
		delay: 5000
	  });
	var data = table.getData();

	console.log('sending to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=agency`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/tableReadSave table=agency, response received: ' + xhr.responseText);
			$.toast({
				title: 'Save Agency',
				subtitle: 'Success',
				content: xhr.responseText,
				type: 'success',
				delay: 5000
			  });
			  $('#saveAgencyButton').removeClass().addClass('btn btn-outline-primary');
			  $('#saveAgencyButton').prop('disabled', true);
			  //$('#agencySaveStatus').html('<span class="alert alert-success">Success. Message: ' + xhr.responseText + '</span>');
		} else {
			console.log('Server POST request to API/tableReadSave table=agency failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$.toast({
				title: 'Save Agency',
				subtitle: 'Failed to save',
				content: xhr.responseText,
				type: 'error',
				delay: 5000
			  });
			  //$('#agencySaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+'</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
}

function addAgency() {
	var data = table.getData();
	var agency_id = $('#agency_id').val().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
	var agency_name = $('#agency_name').val();
	var agency_url = $('#agency_url').val();
	var agency_timezone = $('#agency_timezone').select2().val();
	$('#agency_id').val(agency_id);
	if(! agency_id.length) {
		$.toast({
			title: 'Add Agency',
			subtitle: 'Failed to Add',
			content: 'Give a valid id please.',
			type: 'error',
			delay: 5000
		  });
		//$('#agencyAddStatus').html('<span class="alert alert-warning">Give a valid id please.</span>');
		return;

	}
	
	var agency_id_list = data.map(a => a.agency_id);
	var isPresent = agency_id_list.indexOf(agency_id) > -1;
	if(isPresent) {
		//$('#agencyAddStatus').html('<span class="alert alert-danger">' + agency_id + ' is already there.</span>');
		$.toast({
			title: 'Add Agency',
			subtitle: 'Failed to Add',
			content: agency_id + ' is already there.',
			type: 'error',
			delay: 5000
		  });
	} else {
		table.addData([{ 'agency_id': agency_id, 'agency_name': agency_name, 'agency_url':agency_url, 'agency_timezone': agency_timezone } ]);
		//$('#agencyAddStatus').html('<span class="alert alert-success">Added agency_id ' + agency_id + '</span>');
		$.toast({
			title: 'Add Agency',
			subtitle: 'Success',
			content: 'Added agency_id ' + agency_id,
			type: 'success',
			delay: 5000
		  });
	}

}

// // ###############
// // feed_info table

// function loadFeedInfo() {
// 	var jqxhr = $.get( `${APIpath}tableReadSave?table=feed_info`, function( data ) {
// 		list =  JSON.parse(data);
// 		console.log('GET request to API/tableReadSave for table=feed_info succesfull.');

// 		for (var p in list[0]) {
// 			if( list[0].hasOwnProperty(p) ) {
// 				$('#'+p).val(list[0][p]);
// 			} 
// 		}              
// 	})
// 	.fail( function() {
// 		console.log('GET request to API/tableReadSave table=feed_info failed.')
// 	});
// }


$('#saveFeedInfoButton').on('click', function(){
	$.toast({
		title: 'Save Feed Info',
		subtitle: 'Please wait',
		content: 'Sending data to server...',
		type: 'info',
		delay: 5000
	  });
	//$('#feedInfoSaveStatus').html('Sending data to server.. please wait..');
	var pw = $("#password").val();
	if ( ! pw ) { 
		$.toast({
			title: 'Save Feed Info',
			subtitle: 'Failed to Add/Update',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		  });
		//$('#feedInfoSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); 
		return;
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
			//$('#feedInfoSaveStatus').html('<span class="alert alert-success">Success. Message: ' + xhr.responseText + '</span>');
			$.toast({
				title: 'Save Feed Info',
				subtitle: 'Success',
				content: 'Message: ' + xhr.responseText,
				type: 'success',
				delay: 5000
			  });
		} else {
			console.log('Server POST request to API/tableReadSave table=agency failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			//$('#feedInfoSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+'</span>');
			$.toast({
				title: 'Save Feed Info',
				subtitle: 'Failed to Add/Update',
				content: 'Message: ' + xhr.responseText,
				type: 'error',
				delay: 5000
			  });
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

});