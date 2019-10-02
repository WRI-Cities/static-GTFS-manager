// hydcsv.js

// #######################
// Global variables
var stop_id_list = [];
var areWeReady = false;
var allStopsMappedFlag = false;
var config = {}; // loading default config parameters, see in commonfuncs.js .
var globalNumRoutes = 0;
var globalStopsList = [];
var smallMaps = []; // holder for small maps for sequences

// #######################
// initiate map
var defaultlayer = cfg.MapProviders.find(x => x.default === true);
var Extralayers = cfg.MapProviders.filter(x => x.default === false);
// Set openstreetmap as the defaultlayer if nothing is defined as default.
var defaultlayer = !defaultlayer ? 'OpenStreetMap.Mapnik' : defaultlayer.id;

var LayerOSM = L.tileLayer.provider(defaultlayer);
var baseLayers = {
	"OpenStreetMap": LayerOSM
};

Extralayers.forEach(function (layers, index) {
	// Add the extra layers in a loop
	// Filter out the paid 
	switch (layers.id) {
		case "HERE.terrainDay":
			baseLayers[layers.name] = L.tileLayer.provider(layers.id, {
				app_id: layers.apikey,
				app_code: layers.variant
			});
			break;
		case "MapBox":
			baseLayers[layers.name] = L.tileLayer.provider(layers.id, {
				id: layers.variant,
				accessToken: layers.apikey
			});
			break;
		case "TomTom":
			baseLayers[layers.name] = L.tileLayer.provider(layers.id, {
				apikey: layers.apikey
			});
			break;
		default:
			baseLayers[layers.name] = L.tileLayer.provider(layers.id);
	}

});
var map = new L.Map('map', {
	'center': [17.385044, 78.486671], // hyd
	'zoom': 12,
	'layers': [LayerOSM],
	scrollWheelZoom: false
});


$('.leaflet-container').css('cursor', 'crosshair'); // from https://stackoverflow.com/a/28724847/4355695 Changing mouse cursor to crosshairs
L.control.scale({ metric: true, imperial: false }).addTo(map);
var myRenderer = L.canvas({ padding: 0.5 });
var circleMarkerOptions = {
	renderer: myRenderer,
	radius: 7,
	fillColor: "#00B7F3",
	weight: 1,
	opacity: 1,
	fillOpacity: 0.5
};

stopsLayer = new L.geoJson(null).bindTooltip(function (layer) {
	return layer.properties.stop_id + ': ' + layer.properties.stop_name;
}, { sticky: false })
	.bindPopup(function (layer) {
		return writeProperties(layer.properties);
	});

var overlays = {
	'stops': stopsLayer,

}

var layerControl = L.control.layers(baseLayers, overlays, { collapsed: true, autoZIndex: false }).addTo(map);

// #######################
// Sequence checking map

smallMap = new L.Map(`smallMap`, {
	'center': [17.385044, 78.486671], // hyd
	'zoom': 11,
	'layers': [LayerOSM],
	scrollWheelZoom: false
});
var layerControl = L.control.layers(baseLayers, null, { collapsed: true, autoZIndex: false }).addTo(smallMap);

lineLayer = new L.geoJson(null).bindTooltip(function (layer) {
	//return layer.feature.geometry.properties.name;
	console.log(layer);
}, { sticky: true });

// #######################
// initiate Tabulator tables

var stops = new Tabulator("#stops-table", {
	selectable: 0,
	index: "stop_id",
	addRowPos: "top",
	movableColumns: true,
	layout: "fitDataFill",
	columns: [
		{ title: "stop_id", field: "stop_id", headerFilter: "input", editor: "input", validator: ["required", "string", "minLength:1"], headerSort: false, frozen: true, bottomCalc: true, minWidth: "100" },
		{ title: "stop_name", field: "stop_name", editor: "input", headerFilter: "input", validator: ["required", "string", "minLength:1"], headerSort: false, minWidth: "170" },
		{ title: "stop_lat", field: "stop_lat", editor: "input", validator: ["numeric"], headerSort: false, minWidth: "100" },
		{ title: "stop_lon", field: "stop_lon", editor: "input", validator: ["numeric"], headerSort: false, minWidth: "100" }
	]
});


