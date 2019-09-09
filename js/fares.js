//#########################
// Global variables
//var allStopsKeyed = ''; // not sure if this is used anywhere..

// #########################################
// Function-variables to be used in tabulator
var trashIcon = function (cell, formatterParams, onRendered) { //plain text value
	return "<i class='fas fa-trash-alt'></i>";
};

var agencyListGlobal = {};

var agencyLister = function (cell) {
	return agencyListGlobal;
}

var GTFSDefinedColumnsFareRules = ["fare_id", "route_id", "origin_id", "destination_id", "contains_id"];
var GTFSDefinedColumnsFareAttributes = ["fare_id", "price", "currency_type", "payment_method", "transfers", "agency_id", "transfer_duration"];

var footerHTML = DefaultTableFooter;
const saveButtonFareAttributes = '<button id="saveFareAttributesButton" class="btn btn-outline-primary" disabled>Save Fare Attributes to DB</button>';
footerHTMLFareAttributes = footerHTML.replace('{SaveButton}', saveButtonFareAttributes);
footerHTMLFareAttributes = footerHTMLFareAttributes.replace('{FastAdd}', '');

const saveButtonFareRules = '<button id="saveFareRulesSimpleButton" class="btn btn-outline-primary" disabled>Save Fare Rules</button>';
footerHTMLFareRules = footerHTML.replace('{SaveButton}', saveButtonFareRules);
footerHTMLFareRules = footerHTMLFareRules.replace('{FastAdd}', '');
// To workaround double footer menu's in onepage.
// Menu id
footerHTMLFareRules = footerHTMLFareRules.replace('btnGroupDrop1', 'btnGroupDrop1FareRules');
footerHTMLFareRules = footerHTMLFareRules.replace('btnGroupDrop2', 'btnGroupDrop2FareRules');
// Menu insertings ID's
footerHTMLFareRules = footerHTMLFareRules.replace('SelectColumnsMenu', 'SelectColumnsMenuFareRules');
footerHTMLFareRules = footerHTMLFareRules.replace('DownloadsMenu', 'DownloadsMenuFareRules');

// Menu insertings ID's
footerHTMLFareRules = footerHTMLFareRules.replace('LinkAddColumn', 'LinkAddColumnFareRules');
footerHTMLFareRules = footerHTMLFareRules.replace('LinkDeleteColumn', 'LinkDeleteColumnFareRules');
footerHTMLFareRules = footerHTMLFareRules.replace('LinkShowHideColumn', 'LinkShowHideColumnFareRules');


// set dynamic dropdown for fare_ids, reading from fare attributes table
var fareListGlobal = [];
var fareList = function (cell) {
	return fareListGlobal;
}

var routeIdListGlobal = {};
var routeIdLister = function (cell) {
	return routeIdListGlobal;
}

var zoneIdListGlobal = {};
// solves https://github.com/WRI-Cities/static-GTFS-manager/issues/62
var zoneIdLister = function (cell) {
	return zoneIdListGlobal;
}

var faresTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' fares total';
}

var fareRulesTotal = function (values, data, calcParams) {
	var calc = values.length;
	return calc + ' rules total';
}

