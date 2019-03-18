// from commonfuncs.js

const VERSION = 'v3.4.1';
const APIpath = 'API/';
const CURRENCY = 'INR';
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
		"Translations": "translations.html"
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
		"Import HMRL format": "hmrl.html"
	}
}

// default config parameters for KMRL KML import.
const KMRLDEFAULTS = { "stations":"stations.csv", "timepoint":1, "wheelchair_accessible":1, "route_type":1, "route_color":"00B7F3", "route_text_color":"000000", "secondland":"ml", "currency_type":CURRENCY, "payment_method":0, "transfers":"", "agency_id":"KMRL", "agency_name":"Kochi Metro", "agency_name_translation":"കൊച്ചി മെട്രോ", "agency_url":"http://www.kochimetro.org/", "agency_timezone":"Asia/Kolkata", "end_date":"20990101"
	};

// loader:
const loaderHTML = '<div class="loader loader--style1"> <svg version="1.1" id="loader-1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="100px" height="100px" viewBox="0 0 40 40" enable-background="new 0 0 40 40" xml:space="preserve"> <path opacity="0.2" fill="#000" d="M20.201,5.169c-8.254,0-14.946,6.692-14.946,14.946c0,8.255,6.692,14.946,14.946,14.946 s14.946-6.691,14.946-14.946C35.146,11.861,28.455,5.169,20.201,5.169z M20.201,31.749c-6.425,0-11.634-5.208-11.634-11.634 c0-6.425,5.209-11.634,11.634-11.634c6.425,0,11.633,5.209,11.633,11.634C31.834,26.541,26.626,31.749,20.201,31.749z"/> <path fill="#000" d="M26.013,10.047l1.654-2.866c-2.198-1.272-4.743-2.012-7.466-2.012h0v3.312h0 C22.32,8.481,24.301,9.057,26.013,10.047z"> <animateTransform attributeType="xml" attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1.0s" repeatCount="indefinite"/> </path> </svg></div><br>Loading data.. please wait..';


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
