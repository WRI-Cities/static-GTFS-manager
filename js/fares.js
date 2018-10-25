//#########################
// Global variables
//var allStopsKeyed = ''; // not sure if this is used anywhere..

// #########################################
// Function-variables to be used in tabulator

// set dynamic dropdown for fare_ids, reading from fare attributes table
var fareList = function(cell){
	var data = $("#fare-attributes-table").tabulator("getData");
	var faresList = data.map(a => a.fare_id);
	var priceList = data.map(a => a.price);
	faresList.push('');
	priceList.push('');
	var editorParamsList = {};
	for (f in faresList) {
		editorParamsList[faresList[f]] = faresList[f] + (priceList[f] != '' ? ' (' + priceList[f] + ')' : 'blank' );
	}
	return editorParamsList;
}

var routeIdListGlobal = {};
var routeIdLister = function(cell) {
	return routeIdListGlobal;
}

var zoneIdListGlobal = {};
// solves https://github.com/WRI-Cities/static-GTFS-manager/issues/62
var zoneIdLister = function(cell) {
	return zoneIdListGlobal;
}

var faresTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' fares total';
}

var fareRulesTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' rules total';
}

//#########################
// defining tables
$("#fare-attributes-table").tabulator({
	selectable:0, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	index: "fare_id", 
	history:true,
	addRowPos: "top",
	ajaxURL: APIpath + 'tableReadSave?table=fare_attributes', //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"fare_id", field:"fare_id", editor:"input", headerFilter:"input", width:100, validator:["string", "minLength:2"], bottomCalc:faresTotal },
		{title:"price", field:"price", editor:"input", headerFilter:"input", width:70, validator:["required","numeric"] },
		{title:"payment_method", field:"payment_method", editor:"select", editorParams:{0:"0 - on boarding", 1:"1 - before boarding"}, headerSort:false, width:100 },
		{title:"transfers", field:"transfers", editor:"select", editorParams:{'':'blank - Unlimited transfers', 0:"0 - No transfers", 1:"1 - Once allowed"}, headerSort:false, width:80 },
		{title:"currency_type", field:"currency_type", editor:"input", headerSort:false, width:120 },
		{title:"route_id", field:"route_id", headerSort:false, width:120, tooltip:'' }
	],
	
	cellEdited:function(cell){
		// on editing a cell, log changes 
		let fare_id = cell.getRow().getIndex(); //get corresponding stop_id for that cell
		let field = cell.getColumn().getField() ;

		logmessage('Changed fare attribute for ' + fare_id + ', ' + field + ': ' + cell.getOldValue() + ' to ' + cell.getValue() );
	},
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to tableReadSave?table=fare_attributes failed.  Returned status of: ' + errorThrown);
	},
	dataLoaded: function(data){
		console.log('GET request to tableReadSave?table=fare_attributes successful.');
		// populate Fare id dropdown in simple fare rules tab
		var dropdown = '';
		data.forEach(function(row){
			dropdown += `<option value="${row.fare_id}">${row.fare_id} - ${row.price} ${row.currency_type}</option>`;
		});	
		$('#fareSelect').html(dropdown);
	},
	rowSelected:function(row){
		$('#targetFareid').val(row.getIndex());
	}
	/*
	historyUndo:function(action, component, data){
		var message = '';
		if(action == 'cellEdit') {
			message = 'Undid cellEdit for ' + component.cell.row.data.fare_id + ', ' + JSON.stringify(data);
		}
		else if(action == 'rowDelete') {
			message = 'Undid rowDelete for ' + data.data.fare_id;
		}
		else if (action == 'rowAdd') {
			message = 'Undid rowAdd for ' + data.data.fare_id;
		}

		logmessage(message);

	},
	historyRedo:function(action, component, data){
		var message = '';
		if(action == 'cellEdit') {
			message = 'Redid cellEdit for ' + component.cell.row.data.fare_id + ', ' + JSON.stringify(data);
		}
		else if(action == 'rowDelete') {
			message = 'Redid rowDelete for ' + data.data.fare_id;
		}
		logmessage(message);
	},*/
	
}); // end fare attributes table definition

