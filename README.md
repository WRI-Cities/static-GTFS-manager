# static-GTFS-manager
![GTFS Manager logo](https://github.com/WRI-Cities/static-GTFS-manager/raw/master/extra_files/GTFS.png)  

![Screenshot](https://github.com/WRI-Cities/static-GTFS-manager/raw/master/extra_files/gtfs-routes-screenshot.png)  


A browser-based user interface for creating, editing, exporting of static GTFS (General Transit Feed Specification Reference) feeds for a public transit authority.

**Development Status** : V 1.4.2 is ready, open for Beta Testing. And Windows binary is available too now. See [Releases page](https://github.com/WRI-Cities/static-GTFS-manager/releases/).

This project is the result of a collaboration between WRI ([World Resources Institute](http://wri-india.org/)) and KMRL ([Kochi Metro Rail Limited](http://kochimetro.org)). 

Initially developed for use by KMRL, the source code has been open-sourced so it can grow and get better with community inputs and help for creating GTFS feeds for other transit agencies too.

The GTFS data pre-loaded in the program is of Kochi Metro, Kerala, India which on March 16, 2018 became India's first transit agency to release its schedules data in the global standard static GTFS format as free and open data. 

See the [KMRL open data portal](https://kochimetro.org/open-data/) and some news articles: [1](http://www.newindianexpress.com/cities/kochi/2018/mar/17/kochi-metro-adopts-open-data-system-to-improve-access-to-its-services-1788342.html), [2](http://indianexpress.com/article/india/kochi-metro-throws-open-transit-data-to-public-on-the-lines-of-london-new-york-5100381/), [3](http://www.thehindu.com/news/cities/Kochi/open-data-to-improve-commuter-experience/article23275844.ece), [4](http://www.thehindu.com/news/cities/Kochi/kmrl-moves-a-step-ahead-to-open-up-transit-data/article23247617.ece).

This program adheres to the static GTFS (General Transit Feed Specification Reference) open transit data specs as published by Google Transit here: <https://developers.google.com/transit/gtfs/reference/>  
It also implements a [GTFS extension for translations](https://developers.google.com/transit/gtfs/reference/gtfs-extensions#translations) of stops and routes names to facilitate multilingual use of the data.

Lead programmer up till April 2018: [Nikhil VJ](https://answerquest.github.io) from Pune, India.


## Run on your system

### Windows standalone executable, Double-click and Go!
1. Download the latest `GTFS-Manager-Windows-vxxx.zip` from [Releases section](https://github.com/WRI-Cities/static-GTFS-manager/releases/) and unzip it on your system. Get into the folder created.

2. Double-click on the shortcut "GTFS-Manager".

3. That's it, that should start the program! A dos box should open up giving status messages, and in a few seconds a new tab should open in your system's default web browser with the program loaded.

4. There will probably be a Windows Firewall popup. Just click cancel.. this program doesn't intend to do anything over the internet apart from loading the web map background tiles.

#### Notes on Windows standalone  executable  
- In case the browser that opened is Internet Explorer, please copy-paste the URL to Chrome or similar modern browser. There may be some compatibility issues with IE.

- **Closing** : Simply closing the dos-box and the browser tab should be enough. You can also press Ctrl+C in the dos box, but it acts on it only when there is a change in page at the browser end (will process the command only when an API call is activated).

- We need **feedback** of how the program runs on different Windows systems. If you experience problems, please file an issue with details of your OS (windows version, 64bit or 32bit etc) and if possible give the output that came on the dos-box. (unlikely as it'll probably close itself when an error happens.. try opening command-prompt in the folder and run `dist\GTFSManager\GTFSManager.exe` )

- This works on **64-bit** Windows systems, Win7 and above. Support for older 32-bit versions isn't provided yet; we could give it a shot if there are enough requests, or we encourage a developer working on python3 from a 32-bit windows OS to try compiling it (as a binary for that version needs to be created from that OS). See [issue #63](https://github.com/WRI-Cities/static-GTFS-manager/issues/) for details.

- Want to **Change the Password** ? [Find out how](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Changing-the-password#changing-the-password-on-windows).

### On Ubuntu / Linux OS
See on the project wiki: [Running on Ubuntu OS](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Running-on-Ubuntu-OS)

### Running with Python3 on a Windows OS
See on the project wiki: [Running on Windows OS with Python 3](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Running-on-Windows-OS-with-Python-3)

----

## Changing the password
See on the project wiki: [Changind the password](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Changing-the-password)

----

## GTFS feed Export
The end output of this program is a gtfs.zip file having your transit agency's static GTFS data. See the **Commit and Export GTFS** section on the main page for the same.

## GTFS feed Import
From the main page, you can import a different GTFS feed in a .zip file. Structure of a feed zip must be as per GTFS specs and standard practices:  
```
gtfs.zip
 ˪ stops.txt
 ˪ routes.txt
 ˪ trips.txt
 ˪ stop_times.txt
 ˪ ...
 ```
Please keep all your files with lowercase `.txt` extension, and keep them up at root level in the zip archive, not inside any folders.

Kindly [validate](http://gtfsfeedvalidator.transitscreen.com) your GTFS zip prior to importing so you know in advance if there are any issues with the feed. And no worries, this tool is made FOR fixing bad feeds, the system will import whatever you give it. If you need to delete a lot of junk data in the feed, the Misc > Maintenance section will be your favorite haunt.

In the import process, the program creates a backup ZIP of the current data and then imports your data into its database. You can see the backup listed later on under Past Commits section on the home page.

----

## Improvements, Feedback
Please see the [Issues](https://github.com/WRI-Cities/static-GTFS-manager/issues) section for seeing existing program improvement efforts, feedback, questions. Please make sure you search through all the issues ([click here](https://github.com/WRI-Cities/static-GTFS-manager/issues?utf8=%E2%9C%93&q=) for full list) before filing a new one : it might already be covered in another.

**Invitation**: This project invites active participation from professionals in the coding and GTFS fields to join in to take it forward. Please feel free to fork, write your fixes/enhancements and create a pull request.


## Known limitations
- As of v1.4.2, with very large datasets, particularly where stop_times table has over a million lines, the API calls can get very slow and very complicated queries might even cause a crash. We have to move to some other DB management system to improve performance here. See the issues section for [a discussion on databases](https://github.com/WRI-Cities/static-GTFS-manager/issues/4).
- Schedules with frequencies currently not supported, this is desired as for some systems their schedules may be frequency-based rather than fixed times, plus using frequency greatly reduces the database/feed size by removing repetitive entries from stop_times table.
- Shapes are only accepted in .geojson format. The first entry in the file will be picked up and others will be discared.


## Technical Overview
Moved to Wiki: [Technical Overview](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Technical-Overview)

----

## Gratitude for open source solutions
This project stands on the shoulders of several solutions that have been shared open source. Sharing mentions below.

#### Open source libraries used on Javascript side : 
- Leaflet.js for plotting information on maps
- Tabulator.js for handling data in tabular form at the front-end
- Bootstrap for general page design
- Jquery and Jquery UI for UI components like accordions, event handlers and file upload.
- Papa.parse for CSV parsing
- Chosen.js for search-as-you-type dropdowns

#### Open source libraries used on Python side : 
- Tornado for simple web server with asynchronous callback
- TinyDB for portable JSON database
- Pandas for a lot of data heavylifting
- Many python modules for various operations: json, os, time, datetime, xmltodict, collections, zipfile, webbrowser, pycrptodomex, shutil, pathlib, math, json.decoder

#### Many snippets
In addition to this, there are several code snippets used throughout the program that were found from online forums like stackoverflow and on various tech blogs. The links to the sources of the snippets are mentioned in comments in the program. Here is a shoutout to all the contributors on these forums and blogs : ***Thank You!***

#### Personal mentions
Big thanks to Srinivas from Hyderabad, India for connecting folks together and sharing guidance, and to Devdatta from Pune, India for a sharing a very simple [working example](https://github.com/devdattaT/sampleTornadoApp) to learn about Tornado web server serving asynchronous requests.



