//homepage.js
$( function() {
	getPythonGTFSstats();
	getPythonPastCommits();
});

// Buttons:
$("#exportGTFS").on("click", function(){
	exportGTFS();
});

$("#importGTFSbutton").on("click", function(){
	gtfsImportZip();
});

$("#gtfsBlankSlateButton").on("click", function(){
	gtfsBlankSlate();
});

// #########################################
// Initiate bootstrap / jquery components like tabs, accordions
$(document).ready(function(){
	/*
	// tabs
	$( "#tabs" ).tabs({
		active:0
	}); 
	// popover
	$('[data-toggle="popover"]').popover();
	*/

});
// ##############################
// Functions:

function getPythonGTFSstats() {
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}stats`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/stats .`);
			var data = JSON.parse(xhr.responseText);
			$('#GTFSstats').html(data);
		}
		else {
			console.log('Server request to API/stats for all stops failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
			$('#GTFSstats').html('<p>Failed to fetch stats. Message: ' + xhr.responseText + '</p>');
		}
	};
	xhr.send();
}

function getPythonPastCommits() {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `${APIpath}pastCommits`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server ${APIpath}pastCommits .`);
			
			var data = JSON.parse(xhr.responseText);
			var content = '<ol>';
			for (i in data.commits) {
				content += '<li>' + data.commits[i] + ' : <a href="GTFS/' + data.commits[i] + '/gtfs.zip">Download gtfs.zip</a></li>';
			}
			content += '</ol>';
			
			$('#pastCommits').html('<p>'+content+'</p>');
		}
		else {
			console.log(`Server request to ${APIpath}pastCommits failed.  Returned status of ` + xhr.status + ', message: ' + xhr.responseText);
			$('#pastCommits').html('<p><i>' + xhr.responseText + '</i></p>');
		}
	};
	xhr.send();
}

function exportGTFS() {
	// lowercase and zap everything that is not a-z, 0-9, - or _  from https://stackoverflow.com/a/4460306/4355695
	var commit = $("#commitName").val().toLowerCase().replace(/[^a-z0-9-_]/g, "");
	
	$("#commitName").val(commit); // showing the corrected name to user.

	//reject if its blank
	if (! commit.length) {
		$('#exportGTFSlog').html('<div class="alert alert-danger">Please give a valid name for the commit.</div>');
		shakeIt('commitName'); return;
	}
	/*
	var pw = $("#password").val();
	if ( ! pw.length ) { 
		$('#exportGTFSlog').html('<div class="alert alert-danger">Please enter the password.</div>');
		shakeIt('password'); return;
	}
	*/

	$("#exportGTFSlog").html('Initated commit.. please wait..<br>If it\'s a large feed then expect it to take around 5 mins.');
	
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}commitExport?commit=${commit}`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Sent commit message to Server API/commitExport .`);
			$("#exportGTFSlog").html(xhr.responseText);
		}
		else {
			console.log('Server request to API/commitExport for all stops failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
			$("#exportGTFSlog").html(xhr.responseText);
		}
	};
	xhr.send();
}

function gtfsImportZip() {
	// make POST request to API/gtfsImportZip

	// idiot-proofing: check if the files have been uploaded or not.
	if( document.getElementById('gtfsZipFile').value == '') {
		$('#importGTFSStatus').html('<div class="alert alert-warning">Please select a file first! ;)</div>');
		shakeIt('gtfsZipFile'); return;
	}

	var pw = $("#password").val();
	if ( ! pw.length ) { 
		$('#importGTFSStatus').html('<div class="alert alert-danger">Please enter the password.</div>');
		shakeIt('password'); return;
	}
	$("#importGTFSStatus").html('Importing GTFS file, please wait..');

	var formData = new FormData();
	//formData.append('gtfsZipFile', $('#gtfsZipFile')[0].files[0]);
	formData.append('gtfsZipFile', $('#gtfsZipFile')[0].files[0] );

	$.ajax({
		url : `${APIpath}gtfsImportZip?pw=${pw}`,
		type : 'POST',
		data : formData,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success : function(data) {
			console.log(data);
			$("#importGTFSStatus").html('<div class="alert alert-success">Successfully imported GTFS feed. See the other pages to explore the data.<br>A backup has been taken of the earlier data just in case.</div>');
				// housekeeping: run stats and past commits scan again and clear out blank slate status
				getPythonGTFSstats(); getPythonPastCommits();
				$("#gtfsBlankSlateStatus").html('');

		},
		error: function(jqXHR, exception) {
			console.log('API/gtfsImportZip POST request failed.');
			$("#importGTFSStatus").html('<div class="alert alert-warning">GTFS Import function failed for some reason.<br>Please try again or <a href="https://github.com/WRI-Cities/static-GTFS-manager/issues">file a bug on github.</a><br>Message from server: ' + jqXHR.responseText + '</div>');
		}

	});
}

function gtfsBlankSlate() {
	if (! confirm('Are you sure you want to do this?') )
		return;
	var pw = $("#password").val();

	$("#gtfsBlankSlateStatus").text('Processing, please wait..');

	$.ajax({
		url : `${APIpath}gtfsBlankSlate?pw=${pw}`,
		type : 'GET',
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success : function(data) {
			console.log(data);
			$("#gtfsBlankSlateStatus").html(data);
			// housekeeping: run stats again and clear out GTFS import status text
			getPythonGTFSstats();
			$("#importGTFSStatus").html('');

		},
		error: function(jqXHR, exception) {
			console.log('API/gtfsBlankSlate GET request failed.');
			$("#gtfsBlankSlateStatus").html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>');
		}
	});
}