$("#fare-rules-simple-table").tabulator({
	selectable:0, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	//index: "fare_id", // no index on this one
	history:true,
	addRowPos: "top",
	ajaxURL: APIpath + 'tableReadSave?table=fare_rules', //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"fare_id", field:"fare_id", headerFilter:"input", width:120, editor:"select", editorParams:fareList, tooltip:"Fare Id. Corresponds to a price set in Fare Attributes tab.", bottomCalc:fareRulesTotal },
		{title:"origin_id", field:"origin_id", editor:"select", editorParams:zoneIdLister, headerFilter:"input", width:100, tooltip:"Origin Zone Id. Journey starting from this zone. Zones defined in Stops page." },
		{title:"destination_id", field:"destination_id", editor:"select", editorParams:zoneIdLister, headerFilter:"input", width:100, tooltip:"Desitnation Zone Id. Journey ending in this zone. Zones defined in Stops page." },
		{title:"route_id", field:"route_id", editor:"select", editorParams:routeIdLister, headerFilter:"input", width:100, tooltip:"If this fare rule only applies to a particular route then select the route here." },
		{formatter:"buttonCross", align:"center", title:"del", headerSort:false, minWidth:30, cellClick:function(e, cell){
			if(confirm('Are you sure you want to delete this entry?'))
				cell.getRow().delete();
			}}
	],
	
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to API tableReadSave?table=fare_rules failed.  Returned status of: ' + errorThrown);
	},
	dataLoaded: function(data){
		console.log('GET request to API tableReadSave?table=fare_rules successful.');
	}
});
//#######################
// initiating commands
$(document).ready(function(){
	// Initiating Fare Rules table.
	getPythonFareRules();
	getPythonRouteIdList();
	getPythonZones();
	// getPythonSimpleFareRules();
	// getPythonStopsKeyed();
	//Initiate fare attributes table
	//getPythonFareAttributes(); // tabulator will self-load by ajax
});


//####################
// Button actions

$("#addEditFare").on("click", function() {
	var fare_id = $('#targetFareid').val().replace(/[^A-Za-z0-9-_]/g, "");
	if(CAPSLOCK) fare_id = fare_id.toUpperCase(); // change to uppercase if capslock
	
	$('#targetFareid').val(fare_id);
	
	var price = $('#price').val().replace(/[^0-9.-]/g, ""); //n1b3rs only
	$('#price').val(price);
	var currencyChosen = $('#currency').val() || CURRENCY;

	// validation
	if( !(fare_id.length > 0 && parseFloat(price)>=0 ) ) {
		$('#fareAttrStatus').html('<div class="alert alert-warning">Enter a valid fare id and/or price.</div>');
		return;
	}
	
	$('#fareAttrStatus').html('');
	
	var data = $("#fare-attributes-table").tabulator("getData");
	var fare_id_list = data.map(a => a.fare_id);
	var isPresent = fare_id_list.indexOf(fare_id) > -1;
	if(isPresent) {
		$("#fare-attributes-table").tabulator("updateRow",fare_id, { 'price':price, 'currency_type':currencyChosen });
		logmessage('Updated fare_id ' + fare_id);
		$('#fareAttrStatus').html('<div class="alert alert-success">Updated fare_id ' + fare_id + '</div>');
		depopulateFields();
	} 
	else {
		$("#fare-attributes-table").tabulator("addRow",{ 'fare_id': fare_id, 'price':price, 'currency_type':currencyChosen, 'payment_method':1, 'transfers':''} );
		$('#fareAttrStatus').html('<div class="alert alert-success">Added fare_id ' + fare_id + '</div>');
	}
});

$("#deleteFare").on("click", function() {
	var fare_id = $('#targetFareid').val();

	let check = $("#fare-attributes-table").tabulator("deleteRow",fare_id );
	if(check) {
		$('#fareAttrStatus').html('<div class="alert alert-success">Deleted fare_id ' + fare_id + '</div>');
		logmessage('Fare attribute ' + fare_id + ' deleted.');
		depopulateFields();
	} else {
		$('#fareAttrStatus').html('<div class="alert alert-danger">fare_id [' + fare_id + '] is not in the list, so can\'t delete.</div>');
	}
});

$("#targetFareid").bind("change keyup", function(){
	if(CAPSLOCK) this.value=this.value.toUpperCase();
});



//undo button
$("#attributes-undo").on("click", function(){
	$("#fare-attributes-table").tabulator("undo");
});
$("#rules-undo").on("click", function(){
	$("#fare-rules-table").tabulator("undo");
});

//redo button
$("#attributes-redo").on("click", function(){
	$("#fare-attributes-table").tabulator("redo");
});
$("#rules-redo").on("click", function(){
	$("#fare-rules-table").tabulator("redo");
});

// Saving changes
$("#saveFareAttributesButton").on("click", function(){
	saveFareAttributes();
})

