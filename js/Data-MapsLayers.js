var LeafLetProviders = [
  {
    "Id": "OpenStreetMap.Mapnik",
    "Text": "OpenStreetMap",
    "Default": true,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "OpenStreetMap.DE",
    "Text": "OpenStreetMap German Style",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "OpenStreetMap.HOT",
    "Text": "OpenStreetMap H.O.T.",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Thunderforest.OpenCycleMap",
    "Text": "Thunderforest OpenCycleMap",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Thunderforest.Transport",
    "Text": "Thunderforest Transport",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Thunderforest.Landscape",
    "Text": "Thunderforest Landscape",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Hydda.Full",
    "Text": "Hydda Full",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Stamen.Toner",
    "Text": "Stamen Toner",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Stamen.Terrain",
    "Text": "Stamen Terrain",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Stamen.Watercolor",
    "Text": "Stamen Watercolor",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.WorldStreetMap",
    "Text": "Esri WorldStreetMap",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.DeLorme",
    "Text": "Esri DeLorme",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.WorldTopoMap",
    "Text": "Esri WorldTopoMap",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.WorldImagery",
    "Text": "Esri WorldImagery",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.WorldTerrain",
    "Text": "Esri WorldTerrain",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.WorldShadedRelief",
    "Text": "Esri WorldShadedRelief",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.WorldPhysical",
    "Text": "Esri WorldPhysical",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.OceanBasemap",
    "Text": "Esri OceanBasemap",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.NatGeoWorldMap",
    "Text": "Esri NatGeoWorldMap",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "Esri.WorldGrayCanvas",
    "Text": "Esri WorldGrayCanvas",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "HERE.terrainDay",
    "Text": "Here Maps",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  },
  {
    "Id": "MapBox",
    "Text": "MapBox",
    "Default": false,
    "Variant": "",
    "ApiKey": ""
  }
];

//create custom editor
var select2CurrencyEditor = function (cell, onRendered, success, cancel, editorParams) {

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
            theme: 'bootstrap4'
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