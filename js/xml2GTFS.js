// xml2GTFS.js

// #######################
// Global variables
var stop_id_list = [];
var areWeReady = false;
var weekdayXML = '';
var sundayXML = '';
var weekdaySchedules = [];
var sundaySchedules = [];
var allStopsMappedFlag = false;
var faresListGlobal = [];
var config = KMRLDEFAULTS; // loading default config parameters, see in commonfuncs.js .

// #######################
// initiate map
var osmLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
var MBAttrib = '&copy; ' + osmLink + ' Contributors & <a href="https://www.mapbox.com/about/maps/">Mapbox</a>';
var scenicUrl = 'https://api.mapbox.com/styles/v1/nikhilsheth/cj8rdd7wu45nl2sps9teusbbr/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoibmlraGlsc2hldGgiLCJhIjoiQTREVlJuOCJ9.YpMpVVbkxOFZW-bEq1_LIw' ; 
var scenic = L.tileLayer(scenicUrl, { attribution: MBAttrib });
var map = new L.Map('map', {
	'center': [0,0],
	'zoom': 2,
	'layers': [scenic],
	scrollWheelZoom: false
});
$('.leaflet-container').css('cursor','crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs
L.control.scale({metric:true, imperial:false}).addTo(map);
var myRenderer = L.canvas({ padding: 0.5 });
var circleMarkerOptions = {
	renderer: myRenderer,
	radius: 7,
	fillColor: "#00B7F3",
	//color: null,
	weight: 1,
	opacity: 1,
	fillOpacity: 0.5
};

stopsLayer = new L.geoJson(null).bindTooltip(function (layer) {
	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
}, { sticky: false })
.bindPopup(function (layer) {
	return writeProperties(layer.properties);
});

//#####################
// Inititate table
$("#stations-table").tabulator({
	selectable:0, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	index: "stop_id", 
	history:true,
	addRowPos: "top",
	columns:[ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		//{title:"Num", width:40, formatter: "rownum", headerSort:false , frozen:true}, // row numbering
		{title:"sr", field:"sr", headerSort:false , frozen:true},
		{title:"stop_id", field:"stop_id", headerFilter:"input", editor:"input", validator:["string", "minLength:1"], headerSort:false , frozen:true},
		{title:"up_id", field:"up_id",  headerFilter:"input", editor:"input", headerSort:false, minWidth:"150" },
		{title:"down_id", field:"down_id", headerFilter:"input", editor:"input", headerSort:false, minWidth:"150" },
		{title:"stop_name", field:"stop_name", editor:"input", headerFilter:"input", validator:["required","string", "minLength:1"], headerSort:false, minWidth:"150" },
		//{title:"distance", field:"distance", editor:"input", validator:["numeric", "min:0"], headerSort:false },
		{title:"stop_lat", field:"stop_lat", editor:"input", validator:["numeric"], headerSort:false },
		{title:"stop_lon", field:"stop_lon", editor:"input", validator:["numeric"], headerSort:false },
		{title:"stop_name_secondlang", field:"stop_name_secondlang", editor:"input", headerFilter:"input", validator:["required","string", "minLength:1"], headerSort:false },
		{title:"wheelchair_boarding", field:"wheelchair_boarding", editor:"select", editorParams:{0:"0 - No", 1:"1 - Yes"}, headerSort:false }
	],
	ajaxURL:"API/stations", //ajax URL
	/* // don't need to process the incoming data here, but may be useful elsewhere.
	ajaxResponse:function(url, params, response){
		return response; 
	},*/
	dataLoaded:function(data) {
		// this fires after the ajax response. 
		//Note: presently this fires twice on data load, it's a known bug. See https://github.com/olifolkerd/tabulator/pull/725
		//so don't put an incrementer type thing on, or use a flag to suppress second time around.
		loadmap(data);
		populateDepotList();
	}
});

// #########################################
// Initiate bootstrap / jquery components like tabs, accordions
$(document).ready(function(){
	var rightNow = new Date(); 
	ydm = rightNow.toISOString().slice(0,10).replace(/-/g,'');
	$( "#start_date").val(ydm);

	//Pre-load input boxes with config defaults 
	$( "#agency_id").val( config['agency_id'] );
	$( "#agency_name").val( config['agency_name'] );
	$( "#agency_name_translation").val( config['agency_name_translation'] );
	$( "#agency_url").val( config['agency_url'] );
	$( "#agency_timezone").val( config['agency_timezone'] );
	$( "#end_date").val( config['end_date'] );

});
//###################
// Buttons
$("#addStation").on("click", function(){
	var stop_id = $('#station2add').val();
	if(stop_id.length < 2) {
		$('#stationAddStatus').text('Invalid entry, try again');
		return;
	}

	let data = $("#stations-table").tabulator("getData");
	stop_id_list = data.map(a => a.stop_id); 

	//var index = ;
	if ( stop_id_list.indexOf(stop_id) > -1) {
	    $('#stationAddStatus').text('This id is already taken. Try another value.');
	    return;
	}
	$("#stations-table").tabulator('addRow',{stop_id: stop_id},true);
	$(`#stations-table`).tabulator("redraw", true);
	$('#station2add').val('');
	$('#stationAddStatus').text('Station added with id ' + stop_id + '. Fill its info in the table and then proceed.');
});

$("#XMLUploadButton").on("click", function(){
	XMLUpload();
});

$("#saveStationsButton").on("click", function(){
	saveStations();
});

$("#reDiagnose").on("click", function(){
	reDiagnose();
});

$("#fareChartUploadButton").on("click", function(){
	fareChartUpload();
});

$("#checkMiscButton").on("click", function(){
	checkMisc();
});

$("#xml2GTFSButton").on("click", function(){
	pythonxml2GTFS();
});

// #########################################
// auto-capitalize inputs
$("#station2add").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});

