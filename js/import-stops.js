var ColumnsList = ["Columnstop_id","Columnstop_code","Columnstop_name","Columnstop_desc","Columnstop_lat","Columnstop_lon","Columnzone_id","Columnstop_url","Columnlocation_type","Columnparent_station","Columnstop_timezone","Columnwheelchair_boarding","Columnlevel_id","Columnplatform_code"];

var trashIcon = function (cell, formatterParams, onRendered) { //plain text value
	return "<i class='fas fa-trash-alt'></i>";
};

var TempTable = new Tabulator("#TempTable", {
    selectable: 1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
    layout:"fitColumns",
    height:400 // Height is needed for virtual dom, without virtual dom performance is slowwwww
});

var StopsTable = new Tabulator("#StopsTable", {
    selectable: 1, // make max 1 row click-select-able. http://tabulator.info/docs/3.4?#selectable
	movableRows: true, //enable user movable rows
    layout:"fitColumns",
    height:400, // Height is needed for virtual dom, without virtual dom performance is slowwwww
    columns: [ //Define Table Columns
		// stop_id,stop_name,stop_lat,stop_lon,zone_id,wheelchair_boarding
		{ rowHandle: true, formatter: "handle", headerSort: false, frozen: true, width: 30, minWidth: 30 },
        { title: "stop_id", field: "stop_id", frozen: true, headerFilter: "input", validator: ["string", 3] },
        { title: "stop_code", field: "stop_code", editor: "input"},
        { title: "stop_name", field: "stop_name", editor: "input", headerFilter: "input", validator: ["required", "string", 3] },
        { title: "stop_desc", field: "stop_desc", editor: "input"},
		{ title: "stop_lat", field: "stop_lat", headerSort: false, validator: "float" },
		{ title: "stop_lon", field: "stop_lon", headerSort: false, validator: "float" },
        { title: "zone_id", field: "zone_id", editor: "input" },
        { title: "stop_url", field: "stop_url", editor: "input" },
        { title: "location_type", field: "location_type", editor: "input" },
        { title: "parent_station", field: "parent_station", editor: "input" },
        { title: "stop_timezone", field: "stop_timezone", editor: "input" },
        { title: "wheelchair_boarding", field: "wheelchair_boarding", editor: "select", headerSort: false, editorParams: { values: { 0: "No (0)", 1: "Yes (1)" } } },
        { title: "level_id", field: "level_id", editor: "input" },
        { title: "platform_code", field: "platform_code", editor: "input" },
        {
			formatter: trashIcon, align: "center", title: "Delete", headerSort: false, cellClick: function (e, cell) {				
				cell.getRow().delete();				
			}
		}
	]
});

$("#CSVParse").on("click", function(){
	if (document.getElementById('CSVFile').files.length != 1) {
		alert('Please select a proper file first');
		return;
    }
    //reset table columns and select boxes 
    ResetTempTable();

    // Parse csv and put in a temp table.
    console.log('Parsing CSV...');
    console.time('ParseCSV');
	Papa.parse(document.getElementById('CSVFile').files[0], {
		header: true,
		skipEmptyLines: true,
		dynamicTyping: true, // this reads numbers as numerical; set false to read everything as string
		complete: function (results) {
            console.timeEnd('ParseCSV');
            console.log('Filling Table...');
            console.time('FillingTable');
            var columns = results.meta.fields; // Set the columns of the TempTable.
            columns.forEach(function(column) {
                // Add columns to table
                TempTable.addColumn({title:column, field:column});
                // add columns to select boxes.
                ColumnsList.forEach(function(selectcolumn) {
                    // Add all column to the select boxes for the import.
                    var selected = false;                    
                    // gtfs column name
                    var gtfscolumnname = selectcolumn.replace('Column','');
                    // if the column is equal to the gtfs standard select this column automaticly.
                    if (column == gtfscolumnname) { selected = true;}
                    var newOption = new Option(column, column, false, selected);
			        // add the option to the selectbox.
                    $("#" + selectcolumn).append(newOption);
                });                
            });            
            // Import the data in the table.
            TempTable.replaceData(results.data);
            //TempTable.redraw();
            console.timeEnd('FillingTable');					
		}
	});
});

$("#ImportToStopsTable").on("click", function(){
    var TempJsonTable = [];
    var jsonData = {};

	if (TempTable.getDataCount() < 1) {
        alert('No data in the CSV Table');
        return;
    }
    // get selected.

    // get table data
    var data = TempTable.getData();
    data.forEach(function(row) {
        // create new stops layout
        console.log(row);       
        ColumnsList.forEach(function(selectcolumn) {               
            // get the column selectbox value
            var importcolumn = $("#" + selectcolumn).val();
            var gtfscolumnname = selectcolumn.replace('Column','');
            if (importcolumn != '') {
                jsonData[gtfscolumnname] = row[importcolumn];
            }
        });          
        StopsTable.addData(jsonData);             
    });   
});

function ResetTempTable() {
    var arrOptionsVal = [''];
    var cols = TempTable.getColumns() //get array of column components
    cols.forEach(function(col) {
        TempTable.deleteColumn(col);
    });

    // Recreate the default selectboxes.
    ColumnsList.forEach(function(selectcolumn) {
        // Loop through all options
        $("#" + selectcolumn).children('option:not(:first)').remove();            
       if (selectcolumn == 'Columnstop_id') {
            var newOption = new Option("Generate a STOP_ID", "GENERATE", false, false);
            // add the option to the selectbox.
            $("#" + selectcolumn).append(newOption);
       }
        
    });                
}
// Toggles for show hide columns in stop table.

$('#checkstop_id').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_id");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_id");
        StopsTable.redraw();
    }
});

$('#checkstop_code').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_code");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_code");
        StopsTable.redraw();
    }
});

$('#checkstop_name').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_name");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_name");
        StopsTable.redraw();
    }
});

$('#checkstop_desc').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_desc");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_desc");
        StopsTable.redraw();
    }
});

$('#checkstop_lat').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_lat");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_lat");
        StopsTable.redraw();
    }
});

$('#checkstop_lon').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_lon");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_lon");
        StopsTable.redraw();
    }
});

$('#checkstop_lon').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_lon");
        StopsTable.redraw();;
    }
    else {
        StopsTable.showColumn("stop_lon");
        StopsTable.redraw();
    }
});

$('#checkzone_id').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("zone_id");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("zone_id");
        StopsTable.redraw();
    }
});

$('#checkstop_url').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_url");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_url");
        StopsTable.redraw();
    }
});

$('#checklocation_type').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("location_type");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("location_type");
        StopsTable.redraw();
    }
});

$('#checkparent_station').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("parent_station");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("parent_station");
        StopsTable.redraw();
    }
});

$('#checkstop_timezone').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("stop_timezone");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("stop_timezone");
        StopsTable.redraw();
    }
});

$('#checkwheelchair_boarding').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("wheelchair_boarding");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("wheelchair_boarding");
        StopsTable.redraw();
    }
});

$('#checklevel_id').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("level_id");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("level_id");
        StopsTable.redraw();
    }
});

$('#checkplatform_code').change(function() {
    if(this.checked) {
        StopsTable.hideColumn("platform_code");
        StopsTable.redraw();
    }
    else {
        StopsTable.showColumn("platform_code");
        StopsTable.redraw();
    }
});