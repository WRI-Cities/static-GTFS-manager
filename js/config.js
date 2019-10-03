var trashIcon = function (cell, formatterParams, onRendered) { //plain text value
	return "<i class='fas fa-trash-alt'></i>";
};

var ConfigMapProvider = new Tabulator("#SettingsMaps", {
	selectable: 1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	layout: "fitColumns", //fit columns to width of table (optional)
	index: "id",
	addRowPos: "top",
	data: cfg.MapProviders,
	columns: [ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
		{ title: "id", field: "id", frozen: true, headerFilter: "input" },
		{ title: "name", field: "name", editor: "input" },
		{ title: "default", field: "default", headerSort: false, formatter: "tickCross", editor: true },
		{ title: "variant", field: "variant", headerSort: false, editor: "input", editor: true },
		{ title: "apikey", field: "apikey", editor: "input", editor: true },
		{
			formatter: trashIcon, width: 40, align: "center", title: "del", headerSort: false, minWidth: 30, cellClick: function (e, cell) {
				if (confirm('Are you sure you want to delete this entry?'))
					cell.getRow().delete();
			}
		}
	]
});

var select2LeafLetProviders = $.map(LeafLetProviders, function (obj) {
	obj.id = obj.Id; // replace identifier
	obj.text = obj.Text;
	return obj;
});

$("#Mapprovider").select2({
	placeholder: "Choose a Provider",
	theme: 'bootstrap4',
	data: select2LeafLetProviders,
	templateResult: MapsformatState,
	templateSelection: MapsformatState
});

$('#Mapprovider').on("select2:select", function (e) {
	var provider_id = e.params.data.id;
	switch (provider_id) {
		case "MapBox":
			$("#label-variant").text("id");
			$("#label-apikey").text("accessToken");
			break;
		case "HERE.terrainDay":
			$("#label-variant").text("app_id");
			$("#label-apikey").text("app_code");
			// code block
			break;
		default:
		// code block
	}
});

$(document).ready(function () {
	$("#ApiKeyGraphhopper").val(cfg.GraphHopperApi);
	$("#ApiKeyMapbox").val(cfg.MAPBOXAPI);
	$("#ApiKeyTomTom").val(cfg.TomTomApi);
	$("#HereAppCode").val(cfg.HereAppCode);
	$("#HereAppId").val(cfg.HereAppID);

	$("#GTFSTimezone").select2({
		placeholder: "Select a timezone",
		allowClear: true,
		theme: 'bootstrap4',
		data: TimeZoneList
	});
	$("#GTFSTimezone").val(cfg.GTFS.Timezone).trigger("change");

	$("#GTFSCurrency").select2({
		placeholder: "Select a Currency",
		allowClear: true,
		theme: 'bootstrap4',
		data: CurrencyList
	});
	$("#GTFSCurrency").val(cfg.GTFS.Currency).trigger("change");
});

$("#SaveApiKeys").click(function () {
	$.toast({
		title: 'Save Config',
		subtitle: 'Sending data',
		content: 'Sending data, please wait...',
		type: 'info',
		delay: 1000
	});
	var url = 'API/Config/ApiKeys';
	var MapProviders = ConfigMapProvider.getData();
	var GTFS = { Timezone: $("#GTFSTimezone").val(), Currency: $("#GTFSCurrency").val() }
	var APP = { WideScreen: true //$("WideScreen").val()
 }

	var postData = { HereAppID: $("#HereAppId").val(), HereAppCode: $("#HereAppCode").val(), TomTomApi: $("#ApiKeyTomTom").val(), GraphHopperApi: $("#ApiKeyGraphhopper").val(), MAPBOXAPI: $("#ApiKeyMapbox").val(), MapProviders: MapProviders, GTFS: GTFS, APP: APP };
	// jQuery .post method is used to send post request.
	// $.post(url, postData, function (data, status) {
	// 	alert("Ajax post status is " + status);
	// 	alert(data);
	// });
	$.ajax({
		type: 'POST',
		url: url,
		data: JSON.stringify(postData), // or JSON.stringify ({name: 'jonas'}),
		success: function (data) {
			$.toast({
				title: 'Save Config',
				subtitle: 'Success',
				content: 'Config has been successful saved. Please reload this page.',
				type: 'success',
				delay: 3000
			});
		},
		contentType: "application/json",
		dataType: 'json'
	});

});

$("#AddMapProvider").click(function () {
	var MapproviderSelected = $("#Mapprovider").val();
	var Variant = $("#Variant").val();
	var Apikey = $("#ApiKey").val();
	console.log(MapproviderSelected);
	ConfigMapProvider.addRow([{ id: MapproviderSelected, name: MapproviderSelected, variant: Variant, apikey: Apikey, default: false }]);
});

$('#collapseOne').on('shown.bs.collapse', function () {
	ConfigMapProvider.redraw();
});
