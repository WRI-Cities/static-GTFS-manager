function MenuItem(Text, Link, isActive) {
    var iconText = '';
    var iconPage = IconPage(Link);
    var isActiveText = '';
    if (iconPage != ''){
        iconText = '<i class="fas '+ iconPage + ' fa-fw"></i>'; 
    }
    if (isActive) {
        isActiveText = ' class="active"';
    }
    if (Link == 'index.html' ) {
        iconText = '<span class="bot-line"></span>' + iconText;
    }
    return '<li' + isActiveText + '><a href="' + Link + '">' + iconText + Text + '</a></li>';
}

function SubMenu(Text, Icon) {
    var iconText = '';
    var iconSub = IconSub(Text);
    if (iconSub != ''){
        iconText = '<i class="fas '+ iconSub + ' fa-fw"></i>'; 
    }
    return ' <li class="has-sub"><a href="#">' + iconText +'<span class="bot-line"></span>' + Text + '</a><ul class="header3-sub-list list-unstyled">';
}
// Function for getting the icon with a link adres
function IconPage(pageurl) {
    var iconText;
    switch(pageurl) {
        case "index.html":
            // code block
            iconText = 'fa-home';
            break;
        case "agency.html":
            // code block
            iconText = 'fa-building';
            break;
        case "stops.html":
            // code block
            iconText = 'fa-map-marker-alt';
            break;
        case "routes.html":
            // code block
            iconText = 'fa-road';
            break;
        case "calendar.html":
            // code block
            iconText = 'fa-calendar';
            break;
        case "tripstimings.html":
            // code block
            iconText = 'fa-stopwatch';
            break;
        case "frequencies.html":
            // code block
            iconText = 'fa-wave-square';
           break;
        case "fares.html":
            // code block
            iconText = 'fa-dollar-sign';
            break;
        case "translations.html":
            // code block
            iconText = 'fa-language';
           break;
        case "sequence.html":
            // code block
            iconText = 'fa-align-justify';
            break;
        case "renameID.html":
            // code block
            iconText = 'fa-pen';
           break;
        case "deleteID.html":
            // code block
            iconText = 'fa-trash';
            break;
        case "kmrl.html":
            // code block
            iconText = 'fa-file-import';
            break;
        case "hmrl.html":
            // code block
            iconText = 'fa-file-import';
            break;
        default:
          iconText = '';
      } 

    return iconText;
}
// Function for getting the icon with a menu item text.
function IconSub(pagename) {
    var iconText;

    switch(pagename) {
        case "GTFS":
            // code block
            iconText = 'fa-bus';
            break;
        case "Data":
            // code block
            iconText = 'fa-database';
            break;
        case "Tools":
            // code block
            iconText = 'fa-tools';
            break;  
        case "Home":
            // code block
            iconText = 'fa-home';
            break;         
        default:
          iconText = '';
      } 

    return iconText;
}


var navBarContent = '<ul class="list-unstyled">'
// menu var is definded in the settings.js!
$(document).ready(function() {
    var pageName = location.pathname.split("/").slice(-1).join();
	if(pageName == '') pageName = 'index.html';
    console.log(pageName);
    
    for(key in menu) {
        if (typeof menu[key] != "object") {
            if(menu[key] == pageName)
                navBarContent+= MenuItem(key, menu[key], true);                
            else
                navBarContent+= MenuItem(key, menu[key], false);
        }
        else { // if its a sub-menu
            // from https://www.w3schools.com/bootstrap4/bootstrap_navbar.asp            
            sectionEnd = `</ul></li>`;
            navBarContent+= SubMenu(key, null);
            for(subItem in menu[key]) {
                if(menu[key][subItem] == pageName)
                    navBarContent+= MenuItem(subItem, menu[key][subItem],true);
                else
                    navBarContent+= MenuItem(subItem, menu[key][subItem],false);
            }
            navBarContent += sectionEnd;
        }
    }
    navBarContent += '</ul>';    
    $( "#navmenuinsert" ).html(navBarContent);
});
