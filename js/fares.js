//Initiate fare rules table
getPythonFareAttributes();
// Initiating Fare Rules table.
getPythonFareRules();



$("#addEditFare").on("click", function() {
	var fare_id = $('#targetFareid').val();
	var price = $('#price').val();
	var data = $("#fare-attributes-table").tabulator("getData");
	var fare_id_list = data.map(a => a.fare_id);
	var isPresent = fare_id_list.indexOf(fare_id) > -1;
	if(isPresent) {
		$("#fare-attributes-table").tabulator("updateRow",fare_id, { price:price });
		logmessage()
	} 
	else {
		$("#fare-attributes-table").tabulator("addRow",{ fare_id: fare_id, price:price, currency_type:'INR', payment_method:1,transfers:''} );
	}
	

});

$("#deleteFare").on("click", function() {
	var fare_id = $('#targetFareid').val();
	var data = $("#fare-attributes-table").tabulator("getData");
	var fare_id_list = data.map(a => a.fare_id);
	var isPresent = fare_id_list.indexOf(fare_id) > -1;
	if(isPresent) {
		$("#fare-attributes-table").tabulator("deleteRow",fare_id );
		logmessage('Fare attribute ' + fare_id + ' deleted.');
		depopulateFields();
	}
	else {
		logmessage('delete command: ' + fare_id + ' not in the list.');
	}

});

$("#targetFareid").bind("change keyup", function(){
	this.value=this.value.toUpperCase();
});

$( "#targetFareid" ).autocomplete({
		source: getFareIds()
});