//#########################
// defining tables
var fareattributes = new Tabulator("#fare-attributes-table", {
	selectable: 0, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	index: "fare_id",
	history: true,
	addRowPos: "top",
	ajaxURL: APIpath + 'tableReadSave',
	ajaxParams: { table: "fare_attributes" },
	ajaxLoaderLoading: loaderHTML,
	layout: "fitColumns",
	footerElement: footerHTMLFareAttributes,
	columns: [ //Define Table Columns		
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{
			title: "fare_id", field: "fare_id", editor: "input", headerFilter: "input", validator: ["string", "minLength:2"], bottomCalc: faresTotal, cellClick: function (e, cell) {
				var farerulesdefined = simple.searchData("fare_id", "=", cell.getRow().getData().fare_id);
				console.log('fare_id defined: ' + farerulesdefined);
				if (farerulesdefined.length > 0) {
					alert('You cannot edit a fare_id when a fare_rule reference is present!');
				}
			}, download: true
		},
		{ title: "price", field: "price", editor: "input", headerFilter: "input", validator: ["required", "numeric"], download: true },
		{ title: "currency_type", field: "currency_type", editor: select2CurrencyEditor, headerSort: false, download: true },
		{ title: "payment_method", field: "payment_method", editor: "select", editorParams: { values: { 0: "0 - on boarding", 1: "1 - before boarding" } }, headerSort: false, download: true, visible: false },
		{ title: "transfers", field: "transfers", editor: "select", editorParams: { values: { '': 'Unlimited transfers', 0: "No transfers are permitted on this fare", 1: "One transfer is permitted on this fare", 2: "Two transfers are permitted on this fare" } }, headerSort: false, download: true, visible: false },
		{ title: "agency_id", field: "agency_id", headerSort: false, editor: "select", editorParams: { values: agencyListGlobal }, tooltip: "Needed to fill when there is more than one agency.", download: true, visible: false },
		{ title: "transfer_duration", field: "transfer_duration", editor: "input", headerFilter: "input", validator: ["numeric"], download: true, visible: false },
		{
			formatter: trashIcon, width: 40, align: "center", title: "del", headerSort: false, minWidth: 30, cellClick: function (e, cell) {
				var farerulesdefined = simple.searchData("fare_id", "=", cell.getRow().getData().fare_id);
				if (farerulesdefined.length > 0) {
					alert('You cannot delete a fare attribute that has a reference in the fare_rules table!');
				}
				else {
					if (confirm('Are you sure you want to delete this entry?'))
						cell.getRow().delete();
				}
			}
		}
	],
	cellEdited: function (cell) {
		// on editing a cell, log changes 
		let fare_id = cell.getRow().getIndex(); //get corresponding stop_id for that cell
		let field = cell.getColumn().getField();
		console.log('Changed fare attribute for ' + fare_id + ', ' + field + ': ' + cell.getOldValue() + ' to ' + cell.getValue());
	},
	ajaxError: function (xhr, textStatus, errorThrown) {
		console.log('GET request to tableReadSave?table=fare_attributes failed.  Returned status of: ' + errorThrown);
	},
	dataLoaded: function (data) {
		//fareattributes.setData();
		console.log('GET request to tableReadSave?table=fare_attributes successful.');
		UpdateFareID(data);
		if (data.length > 0) {
			AddExtraColumns(Object.keys(data[0]), GTFSDefinedColumnsFareAttributes, fareattributes);
		}
		else {
			console.log("No data so no columns");
		}
	},
	rowSelected: function (row) {
		//$('#targetFareid').val(row.getIndex());
	},
	dataEdited: function (data) {
		$('#saveFareAttributesButton').removeClass().addClass('btn btn-primary');
		$('#saveFareAttributesButton').prop('disabled', false);
	},
	rowUpdated: function (row) {
		// The rowUpdated callback is triggered when a row is updated by the updateRow, updateOrAddRow, updateData or updateOrAddData, functions.
		$('#saveFareAttributesButton').removeClass().addClass('btn btn-primary');
		$('#saveFareAttributesButton').prop('disabled', false);
	},

}); // end fare attributes table definition

var farerules = new Tabulator("#fare-rules-table", {
	selectable: 0, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	index: "fare_id",
	history: true,
	addRowPos: "top",
	placeholder: "There are no rules defined. First create a rule.",
	ajaxURL: APIpath + 'fareRulesPivoted',
	ajaxLoaderLoading: loaderHTML,
	layout: "fitColumns",
	ajaxResponse: function (url, params, response) {
		console.log("response:");
		console.log(response);
		if (response.length == 0) {
			return response;
		}
		var colslist = Object.keys(response[0]); // get all the keys, ie, column headers. from https://stackoverflow.com/a/8430501/4355695
		var columnSettings = [{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 }];


		// setting options for the columns.
		for (i in colslist) {
			if (i == 0) {
				columnSettings.push({ title: colslist[i], field: colslist[i], headerSort: false, frozen: true /*, headerFilter:"input"*/ });
			}
			else columnSettings.push({ title: colslist[i], field: colslist[i], headerSort: false, editor: "select", editorParams: { values: fareList } });
		}

		columnSettings.push({ rowHandle: true, formatter: "handle", headerSort: false, width: 30, minWidth: 30 });

		// var cols = $.parseJSON(JSON.stringify(gridResponse.columns, replacer));
		// var gridData = $.parseJSON(JSON.stringify(gridResponse.gridData, replacer));

		farerules.setColumns(columnSettings);
		//console.log(this.columns);

		return response;
	},
	ajaxError: function (xhr, textStatus, errorThrown) {
		console.log('GET request to tableReadSave?table=fareRulesPivoted failed.  Returned status of: ' + errorThrown);
	},
	dataLoaded: function (data) {
		//fareattributes.setData();
		console.log('GET request to tableReadSave?table=fareRulesPivoted successful.');
	}

}); // end fare attributes table definition

