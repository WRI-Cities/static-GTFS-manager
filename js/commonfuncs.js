// ############################
// CONSTANTS
const APIpath = 'API/';
// const APIpath = 'https://lit-mesa-97724.herokuapp.com/API/';
const CURRENCY = 'INR';
const route_type_options = {0:"0-Tram, Streetcar, Light rail", 1:"1-Subway, Metro", 2:"2-Rail", 3:"3-Bus",4:"4-Ferry" };

// this json holds the different pages. If you want to add/remove/rename a page, do so here.
const menu = { 'index.html':'Main', 'stops.html':'Stops', 'routes.html':'Routes', 'schedules.html':'Schedules', 'fares.html':'Fares', 'misc.html':'Misc','xml2GTFS.html':'XML Import'};

navBarContentStart = '<nav class="navbar navbar-expand-sm bg-dark navbar-dark fixed-top justify-content-between"> \
 <!-- Brand --> \
<a class="navbar-brand" href="#">GTFS Manager</a> \
<!-- Links --> \
<ul class="navbar-nav">';

navBarContentEnd = '</ul> \
	<input id="password" class="form-control mr-sm-2" type="text" placeholder="pw for edits" aria-label="Search" style="width:200px;"> \
</nav>';

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