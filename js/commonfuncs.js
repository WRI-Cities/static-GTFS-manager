const APIpath = 'API/';
// const APIpath = 'https://lit-mesa-97724.herokuapp.com/API/';

function preventOtherInputs(ui, id) {
	if(!ui.item){
		//http://api.jqueryui.com/autocomplete/#event-change -
		// The item selected from the menu, if any. Otherwise the property is null
		//so clear the item for force selection
		$(id).val("");
	}
}
