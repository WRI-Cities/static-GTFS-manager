// ############################
// CONSTANTS
// moved to /config/settings.js


// ############################
// RUN ON ALL PAGES
$(document).ready(function() {
	
	/* Function to build navigation menu */
	//finding current page, from https://stackoverflow.com/a/21343880/4355695
	var pageName = location.pathname.split("/").slice(-1).join();
	
	// popover
	$('[data-toggle="popover"]').popover(); 

	$('[data-toggle="tooltip"]').tooltip(); 

	// Footer
	var footer = `<section class="p-t-60 p-b-20">
	<div class="container">
	<div class="row">
	<div class="col-md-12">
	<div class="copyright">
	<a href="https://github.com/WRI-Cities/static-GTFS-manager/" target="_blank">static GTFS Manager ${VERSION}</a>
	</div>
	</div>
	</div>
	</div>
	</section>`; 

	$("div.page-content--bgf7").append(footer);
	
	// Usage tracker
	$("body").append(`<!-- Matomo Image Tracker-->
	<img src="http://nikhilvj.co.in/tracking/piwik.php?idsite=2&amp;rec=1&amp;action_name=${pageName}" style="border:0" alt="" />
	<!-- End Matomo -->`);

	document.getElementById("password").value = "program";
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
	lat = parseFloat(lat);
	lon = parseFloat(lon);
	if ( typeof lat == 'number' && typeof lon == 'number' &&
		!isNaN(lat) && !isNaN(lon) ) {
		//console.log(lat,lon,'is valid');
		// again, check if they're in 90 -90 etc
		if( (-90<=lat<=90) && (-180<=lon<=180) ) return true;
	}
	
	// no need of else.. if it fails anywhere above, default return should be false
	//console.log(lat,lon,'is not valid');
	return false;
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

function formatDate(sep='.',date=false ) {
	var d;
	if(date) d = new Date(date);
	else d = new Date();
	var month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join(sep);
}

