// #########################################
// Function-variables to be used in tabulator

var GTFSDefinedColumns = ["agency_id", "agency_name", "agency_url", "agency_timezone", "agency_lang", "agency_phone", "agency_fare_url", "agency_email"];

var agencyTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' agencies total';
}

var footerHTML = DefaultTableFooter;
const saveButton = `<button id='saveAgencyButton' class='btn btn-outline-primary' disabled>Save Agency Changes</button>`;
footerHTML = footerHTML.replace('{SaveButton}', saveButton);
footerHTML = footerHTML.replace('{FastAdd}', '');
//####################
// Tabulator tables

var table = new Tabulator("#agency-table", {
	selectable: 0,
	index: 'agency_id',
	movableRows: true,
	history: true,
	addRowPos: "top",
	movableColumns: true,
	layout: "fitDataFill",
	ajaxURL: `${APIpath}tableReadSave?table=agency`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	placeholder: "No Data Available",
	footerElement: footerHTML,
	columns: [
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30, download: true },
		{ title: "agency_id", field: "agency_id", editor: "input", headerSort: false, validator: tabulator_UID_leastchars, download: true },
		{ title: "agency_name", field: "agency_name", editor: "input", headerSort: false, bottomCalc: agencyTotal, download: true },
		{ title: "agency_url", field: "agency_url", editor: "input", headerSort: false, download: true },
		{ title: "agency_timezone", field: "agency_timezone", editor: select2TZEditor, width: 300, headerSort: false, download: true },
		{ title: "agency_lang", field: "agency_lang", editor: "input", headerSort: false, download: true, visible: false },
		{ title: "agency_phone", field: "agency_phone", editor: "input", headerSort: false, download: true, visible: false },
		{ title: "agency_fare_url", field: "agency_fare_url", editor: "input", headerSort: false, download: true, visible: false },
		{ title: "agency_email", field: "agency_email", editor: "input", headerSort: false, download: true, visible: false }
	],
	ajaxError: function (xhr, textStatus, errorThrown) {
		console.log('GET request to agency failed.  Returned status of: ' + errorThrown);
	},
	dataEdited: function (data) {
		$('#saveAgencyButton').removeClass().addClass('btn btn-primary');
		$('#saveAgencyButton').prop('disabled', false);
	},
	dataLoaded: function (data) {
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

$('body').on('change', 'input[type="checkbox"]', function () {
	var column = this.id.replace('check', '');
	if (this.checked) {
		table.showColumn(column);
		table.redraw();
	}
	else {
		table.hideColumn(column);
		table.redraw();
	}
});

$(document).on("click", "#LinkDownloadCSV", function () {
	table.download("csv", "agency.csv");
});

$(document).on("click", "#LinkDownloadJSON", function () {
	table.download("json", "agency.json");
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

// ###################
// commands to run on page load
$(document).ready(function () {
	// executes when HTML-Document is loaded and DOM is ready
	$("#agency_timezone").select2({
		placeholder: "Select a timezone",
		allowClear: true,
		theme: 'bootstrap4',
		data: TimeZoneList
	});
	// Set the default timezone from the settings.js file.
	$("#agency_timezone").val(cfg.GTFS.Timezone).trigger("change");

	var DownloadContent = "";
	DownloadLinks.forEach(function (downloadtype) {
		DownloadContent += '<a class="dropdown-item" href="#" id="LinkDownload' + downloadtype + '">Download ' + downloadtype + '</a>';
	});
	$("#DownloadsMenu").html(DownloadContent);
});

// #########################
// Buttons

$('#saveAgencyButton').on('click', function () {
	saveAgency();
});

$('#addAgencyButton').on('click', function () {
	// First validate the form!
	var $form = $('#Form-AddAgency');
	$form.parsley({
		errorClass: 'has-danger',
		successClass: 'has-success',
		classHandler: function (ParsleyField) {
			return ParsleyField.$element.closest('.form-group');
		},
		errorsContainer: function (ParsleyField) {
			return ParsleyField.$element.closest('.form-group');
		},
		errorsWrapper: '<span class="form-text text-danger"></span>',
		errorTemplate: '<span></span>'
	}).validate()
	if ($form.parsley().validate()) {
		// Process adding the value
		addAgency();
	}
});

$("#agency_id").bind("change keyup", function () {
	if (CAPSLOCK) this.value = this.value.toUpperCase();
});


// #########################
// Functions

function saveAgency() {
	var pw = $("#password").val();
	if (!pw) {
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
	console.log(data);
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
			console.log('Server POST request to API/tableReadSave table=agency failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText);
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
	if (!agency_id.length) {
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
	if (isPresent) {
		//$('#agencyAddStatus').html('<span class="alert alert-danger">' + agency_id + ' is already there.</span>');
		$.toast({
			title: 'Add Agency',
			subtitle: 'Failed to Add',
			content: agency_id + ' is already there.',
			type: 'error',
			delay: 5000
		});
	} else {
		table.addData([{ 'agency_id': agency_id, 'agency_name': agency_name, 'agency_url': agency_url, 'agency_timezone': agency_timezone }]);
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

function addColumntoTable() {
	var CurrentColumns = [];
	var ColumntoAdd = prompt("Please enter are title for the column you ant to add", "Column Add");
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
			console.log(field);
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
	$('#saveAgencyButton').removeClass().addClass('btn btn-primary');
	$('#saveAgencyButton').prop('disabled', false);
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