var missingstops = new Tabulator("#missing-stops-table", {
	selectable: 0,
	index: "stop_id",
	addRowPos: "top",
	movableColumns: false,
	layout: "fitDataFill",
	columns: [
		{ title: "route_id", field: "route_id", editor: "input" },
		{ title: "stop_id", field: "stop_id", editor: "input" },
		{ title: "benchmark_where", field: "benchmark_where", editor: "input" },
		{ title: "benchmark_column", field: "benchmark_column", editor: "input" },
		{ title: "arrival_time_offset", field: "arrival_time_offset", editor: "input" },
		{ title: "departure_time_offset", field: "departure_time_offset", editor: "input" },
		{ title: "benchmark_arrival_change", field: "benchmark_arrival_change", editor: "input" },
		{ title: "benchmark_departure_change", field: "benchmark_departure_change", editor: "input" },
		{
			formatter: "buttonCross", align: "center", title: "del", headerSort: false, width: "40", cellClick: function (e, cell) {
				cell.getRow().delete();
			}
		}

	]
});

var replacestops = new Tabulator("#replace-stops-table", {
	selectable: 0,
	index: "stop_id",
	addRowPos: "top",
	movableColumns: false,
	layout: "fitDataFill",
	columns: [
		{ title: "route_id", field: "route_id", editor: "input" },
		{ title: "stop_id", field: "stop_id", editor: "input" },
		{ title: "replace_with", field: "replace_with", editor: "input" },
		{
			formatter: "buttonCross", align: "center", title: "del", headerSort: false, width: "40", cellClick: function (e, cell) {
				cell.getRow().delete();
			}
		}
	]
});

var fareid = new Tabulator("#fareIDs-table", {
	selectable: 0,
	index: "fare_id",
	movableColumns: false,
	layout: "fitColumns",
	columns: [
		{ title: "price", field: "price", editor: "input" },
		{ title: "fare_id", field: "fare_id", editor: "input" },
		{
			formatter: "buttonCross", align: "center", title: "del", headerSort: false, width: "40", cellClick: function (e, cell) {
				cell.getRow().delete();
			}
		}
	]
});

var translations = new Tabulator("#translations-table", {
	selectable: 0,
	index: "trans_id",
	addRowPos: "top",
	movableColumns: false,
	layout: "fitDataFill",
	columns: [
		{ title: "Sr", width: 40, formatter: "rownum", headerSort: false }, // row numbering
		{ title: "English", field: "English", editor: "input", width: "200" },
		{ title: "Telegu", field: "Telegu", editor: "input", width: "200" },
		{ title: "Urdu", field: "Urdu", editor: "input", width: "200" },
		{ title: "Hindi", field: "Hindi", editor: "input", width: "200" },
		{
			formatter: "buttonCross", align: "center", title: "del", headerSort: false, width: "40", cellClick: function (e, cell) {
				cell.getRow().delete();
			}
		}
	]
});


// ############################

// #########################################
// Initiate bootstrap / jquery components like tabs, accordions
$(document).ready(function () {

	// $('#missingAccordion').accordion({
	// 		collapsible: true, active: false
	// 	});

	// $('.smallTables').accordion({
	// 		collapsible: true, active: false
	// 	});

	var rightNow = new Date();
	ydm = rightNow.toISOString().slice(0, 10).replace(/-/g, '');
	$("#start_date").val(ydm);

	$.getJSON("config/hmrl-config.json", function (data) {
		config = data;
		console.log('Loaded config/hmrl-config.json:');
		console.log(config);
		loadAgency();

		loadSimpleStops();
		loadCSVinTabulator(config.missingStopsCSV, 'missing');
		loadCSVinTabulator(config.replaceStopsCSV, 'replacestops');
		loadCSVinTabulator(config.translationCSV, 'translations');
		//loadMissingStopsRules();
		loadFares(config.fares);
	});



	/*
	$( "#sortable" ).sortable({
	  placeholder: "ui-state-highlight",
	  axis: "y"
	});
	$( "#sortable" ).disableSelection();
	*/

});

//###################
// Buttons

