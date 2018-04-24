# static-GTFS-manager
A browser-based user interface for creating, editing, exporting of static GTFS (General Transit Feed Specification Reference) feeds for a public transit authority.

**Development Status** : V 1.4.0 is ready, open for Beta Testing.

This project is the result of a collaboration between WRI ([World Resources Institute](http://wri-india.org/)) and KMRL ([Kochi Metro Rail Limited](http://kochimetro.org)). 

Initially developed for use by KMRL, the source code has been open-sourced so it can grow and get better with community inputs and help for creating GTFS feeds for other transit agencies too.

The GTFS data pre-loaded in the program is of Kochi Metro, Kerala, India which on March 16, 2018 became India's first transit agency to release its schedules data in the global standard static GTFS format as free and open data. 

See the [KMRL open data portal](https://kochimetro.org/open-data/) and some news articles: [1](http://www.newindianexpress.com/cities/kochi/2018/mar/17/kochi-metro-adopts-open-data-system-to-improve-access-to-its-services-1788342.html), [2](http://indianexpress.com/article/india/kochi-metro-throws-open-transit-data-to-public-on-the-lines-of-london-new-york-5100381/), [3](http://www.thehindu.com/news/cities/Kochi/open-data-to-improve-commuter-experience/article23275844.ece), [4](http://www.thehindu.com/news/cities/Kochi/kmrl-moves-a-step-ahead-to-open-up-transit-data/article23247617.ece).

This program adheres to the static GTFS (General Transit Feed Specification Reference) open transit data specs as published by Google Transit here: <https://developers.google.com/transit/gtfs/reference/>  
It also implements a [GTFS extension for translations](https://developers.google.com/transit/gtfs/reference/gtfs-extensions#translations) of stops and routes names to facilitate multilingual use of the data.

Lead programmer up till April 2018: [Nikhil VJ](https://answerquest.github.io) from Pune, India.


## Run on your system
#### About the password
You need to type in a password at the top right corner for anything that involves edit / import / export of database. Reading is free.  
This feature was put in to share a demo version of the app online and keep off spam-bots. And also for basic stranger-proofing, in case someone stumbles across the tool over LAN or something. 

How to configure your own password:  
1. Run [utilities/encrypt.py](https://github.com/WRI-Cities/static-GTFS-manager/blob/master/utilities/encrypt.py) like so:  
`python3 encrypt.py "your-password"`  
2. It will generate a file for you named `rsa_key.bin`, which you have to put in the `pw` folder of this repo (replace the one already there) After that, it'll be your password that works.

If you don't want to bother with all that jazz, here's a hack: find the `decrypt` function in `GTFSserverfunction.py` and change it to:
```
def decrypt(password):
	return true
```
Then type in any junk text to make things happen. The check for *some* password being typed, though, is there on JS side in every page and every function, so that may be harder to script out.

#### On Ubuntu / Linux OS
1. Open Terminal (linux command prompt) and clone this repo to your side:  
`git clone https://github.com/WRI-Cities/static-GTFS-manager.git`

2.  Navigate into the folder created.  
`cd static-GTFS-manager`

3. Install the libraries requirements:  
`sudo pip3 install -r requirements.txt`

4. Run web_wrapper.py in python3:  
`python3 web_wrapper.py`

5. The program should load in a new web browser tab. You can now operate the program from your web browser. In case it doesn't load up, see the terminal for the URL, it is most likely `http://localhost:5000/` or so.

6. See the terminal for instructions and reporting of various processes. There are some recurring warnings which you can ignore, like `WARNING:tornado.access:404 GET /favicon.ico (::1) 1.35ms`

7. The program will keep running while you operate on the browser. To terminate the program, come back to the Terminal and press `Ctrl+C` or close the window.

8. Note: there is a password input box at top right corner. For any operation involving editing, import or export of data, the password should be typed in as a basic precaution against data tampering. The password can be accessed by reading the `web_wrapper.py` file. This is just a rudimentary precaution against unintended edits for now; it is NOT a security feature. Otherwise for browsing through the app and seeing info (ie, read operations), no password is required.


#### On Windows OS
Currently trying to build a standalone executable. To run the python3 program in windows, follow these steps:

1. Install MiniConda as per your OS and 32/64 bit: https://conda.io/miniconda.html . Choose the default options.. nothing special needed.
2. Open start menu > Anaconda.. > Anaconda Prompt
3. A command prompt (black dos box) will open. This is like the regular windows command prompt, but has the added functionality of having python commands working.
4. You'll be at some C:\xy path. Navigate to the folder where you have cloned/unzipped this repo. (oh, in case you haven't already.. you do need to download this program's repo! See the "Clone.." button around the top of the page.
5. Try running this command: `python web_wrapper.py` . You'll probably get an error saying a particular module is not found. We have to download and install some dependencies first.
6. Run these commands. You might be shown some things and asked to confirm. Press y and Enter when its asks.
```
conda install tornado
conda install pandas
pip install xmltodict
pip install tinydb
pip install pycryptodome
```
7. Some explanation : `conda` and `pip` are both standard package managers in miniconda and python. They download these packages/modules from official sources. The packages that aren't in conda's official listing need to be downloaded by pip. I had tried using pip for all but some chain-dependencies made conda necesary for the first two.
8. Once you are done, run `python web_wrapper.exe`. You should see lines like:
```
static GTFS Manager
Fork it on Github: https://github.com/WRI-Cities/static-GTFS-manager/
Starting up the program, please wait...

Loaded dependences, starting static GTFS Manager program.
Open http://localhost:5000 in your Browser if you don't see it opening automatically within 5 seconds.
```
9. You might get a prompt from Windows Firewall. You can click Cancel or OK, it won't make any difference at your end. But if you want this program to be accessed by other machines on your LAN or WiFi network, then choose the appropriate options and proceed.
10. A new tab should open in your web browser automatically, but in case it doesn't, please browse to the URL given in the command prompt output.
11. The program now runs like a website in your browser. Note that this program is best seen from Chrome browser.
12. To exit, you can simply close your browser tabs and close the command prompt box. Pressing Ctrl+C doesn't work immediately.. you need to perform some action in the browser like navigating to a different page.


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

Kindly validate your GTFS zip prior to importing.

In the import process, the program creates a backup ZIP of the current data and then imports your data into its database. You can see the backup listed later on under Past Commits section on the home page.



## Improvements, Feedback
Please see the [Issues](https://github.com/WRI-Cities/static-GTFS-manager/issues) section for seeing existing program improvement efforts, feedback, questions. Please make sure you search through all the issues ([click here](https://github.com/WRI-Cities/static-GTFS-manager/issues?utf8=%E2%9C%93&q=) for full list) before filing a new one : it might already be covered in another.

**Invitation**: This project invites active participation from professionals in the coding and GTFS fields to join in to take it forward. Please feel free to fork, write your fixes/enhancements and create a pull request.

## Program technical info
Recommended browser to use : Chrome or Chromium.

The core program is a Python3 script in `web_wrapper.py`. It launches a simple web server via `Tornado` module, and waits for asynchronous GET and POST requests.

These requests are made by the javascript in front-end HTML files as they are loaded in the browser and user navigates the program (which is like a typical website). The javascript makes GET or POST calls to the API, and gets data as callback to show to user.

## Gratitude for open source solutions
This project stands on the shoulders of several solutions that have been shared open source. Sharing mentions below.

#### Open source libraries used on Javascript side : 
- Leaflet.js for maps
- Tabulator.js for tables
- Bootstrap for general page design
- Jquery and Jquery UI for UI components like autocomplete, event handlers and file upload.
- Papa.parse for CSV parsing
- Chosen.js for search-as-you-type dropdowns

#### Open source libraries used on Python side : 
- Tornado for web server with asynchronous callback
- TinyDB for portable JSON database
- Many python modules for various operations: json, os, time, datetime, xmltodict, csv, pandas, collections, zipfile, webbrowser, pycrptodome, shutil, pathlib, math, json.decoder

#### Many snippets
In addition to this, there are several code snippets used throughout the program that were found from online forums like stackoverflow and on various tech blogs. The links to the sources of the snippets are mentioned in comments in the program. Here is a shoutout to all the contributors on these forums and blogs : ***Thank You!***

#### Personal mentions
Big thanks to Srinivas from Hyderabad, India for connecting folks together and sharing guidance, and to Devdatta from Pune, India for a sharing a very simple [working example](https://github.com/devdattaT/sampleTornadoApp) to learn about Tornado web server serving asynchronous requests.

## Things to watch out for

#### Note for larger datasets use
With larger GTFS datasets, the python program can take time to process things and send a callback. So please be patient on the browser end after clicking a button here or there. This is especially true for the Schedules page where some deep trawling through the database is involved. Also, presently the database json file can be of large size in lower 100s of MBs for large datasets that have 1000s of trips. So please keep sufficient disk space available. Suggestions are invited for database optimization, while keeping key requirements in consideration. See the issues section for a discussion on which database to use.

#### Known limitations
- Schedules with frequencies currently not supported, this is desired as for some systems their schedules may be frequency-based rather than fixed times, plus using frequency greatly reduces the database/feed size by removing repetitive entries from stop_times table.
- Shapes are only accepted in .geojson format. The first entry in the file will be picked up and others will be discared.
- Schedules page: When creating new trips, you have to manually type in some dependency parameters like service_id. These need to be made available via drop-down. WIP for next release.
