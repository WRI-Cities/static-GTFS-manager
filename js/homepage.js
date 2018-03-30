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
			var content = '';
			for (i in data.commits) {
				content += '<p>' + data.commits[i] + ' : <a href="GTFS/' + data.commits[i] + '/gtfs.zip">Download gtfs.zip</a></p>';
			}
			$('#pastCommits').html(content);
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
		alert('Please give a valid name for the commit.');
		return;
	}
	var pw = $("#password").val();

	$("#exportGTFSlog").html('Initated commit.. please wait..');
	
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}commitExport?pw=${pw}&commit=${commit}`);
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
	var pw = $("#password").val();

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
		}
	});
}