$("#numRoutesButton").on("click", function () {
	let n = parseInt($('#numRoutesSelect').val());
	console.log('n', n);
	if (n < 1 || isNaN(n)) {
		console.log('Why u give no routes??');
		shakeIt('numRoutesLine');
		$('#numRoutesSelect').val(config.routes.length);
		return;
	}
	globalNumRoutes = n;
	createCSVUploads(n);
	//createSequences(n);

	lineLayer.clearLayers(); // reset map
});

$("#stopsDownloadButton").on("click", function () {
	stops.download("csv", "stops-simple.csv");
});

$("#addStation").on("click", function () {
	var stop_id = $('#station2add').val();
	if (stop_id.length < 2) {
		$('#stationAddStatus').text('Invalid entry, try again');
		return;
	}

	let data = stops.getData();
	stop_id_list = data.map(a => a.stop_id);

	//var index = ;
	if (stop_id_list.indexOf(stop_id) > -1) {
		$('#stationAddStatus').text('This id is already taken. Try another value.');
		return;
	}
	stops.addRow([{ stop_id: stop_id }], true);
	stops.redraw(true);
	$('#station2add').val('');
	$('#stationAddStatus').text('Station added with id ' + stop_id + '. Fill its info in the table and then proceed.');
});

$("#fare2addButton").on("click", function () {
	var price = parseFloat($('#fare2add').val());
	console.log('price', price);

	if (isNaN(price) || price < 0) {
		shakeIt('fareAddBox');
		$('#fare2add').val('');
		return;
	}

	var count = fareid.getData().length;

	fareid.addRow([{ price: price, fare_id: ('F' + (count + 1)) }]);

});

$("#addMissingStopButton").on("click", function () {
	missingstops.addRow();
});

$("#addReplaceStopButton").on("click", function () {
	replacestops.addRow();
});

$("#addTranslationButton").on("click", function () {
	translations.addRow();
});

$("#translationsDownloadButton").on("click", function () {
	translations.download("csv", "translations.csv");
});

$("#missingStopsDownloadButton").on("click", function () {
	missingstops.download("csv", "missingstops.csv")
});


//###################
// Functions

