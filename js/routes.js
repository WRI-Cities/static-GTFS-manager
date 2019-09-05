// #########################################
// Initial things to execute on page load
var allStops = [], stop_id_list =[], remaining0=[], remaining1=[], route_id_list=[];
var selected_route_id = '', globalShapesList=[], uploadedShapePrefix = '';

var GTFSDefinedColumns = ["route_id","agency_id","route_short_name","route_long_name","route_type","route_color","route_text_color","agency_id"];

// #########################################
// Function-variables to be used in tabulator

var agencyListGlobal ={};

var agencyLister = function(cell) {
	return agencyListGlobal;
} 

var routesTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' routes total';
}

var footerHTML = DefaultTableFooter;
const saveButton = "<button id='saveRoutes' class='btn btn-outline-primary' disabled>Save Routes Changes</button>";
footerHTML = footerHTML.replace('{SaveButton}', saveButton);
footerHTML = footerHTML.replace('{FastAdd}','');

// #########################################
// Construct tables
var table = new Tabulator("#routes-table", {
	selectable:0,
	index: 'route_id',
	movableRows: true,
	//history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: APIpath + 'tableReadSave?table=routes', //ajax URL
	ajaxLoaderLoading: loaderHTML,
	footerElement: footerHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"Num", width:40, formatter: "rownum",  frozen:true,download:true}, // row numbering
		{title:"route_id", field:"route_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", validator:tabulator_UID_leastchars,download:true },
		{title:"route_short_name", field:"route_short_name", editor:"input", headerFilter:"input", headerFilterPlaceholder:"filter by name",download:true },
		{title:"route_long_name", field:"route_long_name", editor:"input", headerFilter:"input", headerFilterPlaceholder:"filter by name", bottomCalc:routesTotal,download:true },
		{title:"route_type", field:"route_type", editor:select2RouteEditor, headerSort:false,download:true },
		{title:"route_color", field:"route_color", headerSort:false, editor:ColorEditor,formatter:"color",download:true},
		{title:"route_text_color", field:"route_text_color", headerSort:false, editor:ColorEditor,formatter:"color",download:true },
		{title:"agency_id", field:"agency_id", headerSort:false, editor:"select", editorParams:{values:agencyListGlobal}, tooltip:"Needed to fill when there is more than one agency.",download:true }
	],
	dataLoaded:function(data) {
		// this fires after the ajax response and after table has loaded the data. 
		console.log(`GET request to tableReadSave table=routes successfull.`);
	},
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to tableReadSave table=routes failed.  Returned status of: ' + errorThrown);
	},
	dataEdited:function(data){
		$('#saveRoutes').removeClass().addClass('btn btn-primary');
		$('#saveRoutes').prop('disabled', false);
	},
	dataLoaded:function(data){
		// parse the first row keys if data exists.
		if (data.length > 0) {
			AddExtraColumns(Object.keys(data[0]));
		}
		else {
			console.log("No data so no columns");
		}
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
	table.download("csv", "routes.csv");
});

$(document).on("click","#LinkDownloadJSON", function () {
	table.download("json", "routes.json");
});

$(document).on("click", "#LinkAddColumn", function () {
	addColumntoTable();
});

$(document).on("click", "#LinkDeleteColumn", function () {
	RemoveExtraColumns();
});

$(document).on("click", "#DeleteColumnButton", function () {
	DeleteExtraColumns();
});
$(document).on("click", "#LinkShowHideColumn", function () {
	ShowHideColumn();
});

// #########################################
// Run initiating commands
$(document).ready(function() {
	//getPythonStops(); //load allStops array
	getPythonAgency(); // load agencies, for making the agency picker dropdown in routes table
	//getPythonRoutes(); // load routes.. for routes management.
	//getPythonAllShapesList();

	var DownloadContent = "";
	DownloadLinks.forEach(function(downloadtype) {
		DownloadContent += '<a class="dropdown-item" href="#" id="LinkDownload'+downloadtype+'">Download '+downloadtype+'</a>';		                
	});
	$("#DownloadsMenu").html(DownloadContent);


});

