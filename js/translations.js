// #########################################
// Function-variables to be used in tabulator
var translationsTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' translations total';
}

//####################
// Tabulator tables

$("#translations-table").tabulator({
	selectable:0,
	index: 'trans_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	ajaxURL: `${APIpath}tableReadSave?table=translations`, //ajax URL
	ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"trans_id", field:"trans_id", editor:"input", headerFilter:"input", headerSort:false, width:120, bottomCalc:translationsTotal },
		{title:"lang", field:"lang", editor:"input", headerFilter:"input", headerSort:false },
		{title:"translation", field:"translation", editor:"input", headerFilter:"input", headerSort:false, width:150, formatter:function(cell, formatterParams){
			return "<big>" + cell.getValue() + '</big>'; //return the contents of the cell;
			}
		},
		{formatter:"buttonCross", align:"center", title:"del", headerSort:false, cellClick:function(e, cell){
			if(confirm('Are you sure you want to delete this entry?'))
				cell.getRow().delete();
			}}
	],
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to tableReadSave table=translations failed.  Returned status of: ' + errorThrown);
	}
});

// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	;
});

// #########################
// Buttons

$('#addTranslationButton').on('click', function(){
	addTranslation();
});

$('#saveTranslationButton').on('click', function(){
	saveTranslation();
});

// #########################
// Functions

function addTranslation() {
	$('#translationSaveStatus').html('&nbsp;');
	
	var trans_id = $('#trans_id').val().trim();
	var lang = $('#lang').val().trim();
	var translation = $('#translation').val().trim();
	// autocorrect
	$('#trans_id').val(trans_id);
	$('#lang').val(lang);
	$('#translation').val(translation);
	//validation
	if(!trans_id.length || !lang.length || !translation.length || lang.length>2) {
		$('#translationAddStatus').html('<span class="alert alert-warning">Please enter valid inputs.</span>');
		return;
	}

	var data = $('#translations-table').tabulator('getData');
	var translist = []
	data.forEach(function(row){
			translist.push(row.trans_id + '|' + row.lang);
		});
	let concat = trans_id + '|' + lang;
	var isPresent = translist.indexOf(concat) > -1;
	if(isPresent){
		$('#translationAddStatus').html('<span class="alert alert-warning">This translation is already present. Please find it in the table and edit it there.</span>');
	} else {
		$('#translations-table').tabulator('addRow', {'trans_id':trans_id, 'lang':lang, 'translation':translation},true );
		$('#translationAddStatus').html('<span class="alert alert-success">Added translation.</span>');
	}

	//$('#translations-table').tabulator('addRow', );
	// translationAddStatus
}

function saveTranslation() {
	
	$('#translationSaveStatus').html('<span class="alert alert-secondary">Sending data to server.. please wait..</span>');
	$('#translationAddStatus').html('&nbsp;');
	var pw = $("#password").val();
		if ( ! pw ) { 
		$('#translationSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}
	var data = $('#translations-table').tabulator('getData');

	console.log('sending to server via POST');
	// sending POST request using native JS. From https://blog.garstasio.com/you-dont-need-jquery/ajax/#posting
	var xhr = new XMLHttpRequest();
	xhr.open('POST', `${APIpath}tableReadSave?table=translations&pw=${pw}`);
	xhr.withCredentials = true;
	xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
	xhr.onload = function () {
		if (xhr.status === 200) {
			console.log('Successfully sent data via POST to server API/tableReadSave table=translations, response received: ' + xhr.responseText);
			$('#translationSaveStatus').html('<span class="alert alert-success">Success. Message: ' + xhr.responseText + '</span>');
		} else {
			console.log('Server POST request to API/tableReadSave table=translation failed. Returned status of ' + xhr.status + ', reponse: ' + xhr.responseText );
			$('#translationSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText+'</span>');
		}
	}
	xhr.send(JSON.stringify(data)); // this is where POST differs from GET : we can send a payload instead of just url arguments.
}