// Fare Rules simple 
var simple = new Tabulator("#fare-rules-simple-table", {
	selectable: 0, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	//index: "fare_id", // no index on this one
	history: true,
	addRowPos: "top",
	ajaxURL: APIpath + 'tableReadSave?table=fare_rules', //ajax URL
	ajaxLoaderLoading: loaderHTML,
	layout: "fitColumns",
	footerElement: footerHTMLFareRules,
	columns: [ //Define Table Columns		
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "fare_id", field: "fare_id", headerFilter: "input", width: 120, editor: "select", editorParams: { values: fareList }, tooltip: "Fare Id. Corresponds to a price set in Fare Attributes tab.", bottomCalc: fareRulesTotal },
		{ title: "origin_id", field: "origin_id", editor: "select", editorParams: { values: zoneIdLister }, headerFilter: "input", tooltip: "Origin Zone Id. Journey starting from this zone. Zones defined in Stops page." },
		{ title: "destination_id", field: "destination_id", editor: "select", editorParams: { values: zoneIdLister }, headerFilter: "input", tooltip: "Desitnation Zone Id. Journey ending in this zone. Zones defined in Stops page." },
		{ title: "contains_id", field: "contains_id", editor: "select", editorParams: { values: zoneIdLister }, headerFilter: "input", tooltip: "Identifies the zones that a rider enters for a given fare class. Used in some systems to calculate the correct fare class.", download: true, visible: false },
		{ title: "route_id", field: "route_id", editor: "select", editorParams: { values: routeIdLister }, headerFilter: "input", tooltip: "If this fare rule only applies to a particular route then select the route here." },
		{
			formatter: trashIcon, width: 40, align: "center", title: "del", headerSort: false, minWidth: 30, cellClick: function (e, cell) {
				if (confirm('Are you sure you want to delete this entry?'))
					cell.getRow().delete();
			}
		}
	],

	ajaxError: function (xhr, textStatus, errorThrown) {
		console.log('GET request to API tableReadSave?table=fare_rules failed.  Returned status of: ' + errorThrown);
	},
	dataLoaded: function (data) {
		console.log('GET request to API tableReadSave?table=fare_rules successful.');
		if (data.length > 0) {
			AddExtraColumns(Object.keys(data[0]), GTFSDefinedColumnsFareRules, simple);
		}
		else {
			console.log("No data so no columns");
		}
	},
	dataEdited: function (data) {
		$('#saveFareRulesSimpleButton').removeClass().addClass('btn btn-primary');
		$('#saveFareRulesSimpleButton').prop('disabled', false);
	},
	rowUpdated: function (row) {
		// The rowUpdated callback is triggered when a row is updated by the updateRow, updateOrAddRow, updateData or updateOrAddData, functions.
		$('#saveFareRulesSimpleButton').removeClass().addClass('btn btn-primary');
		$('#saveFareRulesSimpleButton').prop('disabled', false);
	}
});

// On clicking the tab redraw the tabultator info:
$('.nav-tabs a[href="#Attributes"]').on('shown.bs.tab', function (event) {
	fareattributes.redraw(true);
});

$('.nav-tabs a[href="#Simple"]').on('shown.bs.tab', function (event) {
	simple.redraw(true);
});

// Catch clicking

$(document).on("click", "#LinkAddColumnFareRules", function () {
	addColumntoTable(simple);
});

$(document).on("click", "#LinkDeleteColumnFareRules", function () {
	RemoveExtraColumns(simple, GTFSDefinedColumnsFareRules, 'simple');
});

