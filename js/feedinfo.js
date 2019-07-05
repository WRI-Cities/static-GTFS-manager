// #########################################
// Function-variables to be used in tabulator

// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
    loadFeedInfo();
    $("#feed_lang").select2({
        tags: false,
        placeholder: 'Select Language',
        data: LanguageList
      });
});

// #########################
// Buttons
$('#saveFeedInfoButton').on('click', function(){
	// First validate the form!
	var $form = $('#Form-FeedInfo');	
	if ( $form.parsley({
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
	  }).validate() ) {
		// Process adding the value
		SaveFeedInfo();
	}       
});


// #########################
// Functions

// ###############
// feed_info table

function loadFeedInfo() {
	var jqxhr = $.get( `${APIpath}tableReadSave?table=feed_info`, function( data ) {
		list =  JSON.parse(data);
		console.log('GET request to API/tableReadSave for table=feed_info succesfull.');

		for (var p in list[0]) {
			if( list[0].hasOwnProperty(p) ) {
                if (p == 'feed_lang') {
                    $('#feed_lang').val(list[0][p]);
                    $('#feed_lang').trigger('change');
                }
                else {
                    $('#'+p).val(list[0][p]);
                }
			} 
		}              
	})
	.fail( function() {
		console.log('GET request to API/tableReadSave table=feed_info failed.')
	});
}


function SaveFeedInfo() {
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

};