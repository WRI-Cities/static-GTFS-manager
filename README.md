# static-GTFS-manager
![GTFS Manager logo](https://github.com/WRI-Cities/static-GTFS-manager/raw/master/extra_files/GTFS.png)  

![Screenshot](https://github.com/WRI-Cities/static-GTFS-manager/raw/master/extra_files/gtfs-routes-screenshot.png)  

A browser-based user interface for creating, editing, exporting of static GTFS (General Transit Feed Specification Reference) feeds for a public transit authority.

**Development Status** : V 3.4.1  
Download from [Releases page](https://github.com/WRI-Cities/static-GTFS-manager/releases/).  
- Windows binary is available in the repo itself, just double-click GTFSManager.exe to start the program.
- Mac, Ubuntu users can run by first installing docker, then double-clicking two scripts. See [Running with Docker on any OS](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Running-with-Docker-on-any-OS)


## Intro
This project is the result of a collaboration between WRI ([World Resources Institute](http://wri-india.org/)) and KMRL ([Kochi Metro Rail Limited](http://kochimetro.org)). 

Initially developed for use by KMRL, the source code has been open-sourced so it can grow and get better with community inputs and help for creating GTFS feeds for other transit agencies too.

The GTFS data pre-loaded in the program is of Kochi Metro, Kerala, India which on March 16, 2018 became India's first transit agency to release its schedules data in the global standard static GTFS format as free and open data. 

See the [KMRL open data portal](https://kochimetro.org/open-data/) and some news articles: [1](http://www.newindianexpress.com/cities/kochi/2018/mar/17/kochi-metro-adopts-open-data-system-to-improve-access-to-its-services-1788342.html), [2](http://indianexpress.com/article/india/kochi-metro-throws-open-transit-data-to-public-on-the-lines-of-london-new-york-5100381/), [3](http://www.thehindu.com/news/cities/Kochi/open-data-to-improve-commuter-experience/article23275844.ece), [4](http://www.thehindu.com/news/cities/Kochi/kmrl-moves-a-step-ahead-to-open-up-transit-data/article23247617.ece).

This program adheres to the static GTFS (General Transit Feed Specification Reference) open transit data specs as published by Google Transit here: <https://developers.google.com/transit/gtfs/reference/>  
It also implements a [GTFS extension for translations](https://developers.google.com/transit/gtfs/reference/gtfs-extensions#translations) of stops and routes names to facilitate multilingual use of the data.

Lead programmer up till November 2018: [Nikhil VJ](https://answerquest.github.io) from Pune, India.

See this and many more GTFS related resources listed on **[Awesome Transit](https://github.com/CUTR-at-USF/awesome-transit#gtfs-tools)**, a one-stop community listing for all things GTFS.

## Demo Videos
- [GTFS Manager Runthrough video](https://www.youtube.com/embed/n8BuDM51QyU?rel=0&autoplay=1)
- [Demonstration of XML Import feature](https://www.youtube.com/watch?v=_JYVtm-6iJg)
- [Demonstration of HMRL's CSV Import feature](https://www.youtube.com/watch?v=MqEsAtcNieo)

## Run on your system

Psst! Password is `program`.

### Windows standalone executable, Double-click and Go!

1. (Updated, Oct 2018) Download the repo, unzip, and double-click GTFSManager.exe in the main program folder. It'll have an icon.

2. That's it, that should start the program! A dos box should open up giving console messages, and in a few seconds a new tab should open in your system's default web browser with the program loaded.

3. There will probably be a Windows Firewall popup. Click OK or cancel.. this program doesn't do any to-and-fro communication over internet, that's just a default question that comes up when a server is activated. (In our case we're creating a portable web server for the front-end and back-end partd of the program to communicate). It does need internet for loading the background tiles on web maps, but other than that the program can run without internet connection.

4. More notes on this, including some troubleshooting and watchouts, **[on the wiki](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Standalone-Windows-Executable)**.


### On Ubuntu / Linux OS, on Python 3
See on the project wiki: [Running on Ubuntu OS](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Running-on-Ubuntu-OS)

### Running on Windows on Python 3
See on the project wiki: [Running on Windows OS with Python 3](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Running-on-Windows-OS-with-Python-3)

### Running in Docker on all OS's (including Mac)
See [Running with Docker on any OS](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Running-with-Docker-on-any-OS)
----

## Changing the password
See on the project wiki: [Changind the password](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Changing-the-password)

----

## GTFS feed Export
The end output of this program is a gtfs.zip file having your transit agency's static GTFS data. See the **Commit and Export GTFS** section on the main page for the same.

## GTFS feed Import
From the main page, you can import your GTFS feed in a .zip file. Structure of a feed zip must be as per [standard GTFS specs](https://github.com/google/transit/blob/master/gtfs/spec/en/reference.md).  
```
gtfs.zip
 ˪ stops.txt
 ˪ routes.txt
 ˪ trips.txt
 ˪ stop_times.txt
 ˪ ...
 ```
Some requirements, *s'il vous plait !*  
1. Keep all your files with lowercase `.txt` extension
2. Keep them up at root level in the zip archive, not inside any folders.
3. The table in `stop_times.txt` **must be sorted by `trip_id`** (you can open it in LibreOffice, or rename as .csv and open in Excel) before importing.
4. Similarly, the table in `shapes.txt` **must be sorted by `shape_id`** before importing.

Kindly [validate](http://gtfsfeedvalidator.transitscreen.com) your GTFS zip prior to importing so you know in advance if there are any issues with the feed. And no worries, this tool is made FOR fixing bad feeds, the system will import whatever you give it. If you need to delete a lot of junk data in the feed, the Tools > Delete ID section will be your favorite place to be.

In the import process, the program creates a backup ZIP of the current data and then imports your data into its database. You can see the backup listed later on under Past Commits section on the home page.

----

## Improvements, Feedback
Please see the [Issues](https://github.com/WRI-Cities/static-GTFS-manager/issues) section for seeing existing program improvement efforts, feedback, questions. Please make sure you search through all the issues ([click here](https://github.com/WRI-Cities/static-GTFS-manager/issues?utf8=%E2%9C%93&q=) for full list) before filing a new one : it might already be covered in another.

**Invitation**: This project invites active participation from professionals in the coding and GTFS fields to join in to take it forward. Please feel free to fork, write your fixes/enhancements and submit a pull request.


## Known limitations
- Shapes are only accepted in .geojson format. The first entry in the file will be picked up and others will be discarded.
- Extra files that are optional : If you've imported it, it'll be there in the DB, and will be there in the feed when you export again. Code contributions welcome in that regard.

## Technical Overview
Moved to Wiki: [Technical Overview](https://github.com/WRI-Cities/static-GTFS-manager/wiki/Technical-Overview)

----

## Gratitude for open source solutions
This project stands on the shoulders of several solutions that have been shared open source. Sharing mentions below.

#### Open source libraries used on Javascript side : 
- Leaflet.js and its various plugins for plotting information on maps and keeping things interactive
- Tabulator.js for handling data in tabular form at the front-end
- Bootstrap for general page design
- Jquery and Jquery UI for UI components like accordions, event handlers and file upload.
- Papa.parse for CSV parsing
- Chosen.js for search-as-you-type dropdowns

#### Open source libraries used on Python side : 
- `tornado` for simple web server with asynchronous callback
- `pandas` for handling practically all the data to-and-fro, and for very efficient functions like unpivoting.
- HDF5 format support (`tables`) for enabling pandas to work with high compression and high read/write speed .h5 format files.
- `tinyDB` for portable JSON database
- `pycryptodomex` for providing password encryption without the hiccups
- Many python modules for various operations: json, os, time, datetime, xmltodict, collections, zipfile, webbrowser, pycrptodomex, shutil, pathlib, math, json.decoder

#### Many snippets
In addition to this, there are several code snippets used throughout the program that were found from online forums like [stackoverflow](http://stackoverflow.com) and on various tech blogs. The links to the sources of the snippets are mentioned in comments in the program files. Here is a shoutout to all the contributors on these forums and blogs : ***Thank You!***

#### Personal mentions
Big thanks to :  
- Srinivas from Hyderabad, India for connecting folks together and sharing guidance
- Devdatta from Pune, India for a sharing a very simple [working example](https://github.com/devdattaT/sampleTornadoApp) to learn about Tornado web server serving asynchronous requests
- Tony Laidig from the global GTFS community for helping build a docker image
- Sean Barbeau and other co-ordinators of the GTFS community for including this program on [Awesome Transit](https://github.com/CUTR-at-USF/awesome-transit#gtfs-tools) and giving encouragement and feedback on the GTFS forum.