$(document).on("click", "#LinkShowHideColumnFareRules", function () {
	ShowHideColumn(simple, 'simple');
});

$(document).on("click", "#DeleteColumnButton", function () {
	SelectTableForDeleteExtraColumns();
});

$(document).on("click", "#LinkAddColumn", function () {
	addColumntoTable(fareattributes);
});

$(document).on("click", "#LinkDeleteColumn", function () {
	RemoveExtraColumns(fareattributes, GTFSDefinedColumnsFareAttributes, 'fareattributes');
});

$(document).on("click", "#LinkShowHideColumn", function () {
	ShowHideColumn(fareattributes, 'fare_attributes');
});


function UpdateFareID(data) {
	console.log("Update FareID Select2");
	// Clean all items
	$('#fareSelect').empty().trigger("change");
	// Repopulate
	$("#fareSelect").select2({
		placeholder: "Select a fare",
		theme: 'bootstrap4',
	});
	// First option
	var newOption = new Option("Select Fare", "", false, false);
	$('#fareSelect').append(newOption).trigger('change');
	// List of options
	data.forEach(function (row) {
		var SelectOption = row['fare_id'] + " - " + row['price'] + " - " + row['currency_type'];
		var newOption = new Option(SelectOption, row.fare_id, false, false);
		$('#fareSelect').append(newOption).trigger('change');
		fareListGlobal[row.fare_id] = row.fare_id;
	});
}


//#######################
// initiating commands
$(document).ready(function () {
	// Initiating Fare Rules table.
	getPythonRouteIdList();
	getPythonZones();
	getPythonAgency();

	$("#currency").select2({
		tags: false,
		placeholder: 'Select currency',
		data: CurrencyList,
		theme: "bootstrap4"
	});
	$("#currency").val(cfg.GTFS.Currency).trigger("change");
	var DownloadContent = "";
	DownloadLinks.forEach(function (downloadtype) {
		DownloadContent += '<a class="dropdown-item" href="#" id="LinkDownload' + downloadtype + '">Download ' + downloadtype + '</a>';
	});
	$("#DownloadsMenu").html(DownloadContent);

	$("#SelectColumnsMenuFareRules").html(ColumnSelectionContent);
	var DownloadContent = "";
	DownloadLinks.forEach(function (downloadtype) {
		DownloadContent += '<a class="dropdown-item" href="#" id="LinkDownloadFareRules' + downloadtype + '">Download ' + downloadtype + '</a>';
	});
	$("#DownloadsMenuFareRules").html(DownloadContent);

});

$('body').on('change', 'input[id^="check"]', function () {
	var column = this.id.replace('check', '');
	if (this.value == 'fare_attributes') {
		if (this.checked) {
			fareattributes.showColumn(column);
			fareattributes.redraw();
		}
		else {
			fareattributes.hideColumn(column);
			fareattributes.redraw();
		}
	}
	else {
		if (this.checked) {
			simple.showColumn(column);
			simple.redraw();
		}
		else {
			simple.hideColumn(column);
			simple.redraw();
		}
	}
});

$(document).on("click", "#LinkDownloadCSV", function () {
	fareattributes.download("csv", "fare_attributes.csv");
});

$(document).on("click", "#LinkDownloadJSON", function () {
	fareattributes.download("json", "fare_attributes.json");
});

$(document).on("click", "#LinkDownloadFareRulesCSV", function () {
	simple.download("csv", "fare_rules.csv");
});

$(document).on("click", "#LinkDownloadFareRulesJSON", function () {
	simple.download("json", "fare_rules.json");
});


//####################
// Button actions

$("#addEditFare").on("click", function () {
	var $form = $('#Form-AddFareAttributes');
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
		AddFare()
	}


});

$("#targetFareid").bind("change keyup", function () {
	if (CAPSLOCK) this.value = this.value.toUpperCase();
});



//undo button
$("#attributes-undo").on("click", function () {
	$("#fare-attributes-table").tabulator("undo");
});
$("#rules-undo").on("click", function () {
	$("#fare-rules-table").tabulator("undo");
});

