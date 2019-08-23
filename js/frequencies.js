//###################
// global variables
const exact_timesChoices = {0:"0 - Not exactly scheduled", 1:"1 - Exactly scheduled", '':"blank - not exactly scheduled (default)"};


// #########################################
// Function-variables to be used in tabulator
var freqTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' frequencies total';
}

var trashIcon = function (cell, formatterParams, onRendered) { //plain text value
	return "<i class='fas fa-trash-alt'></i>";
};

var tripListGlobal = {};
var tripLister = function(cell) {
	return tripListGlobal;
}


var footerHTML = DefaultTableFooter;
const saveButton = "<button id='saveFreqButton' class='btn btn-outline-primary' disabled>Save Frequencies Changes</button>";
footerHTML = footerHTML.replace('{SaveButton}', saveButton);

//####################
// Tabulator tables
var table = new Tabulator("#frequencies-table", {
	selectable:0,
	index: 'trip_id',
	movableRows: true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}tableReadSave?table=frequencies`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	footerElement: footerHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"trip_id", field:"trip_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", bottomCalc:freqTotal, width:200, editor:"select", editorParams:tripLister },
		{title:"start_time", field:"start_time", editor:"input", headerFilter:"input", headerFilterPlaceholder:"HH:MM:SS" },
		{title:"end_time", field:"end_time", editor:"input", headerFilter:"input", headerFilterPlaceholder:"HH:MM:SS"},
		{title:"headway_secs", field:"headway_secs", editor:"input", headerFilter:"input", headerTooltip:"time between departures"},
		{title:"exact_times", field:"exact_times", editor:"select", editorParams:exact_timesChoices, headerFilter:"input"},
		{
			formatter: trashIcon, align: "center", title: "del", headerSort: false, cellClick: function (e, cell) {				
				cell.getRow().delete();				
			}
		}
		
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to tableReadSave table=frequencies failed.  Returned status of: ' + errorThrown);
	},
	dataEdited:function(data){
		$('#saveFreqButton').removeClass().addClass('btn btn-primary');
		$('#saveFreqButton').prop('disabled', false);
	}
});

// Toggles for show hide columns in stop table.

$('body').on('change', 'input[type="checkbox"]', function() {
	var column = this.id.replace('check','');
	if(this.checked) {		
		table.showColumn(column);
        table.redraw();
    }
    else {		
		table.hideColumn(column);
        table.redraw();       
    }
});

$(document).on("click","#LinkDownloadCSV", function () {
	table.download("csv", "agency.csv");
});

$(document).on("click","#LinkDownloadJSON", function () {
	table.download("json", "agency.json");
});


// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	getPythonRoutesList();
	$("#tripSelect").select2({placeholder: "First select a route",
	theme: 'bootstrap4'});
	var ColumnSelectionContent = "";
	table.getColumnLayout().forEach(function(selectcolumn) {            
	// get the column selectbox value
		if (selectcolumn.field) {
			var columnname = selectcolumn.field;
			console.log(columnname);
			var checked = '';
			if (selectcolumn.visible == true) {
				checked = 'checked';
			}
			ColumnSelectionContent += '<div class="dropdown-item"><div class="form-check"><input class="form-check-input" type="checkbox" value="" id="check'+columnname+'" '+checked+'><label class="form-check-label" for="check'+columnname+'">'+columnname+'</label></div></div>';		                
		}
	});
	$("#SelectColumnsMenu").html(ColumnSelectionContent);	
	var DownloadContent = "";
	DownloadLinks.forEach(function(downloadtype) {
		DownloadContent += '<a class="dropdown-item" href="#" id="LinkDownload'+downloadtype+'">Download '+downloadtype+'</a>';		                
	});
	$("#DownloadsMenu").html(DownloadContent);
});

// #########################
// Buttons

$("#addFreqButton").on("click", function(){
	let trip_id = $("#tripSelect").val();
	if(!trip_id) {
		$("#freqAddStatus").html('Please choose a valid trip_id value.');
		setTimeout(function(){ $("#freqAddStatus").html(''); },10000);
		return;
	}
	table.addRow([{trip_id:trip_id}], true);
	$("#freqAddStatus").html('Added.');
	setTimeout(function(){ $("#freqAddStatus").html(''); },10000);
});


$("#saveFreqButton").on("click", function(){	
	var pw = $("#password").val();
	if ( ! pw ) { 
		$.toast({
			title: 'Save Freqencies',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});		
		shakeIt('password'); return;
	}

	$.toast({
		title: 'Saving Frequencies',
		subtitle: 'Saving',
		content: 'Sending data to server.. please wait..',
		type: 'info',
		delay: 5000
	  });
	var data = table.getData();
	
	console.log('sending frequencies data to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?table=frequencies&pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('<span class="alert alert-success">Successfully sent data via POST to server API/tableReadSave?table=frequencies, response received: ' + xhr.responseText + '</span>');
			$.toast({
				title: 'Saved Frenquencies',
				subtitle: 'Saved',
				content: xhr.responseText,
				type: 'success',
				delay: 5000
			  });			
			$('#saveFreqButton').removeClass().addClass('btn btn-outline-primary');
			$('#saveFreqButton').prop('disabled', true);
			
		} else {
			console.log('Server POST request to API/tableReadSave?table=frequencies failed. Returned status of ' + xhr.status + ', response: ' + xhr.responseText );
			$.toast({
				title: 'Error saving Frenquencies',
				subtitle: 'Error',
				content: xhr.responseText,
				type: 'error',
				delay: 5000
			  });
			$('#saveFreqButton').removeClass().addClass('btn btn-outline-primary');
			$('#saveFreqButton').prop('disabled', true);			
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
	
});

function getPythonRoutesList() {
	/* to do:
	get list of trip_ids from trips table
	populate a dropdown with it for new frequency adding. It must be an existing trip.
	*/
	var jqxhr = $.get( `${APIpath}tableColumn?table=routes&column=route_id`, function( data ) {
		route_id_list =  JSON.parse(data) ;
		console.log('GET request to API/tableColumn table=routes successful.');
		//allStops = data;		
		var select2Routesitems = [];		
		select2Routesitems.push({id : '', text: ''});
		for(key in route_id_list) {			
			select2Routesitems.push({id : route_id_list[key], text: route_id_list[key]})
		}
		$("#routeSelect").select2({				
			placeholder: "Choose a Route",
			theme: 'bootstrap4',
			data: select2Routesitems,
			allowClear: true
		  });		
	})
	.fail( function() {
		console.log('GET request to API/tableColumn table=routes failed.')
	});
}

// If Route selected:
$('#routeSelect').on('select2:select', function (e) {	
	var route_id = e.params.data.id;
	console.log(route_id);
	if( route_id == '') { 
		$.toast({
			title: 'Select route',
			subtitle: 'Failed to select',
			content: 'Please choose a valid route_id to load its trips.',
			type: 'error',
			delay: 5000
		  });
		return;
	}
	var jqxhr = $.get( `${APIpath}tableColumn?table=trips&column=trip_id&key=route_id&value=${route_id}`, function( data ) {
		trip_id_list =  JSON.parse(data);
		var select2Tripsitems = [];
		console.log('GET request to API/tableColumn table=trips successful.');
		// Clean Trip Options
		$("#tripSelect").select2("destroy");
		//$("#tripSelect").val(null).trigger("change");
		// var newOption = new Option('Select a trip', null, false, true);
		// $('#tripSelect').append(newOption);
		// console.log('added default option');
		for(key in trip_id_list) {			
			// var newOption = new Option(trip_id_list[key], trip_id_list[key], false, false);
			// $('#tripSelect').append(newOption);
			select2Tripsitems.push({id : route_id_list[key], text: route_id_list[key]})
		}		
		//$('#tripSelect').trigger('change');
		$("#tripSelect").select2({				
			placeholder: "Choose a trip",
			theme: 'bootstrap4',
			data: select2Tripsitems
		  });
		// var content = '<option value="">Choose a Trip</option>';
		// trip_id_list.forEach(element => {
		// 	//tripListGlobal[element] = element;
		// 	content += `<option value="${element}">${element}</option>`;
		// });
		// $('#tripSelect').html(content);
		// $('#tripSelect').trigger('chosen:updated'); // update if re-populating
		// $('#tripSelect').chosen({search_contains:true, width:200, placeholder_text_single:'Pick a Trip'});
	})
	.fail( function() {
		console.log('GET request to API/tableColumn table=trips failed.')
	});
});



// function getPythonTripsList() {
// 	var route_id = $('#routeSelect').val();
// 	if(!route_id.length) {
// 		$("#freqAddStatus").html('Please choose a valid route_id to load its trips.');
// 		//shakeIt('routeSelect'); // doesn't seem to work well on chosen dropdowns
// 		return;
// 	}

	
// }