$("#agency_id").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});

function XMLUpload() {
	// make POST request to API/XMLUpload

	// idiot-proofing: check if the files have been uploaded or not.
	// alert( ""==f.value ? "nothing selected" : "file selected");
	// from https://stackoverflow.com/a/1417489/4355695
	if( document.getElementById('weekdayXML').value == '' || document.getElementById('sundayXML').value == '' ) {
		$('#XMLUploadStatus').text('Please select both files first! ;)');
		return;
	}


	$('#XMLUploadStatus').text( 'Uploading files, please wait.. ');
	$('#stationsStatus').text('');
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#XMLUploadStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	var depot = $('#depot').val();
	config['depotstations'] = depot;

	var formData = new FormData();
	// weekdayXML sundayXML
	formData.append('weekdayXML', $('#weekdayXML')[0].files[0] );
	formData.append('sundayXML', $('#sundayXML')[0].files[0] );

	$.ajax({
		url : `${APIpath}XMLUpload?pw=${pw}&depot=${depot}`,
		type : 'POST',
		data : formData,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success : function(returndata) {
			console.log('API/XMLUpload POST request with file upload successfully done.');
			diagnosticDataActions(returndata); // this set of actions is being repeated even in subsequent reDiagnose function, so putting them together in a function and avoiding redundancy.
		},
		error: function(jqXHR, exception) {
			$('#XMLUploadStatus').text( jqXHR.responseText );
			$('#stationsStatus').text( '' );
		}
	});
}

// #####################

function diagnosticDataActions(returndata) {
	var data = JSON.parse(returndata);
	weekdayXML = data['weekdayXML'];
	sundayXML = data['sundayXML'];
	$('#XMLUploadStatus').html( data['report'] );
	$('#stationsStatus').html( data['stationsStatus'] );

	weekdaySchedules = data['weekdaySchedules'];
	sundaySchedules = data['sundaySchedules'];
	allStopsMappedFlag = data['allStopsMappedFlag']
	
	// depending on whether there are unmapped stations, block or open access to steps 3 and 4. from https://stackoverflow.com/a/12791312/4355695
	if(!allStopsMappedFlag) 
		$( "#tabs" ).tabs({ disabled:[2,3] });
	else
		$( "#tabs" ).tabs({ disabled:false });

	routesInfoPopulate();
}
// #####################

function loadmap(stopsjson) {
	stopsLayer.clearLayers();
	for(stoprow in stopsjson) {
		let lat = parseFloat(stopsjson[stoprow]['stop_lat']);
		let lon = parseFloat(stopsjson[stoprow]['stop_lon']);
		if( ! checklatlng(lat,lon) ) {
			//console.log('You shall not pass!', stopsjson[stoprow]);
			continue;
		}
		let stopmarker = L.circleMarker([lat,lon], circleMarkerOptions);
		stopmarker.properties = stopsjson[stoprow];
		stopmarker.addTo(stopsLayer);
	}
	stopsLayer.addTo(map);
	map.fitBounds(stopsLayer.getBounds());
}