//redo button
$("#attributes-redo").on("click", function () {
	$("#fare-attributes-table").tabulator("redo");
});
$("#rules-redo").on("click", function () {
	$("#fare-rules-table").tabulator("redo");
});

// Saving changes
$("#saveFareAttributesButton").on("click", function () {
	saveFareAttributes();
})

$("#saveFareRulesPivotedButton").on("click", function () {
	saveFareRulesPivoted();
})

$("#addFareRuleButton").on("click", function () {
	var $form = $('#Form-AddFareRule');
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
		addFareRule();
	}

})

$("#saveFareRulesSimpleButton").on("click", function () {
	saveFareRulesSimple();
})

// #####################################
// Functions

function AddFare() {

	var fare_id = $('#targetFareid').val().replace(/[^A-Za-z0-9-_]/g, "");
	if (CAPSLOCK) fare_id = fare_id.toUpperCase(); // change to uppercase if capslock

	$('#targetFareid').val(fare_id);

	var price = $('#price').val().replace(/[^0-9.-]/g, ""); //n1b3rs only
	$('#price').val(price);
	var currencyChosen = $('#currency').val() || cfg.GTFS.currency;
	var transfers = $('#transfers').val();
	var payment_method = $('#paymentmethod').val()
	console.log(transfers);
	// validation
	if (!(fare_id.length > 0 && parseFloat(price) >= 0)) {
		$('#fareAttrStatus').html('<div class="alert alert-warning">Enter a valid fare id and/or price.</div>');
		return;
	}

	$('#fareAttrStatus').html('');

	fareattributes.updateOrAddData([{ 'fare_id': fare_id, 'price': price, 'currency_type': currencyChosen, 'payment_method': payment_method, 'transfers': transfers }]);
	$('#targetFareid').val('');
	$('#price').val('');
}

function depopulateFields() {
	$('#targetFareid').val('');
	$('#price').val('');
}

function saveFareAttributes() {
	var pw = $("#password").val();
	if (!pw) {
		$.toast({
			title: 'Save Fare Attributes',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});
		shakeIt('password'); return;
	}
	$.toast({
		title: 'Save Fare Attributes',
		subtitle: 'Saving',
		content: 'Sending data to server.. please wait..',
		type: 'info',
		delay: 5000
	});

	var data = fareattributes.getData();
	var datajson = JSON.stringify(data);
	console.log(data);
	$.ajax({
		url: `${APIpath}fareAttributes?pw=${pw}`,
		type: 'POST',
		data: datajson,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8',
		success: function (returndata) {
			console.log('API/fareAttributes POST request successfully done.');
			$.toast({
				title: 'Save Fare Attributes',
				subtitle: 'Saved',
				content: returndata,
				type: 'success',
				delay: 5000
			});
			// Update Fare Select box			
			UpdateFareID(data);
			$('#saveFareAttributesButton').removeClass().addClass('btn btn-outline-primary');
			$('#saveFareAttributesButton').prop('disabled', true);
		},
		error: function (jqXHR, exception) {
			console.log('API/fareAttributes POST request failed.');
			$.toast({
				title: 'Save Fare Attributes',
				subtitle: 'Error',
				content: jqXHR.responseText,
				type: 'error',
				delay: 5000
			});
		}
	});
}

function saveFareRulesPivoted() {
	var pw = $("#password").val();
	if (!pw) {
		$.toast({
			title: 'Save Fare pivoted',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});
		shakeIt('password'); return;
	}
	$.toast({
		title: 'Save Fare Rules pivoted',
		subtitle: 'Saving',
		content: 'Sending data to server.. please wait..',
		type: 'info',
		delay: 5000
	});

	var data = JSON.stringify(farerules.getData());

	$.ajax({
		url: `${APIpath}fareRulesPivoted?pw=${pw}`,
		type: 'POST',
		data: data,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8',
		success: function (returndata) {
			console.log('API/fareRulesPivoted POST request successfully done.');
			$.toast({
				title: 'Save Fare Rules  pivoted',
				subtitle: 'Saving',
				content: 'Fare Rules saved to DB.',
				type: 'success',
				delay: 5000
			});
			// Reload tables.
			farerules.setData();
			farerules.redraw(true);
			simple.setData();
			simple.redraw(true);
		},
		error: function (jqXHR, exception) {
			console.log('API/fareRulesPivoted POST request failed.');
			$.toast({
				title: 'Save Fare Rules  pivoted',
				subtitle: 'Saving',
				content: jqXHR.responseText,
				type: 'error',
				delay: 5000
			});
		}
	});
}