function createCSVUploads(n) {
	$("#routeUploadRepeater").hide();

	routes = config.routes;
	var content = '';
	var stopOptions = makeStopSelect();

	for (i = 0; i < n; i++) {

		let defaultID = 'R' + (i + 1);
		let route_id = routes[i] ? routes[i].route_id : defaultID;
		let route_short_name = routes[i] ? routes[i].route_short_name : defaultID;
		let route_long_name = routes[i] ? routes[i].route_long_name : defaultID;
		let route_color = routes[i] ? routes[i].route_color : '';
		let route_text_color = routes[i] ? routes[i].route_text_color : '';

		content += `
		<div class="col-md-4">
		<div class="card mb-3 card-body">
		<h5 class="card-title">Route <b>${i + 1}</b></h5>
		<!--start of one route block -->
		<div class="form-group row">
			<label for="route${i}_id" class="col-sm-4 col-form-label">ID</label>
			<div class="col-sm-8">
			<input id="route${i}_id" value="${route_id}" required class="form-control">
			</div>
		</div>
		<div class="form-group row">
			<label for="route${i}_id" class="col-sm-4 col-form-label">Weekdays</label>
			<div class="col-sm-8">
			<input type="file" id="route${i}WK" name="route${i}WK" accept=".csv" class="form-control-file">
			</div>
		</div>
		<div class="form-group row">
			<label for="route${i}_id" class="col-sm-4 col-form-label">Sundays</label>
			<div class="col-sm-8">
			<input type="file" id="route${i}SU" name="route${i}SU" accept=".csv" class="form-control-file">
			</div>
		</div>	
		
		<!-- Accordion -->
		<div class="accordion" id="accordion${i}">
			<div class="card">
				<div class="card-header" id="routeOptionsHeader${i}">
					<h2 class="mb-0">
						<button class="btn btn-link" type="button" data-toggle="collapse" data-target="#routeOptions${i}" aria-expanded="true" aria-controls="collapseOne">
						Route ${i + 1} Options
						</button>
					</h2>
				</div>
				<div id="routeOptions${i}" class="collapse show" aria-labelledby="routeOptionsHeader${i}" data-parent="#accordion${i}">
					<div class="card-body">				
						<div class="form-group row">
							<label for="route${i}_short_name" class="col-sm-4 col-form-label">Route short name</label>
							<div class="col-sm-8">
							<input id="route${i}_short_name" value="${route_short_name}" class="form-control">
							</div>
						</div>
						<div class="form-group row">
							<label for="route${i}_long_name" class="col-sm-4 col-form-label">Route long name</label>
							<div class="col-sm-8">
							<input id="route${i}_long_name" value="${route_long_name}" class="form-control">
							</div>
						</div>
						<div class="form-group row">
							<label for="route${i}_color" class="col-sm-4 col-form-label">Route Color</label>
							<div class="col-sm-8">
							<input id="route${i}_color" value="${route_color}" class="form-control">
							</div>
						</div>
						<div class="form-group row">
							<label for="route${i}_text_color" class="col-sm-4 col-form-label">Text color</label>
							<div class="col-sm-8">
							<input id="route${i}_text_color" value="${route_text_color}" class="form-control">
							</div>
						</div>
						<div class="form-group row">
							<label for="route${i}_text_color" class="col-sm-4 col-form-label">Shapefile of the route</label>
							<div class="col-sm-8">
							<input type="file" id="route${i}_shape" name="route${i}_shape" accept=".geojson" class="form-control-file">
							</div>
						</div>                
						<br>note: .geojson formats only. Use <a href="http://geoson.io" target="_blank">geojson.io</a> to create one.
					</div>
				</div>
			</div>
			<div class="card">
				<div class="card-header" id="routeSequenceHeader${i}">
					<h2 class="mb-0">
						<button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#routeSequence${i}" aria-expanded="false" aria-controls="collapseTwo">
							Route ${i + 1} Sequence
						</button>
					</h2>
				</div>
				<div id="routeSequence${i}" class="collapse" aria-labelledby="routeSequenceHeader${i}" data-parent="#accordion${i}">
					<div class="card-body">
						<ol id="sortable${i}" class="list-group">`;
		if (config.routes[i]) {
			sequence = config.routes[i].route_sequence;
		} else {
			sequence = [];
		}
		console.log('Sequence:');
		console.log(sequence);
		for (x = 0; x < sequence.length; x++) {
			let stop_id = sequence[x];
			let stop_name = stops.getRow(stop_id).getData().stop_name;
			content += `
                        <li class="list-group-item d-flex justify-content-between align-items-center" data-id="${stop_id}">
                        ${stop_id}: ${stop_name}
                        
                        <a href="#" class="delSortElement red"><i class="fas fa-trash-alt"></i></a>
                        
                        </li>
                        `;
		}
		content += `
			</ol>
						<div class="form-group row">
				<label for="addtosequence${i}" class="col-sm-2 col-form-label">Add</label>
				<div class="col-sm-10">
				<select onChange="add2SequenceFunc(this.value,${i})" class="form-control" id="addtosequence${i}">
				<option value="0">Select a stop</option>
				${stopOptions}
				</select>
				</div>
			</div>
            
	        <p><button onclick="sequenceTest(${i})" class="btn btn-md btn-warning" id="viewAnchor">Test on map</button></p>
            </div>
        </div>
    </div>
</div>
</div>
</div>`;
	}


	$('#routeUploadRepeater').html(content);

	for (i = 0; i < n; i++) {
		// $(`#routeOptions${i}`).accordion({
		// 	collapsible: true, active: false
		// });
		// $(`#routeSequence${i}`).accordion({
		// 	collapsible: true, active: false
		// });
		//var sortablelist = $(`#sortable${i}`);
		var el = document.getElementById(`sortable${i}`);
		window[`Sortable{i}`] = Sortable.create(el);
		//new Sortable(sortablelist, {});
		// $(sortablelist).sortable({
		// 	placeholder: "ui-state-highlight",
		// 	axis: "y",
		// 	sort: function () {
		// 		// from https://jsfiddle.net/cP4Fx/3, https://forum.jquery.com/topic/sortable-ol-elements-don-t-display-numbers-properly#14737000001561195 for numbered sortable list.
		// 		var $lis = $(this).children('li');
		// 		$lis.each(function () {
		// 			var $li = $(this);
		// 			var hindex = $lis.filter('.ui-sortable-helper').index();
		// 			if (!$li.is('.ui-sortable-helper')) {
		// 				var index = $li.index();
		// 				index = index < hindex ? index + 1 : index;

		// 				$li.val(index);

		// 				if ($li.is('.ui-sortable-placeholder')) {
		// 					$lis.filter('.ui-sortable-helper').val(index);
		// 				}
		// 			}
		// 		});
		// 	}
		// });
		//$(`#sortable${i}`).disableSelection();
	}

	// sortable: delete element from list
	$('a.delSortElement').click(function (e) {
		e.preventDefault();
		console.log('firing?');
		$(this).parent().hide('slow', complete = function (e) { this.remove(); });
		// from http://jsfiddle.net/K3Kxg/, https://stackoverflow.com/a/19839253/4355695
	});

	//$("#routeUploadRepeater").show('drop','slow');
	$("#routeUploadRepeater").slideDown('slow');

}


