var trashIcon = function(cell, formatterParams, onRendered){ //plain text value
    return "<i class='fas fa-trash-alt'></i>";
};

var ConfigMapProvider = new Tabulator("#SettingsMaps", {
	selectable:1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
	layout:"fitColumns", //fit columns to width of table (optional)
	index: "Id",	
    addRowPos: "top",
    data:LeafLetProviders,	
	columns:[ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30},
		{title:"id", field:"Id", frozen:true, headerFilter:"input" },
		{title:"name", field:"Text", editor:"input"},
		{title:"default", field:"Default", headerSort:false, formatter:"tickCross" },
		{title:"variant", field:"Variant", headerSort:false, editor:"input" },
		{title:"apikey", field:"Apikey", editor:"input" },
		{formatter:trashIcon, width:40, align:"center", title:"del", headerSort:false, minWidth:30, cellClick:function(e, cell){
			if(confirm('Are you sure you want to delete this entry?'))
				cell.getRow().delete();
			}}	
	],
	
	rowSelected:function(row){ //when a row is selected
		//console.log("Row " + row.getData().stop_id + " Clicked, index: " + row.getIndex() );
		// Change tab on select
		// $('.nav-tabs a[href="#edit"]').tab('show');
		// mapPop(row.getData().stop_id);
	},
	rowDeselected:function(row){ //when a row is deselected
		// depopulateFields();
		// map.closePopup();
	},	
	cellEditing:function(cell){
		// pop up the stop on the map when user starts editing
		// mapPop(cell.getRow().getData().stop_id);
	},
	cellEdited:function(cell){
		// on editing a cell, display updated info 
		// reloadData();
		// var stop_id = cell.getRow().getData().stop_id; //get corresponding stop_id for that cell. Can also use cell.getRow().getIndex()
		// mapPop(stop_id);
		// logmessage('Changed "' + cell.getOldValue() + '" to "' + cell.getValue() + '" for stop_id: ' + stop_id);
		// $("#undoredo").show('slow');
	},
	dataLoaded:function(data) {
		// this fires after the ajax response and after table has loaded the data. 
		// console.log(`Loaded all stops data from Server API/tableReadSave table=stops .`);
		// reloadData('firstTime');
	},
	ajaxError:function(xhr, textStatus, errorThrown){
		// console.log('GET request to tableReadSave table=stops failed.  Returned status of: ' + errorThrown);
	}
});


var select2LeafLetProviders = $.map(LeafLetProviders, function (obj) {
    obj.id = obj.Id; // replace identifier
    obj.text = obj.Text;
    return obj;
  });

$("#Mapprovider").select2({    
    placeholder: "Choose a Provider",
    theme: 'bootstrap4',    
    data: select2LeafLetProviders
  });

  $('#Mapprovider').on("select2:select", function(e) { 		    
    var provider_id = e.params.data.id;		
    switch(provider_id) {
        case "MapBox":
          $("#label-variant").text("id");
          $("#label-apikey").text("accessToken");
          alert('Mapbox Selected')
          break;
        case "HERE.terrainDay":
          alert('Here Selected')
          $("#label-variant").text("app_id");
          $("#label-apikey").text("app_code");
          // code block
          break;
        default:
          // code block
      }
 });

 $(document).ready(function() {
	$.getJSON( "http://localhost:5000/API/Config/ApiKeys", function( data ) {
		console.log(data);
		$("#ApiKeyGoogle").val(data.GOOGLEAPI);
		$("#ApiKeyMapbox").val(data.MAPBOXAPI);
      }); 
});

$("#SaveApiKeys").click(function () {

	var url = 'http://localhost:5000/API/Config/ApiKeys';

	var postData = {GOOGLEAPI:$("#ApiKeyGoogle").val(), MAPBOXAPI:$("#ApiKeyMapbox").val()};

	// jQuery .post method is used to send post request.
	// $.post(url, postData, function (data, status) {
	// 	alert("Ajax post status is " + status);
	// 	alert(data);
	// });
	$.ajax({
		type: 'POST',
		url: url,
		data: JSON.stringify(postData), // or JSON.stringify ({name: 'jonas'}),
		success: function(data) { alert('data: ' + data); },
		contentType: "application/json",
		dataType: 'json'
	});

});