function saveStations() {
	$('#stationsSaveStatus').text('');

	var data = $("#stations-table").tabulator("getData");

	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#stationsSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	console.log('sending stations table data to server via POST.');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}stations?pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/stations, resonse received: ' + xhr.responseText);
			$('#stationsSaveStatus').text(xhr.responseText);
			populateDepotList(); // repopulate depots list in case some names have changed etc.
			reDiagnose(); // run the diagnostic again.
		} else {
			console.log('Server POST request to API/stations failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#stationsSaveStatus').text('Failed to save. Message: ' + xhr.responseText);
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
}

function reDiagnose(){
	if( weekdayXML.length > 4 && sundayXML.length > 4) {
		$('#XMLUploadStatus').html('Sending request for Diagnostic. Please wait..');
		$('#reDiagnoseStatus').text('Sending request for Diagnostic. Please wait..');
		$('#stationsStatus').text('Sending request for Diagnostic. Please wait..');

		var depot = $('#depot').val();
		config['depotstations'] = depot;

		let xhr = new XMLHttpRequest();
		//make API call from with this as get parameter name
		xhr.open('GET', `${APIpath}XMLDiagnose?weekdayXML=${weekdayXML}&sundayXML=${sundayXML}&depot=${depot}`);
		xhr.onload = function () {
			if (xhr.status === 200) { //we have got a Response
				console.log(`Sent Diagnostic request to Server API/XMLDiagnose successfully.`);
				$('#reDiagnoseStatus').text('Done. Scroll to top to see Diagnostic results.');
				diagnosticDataActions(xhr.responseText); //repeating common set of actions, removing code redundancy
			}
			else {
				console.log('Server request to API/XMLDiagnose failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
				$('#XMLUploadStatus').html( 'Diagnostic check failed. Message: '+ xhr.responseText);
				$('#stationsStatus').html( 'Diagnostic check failed. Message: '+ xhr.responseText);
			}
		};
		xhr.send();
	}// end of if loop. Do nothing if XMLs not already loaded.
	else $('#reDiagnoseStatus').text('Load XMLs first in step 1.');
}

function populateDepotList(){
	var data = $("#stations-table").tabulator("getData");
	var row = '';
	var options = '<option value="None">None</option>';
	/* <option>1</option>
      <option selected="selected">2</option>
      <option>3</option>
      */
	for (i in data) {
		selectedflag = (data[i]['stop_id'] == 'MUTT') ? ' selected' : '';
		row = '<option value="' + data[i]['up_id'] + ',' + data[i]['down_id'] + '"' + selectedflag + '>' + data[i]['stop_id'] + ': ' + data[i]['stop_name'] + '</option>';
		options += row;
	}
	$("#depot").html(options);
}

function routesInfoPopulate() {
	//weekdayXML, sundayXML
	//weekdaySchedules, sundaySchedules
	// Note: If you change naming conventions of id's generated here, be sure to mirror the change in the checkMisc() function too.
	routesInfoHTML = '<form id="routes">';

	for( i in weekdaySchedules) {
		n = parseInt(i) + 1;
		weekdaySelect = `<select name="weekdaySelect${n}" id="weekdaySelect${n}">`;

		for (j in weekdaySchedules) {
			if (j == i) selectedFlag = ' selected="selected"';
			else selectedFlag = '';
			
			weekdaySelect += `<option value="${weekdaySchedules[j]}"${selectedFlag}>(${parseInt(j) + 1}) ${weekdaySchedules[j]}</option>`
		}
		weekdaySelect += `</select>`;

		sundaySelect = `<select name="sundaySelect${n}" id="sundaySelect${n}">`;
		
		for (j in sundaySchedules) {
			if (j == i) selectedFlag = ' selected="selected"';
			else selectedFlag = '';
			
			sundaySelect += `<option value="${sundaySchedules[j]}"${selectedFlag}>(${parseInt(j) + 1}) ${sundaySchedules[j]}</option>`;
		}
		sundaySelect += `</select>`;

		line = `<p>Route ${n}: Choose schedule:<br>Weekday: ${weekdaySelect}<br>Sunday: ${sundaySelect}</p>`
		routesInfoHTML += line;

		routesInfoHTML+= `<p><small><label title="For internal system use. Use a unique alphanumeric id like R01">route_id: <input required id="route_id${n}" name="route_id${n}" size=6 value="R${n}"> <small><i>Keep it unique!</i></small></label><br>`;
		routesInfoHTML+= `<label title="What commuters will see as 'bus number' types. Like '32A', 'BLUE' etc.">route_short_name: <input required id="route_short_name${n}" name="route_short_name${n}" size=6 value="R${n}"></label><br>`;
		routesInfoHTML+= `<label title="Like: Aluva to Maharaja Collage">route_long_name: <input required id="route_long_name${n}" name="route_long_name${n}" size=6 value="Route ${n}"></label></small></p>`;
		routesInfoHTML+= '<hr>';

	}
	routesInfoHTML += '</form>';
	$('#routesInfoPopulate').html(routesInfoHTML);
}

function farePopulate(faresList) {
	// upon upload and validation of fares chart csv, find the fare variables (like F1 F2 etc) and create input fields for them.
	// argument faresList will be an array like ['F1','F2']
	// we will also need a way to collect all these values into a JSON like {'F1':10,'F2':20}. That will have to be done by the function called by "check and submit" button. Which means it needs access to a global variable.
	faresListGlobal = faresList;
	
	fareAttributeHTML = '<p>Listing fare ids in the chart.<br><div class="row">';
	for (i in faresList) {
		fareAttributeHTML += `<div class="col col-md-6"><label>${faresList[i]}: <input required id="fare_${faresList[i]}" value="${(parseInt(i)+1)*10}" size="4"></label></div>`;
	}
	fareAttributeHTML += '</div><br>Enter the fare amounts.</p>';
	$('#fareAttrPopulate').html(fareAttributeHTML);
}


function fareChartUpload() {
	if( document.getElementById('fareChart').value == '' ) {
		$('#fareChartUploadStatus').text('Please select a file! ;)');
		return;
	}

	$('#fareChartUploadStatus').text( 'Uploading file, please wait.. ');
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#fareChartUploadStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	var formData = new FormData();
	formData.append('fareChart', $('#fareChart')[0].files[0] );
	
	$.ajax({
		url : `${APIpath}fareChartUpload?pw=${pw}`,
		type : 'POST',
		data : formData,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success : function(returndata) {
			console.log(returndata);
			var data = JSON.parse(returndata);
			$('#fareChartUploadStatus').html( data['report'] );
			farePopulate(data['faresList']);
			config['fareschart'] = $('#fareChart')[0].files[0]['name'];
			// setting this here so that if later someone selects another file by mistake, that name doesn't go through.
		},
		error: function(jqXHR, exception) {
			$('#fareChartUploadStatus').text( jqXHR.responseText );
			$('#fareAttrPopulate').html('');

		}
	});	
}

function checkMisc() {
	// calendar-check, agency-check, fares-check
	// console.log(faresListGlobal); // works!

	// to do:
	// depot: Validation is fine, but check with backend how many trips are going to be dropped out of how many total and publish that so user knows. RTI. Dry run.
	// calendar : validated for yyyymmdd and end date being later than start date. (numerical > should do)
	// routes: given the number of elements in weekdaySchedules[], construct the route fields and check if they're filled.
	// agency: check for the 4 fields
	// fares: check if file is loaded (backend check? Nah! If fare_ids are there then that check has already happened.), all fare_id fields filled with numbers.
	// so the only backend thing to do here is with depot.

	// routes:

	config['weekdayXML'] = weekdayXML;
	config['sundayXML'] = sundayXML;

	var checkRoutesFlag = true;
	if ( weekdaySchedules.length == 0) checkRoutesFlag=false;

	config['routes'] = [];
	for (i in weekdaySchedules) {
		n = parseInt(i) + 1;
		let row = {};
		if( !filled(`route_id${n}`, 2) || !filled(`route_short_name${n}`,2) || !filled(`route_long_name${n}`,2)  ) { 
			checkRoutesFlag=false; break; 
		}

		row['weekdaySchedule'] = $(`#weekdaySelect${n}`).val();
		row['sundaySchedule'] = $(`#sundaySelect${n}`).val();
		row['route_id'] = $(`#route_id${n}`).val();
		row['route_short_name'] = $(`#route_short_name${n}`).val();
		row['route_long_name'] = $(`#route_long_name${n}`).val();
		config['routes'].push(row);
	}
	config['checkRoutesFlag'] = checkRoutesFlag;
	$("#routes-check").html( checkRoutesFlag? '<font color="green" size="6"><b>&#10004;</b></font>' : '<font color="red" size="6"><b>&#10008;</b></font>' );

	//calendar: start_date, end_date
	var checkCalendarFlag = true;
	/*if( !filled('start_date',8) || !filled('end_date',8) ) {
		checkCalendarFlag=false; } */

	// rudimentary numerical check for now. later, do proper date validation.
	if( 20000101 < parseInt($("#start_date").val()) <  parseInt($("#end_date").val()) < 20991231 ) {
		config['start_date'] = $("#start_date").val();
		config['end_date'] = $("#end_date").val();
	} else {
		checkCalendarFlag=false;
	}
	config['checkCalendarFlag'] = checkCalendarFlag;
	$("#calendar-check").html( checkCalendarFlag? '<font color="green" size="6"><b>&#10004;</b></font>' : '<font color="red" size="6"><b>&#10008;</b></font>' );


	// agency
	// agency_id agency_name agency_url agency_timezone
	var checkAgencyFlag = true;
	if( !filled('agency_id',2) || !filled('agency_name',2) || !filled('agency_url',10) || !filled('agency_timezone',5)) {
		checkAgencyFlag = false;
	} else {
		config['agency_id'] = $("#agency_id").val();
		config['agency_name'] = $("#agency_name").val();
		config['agency_url'] = $("#agency_url").val();
		config['agency_timezone'] = $("#agency_timezone").val();
		config['agency_name_translation'] = $("#agency_name_translation").val();
	}
	config['checkAgencyFlag'] = checkAgencyFlag;
	$("#agency-check").html( checkAgencyFlag? '<font color="green" size="6"><b>&#10004;</b></font>' : '<font color="red" size="6"><b>&#10008;</b></font>' );

	// fares:
	// check for : file loaded but not uploaded.
	var checkFaresFlag = true;
	
	// checking if it's been uploaded or not
	if(faresListGlobal.length) {
		config['fares'] = {};

		for (f in faresListGlobal) {
			/*console.log(faresListGlobal[f]);
			console.log($(`#fare_${faresListGlobal[f]}`).val());
			console.log( isNaN(parseFloat( $(`#fare_${faresListGlobal[f]}`).val() )) );*/
			checkFaresFlag = checkFaresFlag && !isNaN(parseFloat( $(`#fare_${faresListGlobal[f]}`).val() ));

			config['fares'][ faresListGlobal[f] ] = parseFloat( $(`#fare_${faresListGlobal[f]}`).val() );
		}
	
	} else checkFaresFlag = false;

	config['checkFaresFlag'] = checkFaresFlag;
	$("#fares-check").html( checkFaresFlag? '<font color="green" size="6"><b>&#10004;</b></font>' : '<font color="red" size="6"><b>&#10008;</b></font>' );

	console.log(config);

	// finally!

	if( checkRoutesFlag && checkAgencyFlag && checkFaresFlag &&  checkCalendarFlag) {

		areWeReady = true;
		document.getElementById("xml2GTFSButton").disabled = false;
		document.getElementById("xml2GTFSButton").className = "btn btn-outline-success";

		$('#checkMiscStatus').html('<div class="alert alert-success col-md-4">All good! You can proceed to step 4.</div');
	} else {
		areWeReady = false;
		$('#checkMiscStatus').html('<div class="alert alert-danger col-md-4">Wait, please set some things right before proceeding.</div');
		document.getElementById("xml2GTFSButton").disabled = true;
		document.getElementById("xml2GTFSButton").className = "btn btn-normal";
	}

}

function pythonxml2GTFS() {
	//send config json variable to python
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#xml2GTFSStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	$('#xml2GTFSStatus').html('<div class="alert alert-secondary col-md-4">Sending config parameters...<br>Backing up existing data... <br>Processing uploaded files to generate new GTFS...<br>Populating database...<br>Please wait...</div>');
	
	$.ajax({
		url : `${APIpath}xml2GTFS?pw=${pw}`,
		type : 'POST',
		data : JSON.stringify(config),
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8', 
		success : function(returndata) {
			console.log('API/xml2GTFS POST request successful.');
			$('#xml2GTFSStatus').html('<div class="alert alert-success col-md-4">'+ returndata + '</div>' );
			
		},
		error: function(jqXHR, exception) {
			console.log('API/xml2GTFS POST request failed.');
			$('#xml2GTFSStatus').html('<div class="alert alert-danger col-md-4">'+ jqXHR.responseText + '</div>' );
		}
	});	
}