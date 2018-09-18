// ############################
// CONSTANTS
// moved to /config/settings.js


// ############################
// RUN ON ALL PAGES
$(document).ready(function() {
	/* Function to build navigation menu */
	//finding current page, from https://stackoverflow.com/a/21343880/4355695
	var pageName = location.pathname.split("/").slice(-1).join();
	if(pageName == '') pageName = 'index.html';
	console.log(pageName);
	
	var navBarContentStart = '<nav class="navbar navbar-expand-sm bg-dark navbar-dark fixed-top justify-content-between"> \
	 <!-- Brand --> \
	<div class="navbar-brand"><a class="navbar-brand" href="index.html"><img src="extra_files/GTFS.png" height="44" width="auto">GTFS Manager</a> <a class="navbar-brand" href="https://github.com/WRI-Cities/static-GTFS-manager" target="_blank"><span class="badge">' + VERSION + '</span></a></div> \
	<!-- Links --> \
	<ul class="navbar-nav">';
	
	var navBarContentEnd = '</ul> \
		<input id="password" class="form-control mr-sm-2" type="text" placeholder="pw for edits" aria-label="Search" style="width:200px;"> \
	</nav>';
	
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
