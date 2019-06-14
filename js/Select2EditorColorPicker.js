//create custom editor
var ColorEditor = function(cell, onRendered, success, cancel, editorParams){

    //create input element to hold select
    var editor = document.createElement("input");
    editor.style.width = "100%";
    editor.style.height = "100%";
 

    // Current value
    editor.value = cell.getValue()

    onRendered(function(){
        var ColorEditor = $(editor);

        ColorEditor.colorpicker({
            useHashPrefix: false,
            useAlpha: false,
            debug: true     
        });

        ColorEditor.on('colorpickerUpdate', function (e) {            
            success(e.color.string());
        });


        ColorEditor.on('blur', function (e) {
            cancel();
        });
    });
    //add editor to cell
    return editor;
}