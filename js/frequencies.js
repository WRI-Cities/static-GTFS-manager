//###################
// global variables
const exact_timesChoices = {0:"0 - Not exactly scheduled", 1:"1 - Exactly scheduled", '':"blank - not exactly scheduled (default)"};

var GTFSDefinedColumns = ["trip_id","start_time","end_time","headway_secs","exact_times"];

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
footerHTML = footerHTML.replace('{FastAdd}','');
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
		{title:"trip_id", field:"trip_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", bottomCalc:freqTotal, width:200, editable: false},
		{title:"start_time", field:"start_time", editor:"input", headerFilter:"input", headerFilterPlaceholder:"HH:MM:SS", validator:"required"},
		{title:"end_time", field:"end_time", editor:"input", headerFilter:"input", headerFilterPlaceholder:"HH:MM:SS", validator:"required"},
		{title:"headway_secs", field:"headway_secs", editor:"input", headerFilter:"input", headerTooltip:"time between departures", validator:"required"},
		{title:"exact_times", field:"exact_times", editor:"select", editorParams:{values:exact_timesChoices}, headerFilter:"input"},
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
	},
	rowUpdated:function(row){
		// The rowUpdated callback is triggered when a row is updated by the updateRow, updateOrAddRow, updateData or updateOrAddData, functions.
		$('#saveFreqButton').removeClass().addClass('btn btn-primary');
		$('#saveFreqButton').prop('disabled', false);
	},	
	dataLoaded:function(data){
		// parse the first row keys if data exists.
		if (data.length > 0) {
			AddExtraColumns(Object.keys(data[0]), GTFSDefinedColumns, table);
		}
		else {
			console.log("No data so no columns");
		}
	}
});

// Toggles for show hide columns in stop table.

$('body').on('change', 'input[id^="check"]', function() {
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

// functions for the download of the table.

$(document).on("click","#LinkDownloadCSV", function () {
	table.download("csv", "frequencies.csv");
});

$(document).on("click","#LinkDownloadJSON", function () {
	table.download("json", "frequencies.json");
});


$(document).on("click", "#LinkAddColumn", function () {
	addColumntoTable(table);
});

$(document).on("click", "#LinkDeleteColumn", function () {
	RemoveExtraColumns(table, GTFSDefinedColumns, 'table');
});

$(document).on("click", "#DeleteColumnButton", function () {
	DeleteExtraColumns(table);
});
$(document).on("click", "#LinkShowHideColumn", function () {
	ShowHideColumn(table);
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
		return;
	}
	table.addRow([{trip_id:trip_id}], true);
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
			console.log('Successfully sent data via POST to server API/tableReadSave?table=frequencies, response received: ' + xhr.responseText);
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
		$("#tripSelect").select2('data', null);
		$("#tripSelect").empty().trigger("change");		
		trip_id_list.forEach(function (item, index) {
			console.log(item);
			select2Tripsitems.push({id : item, text: item})			
		});		
		$("#tripSelect").select2({
			placeholder: "Choose a trip",
			theme: 'bootstrap4',
			data: select2Tripsitems
		  });
	})
	.fail( function() {
		console.log('GET request to API/tableColumn table=trips failed.')
	});
});