// #########################################
// Listeners for button presses etc

$("#addRoute").on("click", function(){
	var agency_id = $('#agencySelect').val().replace(/[^A-Za-z0-9-_.]/g, "");
	if(! agency_id.length) return;
	let data = table.getData();
	route_id_list = data.map(a => a.route_id);
	var counter = 1;
	while ( route_id_list.indexOf(agency_id + pad(counter) ) > -1 ) counter++;

	var route_id = agency_id + pad(counter);
	
	console.log(route_id);

	table.addRow([{route_id: route_id, agency_id:agency_id, route_short_name:route_id}],true);
	$('#route2add').val('');
	$.toast({
		title: 'Add Route',
		subtitle: 'Adding',
		content: 'Route added with id ' + route_id + '. Fill its info in the table and then save changes.',
		type: 'success',
		delay: 3000
	  });	
});

$("#saveRoutes").on("click", function(){
	saveRoutes();
});

// #########################################
// Functions

// Save, send data to python server

function saveRoutes() {
	var data=table.getData();

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

	console.log('sending routes table data to server API/saveRoutes via POST.');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?pw=${pw}&table=routes`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API tableReadSave table=routes, response received: ' + xhr.responseText);
			$.toast({
				title: 'Save Routes',
				subtitle: 'Saved',
				content: 'Saved changes to routes DB',
				type: 'success',
				delay: 5000
			});			
			// reload routes data from DB, and repopulate route selector for sequence
			table.setData();
			$('#saveRoutes').removeClass().addClass('btn btn-outline-primary');
			$('#saveRoutes').prop('disabled', true);
		}
		 else {
			console.log('Server POST request to tableReadSave table=routes failed. Returned status of ' + xhr.status + ', response: ' + xhr.responseText );
			$.toast({
				title: 'Save Routes',
				subtitle: 'Error saving',
				content: xhr.responseText,
				type: 'error',
				delay: 5000
			});				
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.

}

function getPythonAgency() {
	//to do: load agencies info, and store it in a global variable.
	// for routes table, set a function for picking agency.
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}agency`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded agency data from Server API/agency .`);
			var data = JSON.parse(xhr.responseText);
			data.forEach(function(row){
				// Push the list of agencies for use in column agency_id
				agencyListGlobal[ row.agency_id ] = row.agency_name;				
			});			
			var select2items = $.map(data, function (obj) {
				obj.id = obj.id || obj.agency_id; // replace identifier
				obj.text = obj.text || obj.agency_id + " - " + obj.agency_name
				return obj;
			});
							
			$("#agencySelect").select2({
				tags: false,
				placeholder: 'Select agency',
				data: select2items,
				theme: "bootstrap4"
			});

		}
		else {
			console.log('Server request to API/agency failed.  Returned status of ' + xhr.status);
		}
	};
	xhr.send();
}

function addColumntoTable() {
	var CurrentColumns = [];
	var ColumntoAdd = prompt("Please enter a title for the column you want to add", "");
	if (!ColumntoAdd) { return;}
	// replace special chars and spaces.
	ColumntoAdd = ColumntoAdd.replace(/[^A-Z0-9]+/ig, "_");
	// Current Columns
	table.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			CurrentColumns.push(selectcolumn.field);
		}
	});
	// Check 
	if (CurrentColumns.indexOf(ColumntoAdd) == -1) {
		table.addColumn({ title: ColumntoAdd, field: ColumntoAdd, editor: true });
		$.toast({
			title: 'Add Column',
			subtitle: 'Columns Added',
			content: "Please add values to the newly added column. Without it it won't save it to the database.",
			type: 'success',
			delay: 5000
		});
		$('#saveAgencyButton').removeClass().addClass('btn btn-primary');
		$('#saveAgencyButton').prop('disabled', false);
	}
	else {
		$.toast({
			title: 'Add Column',
			subtitle: 'Failed to Add',
			content: ColumntoAdd + ' is already there.',
			type: 'error',
			delay: 5000
		});
	}
}

function ShowHideColumn() {
	var ColumnSelectionContent = "";
	table.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			var columnname = selectcolumn.field;
			var checked = '';
			if (selectcolumn.visible == true) {
				checked = 'checked';
			}
			ColumnSelectionContent += '<div class="form-check"><input class="form-check-input" type="checkbox" value="" id="check' + columnname + '" ' + checked + '><label class="form-check-label" for="check' + columnname + '">' + columnname + '</label></div>';
		}
	});
	$("#DeleteColumnButton").hide();
	$("#DeleteColumnModalTitle").html("Show / Hide columns");
	$("#DeleteColumnModalBody").html(ColumnSelectionContent);
	// Show the Modal
	$('#DeleteColumnModal').modal('show');
}

function RemoveExtraColumns() {
	// first load all the columns currenty active in the tabel.
	var CurrentColumns = [];
	table.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			var columnname = selectcolumn.field;
			CurrentColumns.push(columnname);
		}
	});
	// Remove gtfs columns:
	GTFSDefinedColumns.forEach(function (element) {
		for (var i = 0; i < CurrentColumns.length; i++) {
			if (CurrentColumns[i] === element) {
				// Remove the predefined columns.
				CurrentColumns.splice(i, 1);
				i--;
			}
		}
	});
	if (CurrentColumns.length == 0) {
		$.toast({
			title: 'Delete Column',
			subtitle: 'No custom Columns',
			content: 'There are no custom columns to delete',
			type: 'info',
			delay: 5000
		});
		return;
	}

	// Currentcolumns now holds all defined columns.
	var ColumnSelectionContent = "";
	CurrentColumns.forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn) {
			var columnname = selectcolumn;
			ColumnSelectionContent += '<div class="form-check"><input class="form-check-input" type="checkbox" value="' + columnname + '" name="DeleteColumns" id="DeleteColumns' + columnname + '"><label class="form-check-label" for="DeleteColumns' + columnname + '">' + columnname + '</label></div>';
		}
	});
	$("#DeleteColumnButton").show();
	$("#DeleteColumnModalTitle").html("Delete Non standard columns");
	$("#DeleteColumnModalBody").html(ColumnSelectionContent);
	// Show the Modal
	$('#DeleteColumnModal').modal('show');

}

function DeleteExtraColumns() {
	// The getdata funtion will not delete the column from the data but only hides it. 
	var data = table.getData();
	var filteredData = [];
	var columns = table.getColumns();
	data.forEach(function (row) {
		var outputRow = {};

		columns.forEach(function (col) {
			var field = col.getField();
			if (field) {
				$("input[name=DeleteColumns]:checked").each(function () {
					if (field != $(this).val()) {
						outputRow[field] = row[field];
					}
				});
			}
		});
		// Now we have the row without the delete columns.
		filteredData.push(outputRow);
	});
	$("input[name=DeleteColumns]:checked").each(function () {
		// Efectifly delete the columns from the table. But this will not delete the columns from the data!
		table.deleteColumn($(this).val());
	});
	// Replace all of the table data with the new json array. This will not contain the deleted columns!
	table.replaceData(filteredData);
	table.redraw();
	$('#saveRoutes').removeClass().addClass('btn btn-primary');
	$('#saveRoutes').prop('disabled', false);
	$('#DeleteColumnModal').modal('hide');
	$.toast({
		title: 'Delete Column',
		subtitle: 'Columns Deleted',
		content: 'Save the table save the changes to the database.',
		type: 'success',
		delay: 5000
	});
}

function AddExtraColumns(loadeddata) {
	var filtered = loadeddata;
	GTFSDefinedColumns.forEach(function (element) {
		for (var i = 0; i < filtered.length; i++) {
			if (filtered[i] === element) {
				// Remove the predefined columns.
				filtered.splice(i, 1);
				i--;
			}
		}
	});
	// Filtered contains now the columns that aren't in the gtfs specs.	
	filtered.forEach(function (addcolumn) {
		//add the column to the table.
		table.addColumn({ title: addcolumn, field: addcolumn, editor: true });
	});
}