function loadSimpleStops() {
	let csvfile = config.stopsCSV;
	Papa.parse(csvfile, {
		download: true,
		header: true,
		skipEmptyLines: true,
		complete: function (results) {
			// results.data
			stops.setData(results.data);
			loadMap();
			globalStopsList = [];
			results.data.forEach(function (row) {
				globalStopsList.push(row.stop_id);
			});
			console.log('globalStopsList', globalStopsList);

			// pre-load default number of routes
			let n = 2;
			globalNumRoutes = n;
			createCSVUploads(n);

		}
	});
}

function loadMissingStopsRules() {
	let csvfile = config.missingStopsCSV;
	Papa.parse(csvfile, {
		download: true,
		header: true,
		skipEmptyLines: true,
		complete: function (results) {
			// results.data
			missingstops.setData(results.data);
		}
	});
}

function loadCSVinTabulator(csvfile, tableID) {
	Papa.parse(csvfile, {
		download: true,
		header: true,
		skipEmptyLines: true,
		complete: function (results) {
			switch (tableID) {
				case 'translations':
					// code block
					translations.setData(results.data);
					break;
				case 'stops':
					// code block
					stops.setData(results.data);
					break;
				case 'missing':
					// code block
					missingstops.setData(results.data);
					break;
				case 'fareid':
					// code block
					fareid.setData(results.data);
					break;
				case 'replacestop':
					// code block
					replacestops.setData(results.data);
					break;
				default:
				// code block
			}

			// results.data
			//$("#"+tableID).tabulator("setData", results.data);
		}
	});
}

function loadMap() {
	var stopsjson = stops.getData();
	stopsLayer.clearLayers();
	for (stoprow in stopsjson) {
		let lat = parseFloat(stopsjson[stoprow]['stop_lat']);
		let lon = parseFloat(stopsjson[stoprow]['stop_lon']);
		if (!checklatlng(lat, lon)) {
			// missing or invalid lat-long data. skip loading this stop, but load the others.
			continue;
		}
		let stopmarker = L.circleMarker([lat, lon], circleMarkerOptions);
		stopmarker.properties = stopsjson[stoprow];
		stopmarker.addTo(stopsLayer);
	}
	stopsLayer.addTo(map);
	map.fitBounds(stopsLayer.getBounds(), { paddingTopLeft: [50, 10] });
}

/* move to commonfuncs.js
function writeProperties(data) {
	var lines = [];
	for (key in data) {
		if(key == 'undefined') continue;
		lines.push( key + ': ' + data[key] );
	}
	var returnHTML = lines.join('<br>');
	return returnHTML;
}
*/

function loadAgency() {
	$("#agency_id").val(config['agency_id']);
	$("#agency_name").val(config['agency_name']);
	$("#agency_url").val(config['agency_url']);
	$("#agency_timezone").val(config['agency_timezone']);
}