// setting accordion
$( function() {
	$( "#accordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
} );


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
$("#saveFareAttributes").on("click", function(){
	var data = $("#fare-attributes-table").tabulator("getData");
	logmessage( 'Fare Attributes saved.' );
	logmessage( JSON.stringify(data) );
	fare_id_list = data.map(a => a.fare_id); 

	$("#fare-rules-table").tabulator("redraw");
})

$("#saveFareRules").on("click", function(){
	var data = $("#fare-rules-table").tabulator("getData");
	logmessage( 'Fare Rules saved.' );
	console.log( JSON.stringify(data) );
})

// #####################################
// Functions

function logmessage(message) {
	document.getElementById('trackChanges').value += timestamp() + ': ' + message + '\n';
}
function timestamp() {
	let today = new Date();
	let timestring = today.toLocaleString();
	return timestring;
}
function depopulateFields() {
	$('#targetFareid').val('');
	$('#price').val('');
}

function getFareIds(){
	// Fetch the list of fares. For now, manually writing it in. But we want the function to fetch these either from the updated fare attributes table or python backend.
	return ['F1','F2','F3','F4','F5'];
}

function getStopIds() {
	// Fetch the list of stops. For now, manually writing it in. But we want the function to fetch these from the python backend.
	return ["ALVA", "PNCU", "CPPY", "ATTK", "MUTT", "KLMT", "CCUV", "PDPM", "EDAP", "CGPP", "PARV", "JLSD", "KALR", "LSSE", "MGRD", "MACE"];
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
			console.log('Server request to API/fareRulesPivoted failed.  Returned status of ' + xhr.status + ', message: ' + xhr.responseText + '\nLoading backup.');
			var backup = [{"zone_id":"ALVA","ALVA":"","PNCU":"F1","CPPY":"F2","ATTK":"F2","MUTT":"F2","KLMT":"F3","CCUV":"F3","PDPM":"F3","EDAP":"F3","CGPP":"F3","PARV":"F4","JLSD":"F4","KALR":"F4","LSSE":"F4","MGRD":"F5","MACE":"F5"},{"zone_id":"PNCU","ALVA":"F1","PNCU":"","CPPY":"F1","ATTK":"F2","MUTT":"F2","KLMT":"F2","CCUV":"F3","PDPM":"F3","EDAP":"F3","CGPP":"F3","PARV":"F3","JLSD":"F4","KALR":"F4","LSSE":"F4","MGRD":"F4","MACE":"F5"},{"zone_id":"CPPY","ALVA":"F2","PNCU":"F1","CPPY":"","ATTK":"F1","MUTT":"F2","KLMT":"F2","CCUV":"F2","PDPM":"F3","EDAP":"F3","CGPP":"F3","PARV":"F3","JLSD":"F3","KALR":"F4","LSSE":"F4","MGRD":"F4","MACE":"F4"},{"zone_id":"ATTK","ALVA":"F2","PNCU":"F1","CPPY":"F1","ATTK":"","MUTT":"F1","KLMT":"F2","CCUV":"F2","PDPM":"F2","EDAP":"F3","CGPP":"F3","PARV":"F3","JLSD":"F3","KALR":"F3","LSSE":"F4","MGRD":"F4","MACE":"F4"},{"zone_id":"MUTT","ALVA":"F2","PNCU":"F2","CPPY":"F1","ATTK":"F1","MUTT":"","KLMT":"F1","CCUV":"F2","PDPM":"F2","EDAP":"F2","CGPP":"F2","PARV":"F3","JLSD":"F3","KALR":"F3","LSSE":"F3","MGRD":"F4","MACE":"F4"},{"zone_id":"KLMT","ALVA":"F3","PNCU":"F2","CPPY":"F2","ATTK":"F2","MUTT":"F2","KLMT":"","CCUV":"F1","PDPM":"F2","EDAP":"F2","CGPP":"F2","PARV":"F2","JLSD":"F3","KALR":"F3","LSSE":"F3","MGRD":"F3","MACE":"F4"},{"zone_id":"CCUV","ALVA":"F3","PNCU":"F3","CPPY":"F3","ATTK":"F2","MUTT":"F2","KLMT":"F1","CCUV":"","PDPM":"F1","EDAP":"F2","CGPP":"F2","PARV":"F2","JLSD":"F2","KALR":"F3","LSSE":"F3","MGRD":"F3","MACE":"F3"},{"zone_id":"PDPM","ALVA":"F3","PNCU":"F3","CPPY":"F3","ATTK":"F2","MUTT":"F2","KLMT":"F2","CCUV":"F1","PDPM":"","EDAP":"F1","CGPP":"F1","PARV":"F2","JLSD":"F2","KALR":"F2","LSSE":"F3","MGRD":"F3","MACE":"F3"},{"zone_id":"EDAP","ALVA":"F4","PNCU":"F3","CPPY":"F3","ATTK":"F3","MUTT":"F3","KLMT":"F2","CCUV":"F2","PDPM":"F1","EDAP":"","CGPP":"F1","PARV":"F1","JLSD":"F2","KALR":"F2","LSSE":"F2","MGRD":"F3","MACE":"F3"},{"zone_id":"CGPP","ALVA":"F4","PNCU":"F4","CPPY":"F3","ATTK":"F3","MUTT":"F3","KLMT":"F3","CCUV":"F2","PDPM":"F2","EDAP":"F1","CGPP":"","PARV":"F1","JLSD":"F2","KALR":"F2","LSSE":"F2","MGRD":"F3","MACE":"F3"},{"zone_id":"PARV","ALVA":"F4","PNCU":"F4","CPPY":"F4","ATTK":"F3","MUTT":"F3","KLMT":"F3","CCUV":"F2","PDPM":"F2","EDAP":"F2","CGPP":"F1","PARV":"","JLSD":"F1","KALR":"F1","LSSE":"F2","MGRD":"F2","MACE":"F3"},{"zone_id":"JLSD","ALVA":"F4","PNCU":"F4","CPPY":"F4","ATTK":"F4","MUTT":"F3","KLMT":"F3","CCUV":"F3","PDPM":"F2","EDAP":"F2","CGPP":"F1","PARV":"F1","JLSD":"","KALR":"F1","LSSE":"F2","MGRD":"F2","MACE":"F2"},{"zone_id":"KALR","ALVA":"F5","PNCU":"F4","CPPY":"F4","ATTK":"F4","MUTT":"F4","KLMT":"F3","CCUV":"F3","PDPM":"F3","EDAP":"F2","CGPP":"F2","PARV":"F2","JLSD":"F1","KALR":"","LSSE":"F1","MGRD":"F2","MACE":"F2"},{"zone_id":"LSSE","ALVA":"F5","PNCU":"F4","CPPY":"F4","ATTK":"F4","MUTT":"F4","KLMT":"F3","CCUV":"F3","PDPM":"F3","EDAP":"F2","CGPP":"F2","PARV":"F2","JLSD":"F1","KALR":"F1","LSSE":"","MGRD":"F1","MACE":"F2"},{"zone_id":"MGRD","ALVA":"F5","PNCU":"F5","CPPY":"F4","ATTK":"F4","MUTT":"F4","KLMT":"F4","CCUV":"F3","PDPM":"F3","EDAP":"F3","CGPP":"F2","PARV":"F2","JLSD":"F2","KALR":"F1","LSSE":"F1","MGRD":"","MACE":"F1"},{"zone_id":"MACE","ALVA":"F5","PNCU":"F5","CPPY":"F5","ATTK":"F4","MUTT":"F4","KLMT":"F4","CCUV":"F3","PDPM":"F3","EDAP":"F3","CGPP":"F3","PARV":"F2","JLSD":"F2","KALR":"F2","LSSE":"F2","MGRD":"F1","MACE":""}];
			initiateFareRules(backup);
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
			initiateFareAttributes(data);
		}
		else {
			console.log('Server request to API/fareAttributes failed.  Returned status of ' + xhr.status + '\nLoading backup.');
			var backup = [{"fare_id":"F1","price":10,"currency_type":"INR","payment_method":1,"transfers":""},{"fare_id":"F2","price":20,"currency_type":"INR","payment_method":1,"transfers":""},{"fare_id":"F3","price":30,"currency_type":"INR","payment_method":1,"transfers":""},{"fare_id":"F4","price":40,"currency_type":"INR","payment_method":1,"transfers":""},{"fare_id":"F5","price":50,"currency_type":"INR","payment_method":1,"transfers":""}];
			initiateFareAttributes(backup);
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
		selectable:1,
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

function initiateFareAttributes(attributesData) {
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
			{title:"payment_method", field:"payment_method", editor:"select", editorParams:{0:"on boarding", 1:"before boarding"}, headerSort:false, width:150 },
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
		}
	}); // end fare attributes table definition

	// Defning the table is over. Now we load the data
	$("#fare-attributes-table").tabulator('setData', attributesData);


} // end initiateFareAttributes function


/* deprecated 

function loadFareAttributesCsv(chosen1,mode='setData') {
	// Keep this around in case we want to enable loading by CSV or so.
	// chosen1 will be the file path, mode will be setData or other option for possible appending
	Papa.parse(chosen1, {
		download: true,
		header: true,
		dynamicTyping: true,
		skipEmptyLines: true,
		complete: function(results) {
			console.log('loaded',chosen1);
			logmessage('loaded ' + chosen1);;
			$("#fare-attributes-table").tabulator(mode, results.data); 
		}, // END of Papa.parse complete() function
		
		error: function() {
			console.log("Error. Could not load", chosen1);
			logmessage("Error. Could not load "+ chosen1);
			
		}
	}); // END of Papa.parse
	
}
*/