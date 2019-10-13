// This javascript contains all the functions for the config button in the tabultator footer. the custom calling is done in the page specific javascript. 
function addColumntoTable(tablename) {
	var CurrentColumns = [];
	var ColumntoAdd = prompt("Please enter a title for the column you want to add", "");
	if (!ColumntoAdd) { return;}
	// replace special chars and spaces.
	ColumntoAdd = ColumntoAdd.replace(/[^A-Z0-9]+/ig, "_");
	// Current Columns
	tablename.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			CurrentColumns.push(selectcolumn.field);
		}
	});
	// Check 
	if (CurrentColumns.indexOf(ColumntoAdd) == -1) {
		tablename.addColumn({ title: ColumntoAdd, field: ColumntoAdd, editor: true });
		$.toast({
			title: 'Add Column',
			subtitle: 'Columns Added',
			content: "Please add values to the newly added column. Without it it won't save it to the database.",
			type: 'success',
			delay: 5000
		});		
	}
	else {
		$.toast({
			title: 'Add Column',
			subtitle: 'Failed to Add',
			content: ColumntoAdd + ' is already there.',
			type: 'error',
			delay: 5000
		});
	}
}

function ShowHideColumn(tablename, table) {
	var ColumnSelectionContent = "";
	tablename.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			var columnname = selectcolumn.field;
			var checked = '';
			if (selectcolumn.visible == true) {
				checked = 'checked';
			}
			ColumnSelectionContent += '<div class="form-check"><input class="form-check-input" type="checkbox" value="'+table+'" id="check' + columnname + '" ' + checked + '><label class="form-check-label" for="check' + columnname + '">' + columnname + '</label></div>';
		}
    });
    // Hide all nonstandard buttons of the modal.
    $('.nonstandardbutton').hide();	
	$("#DeleteColumnModalTitle").html("Show / Hide columns");
	$("#DeleteColumnModalBody").html(ColumnSelectionContent);
	// Show the Modal
	$('#DeleteColumnModal').modal('show');
}

function RemoveExtraColumns(tablename, GTFSDefinedColumns, table) {
	// first load all the columns currenty active in the tabel.
	var CurrentColumns = [];
	tablename.getColumnLayout().forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn.field) {
			var columnname = selectcolumn.field;
			CurrentColumns.push(columnname);
		}
	});
	// Remove gtfs columns:
	GTFSDefinedColumns.forEach(function (element) {
		for (var i = 0; i < CurrentColumns.length; i++) {
			if (CurrentColumns[i] === element) {
				// Remove the predefined columns.
				CurrentColumns.splice(i, 1);
				i--;
			}
		}
	});
	// Currentcolumns now holds all defined columns.
	var ColumnSelectionContent = "";
	CurrentColumns.forEach(function (selectcolumn) {
		// get the column selectbox value
		if (selectcolumn) {
			var columnname = selectcolumn;
			ColumnSelectionContent += '<div class="form-check"><input class="form-check-input" type="checkbox" value="' + columnname + '" name="DeleteColumns" id="DeleteColumns' + columnname + '"data-tablename='+table+'><label class="form-check-label" for="DeleteColumns' + columnname + '">' + columnname + '</label></div>';
		}
    });
    if (CurrentColumns.length > 0) {
        $('.nonstandardbutton').hide();	
        $("#DeleteColumnButton").show();
        $("#DeleteColumnModalTitle").html("Delete Non standard columns");
        $("#DeleteColumnModalBody").html(ColumnSelectionContent);
        // Show the Modal
        $('#DeleteColumnModal').modal('show');
    } 
    else {
        $.toast({
			title: 'Delete Column',
			subtitle: 'No custom columns',
			content: 'There are no custom columns defined that you can delete.',
			type: 'info',
			delay: 5000
		});
    }

}

function SelectTableForDeleteExtraColumns() {
	var tablenameselected

	$("input[name=DeleteColumns]:checked").each(function () {
		tablenameselected = $(this).data("tablename");
	});
    // Eval is evil but it works in this.
	DeleteExtraColumns(eval(tablenameselected));

}

function DeleteExtraColumns(tablename) {
	// The getdata funtion will not delete the column from the data but only hides it. 
	var data = tablename.getData();	
	var filteredData = [];
	var columns = tablename.getColumns();
	data.forEach(function (row) {
		var outputRow = {};
		columns.forEach(function (col) {
			var field = col.getField();
			if (field) {
				$("input[name=DeleteColumns]:checked").each(function () {
					if (field != $(this).val()) {
						outputRow[field] = row[field];
					}
				});
			}
		});
		// Now we have the row without the delete columns.
		filteredData.push(outputRow);
	});
	$("input[name=DeleteColumns]:checked").each(function () {
		// Efectifly delete the columns from the table. But this will not delete the columns from the data!
		tablename.deleteColumn($(this).val());
	});
	// Replace all of the table data with the new json array. This will not contain the deleted columns!
	tablename.replaceData(filteredData);
	tablename.redraw();	
	$('#DeleteColumnModal').modal('hide');
	$.toast({
		title: 'Delete Column',
		subtitle: 'Columns Deleted',
		content: 'Save the table save the changes to the database.',
		type: 'success',
		delay: 5000
	});
}

function AddExtraColumns(loadeddata, GTFSDefined, tablename) {
	var filtered = loadeddata;
	GTFSDefined.forEach(function (element) {
		for (var i = 0; i < filtered.length; i++) {
			if (filtered[i] === element) {
				// Remove the predefined columns.
				filtered.splice(i, 1);
				i--;
			}
		}
	});
	// Filtered contains now the columns that aren't in the gtfs specs.	
	filtered.forEach(function (addcolumn) {
		//add the column to the table.
		tablename.addColumn({ title: addcolumn, field: addcolumn, editor: true });
	});
}