/*
function createSequences(n) {
	$("#sequenceHolder").hide();
	
	var content = '<div class="row">';
	var sequence = [];

	for(i=0; i<n; i++) {
		if( config.routes[i] ) {

			sequence = config.routes[i].route_sequence;
			// console.log(sequence);
		} else {
			sequence = [];
		}

		if((i)%2 == 0) 
			content += '</div><div class="row">';
			// reset to new row if 2 routes done

		content += '<div class="col-md-4">'
		content += `
		<h4>Route ${i+1}</h4>
		<p><button onclick="sequenceTest(${i})" class="btn btn-md btn-warning">Test on map</button></p>
		<ol id="sortable${i}" class="sortable">
		`;

		for(x=0; x<sequence.length; x++) {
			let stop_id = sequence[x];
			let stop_name = $("#stops-table").tabulator("getRow", stop_id).getData().stop_name;
			content += `
			<li class="ui-state-default" id="${stop_id}">
			<span class="left">
			${stop_id}: ${stop_name}
			</span>
			<span class="right red">
			<a href="#" class="delSortElement">&nbsp;x&nbsp;</a>
			</span>
			</li>
			`;
		}
		content += `
		</ol>
		<input id="add2Sequence${i}" size="4"></input>
		<button class="btn-primary" id="sequenceAddStopButton${i}" type="button" onclick="add2SequenceFunc(document.getElementById('add2Sequence${i}').value,${i})">Add</button>
		<p><select id="addStop${i}">
		`

		content += `
		</select>
		
		</div>
		`;
		// backup <div id="sequenceMap${i}" class="smallMap"></div>
	}

	content += '</div>';
	// now writing the composed HTML to the page
	$('#sequenceHolder').html(content);

	// running jquery initiations on sortable lists and autocompletes

	for(i=0; i<n; i++) {
		$(`#sortable${i}`).sortable({
			placeholder: "ui-state-highlight",
			axis: "y",
			sort: function(){
				// from https://jsfiddle.net/cP4Fx/3, https://forum.jquery.com/topic/sortable-ol-elements-don-t-display-numbers-properly#14737000001561195 for numbered sortable list.
				var $lis = $(this).children('li');
				$lis.each(function(){
					var $li = $(this);
					var hindex = $lis.filter('.ui-sortable-helper').index();
					if( !$li.is('.ui-sortable-helper') ){
						var index = $li.index();
						index = index < hindex ? index + 1 : index;

						$li.val(index);

						if( $li.is('.ui-sortable-placeholder') ){
							$lis.filter('.ui-sortable-helper').val(index);
						}
					}
		        });
		    }
		});
		$(`#sortable${i}`).disableSelection();

		$(`#add2Sequence${i}`).autocomplete({
			source: globalStopsList
		});

	}
	$("#sequenceHolder").show('drop','slow');

	// sortable: delete element from list
	$('a.delSortElement').click(function(e){
		e.preventDefault();
		console.log('firing?');
		$(this).parent().parent().hide('slow', complete=function(e){ this.remove(); });
		// from http://jsfiddle.net/K3Kxg/, https://stackoverflow.com/a/19839253/4355695
	});

}
*/

function add2SequenceFunc(val, i) {
	console.log('add2SequenceFunc', val, i);
	if (val == "0") return;
	let stop_id = val;
	let stop_name = stops.getRow(stop_id).getData().stop_name;
	$('#sortable' + i).append(`
		<li class="list-group-item d-flex justify-content-between align-items-center" data-id="${stop_id}">
                        ${stop_id}: ${stop_name}                        
                        <a href="#" class="delSortElement red"><i class="fas fa-trash-alt"></i></a>                        
                        </li>			
			`);
	//window[`Sortable{i}`].sortable('refresh');

	// may have to issue this again since refreshing sortable
	// sortable: delete element from list
	$('a.delSortElement').click(function (e) {
		e.preventDefault();
		$(this).parent().parent().hide('slow', complete = function (e) { this.remove(); });
		// from http://jsfiddle.net/K3Kxg/, https://stackoverflow.com/a/19839253/4355695
	});
}

function sequenceTest(i) {
	var sortedIDs = window[`Sortable{i}`].toArray(); // $(`#sortable${i}`).sortable("toArray");
	console.log(sortedIDs);
	var mapLine = [];
	sortedIDs.forEach(function (stop_id) {
		let stop_row = stops.getRow(stop_id).getData();
		mapLine.push([
			parseFloat(stop_row.stop_lat),
			parseFloat(stop_row.stop_lon)
		]);

	});

	/*
	var centerRev = mapLine[parseInt(mapLine.length / 2)];
	var center = [centerRev[1],centerRev[0]];
	var myLine = {
		"type": "LineString",
		"coordinates": mapLine,
		"properties": { "name": "Route "+(i+1) }
	};
	*/
	lineLayer.clearLayers();
	//L.geoJSON(myLine).addTo(lineLayer);

	var shapeLine = L.polyline.antPath(mapLine, { color: 'purple', weight: 5 }).addTo(lineLayer);
	lineLayer.addTo(smallMap);

	smallMap.fitBounds(lineLayer.getBounds());
	document.getElementById('viewAnchor').scrollIntoView();

}