function saveFareRulesSimple() {
	var pw = $("#password").val();
	if (!pw) {
		$.toast({
			title: 'Save Fare Rules Simple',
			subtitle: 'No password provided.',
			content: 'Please enter the password.',
			type: 'error',
			delay: 5000
		});
		shakeIt('password'); return;
	}
	$.toast({
		title: 'Save Fare Rules Simple',
		subtitle: 'Saving',
		content: 'Sending data to server.. please wait..',
		type: 'info',
		delay: 5000
	});

	var data = JSON.stringify(simple.getData());

	$.ajax({
		url: `${APIpath}tableReadSave?table=fare_rules&pw=${pw}`,
		type: 'POST',
		data: data,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8',
		success: function (returndata) {
			console.log('API/tableReadSave?table=fare_rules POST request successfully done.');
			//$('#saveFareRulesSimpleStatus').html('<span class="alert alert-success">' + returndata + '</span>' );
			$.toast({
				title: 'Save Fare Rules Simple',
				subtitle: 'Saved',
				content: returndata,
				type: 'success',
				delay: 5000
			});
			//logmessage( 'Simple Fare Rules saved to DB.' );
			// Reload tables.
			farerules.setData();
			farerules.redraw(true);
			simple.setData();
			simple.redraw(true);
			$('#saveFareRulesSimpleButton').removeClass().addClass('btn btn-outline-primary');
			$('#saveFareRulesSimpleButton').prop('disabled', true);
		},
		error: function (jqXHR, exception) {
			console.log('API/tableReadSave?table=fare_rules POST request failed.')
			$('#saveFareRulesSimpleStatus').html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>');
		}
	});
}


function getPythonZones() {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/zoneIdList`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/zoneIdList .`);
			var data = JSON.parse(xhr.responseText);

			// populating zone id dropdowns in Simple tab
			var dropdown = '';
			dropdown += `<option value="">Empty</option>`;
			data.forEach(function (row) {
				dropdown += `<option value="${row}">${row}</option>`;
				zoneIdListGlobal[row] = row;
				// solves https://github.com/WRI-Cities/static-GTFS-manager/issues/62

			});
			// console.log(dropdown);
			$('#originSelect').html(dropdown);
			$('#destinationSelect').html(dropdown);
			$('#containsSelect').html(dropdown);
		}
		else {
			console.log('Server request to API/zoneIdList failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function getPythonRouteIdList() {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/routeIdList`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/routeIdList .`);
			var data = JSON.parse(xhr.responseText);
			var dropdown = '<option value="">All routes</option>';
			data.forEach(function (row) {
				routeIdListGlobal[row] = row;
				dropdown += `<option value="${row}">${row}</option>`;
			});
			console.log(routeIdListGlobal);
			$('#routeSelect').html(dropdown);
		}
		else {
			console.log('Server request to API/routeIdList failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function addFareRule() {
	var origin_id = $('#originSelect').val();
	var destination_id = $('#destinationSelect').val();
	var route_id = $('#routeSelect').val();
	var fare_id = $('#fareSelect').val();
	simple.addRow({ fare_id: fare_id, origin_id: origin_id, destination_id: destination_id, route_id: route_id }, true);
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
			data.forEach(function (row) {
				// Push the list of agencies for use in column agency_id
				agencyListGlobal[row.agency_id] = row.agency_name;
			});
			var select2items = $.map(data, function (obj) {
				obj.id = obj.id || obj.agency_id; // replace identifier
				obj.text = obj.text || obj.agency_name
				return obj;
			});

			$("#agency_id").select2({
				placeholder: "Pick a Agency",
				theme: 'bootstrap4',
				data: select2items,
				allowClear: true
			});
		}
		else {
			console.log('Server request to API/agency failed.  Returned status of ' + xhr.status);
		}
	};
	xhr.send();
}