$("#saveFareRulesPivotedButton").on("click", function(){
	saveFareRulesPivoted();
})

$("#addFareRuleButton").on("click", function(){
	addFareRule();
})

$("#saveFareRulesSimpleButton").on("click", function(){
	saveFareRulesSimple();
})

// #####################################
// Functions

function depopulateFields() {
	$('#targetFareid').val('');
	$('#price').val('');
}

function getFareIds(){
	// Fetch the list of fares. For now, manually writing it in. But we want the function to fetch these either from the updated fare attributes table or python backend.
	return ['F1','F2','F3','F4','F5'];
	var data = $("#fare-attributes-table").tabulator("getData");
	var faresList = data.map(a => a.fare_id);
}

function getPythonFareRules() {
	// Here we want to fetch JSON from backend, which will take it from fare_rules.txt 
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}fareRulesPivoted`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded pivoted Fare Rules data from Server API/fareRulesPivoted .`);
			var data = JSON.parse(xhr.responseText);
			if(data.length)	initiateFareRules(data);
			else $("#fare-rules-table").html('No fare rules data found.');
		}
		else {
			console.log('Server request to API/fareRulesPivoted failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText );
		}
	};
	xhr.send();
}


function initiateFareRules(rulesData) {
	// check if already initialized
	if( $("#fare-rules-table").html().length > 1000 ) {
		$("#fare-rules-table").tabulator('setData',rulesData);
		$("#fare-rules-table").tabulator('redraw', true);
		return;
	}

	var colslist = Object.keys(rulesData[0]); // get all the keys, ie, column headers. from https://stackoverflow.com/a/8430501/4355695
	var columnSettings = [{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 }];


	// setting options for the columns.
	for (i in colslist) {
		if(i==0) {
			columnSettings.push({title:colslist[i], field:colslist[i], headerSort:false, frozen:true /*, headerFilter:"input"*/ });
		}
		else columnSettings.push({title:colslist[i], field:colslist[i], headerSort:false, editor:"select", editorParams:fareList });
	}

	columnSettings.push( {rowHandle:true, formatter:"handle", headerSort:false, width:30, minWidth:30} );

	
	$("#fare-rules-table").tabulator({
		selectable:0,
		index: 'zone_id',
		movableRows: true,
		history:true,
		addRowPos: "top",
		movableColumns: true,
		layout:"fitDataFill",
		columns:columnSettings,
		cellEdited:function(cell){
			// on editing a cell, log changes 
			let fromZone = cell.getRow().getIndex(); //get corresponding zone_id for that cell
			let toZone = cell.getColumn().getField() ;	// get the column header

			logmessage('Changed fare rule ' + cell.getOldValue() + ' to ' + cell.getValue() + ' for zone ' + fromZone + '->' + toZone);
		},
		historyUndo:function(action, component, data){
			var message = '';
			if(action == 'cellEdit') {
				message = 'Undid cellEdit for ' + component.cell.row.data.zone_id + '->' + component.cell.column.getField() + ': ' + JSON.stringify(data);
				logmessage(message);
			}
		},
		historyRedo:function(action, component, data){
			var message = '';
			if(action == 'cellEdit') {
				message = 'Redid cellEdit for ' + component.cell.row.data.zone_id + '->' + component.cell.column.getField() + ': ' + JSON.stringify(data);
				logmessage(message);
			}
		}
	});

	// Defning the table is over. Now we load the data
	$("#fare-rules-table").tabulator('setData',rulesData);
}

function saveFareAttributes() {
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#saveFareAttributesStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	$('#saveFareAttributesStatus').html('<span class="alert alert-secondary">Saving data to DB.. please wait..</span>');

	var data = JSON.stringify( $("#fare-attributes-table").tabulator('getData') );

	$.ajax({
		url : `${APIpath}fareAttributes?pw=${pw}`,
		type : 'POST',
		data : data,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8', 
		success : function(returndata) {
			console.log('API/fareAttributes POST request successfully done.');
			$('#saveFareAttributesStatus').html('<span class="alert alert-success">' + returndata + '</span>' );
			logmessage( 'Fare Attributes saved to DB.' );
		},
		error: function(jqXHR, exception) {
			console.log('API/fareAttributes POST request failed.')
			$('#saveFareAttributesStatus').html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>' );
		}
	});
}