function makeStopSelect() {
	var stopsData = stops.getData();
	var content = '';
	stopsData.forEach(function (row) {
		content += `
		<option value="${row.stop_id}">${row.stop_id}-${row.stop_name}</option>`;
	});
	return content;
}

function diagnoseConvertHYD() {
	$('#diagnoseConvertStatus').html('<span class="alert alert-warning">Processing..</span>');
	$('#diagnoseConvertInfo').html('');
	// first, gather up the data into a json
	var payload = {};

	// feed_info
	payload['feed_info'] = config['feed_info'];
	payload['feed_info']['feed_version'] = formatDate();

	// tabulator tables data:
	payload['stopsData'] = stops.getData();
	payload['missingStops'] = missingstops.getData();
	payload['replaceStops'] = replacestops.getData();
	payload['fareAttributes'] = fareid.getData();
	payload['translations'] = translations.getData();
	payload['transfers'] = config['transfers']

	// agency etc data:
	payload['agency'] = {};
	payload.agency['id'] = $('#agency_id').val();
	payload.agency['name'] = $('#agency_name').val();
	payload.agency['url'] = $('#agency_url').val();
	payload.agency['timezone'] = $('#agency_timezone').val();
	payload.agency['start'] = $('#start_date').val();
	payload.agency['end'] = $('#end_date').val();

	// routewise data:
	payload['routes'] = [];
	for (i = 0; i < globalNumRoutes; i++) {
		payload['routes'][i] = {};
		// to do: load the routes fields
		payload['routes'][i]['id'] = $(`#route${i}_id`).val();
		payload['routes'][i]['short_name'] = $(`#route${i}_short_name`).val();
		payload['routes'][i]['long_name'] = $(`#route${i}_long_name`).val();
		payload['routes'][i]['color'] = $(`#route${i}_color`).val();
		payload['routes'][i]['text_color'] = $(`#route${i}_text_color`).val();
		payload['routes'][i]['sequence'] = window[`Sortable{i}`].toArray();
	}
	console.log('payload:', payload);

	// Attaching the files
	var form = document.getElementById('form1');
	var formData = new FormData(form);

	//console.log('formData',formData);

	formData.append('payload', JSON.stringify(payload));

	// adding fares chart
	formData.append('fareChart', $('#fareChart')[0].files[0]);

	// pw check
	var pw = $("#password").val();

	if (!pw) {
		$('#diagnoseConvertStatus').html('<span class="alert alert-danger">Please enter the password.</span>');
		shakeIt('password'); return;
	}

	// constructing POST API call

	$.ajax({
		url: `${APIpath}hydGTFS?pw=${pw}`,
		type: 'POST',
		data: formData,
		cache: false,
		processData: false,  // tell jQuery not to process the data
		contentType: false,  // tell jQuery not to set contentType
		success: function (returndata) {
			console.log('POST success');
			overallStatus = returndata.status;

			if (!overallStatus) {
				$('#diagnoseConvertStatus').html('<span class="alert alert-danger">' + 'Did not convert.' + '</span>');
				$('#diagnoseConvertInfo').html(returndata.message);
				return;
			}
			$('#diagnoseConvertStatus').html('Operation performed successfully. Log:');
			console.log(returndata);
			$('#diagnoseConvertInfo').html(returndata.message);
			// to do: populate different divs. CSVUploadStatus, diagnoseConvertInfo

		},
		error: function (jqXHR, exception) {
			console.log('POST fail', jqXHR.responseText);
			$('#diagnoseConvertStatus').html('<span class="alert alert-danger">' + jqXHR.responseText + '</span>');

		}
	});
}

function loadFares(faresList) {
	// to do: add to fares table
	for (f = 0; f < faresList.length; f++) {
		fareid.addRow([{ price: faresList[f], fare_id: ('F' + (f + 1)) }]);
	}
}