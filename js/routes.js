// #########################################
// Initial things to execute on page load
var allStops = [], stop_id_list =[], remaining0=[], remaining1=[], route_id_list=[];
var selected_route_id = '', globalShapesList=[], uploadedShapePrefix = '';

// #########################################
// Function-variables to be used in tabulator

var agencyListGlobal = {}; // global variable
var agencyLister = function(cell) {
	return agencyListGlobal;
	// needs to be declared earlier but the variable referenced in it is a global one that will change later
	// this function will get called every time user clicks the dropdown
	//	getPythonAgency() function will make API call and load agencies listin into this global variable.
}

var routesTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' routes total';
}

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
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"Num", width:40, formatter: "rownum",  frozen:true,}, // row numbering
		{title:"route_id", field:"route_id", frozen:true, headerFilter:"input", headerFilterPlaceholder:"filter by id", validator:tabulator_UID_leastchars },
		{title:"route_short_name", field:"route_short_name", editor:"input", headerFilter:"input", headerFilterPlaceholder:"filter by name" },
		{title:"route_long_name", field:"route_long_name", editor:"input", headerFilter:"input", headerFilterPlaceholder:"filter by name", bottomCalc:routesTotal },
		{title:"route_type", field:"route_type", editor:"select", editorParams:route_type_options, formatter:"lookup", formatterParams:route_type_lookup, headerSort:false },
		{title:"route_color", field:"route_color", headerSort:false, editor:ColorEditor,formatter:"color"},
		{title:"route_text_color", field:"route_text_color", headerSort:false, editor:ColorEditor,formatter:"color" },
		{title:"agency_id", field:"agency_id", headerSort:false, editor:"select", editorParams:{values:{agencyLister}}, tooltip:"Needed to fill when there is more than one agency." }
	],
	dataLoaded:function(data) {
		// this fires after the ajax response and after table has loaded the data. 
		console.log(`GET request to tableReadSave table=routes successfull.`);
		
		// var dropdown = '<option value="">Select a route</option>';
		// data.forEach(function(row){
		// 	dropdown += '<option value="' + row['route_id'] + '">' + row['route_short_name'] + ': ' + row['route_long_name'] + '</option>';
		// });

		// $("#routeSelect").html(dropdown);
		// $('#routeSelect').trigger('chosen:updated'); // update if re-populating
		// $('#routeSelect').chosen({disable_search_threshold: 1, search_contains:true, width:300});

	},
	ajaxError:function(xhr, textStatus, errorThrown){
		console.log('GET request to tableReadSave table=routes failed.  Returned status of: ' + errorThrown);
	}
	
});

// #########################################
// Run initiating commands
$(document).ready(function() {
	//getPythonStops(); //load allStops array
	getPythonAgency(); // load agencies, for making the agency picker dropdown in routes table
	//getPythonRoutes(); // load routes.. for routes management.
	//getPythonAllShapesList();

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
	$('#routeAddStatus').html('Route added with id ' + route_id + '. Fill its info in the table and then save changes.');
});

$("#saveRoutes").on("click", function(){
	saveRoutes();
});

// #########################################
// Functions

// Save, send data to python server

function saveRoutes() {
	$('#routeSaveStatus').html('');

	var data=table.getData();

	var pw = $("#password").val();
	if ( ! pw ) { 
		$('#routeSaveStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
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
			$('#routeSaveStatus').html('<span class="alert alert-success">Saved changes to routes DB.</span>');
			// reload routes data from DB, and repopulate route selector for sequence
			$("#routes-table").tabulator("setData");
		} else {
			console.log('Server POST request to tableReadSave table=routes failed. Returned status of ' + xhr.status + ', response: ' + xhr.responseText );
			$('#routeSaveStatus').html('<span class="alert alert-danger">Failed to save. Message: ' + xhr.responseText + '</span>');
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
			// var dropdown = '<option value="">Select agency</option>'
			// var selectedFlag = false;
			data.forEach(function(row){
			 	agencyListGlobal[''] = '(None)';
			 	agencyListGlobal[row['agency_id']] = row['agency_id'] + ': ' + row['agency_name'];
			// 	var select = '';
			// 	if(!selectedFlag) {
			// 		select = '  selected="selected"'; selectedFlag = true;
			// 	}
			// 	dropdown += '<option value="' + row['agency_id'] + '"' + select + '>' + row['agency_id'] + ': ' + row['agency_name'] + '</option>';
			});
			var select2items = $.map(data, function (obj) {
				obj.id = obj.id || obj.agency_id; // replace identifier
				obj.text = obj.text || obj.agency_id + " - " + obj.agency_name
				return obj;
			  });
				
			$("#agencySelect").select2({
				tags: false,
				placeholder: 'Select agency',
				data: select2items
			  });

		}
		else {
			console.log('Server request to API/agency failed.  Returned status of ' + xhr.status);
		}
	};
	xhr.send();
}