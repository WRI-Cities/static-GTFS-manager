//create custom editor for colorpicking based on jscolor.
var ColorEditor = function(cell, onRendered, success, cancel, editorParams){

    //create input element to hold select
    var editor = document.createElement("input");
    editor.style.width = "100%";
    editor.style.height = "100%";
    //editor.className = "jscolor";
    if (cell.getValue()) {
        editor.value = cell.getValue().replace('#','');
    }
    var ColorEditor = new jscolor(editor);

    // Current value
    
    //editor.jscolor.show();
    
    onRendered(function(){
        editor.focus();        
    });

    editor.addEventListener("change", function(e){
        var color = e.target.value; 
     
        console.log('#' + color);
        success('#' + color);
     });
    editor.addEventListener("blur", function(e){
        var color = e.target.value; 
     
        console.log('#' + color);
        success('#' + color);
     });
    
    //add editor to cell
    return editor;
}