# static-GTFS-manager
A browser-based user interface for creating, editing, exporting of static GTFS (General Transit Feed Specification Reference) schedules management for a public transit authority.

**Note: Program is still in development.**

This project is the result of a collaboration between WRI ([World Resources Institute](http://wri-india.org/)) and KMRL ([Kochi Metro Rail Limited](http://kochimetro.org)). 

Initially developed for use by KMRL, the source code has been open-sourced so it can grow and get better with community inputs and help for creating GTFS feeds for other transit agencies too.

The GTFS data pre-loaded in the program is of Kochi Metro, Kerala, India which on March 16, 2018 became India's first transit agency to release its schedules data in the global standard static GTFS format as free and open data. 

See the [KMRL open data portal](https://kochimetro.org/open-data/) and some news articles: [1](http://www.newindianexpress.com/cities/kochi/2018/mar/17/kochi-metro-adopts-open-data-system-to-improve-access-to-its-services-1788342.html), [2](http://indianexpress.com/article/india/kochi-metro-throws-open-transit-data-to-public-on-the-lines-of-london-new-york-5100381/), [3](http://www.thehindu.com/news/cities/Kochi/open-data-to-improve-commuter-experience/article23275844.ece), [4](http://www.thehindu.com/news/cities/Kochi/kmrl-moves-a-step-ahead-to-open-up-transit-data/article23247617.ece).

This program adheres to the static GTFS (General Transit Feed Specification Reference) open transit data specs as published by Google Transit here: <https://developers.google.com/transit/gtfs/reference/>  
It also implements a [GTFS extension for translations](https://developers.google.com/transit/gtfs/reference/gtfs-extensions#translations) of stops and routes names to facilitate multilingual use of the data.

Lead programmer up till April 2018: [Nikhil VJ](https://answerquest.github.io) from Pune, India.


## Run on your system
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

#### On Windows OS
To do! But Anaconda package is a good place to start, and similar steps to be followed. *Coming soon: a binary .exe to make the program stand-alone.*


## Improvements, Feedback
Please see the [Issues](https://github.com/WRI-Cities/static-GTFS-manager/issues) section for seeing existing program improvement efforts, feedback, questions. Please make sure you search through all the issues (click here for full list) before filing a new one : it might already be covered in another.

**Invitation**: This project invites active participation from professionals in the coding and GTFS fields to join in to take it forward. Please feel free to fork, write your fixes/enhancements and create a pull request.
