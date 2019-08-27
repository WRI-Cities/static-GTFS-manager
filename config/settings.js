const APIpath = 'API/';

var cfg = {};
$.ajax({
  url: APIpath + 'Config/ApiKeys',
  success: function(data) {
	cfg = data;
	console.log(cfg.GOOGLEAPI);
  }
});
// from commonfuncs.js

const VERSION = 'v3.4.3';

const CURRENCY = 'COP';
// this flag tells whether it is mandatory for all UIDs to be in capitals or not.
const CAPSLOCK = false;

const route_type_options = {0:"0-Tram, Streetcar, Light rail", 1:"1-Subway, Metro", 2:"2-Rail", 3:"3-Bus",4:"4-Ferry", 1100:"1100-Air Service",  };
//const route_type_lookup = {0:"Tram, Streetcar, Light rail", 1:"Subway, Metro", 2:"Rail", 3:"Bus",4:"Ferry" };
const route_type_lookup = route_type_options;

// this json holds the different pages. If you want to add/remove/rename a page, do so here.
const menu = {
	"Home": "index.html",
	"GTFS": {
		"Agency": "agency.html",
		"Stops": "stops.html",
		"Routes": "routes.html",
		"Calendar": "calendar.html",
		"Trips, Stop_times": "tripstimings.html",
		"Frequencies": "frequencies.html",
		"Fares": "fares.html",
		"Translations": "translations.html",
		"Feed Info": "feedinfo.html"
	},
	"Tools": {
		// to do: bulk action pages, diagnostic pages etc
		"Default Route Sequence": "sequence.html",
		"Rename ID": "renameID.html",
		"Delete ID": "deleteID.html"		
	},
	"Data": {
		//"Import / Export GTFS": "gtfs.html",
		"Import KMRL format": "kmrl.html",
		"Import HMRL format": "hmrl.html",
		"Import Stops CSV": "import-stops.html",
		"Import Stops KML/GeoJson": "import-stops-kml.html",
		"Import Stops Openstreetmap": "import-stops-osm.html"
	},
	"Config": "config.html"
}
// Default timezone used in the application.

// default table footer
var DownloadLinks = ["CSV","JSON"];
const DefaultTableFooter = `<div class="btn-toolbar justify-content-between" role="toolbar" aria-label="Toolbar with button groups">
<div class="btn-toolbar">	
	<div class="btn-group dropup" role="group" id="SelectionButtons">
		<button id="btnGroupDrop1" type="button" class="btn btn-secondary dropdown-toggle mx-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title="Uncheck the box te hide the column">
			Shown / Hide Columns
		</button>
		<div class="dropdown-menu" aria-labelledby="btnGroupDrop1" id="SelectColumnsMenu"></div>
	</div>	
	<div class="btn-group dropup mr-2" role="group" id="DownloadButtons">
		<button id="btnGroupDrop2" type="button" class="btn btn-secondary dropdown-toggle mx-1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" title="Download the content of the table">
			Download
		</button>
		<div class="dropdown-menu" aria-labelledby="btnGroupDrop2" id="DownloadsMenu"></div>
	</div>
	{FastAdd}
</div>
<div class="btn-group" role="group" aria-label="Save Button" id="SaveButtonPosition">{SaveButton}</div>
</div>`;


const defaultTimeZone = 'Asia/Kolkata';
// loader:
const loaderHTML = '<div class="spinner-border text-danger" role="status"><span class="sr-only">Loading...</span></div>';

// from stops.js
const UID_leastchars = 2;
const tabulator_UID_leastchars = "minLength:2";
const UID_maxchars = 20;
const MARKERSLIMIT = 100;

// from routes.js
const shapeAutocompleteOptions = {disable_search_threshold: 1, search_contains:true, width:100};

const stopAutocompleteOptions = {disable_search_threshold: 4, search_contains:true, width:225, placeholder_text_single:'Pick a stop'};

// from tripstimings.js , formerly schedules.js
const wheelchairOptions = {"":"blank-No info", 1:"1-Yes", 2:"2-No"};
const wheelchairOptionsFormat = {"":"", 1:"1 (Yes)", 2:"2 (No)"};
const bikesAllowedOptions = {'':"blank-No info", 1:"1-Yes", 2:"2-No"};
const bikesAllowedOptionsFormat = {"":"", 1:"1 (Yes)", 2:"2 (No)"};

// from calendar.js:
const calendar_operationalChoices = {1:"1 - Operating on this day", 0:"0 - Not operating"};
const calendar_exception_type_choices = {1:"1 - service is LIVE on this date", 2:"2 - Service is DISABLED on this date"};


// Leaflet Map related