function saveFareRulesPivoted() {
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#saveFareRulesStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	$('#saveFareRulesStatus').html('<span class="alert alert-secondary">Saving data to DB.. please wait..</span>');

	var data = JSON.stringify( $("#fare-rules-table").tabulator("getData") );
	
	$.ajax({
		url : `${APIpath}fareRulesPivoted?pw=${pw}`,
		type : 'POST',
		data : data,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8', 
		success : function(returndata) {
			console.log('API/fareRulesPivoted POST request successfully done.');
			$('#saveFareRulesStatus').html('<span class="alert alert-success">' + returndata + '</span>' );
			logmessage( 'Fare Rules saved to DB.' );
			getPythonFareRules();
			getPythonSimpleFareRules();
		},
		error: function(jqXHR, exception) {
			console.log('API/fareRulesPivoted POST request failed.')
			$('#saveFareRulesStatus').html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>' );
		}
	});	
}

function saveFareRulesSimple() {
	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#saveFareRulesSimpleStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	$('#saveFareRulesSimpleStatus').html('<span class="alert alert-secondary">Saving data to DB.. please wait..</span>');

	var data = JSON.stringify( $("#fare-rules-simple-table").tabulator("getData") );
	
	$.ajax({
		url : `${APIpath}tableReadSave?table=fare_rules&pw=${pw}`,
		type : 'POST',
		data : data,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: 'application/json; charset=utf-8', 
		success : function(returndata) {
			console.log('API/tableReadSave?table=fare_rules POST request successfully done.');
			$('#saveFareRulesSimpleStatus').html('<span class="alert alert-success">' + returndata + '</span>' );
			logmessage( 'Simple Fare Rules saved to DB.' );
			getPythonFareRules();
			//getPythonSimpleFareRules();
		},
		error: function(jqXHR, exception) {
			console.log('API/tableReadSave?table=fare_rules POST request failed.')
			$('#saveFareRulesSimpleStatus').html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>' );
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
			data.forEach(function(row){
				dropdown += `<option value="${row}">${row}</option>`;
				zoneIdListGlobal[row] = row; 
				// solves https://github.com/WRI-Cities/static-GTFS-manager/issues/62

			});
			// console.log(dropdown);
			$('#originSelect').html(dropdown);
			$('#destinationSelect').html(dropdown);

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
			data.forEach(function(row){
				routeIdListGlobal[ row ] = row;
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
	$("#fare-rules-simple-table").tabulator('addRow', {fare_id:fare_id, origin_id:origin_id, destination_id:destination_id, route_id:route_id}, true );

}

/* retired functions

function getPythonFareAttributes(){
	// Here we want to fetch JSON from backend, which will take it from fare_attributes.txt 
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}fareAttributes`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded Fare Attributes data from Server API/fareAttributes .`);
			var data = JSON.parse(xhr.responseText);
			$("#fare-attributes-table").tabulator('setData', data);

			// populate Fare id dropdown in simple fare rules tab
			var dropdown = '';
			data.forEach(function(row){
				dropdown += `<option value="${row.fare_id}">${row.fare_id} - ${row.price} ${row.currency_type}</option>`;
			});	
			$('#fareSelect').html(dropdown);

		}
		else {
			console.log('Server request to API/fareAttributes failed.  Returned status of ' + xhr.status );
		}
	};
	xhr.send();
	
}

function getPythonStopsKeyed() {
	// loading KEYED JSON of the stops.txt data, keyed by stop_id.
		let xhr = new XMLHttpRequest();
	xhr.open('GET', `API/allStopsKeyed`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded data from Server API/allStopsKeyed .`);
			var data = JSON.parse(xhr.responseText);
			allStopsKeyed = data;
		}
		else {
			console.log('Server request to API/allStopsKeyed failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText);
		}
	};
	xhr.send();
}

function getPythonSimpleFareRules() {
	// Here we want to fetch JSON from backend, which will take it from fare_rules.txt 
	let xhr = new XMLHttpRequest();
	//make API call from with this as get parameter name
	xhr.open('GET', `${APIpath}fareRules`);
	xhr.onload = function () {
		if (xhr.status === 200) { //we have got a Response
			console.log(`Loaded Simple Fare Rules data from Server API/fareRules .`);
			var data = JSON.parse(xhr.responseText);
			if(data.length)	$("#fare-rules-simple-table").tabulator('setData',data);
			//else $("#fare-rules-simple-table").html('No fare rules data found.');
			// what're you doing here, let the user create new fare rules!
		}
		else {
			console.log('Server request to API/fareRules failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText );
		}
	};
	xhr.send();
}
*/