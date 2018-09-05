// ############################
// CONSTANTS
const VERSION = 'v2.0.0';
const APIpath = 'API/';
const CURRENCY = 'INR';
const route_type_options = {0:"0-Tram, Streetcar, Light rail", 1:"1-Subway, Metro", 2:"2-Rail", 3:"3-Bus",4:"4-Ferry" };
//const route_type_lookup = {0:"Tram, Streetcar, Light rail", 1:"Subway, Metro", 2:"Rail", 3:"Bus",4:"Ferry" };
const route_type_lookup = route_type_options;

// this json holds the different pages. If you want to add/remove/rename a page, do so here.
const menu = { 'index.html':'Main', 'stops.html':'Stops', 'routes.html':'Routes', 'schedules.html':'Schedules', 'fares.html':'Fares', 'misc.html':'Misc','xml2GTFS.html':'KMRL', 'hydcsv.html':'HMRL'};

// this flag tells whether it is mandatory for all UIDs to be in capitals or not.
const CAPSLOCK = true;

// default config parameters for KMRL KML import.
const KMRLDEFAULTS = { "stations":"stations.csv", "timepoint":1, "wheelchair_accessible":1, "route_type":1, "route_color":"00B7F3", "route_text_color":"000000", "secondland":"ml", "currency_type":CURRENCY, "payment_method":0, "transfers":"", "agency_id":"KMRL", "agency_name":"Kochi Metro", "agency_name_translation":"കൊച്ചി മെട്രോ", "agency_url":"http://www.kochimetro.org/", "agency_timezone":"Asia/Kolkata", "end_date":"20990101"
	};

var navBarContentStart = '<nav class="navbar navbar-expand-sm bg-dark navbar-dark fixed-top justify-content-between"> \
 <!-- Brand --> \
<div class="navbar-brand"><a class="navbar-brand" href="index.html"><img src="extra_files/GTFS.png" height="44" width="auto">GTFS Manager</a> <a class="navbar-brand" href="https://github.com/WRI-Cities/static-GTFS-manager" target="_blank"><span class="badge">' + VERSION + '</span></a></div> \
<!-- Links --> \
<ul class="navbar-nav">';

var navBarContentEnd = '</ul> \
	<input id="password" class="form-control mr-sm-2" type="text" placeholder="pw for edits" aria-label="Search" style="width:200px;"> \
</nav>';


// loader:
const loaderHTML = '<div class="loader loader--style1"> <svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve"> <path opacity="0.2" fill="#000" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946 s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634 c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"/> <path fill="#000" d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0 C22.32,8.481,24.301,9.057,26.013,10.047z"> <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1.0s" repeatCount="indefinite"/> </path> </svg></div><br>Loading data.. please wait..';

// ############################
// RUN ON ALL PAGES
$(document).ready(function() {
	//finding current page, from https://stackoverflow.com/a/21343880/4355695
	var pageName = location.pathname.split("/").slice(-1).join();
	if(pageName == '') pageName = 'index.html';
	console.log(pageName);

	var navBarContent = navBarContentStart;
	for(key in menu) {
		if(key == pageName)
			navBarContent+= '<li class="nav-item"><a class="nav-link currentpage" href="'+key+'">'+menu[key]+'</a></li>';
		else
			navBarContent+= '<li class="nav-item"><a class="nav-link" href="'+key+'">'+menu[key]+'</a></li>';
	}

	navBarContent+=navBarContentEnd;
	$( "#navBar" ).html(navBarContent);

	// initiate bootstrap / jquery components like tabs, accordions
	// tabs
	$( "#tabs" ).tabs({
		active:0
	});
	// popover
	$('[data-toggle="popover"]').popover(); 

	$('[data-toggle="tooltip"]').tooltip(); 

	// initiate accordion
	$( "#accordion" ).accordion({
		collapsible: true, active: false
	});
	$( "#instructions" ).accordion({
		collapsible: true, active: false
	});
	$( "#logaccordion" ).accordion({
		collapsible: true, active: false
	});
	
	// Footer
	$("body").append('<div class="footer"><a href="https://github.com/WRI-Cities/static-GTFS-manager/" target="_blank">GTFS Manager ' + VERSION + '</a></div>');

});
// ############################
// FUNCTIONS

function preventOtherInputs(ui, id) {
	if(!ui.item){
		//http://api.jqueryui.com/autocomplete/#event-change -
		// The item selected from the menu, if any. Otherwise the property is null
		//so clear the item for force selection
		$(id).val("");
	}
}

function checklatlng(lat,lon) {
	if ( typeof lat == 'number' && 
		typeof lon == 'number' &&
		lat != NaN &&
		lon != NaN ) {
		//console.log(lat,lon,'is valid');
		return true;
	}
	else {
		//console.log(lat,lon,'is not valid');
		return false;
	}
}

function filled(id, minlen) {
	if( $(`#${id}`).val().length < minlen )
		return false;
	else return true;
}

function logmessage(message) {
	document.getElementById('trackChanges').value += timestamp() + ': ' + message + '\n';
}
function timestamp() {
	let today = new Date();
	let timestring = today.toLocaleString();
	return timestring;
}

function addVar(row, id) {
	row[id] = $('#'+id).val();
}

function shakeIt(targetId) {
	$('#'+targetId).effect( "shake", {times:3}, 500 );
}

function pad(n, width=3, z=0) {
	return (String(z).repeat(width) + String(n)).slice(String(n).length);
}

function writeProperties(data) {
	var lines = [];
	for (key in data) {
		if(key == 'undefined') continue;
		lines.push( key + ': ' + data[key] );
	}
	var returnHTML = lines.join('<br>');
	return returnHTML;
}
