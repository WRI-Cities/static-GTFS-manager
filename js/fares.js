//#########################
// defining tables
$("#fare-attributes-table").tabulator({
	selectable:1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	//layout:"fitColumns", //fit columns to width of table (optional)
	index: "fare_id", 
	history:true,
	addRowPos: "top",
	columns:[ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"fare_id", field:"fare_id", editor:"input", headerFilter:"input", width:100, validator:["string", "minLength:2"] },
		{title:"price", field:"price", editor:"input", headerFilter:"input", width:70, validator:["required","numeric"] },
		{title:"currency_type", field:"currency_type", headerSort:false, width:120 },
		{title:"payment_method", field:"payment_method", editor:"select", editorParams:{0:"on boarding", 1:"before boarding"}, headerSort:false, width:100 },
		{title:"transfers", field:"transfers", editor:"select", editorParams:{0:"No transfers", 1:"Once allowed", '':"unlimited transfers"}, headerSort:false, width:80 }
	],
	cellEdited:function(cell){
		// on editing a cell, log changes 
		let fare_id = cell.getRow().getIndex(); //get corresponding stop_id for that cell
		let field = cell.getColumn().getField() ;

		logmessage('Changed fare attribute for ' + fare_id + ', ' + field + ': ' + cell.getOldValue() + ' to ' + cell.getValue() );
	},
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
	},
	dataLoaded: function(data){
		var list = [];
		data.forEach(function(row){
			list.push(row.fare_id);
		});
		/* just ditch the autocomplete for now yaar, for just fare ids this is overkill
		$( "#targetFareid" ).autocomplete({
		source: list */
	},
	rowSelected:function(row){
		$('#targetFareid').val(row.getIndex());
	}

}); // end fare attributes table definition


//#######################
// initiating commands
$(document).ready(function(){
	$( "#accordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	// tabs
	$( "#tabs" ).tabs({
		active:0
	}); 
	//Initiate fare attributes table
	getPythonFareAttributes();
	// Initiating Fare Rules table.
	getPythonFareRules();
});


//####################
// Button actions

$("#addEditFare").on("click", function() {
	var fare_id = $('#targetFareid').val().toUpperCase().replace(/[^A-Z0-9-_]/g, "");
	$('#targetFareid').val(fare_id);
	var price = $('#price').val().replace(/[^0-9.-]/g, "");
	$('#price').val(price);

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
		$("#fare-attributes-table").tabulator("updateRow",fare_id, { price:price });
		logmessage('Updated fare_id ' + fare_id);
		$('#fareAttrStatus').html('<div class="alert alert-success">Updated fare_id ' + fare_id + '</div>');
		depopulateFields();
	} 
	else {
		$("#fare-attributes-table").tabulator("addRow",{ 'fare_id': fare_id, 'price':price, 'currency_type':CURRENCY, 'payment_method':1, 'transfers':''} );
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
	this.value=this.value.toUpperCase();
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

$("#saveFareRulesButton").on("click", function(){
	saveFareRules();
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
			initiateFareRules(data);
		}
		else {
			console.log('Server request to API/fareRulesPivoted failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText );
			
		}
	};
	xhr.send();
}

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
		}
		else {
			console.log('Server request to API/fareAttributes failed.  Returned status of ' + xhr.status );
		}
	};
	xhr.send();
	
}

function initiateFareRules(rulesData) {
	var colslist = Object.keys(rulesData[0]); // get all the keys, ie, column headers. from https://stackoverflow.com/a/8430501/4355695
	var columnSettings = [{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 }];

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
			let fromZone = cell.getRow().getIndex(); //get corresponding stop_id for that cell
			let toZone = cell.getColumn().getField() ;

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

function saveFareRules() {
	var pw = $("#password").val();
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
		},
		error: function(jqXHR, exception) {
			console.log('API/fareRulesPivoted POST request failed.')
			$('#saveFareRulesStatus').html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>' );
		}
	});	
}
	