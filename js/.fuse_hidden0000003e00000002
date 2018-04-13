// xml2GTFS.js
var stop_id_list = [];
var AreWeReady = false;

$("#stations-table").tabulator({
	selectable:1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	index: "stop_id", 
	history:true,
	layout:"fitDataFill",
	addRowPos: "top",
	columns:[ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"Num", width:40, formatter: "rownum", headerSort:false }, // row numbering
		{title:"stop_id", field:"stop_id", headerFilter:"input", editor:"input", validator:["string", "minLength:1"], headerSort:false },
		{title:"up_id", field:"up_id",  headerFilter:"input", editor:"input", headerSort:false },
		{title:"down_id", field:"down_id", headerFilter:"input", editor:"input", headerSort:false },
		{title:"stop_name", field:"stop_name", editor:"input", headerFilter:"input", validator:["required","string", "minLength:1"], headerSort:false },
		{title:"distance", field:"distance", editor:"input", validator:["numeric", "min:0"], headerSort:false },
		{title:"stop_lat", field:"stop_lat", editor:"input", validator:["numeric"], headerSort:false },
		{title:"stop_lon", field:"stop_lon", editor:"input", validator:["numeric"], headerSort:false },
		{title:"stop_name_secondlang", field:"stop_name_secondlang", editor:"input", headerFilter:"input", validator:["required","string", "minLength:1"], headerSort:false },
		{title:"wheelchair_boarding", field:"wheelchair_boarding", editor:"select", editorParams:{0:"0 - No", 1:"1 - Yes"}, headerSort:false }
	]
});

loadFromCsv('extra_files/stations.csv')

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

// #########################################
// auto-capitalize inputs
$("#station2add").bind("change keyup", function(){
	this.value=this.value.toUpperCase();
});

// #########################################
// initiate bootstrap / jquery components like tabs, accordions
$( function() {
	// tabs
/*	$( "#tabs" ).tabs({
		active:0
	}); */
	// initiate accordion
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#instructions" ).accordion({
		collapsible: true, active: false
	});
});

//###################
// Functions
function loadFromCsv(chosen1,mode='setData') {
	Papa.parse(chosen1, {
		download: true,
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
		complete: function(results) {
			console.log('loaded',chosen1);
			
			initiateStations(results.data, mode);

		}, // END of Papa.parse complete() function
		
		error: function() {
			console.log("Error. Could not load", chosen1);
			
		}
	}); // END of Papa.parse
	
}

function initiateStations(data, mode='setData') {
	$("#stations-table").tabulator(mode,data);
}

function XMLUpload() {
	// make POST request to API/XMLUpload
	$('#XMLUploadStatus').text( 'Uploading files, please wait.. ');
	var pw = $("#password").val();

	var formData = new FormData();
	// weekdayXML sundayXML
	formData.append('weekdayXML', $('#weekdayXML')[0].files[0] );
	formData.append('sundayXML', $('#sundayXML')[0].files[0] );

	$.ajax({
		url : `${APIpath}XMLUpload?pw=${pw}`,
		type : 'POST',
		data : formData,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success : function(data) {
			var xmls = data.split(',');
			$('#XMLUploadStatus').html( `<p>Uploaded XMLs.<br><a target="_blank" href="uploads/${xmls[0]}">Weekday XML</a><br><a target="_blank" href="uploads/${xmls[1]}">Sunday XML</a></p>` );
		},
		error: function(jqXHR, exception) {
			$('#XMLUploadStatus').text( jqXHR.responseText );
		}
	});
}
