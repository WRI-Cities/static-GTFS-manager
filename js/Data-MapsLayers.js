var LeafLetProviders = [
  {
    "Id": "OpenStreetMap.Mapnik",
    "Text": "OpenStreetMap",
    "Default": true,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "OpenStreetMap.DE",
    "Text": "OpenStreetMap German Style",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "OpenStreetMap.HOT",
    "Text": "OpenStreetMap H.O.T.",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Thunderforest.OpenCycleMap",
    "Text": "Thunderforest OpenCycleMap",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  },
  {
    "Id": "Thunderforest.Transport",
    "Text": "Thunderforest Transport",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  },
  {
    "Id": "Thunderforest.Landscape",
    "Text": "Thunderforest Landscape",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  },
  {
    "Id": "Hydda.Full",
    "Text": "Hydda Full",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Stamen.Toner",
    "Text": "Stamen Toner",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  },
  {
    "Id": "Stamen.Terrain",
    "Text": "Stamen Terrain",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  },
  {
    "Id": "Stamen.Watercolor",
    "Text": "Stamen Watercolor",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  },
  {
    "Id": "Esri.WorldStreetMap",
    "Text": "Esri WorldStreetMap",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.DeLorme",
    "Text": "Esri DeLorme",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.WorldTopoMap",
    "Text": "Esri WorldTopoMap",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.WorldImagery",
    "Text": "Esri WorldImagery",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.WorldTerrain",
    "Text": "Esri WorldTerrain",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.WorldShadedRelief",
    "Text": "Esri WorldShadedRelief",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.WorldPhysical",
    "Text": "Esri WorldPhysical",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.OceanBasemap",
    "Text": "Esri OceanBasemap",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.NatGeoWorldMap",
    "Text": "Esri NatGeoWorldMap",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "Esri.WorldGrayCanvas",
    "Text": "Esri WorldGrayCanvas",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": false
  },
  {
    "Id": "HERE.terrainDay",
    "Text": "Here Maps",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  },
  {
    "Id": "MapBox",
    "Text": "MapBox",
    "Default": false,
    "Variant": "",
    "ApiKey": "",
    "Paid": true
  }
];

function MapsformatState(state) {	
	// Used to put a google icon for the gogle supported services.
	if (!state.id) {
		return state.text;
	}
  var $state = state.text;
  if (state.Paid) {
			$state = $(
				'<span><i class="fas fa-money-bill"></i> ' + state.text + '</span>'
			);
  } 
  else {
    $state = $(
      '<span> ' + state.text + '</span>'
    );
  }
	return $state;
};

//create custom editor
var select2LeafletEditor = function (cell, onRendered, success, cancel, editorParams) {

    //create input element to hold select
    var editor = document.createElement("select");
    editor.className = "form-control";
    editor.style.width = "100%";
    editor.style.height = "100%";
    onRendered(function () {
        var select_2 = $(editor);

        select_2.select2({
            placeholder: 'Select',
            data: LeafLetProviders,
            width: 300,
            minimumInputLength: 0,
            theme: 'bootstrap4',
	          templateResult: MapsformatState,
	          templateSelection: MapsformatState
        });

        select_2.on('change', function (e) {
            success(select_2.val());
        });


        select_2.on('blur', function (e) {
            cancel();
        });
    });
    //add editor to cell
    return editor;
}