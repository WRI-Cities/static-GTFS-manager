// #########################################
// Function-variables to be used in tabulator

var shapeTotal = function(values, data, calcParams){
	var calc = values.length;
	return calc + ' agencies total';
}

//####################
// Tabulator tables

$("#shapes-table").tabulator({
	selectable:0,
	index: 'shape_id',
	movableRows: true,
	history:true,
	addRowPos: "top",
	movableColumns: true,
	layout:"fitDataFill",
	//ajaxURL: `${APIpath}tableReadSave?table=shapes`, //ajax URL
	//ajaxLoaderLoading: loaderHTML,
	columns:[
		{rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, minWidth:30 },
		{title:"shape_id", field:"shape_id", editor:"input", width:200, bottomCalc:shapeTotal },
		{title:"shape_pt_lat", field:"shape_name", editor:"input", headerSort:false, validator:"float" },
		{title:"shape_pt_lon", field:"shape_name", editor:"input", headerSort:false, validator:"float" },
		{title:"shape_pt_sequence", field:"shape_url", editor:"input", validator:"integer" },
		{title:"shape_dist_traveled", field:"shape_url", editor:"input", validator:"float" },
		
	],
	
});

// ###################
// commands to run on page load
$(document).ready(function() {
	// executes when HTML-Document is loaded and DOM is ready
	getShapesList();
});

// #########################
// Buttons

// ###################
// Functions

function getShapesList() {
	var jqxhr = $.get( `${APIpath}allShapesList`, function( data ) {
		list =  JSON.parse(data);
		console.log('GET request to API/tableReadSave for table=feed_info succesfull.');
        var content = '<option value="">Select a Shape</option>';

		list['all'].forEach(function(row){

		//for (var p in list['all']) {
            content += `<option value="${row}">${row}</option>`;
		});
		$('#shapeSelect').html(content);
	})
	.fail( function() {
		console.log('GET request to API/tableReadSave table=feed_info failed.')
	});
}
