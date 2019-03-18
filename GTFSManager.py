print('\n\nstatic GTFS Manager')
print('Fork it on Github: https://github.com/WRI-Cities/static-GTFS-manager/')
print('Starting up the program, loading dependencies, please wait...\n\n')

import tornado.web
import tornado.ioloop
import json
import os
import time, datetime

import xmltodict
import pandas as pd
from collections import OrderedDict
import zipfile, zlib
from tinydb import TinyDB, Query
from tinydb.operations import delete
import webbrowser
from Cryptodome.PublicKey import RSA #uses pycryptodomex package.. disambiguates from pycrypto, pycryptodome
import shutil # used in fareChartUpload to fix header if changed
import pathlib
from math import sin, cos, sqrt, atan2, radians # for lat-long distance calculations
# import requests # nope, not needed for now
from json.decoder import JSONDecodeError # used to catch corrupted DB file when tinyDB loads it.
import signal, sys # for catching Ctrl+C and exiting gracefully.
import gc # garbage collector, from https://stackoverflow.com/a/1316793/4355695
import csv
import numpy as np
import io # used in hyd csv import
import requests, platform # used to log user stats

# setting constants
root = os.path.dirname(__file__) # needed for tornado
uploadFolder = os.path.join(root,'uploads/')
xmlFolder = os.path.join(root,'xml_related/')
logFolder = os.path.join(root,'logs/')
configFolder = os.path.join(root,'config/')
dbFolder = os.path.join(root,'db/') # 12.5.18 new pandas DB storage
exportFolder = os.path.join(root,'export/') # 4.9.18 putting exports here now

sequenceDBfile = os.path.join(root,'db/sequence.json')
passwordFile = os.path.join(root,'pw/rsa_key.bin')
chunkRulesFile = 'chunkRules.json'
configFile = 'config.json'
thisURL = ''

debugMode = False # using this flag at various places to do or not do things based on whether we're in development or production

requiredFeeds = ['agency.txt','calendar.txt','stops.txt','routes.txt','trips.txt','stop_times.txt']
optionalFeeds = ['calendar_dates.txt','fare_attributes.txt','fare_rules.txt','shapes.txt','frequencies.txt','transfers.txt','feed_info.txt']
# for checking imported ZIP against
# to do: don't make this a HARD requirement. Simply logmessage about it.

# load parameters from config folder
with open(configFolder + chunkRulesFile) as f:
	chunkRules = json.load(f)
with open(configFolder + configFile) as f:
	configRules = json.load(f)

# create folders if they don't exist
for folder in [uploadFolder, xmlFolder, logFolder, configFolder, dbFolder, exportFolder]:
	if not os.path.exists(folder):
		os.makedirs(folder)


# importing GTFSserverfunctions.py, embedding it inline to avoid re-declarations etc
exec(open(os.path.join(root,"GTFSserverfunctions.py"), encoding='utf8').read())
exec(open(os.path.join(root,"xml2GTFSfunction.py"), encoding='utf8').read())
exec(open(os.path.join(root,"hydCSV2GTFS.py"), encoding='utf8').read())

logmessage('Loaded dependencies, starting static GTFS Manager program.')

'''
# Tornado API functions template:
class APIHandler(tornado.web.RequestHandler):
	def get(self):
		#get the Argument that User had passed as name in the get request
		userInput=self.get_argument('name')
		welcomeString=sayHello(userInput)
		#return this as JSON
		self.write(json.dumps(welcomeString))

	def post(self):
		user = self.get_argument("username")
		passwd = self.get_argument("password")
		time.sleep(10)
		self.write("Your username is %s and password is %s" % (user, passwd))
'''

class allStops(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nallStops GET call')
		
		allStopsJson = readTableDB('stops').to_json(orient='records', force_ascii=False)
		self.write(allStopsJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("allStops GET call took {} seconds.".format(round(end-start,2)))
		
	def post(self):
		start = time.time()
		logmessage('\nallStops POST call')
		pw=self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )

		if replaceTableDB('stops', data): #replaceTableDB(tablename, data)
			self.write('Saved stops data to DB.')
		else:
			self.set_status(400)
			self.write("Error: Could not save to DB.")
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("allStops POST call took {} seconds.".format(round(end-start,2)))

	def set_default_headers(self):
		self.set_header("Access-Control-Allow-Origin", "*")
		self.set_header("Access-Control-Allow-Headers", "x-requested-with")
		self.set_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

	def options(self):
		# no body
		self.set_status(204)
		self.finish()


class allStopsKeyed(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nallStopsKeyed GET call')
		stopsDF = readTableDB('stops')
		# putting in a check for empty df, because set_index() errors out with empty df.
		if len(stopsDF):
			keyedStopsJson = stopsDF.set_index('stop_id').to_json(orient='index', force_ascii=False)
			# change index to stop_id and make json keyed by index
		else : keyedStopsJson = '{}'
		
		self.write(keyedStopsJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("allStopsKeyed GET call took {} seconds.".format(round(end-start,2)))

		
class routes(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nroutes GET call')
		
		allRoutesJson = readTableDB('routes').to_json(orient='records', force_ascii=False)
		self.write(allRoutesJson)
		end = time.time()
		logmessage("routes GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start = time.time()
		logmessage('\nroutes POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
		# writing back to db now
		if replaceTableDB('routes', data): #replaceTableDB(tablename, data)
			self.write('Saved routes data to DB')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("routes POST call took {} seconds.".format(round(end-start,2)))

class fareAttributes(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nfareAttributes GET call')
		fareAttributesJson = readTableDB('fare_attributes').to_json(orient='records', force_ascii=False)

		self.write(fareAttributesJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("fareAttributes GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/fareAttributes
		start = time.time()
		logmessage('\nfareAttributes POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
	
		# writing back to db
		if replaceTableDB('fare_attributes', data): #replaceTableDB(tablename, data)
			self.write('Saved Fare Attributes data to DB.')
		else:
			self.set_status(400)
			self.write("Error: could not save to DB.")
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("API/fareAttributes POST call took {} seconds.".format(round(end-start,2)))

class fareRules(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nfareRules GET call')
		fareRulesSimpleJson = readTableDB('fare_rules').to_json(orient='records', force_ascii=False)

		self.write(fareRulesSimpleJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("fareRules GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/fareRules
		start = time.time()
		logmessage('\nfareRules POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
	
		# writing back to db
		if replaceTableDB('fare_rules', data): #replaceTableDB(tablename, data)
			self.write('Saved Fare Rules data to DB.')
		else:
			self.set_status(400)
			self.write("Error: could not save to DB.")
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("API/fareRules POST call took {} seconds.".format(round(end-start,2)))

class fareRulesPivoted(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nfareRulesPivoted GET call')
		fareRulesDf = readTableDB('fare_rules')
		# do pivoting operation only if there is data. Else send a blank array. 
		# Solves part of https://github.com/WRI-Cities/static-GTFS-manager/issues/35
		if len(fareRulesDf):
			df = fareRulesDf.drop_duplicates()
			# skipping duplicate entries if any, as pivoting errors out if there are duplicates.
			fareRulesPivotedJson = df.pivot(index='origin_id',\
				columns='destination_id', values='fare_id')\
				.reset_index()\
				.rename(columns={'origin_id':'zone_id'})\
				.to_json(orient='records', force_ascii=False)
		else:
			fareRulesPivotedJson = '[]'

		# multiple pandas ops..
		# .pivot() : pivoting. Keep origin as vertical axis, destination as horizontal axis, and fill the 2D matrix with values from fare_id column.
		# .reset_index() : move the index in as a column so that we can export it to dict further along. from https://stackoverflow.com/a/20461206/4355695
		# .rename() : rename the index column which we've moved in. Proper name is zone_id.
		# .to_dict(orient='records', into=OrderedDict) : convert to flat list of dicts. from https://pandas.pydata.org/pandas-docs/stable/generated/pandas.DataFrame.to_dict.html

		# to do: if we get a route or two, then order these by the route's sequence.

		self.write(fareRulesPivotedJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("fareRulesPivoted GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/fareRulesPivoted?pw=${pw}
		start = time.time()
		logmessage('\nfareRulesPivoted POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
		
		# need to unpivot this. We basically need to do the exact same steps as the get(self) function did, in reverse.
		df = pd.DataFrame(data)
		
		fareRulesArray = pd.melt(df, id_vars=['zone_id'],\
			var_name='destination_id',value_name='fare_id')\
			.rename(columns={'zone_id': 'origin_id'})\
			.replace('', pd.np.nan)\
			.dropna()\
			.sort_values(by=['origin_id','destination_id'])\
			.to_dict('records',into=OrderedDict)
		
		# pandas: chained many commands together. explaining..
		# .melt(df.. : that's the UNPIVOT command. id_vars: columns to keep. Everthing else "melts" down. var_name: new column name of the remaining cols serialized into one.
		# .rename(.. : renaming the zone_id ('from' station) to origin_id
		# .replace(.. At frontend some cells might have been set to blank. That comes thru as empty strings instead of null/NaN values. This replaces all empty strings with NaN, so they can be dropped subsequently. From https://stackoverflow.com/a/29314880/4355695
		# .dropna() : drop all entries having null/None values. Example ALVA to ALVA has nothing; drop it.
		# sort_values(.. : sort the table by col1 then col2
		# to_dict(.. : output as an OrderedDict.

		# writing back to db
		if replaceTableDB('fare_rules', fareRulesArray):
			 self.write('Saved Fare Rules data to DB.')
		else:
			self.set_status(400)
			self.write("Error: could not save to DB.")
		
		end = time.time()
		logmessage("API/fareAttributes POST call took {} seconds.".format(round(end-start,2)))


class agency(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nagency GET call')
		agencyJson = readTableDB('agency').to_json(orient='records', force_ascii=False)
		self.write(agencyJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("agency GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start = time.time()
		logmessage('\nagency POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
	
		if replaceTableDB('agency', data): #replaceTableDB(tablename, data)
			self.write('Saved Agency data to DB.')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("saveAgency POST call took {} seconds.".format(round(end-start,2)))


class sequence(tornado.web.RequestHandler):
	def get(self):
		# API/sequence?route=${route_id}
		start = time.time()
		logmessage('\nsequence GET call')
		route_id = self.get_argument('route',default='')

		if not len(route_id):
			self.set_status(400)
			self.write("Error: invalid route.")
			return 

		#to do: first check in sequence db. If not found there, then for first time, scan trips and stop_times to load sequence. And store that sequence in sequence db so that next time we fetch from there.

		sequence = sequenceReadDB(sequenceDBfile, route_id)
		# read sequence db and return sequence array. If not found in db, return false.

		message = '<span class="alert alert-success">Loaded default sequence for this route from DB.</span>'

		if not sequence:
			logmessage('sequence not found in sequence DB file, so extracting from gtfs tables instead.')
			# Picking the first trip instance for each direction of the route.
			sequence = extractSequencefromGTFS(route_id)

			if sequence == [ [], [] ] :
				message = '<span class="alert alert-info">This seems to be a new route. Please create a sequence below and save to DB.</span>'
			else: 
				message = '<span class="alert alert-warning">Loaded a computed sequence from existing trips. Please finalize and save to DB.</span>'
			
			# we have computed a sequence from the first existing trip's entry in trips and stop_times tables for that route (one sequence for each direction)
			# Passing it along. Let the user finalize it and consensually save it.
	
		# so either way, we now have a sequence array.
		
		returnJson = { 'data':sequence, 'message':message }
		self.write(json.dumps(returnJson))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("sequence GET call took {} seconds.".format(round(end-start,2)))

	#using same API endpoint, post request for saving.
	def post(self):
		# ${APIpath}sequence?pw=${pw}&route=${selected_route_id}&shape0=${chosenShape0}&shape1=${chosenShape1}
		start = time.time()
		logmessage('\nsequence POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		route_id = self.get_argument('route', default='')
		shape0 = self.get_argument('shape0', default='')
		shape1 = self.get_argument('shape1', default='')

		if not len(route_id):
			self.set_status(400)
			self.write("Error: invalid route.")
			return 
		
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )

		'''
		This is what the data would look like: [
			['ALVA','PNCU','CPPY','ATTK','MUTT','KLMT','CCUV','PDPM','EDAP','CGPP','PARV','JLSD','KALR','LSSE','MGRD'],
			['MACE','MGRD','LSSE','KALR','JLSD','PARV','CGPP','EDAP','PDPM','CCUV','KLMT','MUTT','ATTK','CPPY','PNCU','ALVA']
		];
		'''
		# to do: the shape string can be empty. Or one of the shapes might be there and the other might be an empty string. Handle it gracefully.
		# related to https://github.com/WRI-Cities/static-GTFS-manager/issues/35
		# and : https://github.com/WRI-Cities/static-GTFS-manager/issues/38
		shapes = [shape0, shape1]

		if sequenceSaveDB(sequenceDBfile, route_id, data, shapes):
			self.write('saved sequence to sequence db file.')
		else:
			self.set_status(400)
			self.write("Error, could not save to sequence db for some reason.")
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("API/sequence POST call took {} seconds.".format(round(end-start,2)))


class trips(tornado.web.RequestHandler):
	def get(self):
		# API/trips?route=${route_id}
		start = time.time()
		logmessage('\ntrips GET call')
		route_id = self.get_argument('route', default='')
		if not len(route_id):
			self.set_status(400)
			self.write("Error: invalid route.")
			return 

		tripsArray = readTableDB('trips', key='route_id', value=route_id).to_dict(orient='records')

		# also read sequence for that route and send.
		sequence = sequenceFull(sequenceDBfile, route_id)		
		# if there is no sequence saved yet, sequence=False which will be caught on JS side to inform the user and disable new trips creation.
		
		returnJson = {'trips':tripsArray, 'sequence':sequence }

		self.write(json.dumps(returnJson))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("trips GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start  = time.time() # time check, from https://stackoverflow.com/a/24878413/4355695
		# ${APIpath}trips?pw=${pw}&route=${route_id}
		logmessage('\ntrips POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		route_id = self.get_argument('route',default='')
		if not len(route_id) :
			self.set_status(400)
			self.write("Error: invalid route_id.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		tripsData = json.loads( self.request.body.decode('UTF-8') )

		# heres where all the action happens:
		result = replaceTableDB('trips', tripsData, key='route_id', value=route_id)
		
		if result:
			self.write('Saved trips data for route '+route_id)
		else:
			self.set_status(400)
			self.write("Some error happened.")
		
		end = time.time()
		logmessage("trips POST call took {} seconds.".format(round(end-start,2)))


class stopTimes(tornado.web.RequestHandler):
	def get(self):
		# API/stopTimes?trip=${trip_id}&route=${route_id}&direction=${direction_id}
		start = time.time()
		logmessage('\nstopTimes GET call')
		trip_id = self.get_argument('trip', default='')
		route_id = self.get_argument('route', default='')
		direction_id = int(self.get_argument('direction',default=0))
		returnMessage = ''

		if not ( len(trip_id) and len(route_id) ):
			self.set_status(400)
			self.write("Error: Invalid trip or route ID given.")
			return

		tripInTrips = readTableDB('trips', 'trip_id', trip_id)
		if not len(tripInTrips):
			self.set_status(400)
			self.write("Error: Please save this trip to DB in the Trips tab first.")
			return

		stoptimesDf = readTableDB('stop_times', 'trip_id', trip_id)
		# this will simply be empty if the trip doesn't exist yet

		stoptimesArray = stoptimesDf.to_dict(orient='records')

		if len(stoptimesArray):
			returnMessage = 'Loaded timings from stop_times table.'
			newFlag = False
		else:
			returnMessage = 'This trip is new. Loading default sequence, please fill in timings and save to DB.'
			newFlag = True

		returnJson = {'data':stoptimesArray, 'message':returnMessage, 'newFlag':newFlag }
		# let's send back not just the array but even the message to display.
		logmessage('returnJson.message:',returnJson['message'])

		self.write(json.dumps(returnJson))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("stopTimes GET call took {} seconds.".format(round(end-start,2)))


	def post(self):
		# ${APIpath}stopTimes?pw=${pw}&trip=${trip_id}
		start  = time.time() # time check, from https://stackoverflow.com/a/24878413/4355695
		logmessage('\nstopTimes POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		trip_id = self.get_argument('trip', default='')
		if not len(trip_id) :
			self.set_status(400)
			self.write("Error: invalid trip_id.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		timingsData = json.loads( self.request.body.decode('UTF-8') )

		# heres where all the action happens:
		result = replaceTableDB('stop_times', timingsData, key='trip_id', value=trip_id)
		
		if result:
			self.write('Changed timings data for trip '+trip_id)
		else:
			self.set_status(400)
			self.write("Some error happened.")
		
		end = time.time()
		logmessage("stopTimes POST call took {} seconds.".format(round(end-start,2)))


class routeIdList(tornado.web.RequestHandler):
	def get(self):
		# API/routeIdList
		start = time.time()
		logmessage('\nrouteIdList GET call')
		#routesArray = readTableDB('routes')
		#route_id_list = [ n['route_id'] for n in routesArray ]
		
		route_id_list = readColumnDB('routes','route_id')
		self.write(json.dumps(route_id_list))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("routeIdList GET call took {} seconds.".format(round(end-start,2)))


class tripIdList(tornado.web.RequestHandler):
	def get(self):
		# API/tripIdList
		start = time.time()
		logmessage('\ntripIdList GET call')
		trip_id_list = readColumnDB('trips','trip_id')

		self.write(json.dumps(trip_id_list))
		# db.close()
		end = time.time()
		logmessage("tripIdList GET call took {} seconds.".format(round(end-start,2)))


class calendar(tornado.web.RequestHandler):
	def get(self):
		# API/calendar?current=y
		start = time.time() # time check
		logmessage('\ncalendar GET call')
		current = self.get_argument('current',default='')

		if current.lower() == 'y':
			calendarJson = calendarCurrent().to_json(orient='records', force_ascii=False)
		else:
			calendarJson = readTableDB('calendar').to_json(orient='records', force_ascii=False)
		self.write(calendarJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("calendar GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/calendar?pw=${pw}
		start = time.time() # time check
		logmessage('\ncalendar POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		calendarData = json.loads( self.request.body.decode('UTF-8') )
		
		#csvwriter(calendarData,'calendar.txt')
		replaceTableDB('calendar', calendarData)

		self.write('Saved Calendar data to DB.')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("calendar POST call took {} seconds.".format(round(end-start,2)))


class serviceIds(tornado.web.RequestHandler):
	def get(self):
		# API/serviceIds
		start = time.time() # time check
		logmessage('\nserviceIds GET call')
		service_id_list = serviceIdsFunc()
		self.write(json.dumps(service_id_list))
		end = time.time()
		logmessage("serviceIds GET call took {} seconds.".format(round(end-start,2)))

class stats(tornado.web.RequestHandler):
	def get(self):
		# API/stats
		start = time.time()
		logmessage('\nstats GET call')
		stats = GTFSstats()

		self.write(json.dumps(stats))
		end = time.time()
		logmessage("stats GET call took {} seconds.".format( round(end-start, 2) ) )
		logUse('stats')


class gtfsImportZip(tornado.web.RequestHandler):
	def post(self):
		# API/gtfsImportZip?pw=${pw}
		start = time.time()
		logmessage('\ngtfsImportZip GET call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		zipname = uploadaFile( self.request.files['gtfsZipFile'][0] )
		if importGTFS(zipname):
			self.write(zipname)
		else:
			self.set_status(400)
			self.write("Error: invalid GTFS feed.")

		end = time.time()
		logmessage("gtfsImportZip POST call took {} seconds.".format( round(end-start,2) ))
		logUse('gtfsImportZip')

class commitExport(tornado.web.RequestHandler):
	def get(self):
		# API/commitExport?commit=${commit}
		start = time.time()
		logmessage('\ncommitExport GET call')
		commit = self.get_argument('commit', default='')
		if not len(commit):
			self.set_status(400)
			self.write("Error: invalid commit name.")
			return 
		commitFolder = exportFolder + '{:%Y-%m-%d-}'.format(datetime.datetime.now()) + commit + '/'
		finalmessage = exportGTFS(commitFolder) 
		# this is the main function. it's in GTFSserverfunctions.py
		
		self.write(finalmessage)
		end = time.time()
		logmessage("commitExport GET call took {} seconds.".format(round(end-start,2)))
		logUse('commitExport')


class pastCommits(tornado.web.RequestHandler):
	def get(self):
		# API/pastCommits
		start = time.time()
		logmessage('\npastCommits GET call')
		dirnames = []
		for root, dirs, files in os.walk(exportFolder):
			for folder in dirs:
				if os.path.isfile(exportFolder + folder + '/gtfs.zip'):
					dirnames.append(folder)
		if not len(dirnames):
			self.set_status(400)
			self.write("No past commits found.")
			return

		# reversing list, from 
		dirnames = dirnames[::-1]
		writeback = { "commits": dirnames }
		self.write(json.dumps(writeback))
		end = time.time()
		logmessage("pastCommits GET call took {} seconds.".format(round(end-start,2)))


class XMLUpload(tornado.web.RequestHandler):
	def post(self):
		# `${APIpath}XMLUpload?pw=${pw}&depot=${depot}`,
		start = time.time()
		logmessage('\nXMLUpload GET call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		# pass form file objects to uploadaFile funciton, get filenames in return
		weekdayXML = uploadaFile( self.request.files['weekdayXML'][0] )
		sundayXML = uploadaFile( self.request.files['sundayXML'][0] )
		
		depot = self.get_argument('depot', default='')
		if( depot == 'None' or depot == ''):
			depot = None
		
		diagnoseData = diagnoseXMLs(weekdayXML, sundayXML, depot)
		# function diagnoseXMLs returns dict having keys: report, weekdaySchedules, sundaySchedules

		if diagnoseData is False:
			self.set_status(400)
			self.write("Error: invalid xml(s).")
			return 

		returnJson = {'weekdayXML':weekdayXML, 'sundayXML':sundayXML }
		returnJson.update(diagnoseData)
		
		self.write(json.dumps(returnJson))
		end = time.time()
		logmessage("XMLUpload POST call took {} seconds.".format(round(end-start,2)))
		logUse('XMLUpload')

class XMLDiagnose(tornado.web.RequestHandler):
	def get(self):
		# `${APIpath}XMLDiagnose?weekdayXML=${weekdayXML}&sundayXML=${sundayXML}&depot=${depot}`
		start = time.time()
		logmessage('\nXMLDiagnose GET call')
		weekdayXML = self.get_argument('weekdayXML', default='')
		sundayXML = self.get_argument('sundayXML', default='')
		
		if not ( len(weekdayXML) and len(sundayXML) ):
			self.set_status(400)
			self.write("Error: invalid xml(s).")
			return 

		depot = self.get_argument('depot', default='')
		if( depot == 'None' or depot == ''):
			depot = None
		
		diagnoseData = diagnoseXMLs(weekdayXML, sundayXML, depot)
		# function diagnoseXMLs returns dict having keys: report, weekdaySchedules, sundaySchedules
		
		if diagnoseData is False:
			self.set_status(400)
			self.write("Error: invalid xml(s), diagnoseData function failed.")
			return 

		returnJson = {'weekdayXML':weekdayXML, 'sundayXML':sundayXML }
		returnJson.update(diagnoseData)
		
		self.write(json.dumps(returnJson))
		end = time.time()
		logmessage("XMLDiagnose GET call took {} seconds.".format(round(end-start,2)))
		logUse('XMLDiagnose')


class stations(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nstations GET call')
		stationsArray = pd.read_csv(xmlFolder + "stations.csv", na_filter=False).to_dict('records')
		self.write(json.dumps(stationsArray))
		end = time.time()
		logmessage("stations GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start = time.time()
		logmessage('\nstations POST call')
		stationsArray = pd.read_csv(xmlFolder + "stations.csv", na_filter=False).to_dict('records')
		
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		data = json.loads( self.request.body.decode('UTF-8') )
		
		if stationsArray == data :
			self.write('No changes to save.')
		else:
			csvwriter(data, xmlFolder + 'stations.csv')
			self.write('Saved changes to stations.csv.')
		
		end = time.time()
		logmessage("stations POST call took {} seconds.".format(round(end-start,2)))


class fareChartUpload(tornado.web.RequestHandler):
	def post(self):
		# `${APIpath}fareChartUpload?pw=${pw}`,
		start = time.time()
		logmessage('\nfareChartUpload POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		# pass form file objects to uploadaFile funciton, get filenames in return
		fareChart = uploadaFile( self.request.files['fareChart'][0] )
		
		# idiot-proofing : What if the only column header in the file 'Stations' is named to something else?
		# We can do a quick replace of first word before (,) in first line
		# from https://stackoverflow.com/a/14947384/4355695
		targetfile = uploadFolder + fareChart
		from_file = open(targetfile, encoding='utf8') 
		line = from_file.readline()
		lineArray = line.split(',')
		if lineArray[0] != 'Stations':
			logmessage('Fixing header on ' + fareChart + ' so the unpivot doesn\'t error out.')
			lineArray[0] = 'Stations'
			line = ','.join(lineArray)
			to_file = open(targetfile,mode="w",encoding='utf8')
			to_file.write(line)
			shutil.copyfileobj(from_file, to_file)
			to_file.close()
		from_file.close()

		try:
			fares_array = csvunpivot(uploadFolder + fareChart, ['Stations'], 'destination_id', 'fare_id', ['fare_id','Stations','destination_id']).to_dict('records')
	
		except:
			self.set_status(400)
			self.write("Error: invalid file.")
			return 

		fare_id_set = set()
		fare_id_set.update([ row['fare_id'] for row in fares_array ])
		
		# this set is having a null value, NaN as well.
		# need to lose the NaN man
		# from https://stackoverflow.com/a/37148508/4355695
		faresList = [x for x in fare_id_set if x==x]
		faresList.sort()

		logmessage(faresList)

		report = 'Loaded Fares Chart successfully.'

		returnJson = {'report':report, 'faresList':faresList }
		
		self.write(json.dumps(returnJson))
		end = time.time()
		logmessage("fareChartUpload POST call took {} seconds.".format(round(end-start,2)))
		logUse('fareChartUpload')

class xml2GTFS(tornado.web.RequestHandler):
	def post(self):
		# `${APIpath}xml2GTFS?pw=${pw}`
		start = time.time()
		logmessage('\nxml2GTFS POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		configdata = json.loads( self.request.body.decode('UTF-8') )
		logmessage(configdata)
		# and so it begins! Ack lets pass it to a function.
		returnMessage = xml2GTFSConvert(configdata)
		
		if not len(returnMessage):
			self.set_status(400)
			returnMessage = 'Import was unsuccessful, please debug on python side.'
		
		self.write(returnMessage)
		end = time.time()
		logmessage("xml2GTFS POST call took {} seconds.".format(round(end-start,2)))
		logUse('xml2GTFS')

class gtfsBlankSlate(tornado.web.RequestHandler):
	def get(self):
		# API/gtfsBlankSlate?pw=${pw}
		start = time.time()
		logmessage('\ngtfsBlankSlate GET call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		
		# take backup first, if we're not in debug mode.
		if not debugMode: 
			backupDB()
			finalmessage = '<font color=green size=6>&#10004;</font> Took a backup and cleaned out the DB.'
		else:
			finalmessage = '<font color=green size=6>&#10004;</font> Cleaned out the DB.'

		# outsourced purging DB to a function
		purgeDB()
		
		self.write(finalmessage)
		end = time.time()
		logmessage("gtfsBlankSlate GET call took {} seconds.".format(round(end-start,2)))
		logUse('gtfsBlankSlate')

class translations(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\ntranslations GET call')
		translationsJson = readTableDB('translations').to_json(orient='records', force_ascii=False)
		self.write(translationsJson)
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("translations GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/translations?pw=${pw}
		start = time.time() # time check
		logmessage('\ntranslations POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		translationsData = json.loads( self.request.body.decode('UTF-8') )
		
		replaceTableDB('translations', translationsData)

		self.write('Saved Translations data to DB.')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("translations POST call took {} seconds.".format(round(end-start,2)))

class shapesList(tornado.web.RequestHandler):
	def get(self):
		# API/shapesList?route=${route_id}
		start = time.time()
		logmessage('\nshapesList GET call')
		route_id = self.get_argument('route','')
		if not len(route_id):
			self.set_status(400)
			self.write("Error: invalid route.")
			return

		shapeIDsJson = {}
		df = readTableDB('trips', key='route_id', value=route_id)

		# since shape_id is an optional column, handle gracefully if column not present.
		if 'shape_id' not in df.columns:
			shapeIDsJson = { '0':[], '1':[] }
			self.write(json.dumps(shapeIDsJson))
			del df
			gc.collect()
			return

		# get shape_id's used by that route and direction. Gets rid of blanks and NaNs, gets unique list and outputs as list.
		shapeIDsJson['0'] = df[ (df.direction_id == '0') ].shape_id.replace('', pd.np.nan).dropna().unique().tolist()
		shapeIDsJson['1'] = df[ (df.direction_id == '1') ].shape_id.replace('', pd.np.nan).dropna().unique().tolist()

		self.write(json.dumps(shapeIDsJson))
		del df
		gc.collect()
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("shapesList GET call took {} seconds.".format(round(end-start,2)))

class shape(tornado.web.RequestHandler):
	def post(self):
		# ${APIpath}shape?pw=${pw}&route=${route_id}&id=${shape_id}&reverseFlag=${reverseFlag}
		start = time.time()
		logmessage('\nshape POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		route_id = self.get_argument('route', default='')
		shapePrefix = self.get_argument('id', default='')
		reverseFlag = self.get_argument('reverseFlag', default=False) == 'true'
		logmessage(route_id)
		logmessage(shapePrefix)
		logmessage(reverseFlag)

		if not ( len(route_id) and len(shapePrefix) ):
			self.set_status(400)
			self.write("Error: Invalid route or shape id prefix.")
			return 

		shapeArray = False

		geoJson0 = uploadaFile( self.request.files['uploadShape0'][0] )
		logmessage(geoJson0)
		if reverseFlag:
			geoJson1 = uploadaFile( self.request.files['uploadShape1'][0] )
			logmessage(geoJson1)
			shapeArray = geoJson2shape(shapePrefix, shapefile=(uploadFolder+geoJson0), shapefileRev=(uploadFolder+geoJson1) )
		else:
			shapeArray = geoJson2shape(shapePrefix, shapefile=(uploadFolder+geoJson0), shapefileRev=None)

		if not shapeArray:
			self.set_status(400)
			self.write("Error: One or more geojson files is faulty. Please ensure it's a proper line.")
			return 
		
		shape0 = str(shapePrefix) + '_0'
		shape1 = str(shapePrefix) + '_1'
		shapeArray0 = [ x for x in  shapeArray if x['shape_id'] == shape0 ]
		shapeArray1 = [ x for x in  shapeArray if x['shape_id'] == shape1 ]

		replaceTableDB('shapes', shapeArray0, key='shape_id', value=shape0)
		replaceTableDB('shapes', shapeArray1, key='shape_id', value=shape1)


		self.write('Saved ' + shape0 + ', ' + shape1 + ' to shapes table in DB.')
		end = time.time()
		logmessage("shape POST call took {} seconds.".format(round(end-start,2)))

	def get(self):
		# API/shape?shape=${shape_id}
		start = time.time()
		logmessage('\nshape GET call')
		shape_id = self.get_argument('shape', default='')
		print(shape_id)

		if not len(shape_id):
			self.set_status(400)
			self.write("Error: invalid shape.")
			return 

		shapeDf = readTableDB('shapes', key='shape_id', value=shape_id)

		if not len(shapeDf):
			self.set_status(400)
			self.write("Error: Given shape_id is not present in shapes table in DB.")
			return 

		# need to sort this array before returning it. See https://github.com/WRI-Cities/static-GTFS-manager/issues/22
		shapeDf.shape_pt_sequence = shapeDf.shape_pt_sequence.astype(int)
		# type-cast the column as int before sorting!

		sortedShapeJson = shapeDf.sort_values('shape_pt_sequence').to_json(orient='records', force_ascii=False)
		# sort ref: http://pandas.pydata.org/pandas-docs/version/0.19/generated/pandas.DataFrame.sort.html
		self.write(sortedShapeJson)

		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("shape GET call took {} seconds.".format(round(end-start,2)))
	
class allShapesList(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		logmessage('\nallShapesList GET call')
		shapeIDsJson = allShapesListFunc()
		self.write(json.dumps(shapeIDsJson))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("allShapesList GET call took {} seconds.".format(round(end-start,2)))

class listAll(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}listAll
		# a Master API call for fetching all id's!
		start = time.time()
		logmessage('\nlistAll GET call')

		zoneCollector = set()
		
		# stops
		stop_id_list = readColumnDB('stops','stop_id')
		
		# also collect zone_ids
		zoneCollector.update( readColumnDB('stops','zone_id') )
		
		# routes
		route_id_list = readColumnDB('routes','route_id')

		# trips
		trip_id_list = readColumnDB('trips','trip_id')

		# fare zone ids
		zoneCollector.update( readColumnDB('fare_rules','origin_id') )
		zoneCollector.update( readColumnDB('fare_rules','destination_id') )
			
		# zones collected; transfer all collected zones to zone_id_list
		zone_id_list = list(zoneCollector)
		
		# fare_ids
		# solves https://github.com/WRI-Cities/static-GTFS-manager/issues/36
		fare_id_list = readColumnDB('fare_attributes','fare_id')

		# agency_ids
		# solves https://github.com/WRI-Cities/static-GTFS-manager/issues/42
		agency_id_list = readColumnDB('agency','agency_id')
		
		# next are repetitions of other functions		
		# shapes
		shapeIDsJson = allShapesListFunc()

		# service ids
		service_id_list = serviceIdsFunc()

		# wrapping it all together
		returnJson = { 'stop_id_list':stop_id_list, 'route_id_list':route_id_list, 'trip_id_list':trip_id_list, 'zone_id_list':zone_id_list, 'shapeIDsJson':shapeIDsJson, 'service_id_list': service_id_list, 'fare_id_list':fare_id_list, 'agency_id_list':agency_id_list }
		self.write(json.dumps(returnJson))
		end = time.time()
		logmessage("listAll GET call took {} seconds.".format(round(end-start,2)))


class zoneIdList(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}zoneIdList
		start = time.time()
		logmessage('\nzoneIdList GET call')

		zoneCollector = set()		
		zoneCollector.update( readColumnDB('stops','zone_id') )
		# to do: find out why this function is only looking at stops table
		
		zoneList = list(zoneCollector)
		zoneList.sort()
		self.write(json.dumps(zoneList))
		end = time.time()
		logmessage("zoneIdList GET call took {} seconds.".format(round(end-start,2)))


class diagnoseID(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}diagnoseID?column=column&value=value
		start = time.time()
		logmessage('\ndiagnoseID GET call')
		column = self.get_argument('column', default='')
		value = self.get_argument('value', default='')

		if not ( len(column) and len(value) ):
			self.set_status(400)
			self.write("Error: invalid parameters.")
			return 
		returnMessage = diagnoseIDfunc(column,value)
		self.write(returnMessage)

		end = time.time()
		logmessage("diagnoseID GET call took {} seconds.".format(round(end-start,2)))


class deleteByKey(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}deleteByKey?pw=pw&key=key&value=value&tables=table1,table2
		start = time.time()
		logmessage('\ndeleteByKey GET call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		column = self.get_argument('key', default='')
		value = self.get_argument('value', default='')
		if not ( len(column) and len(value) ):
			logmessage("API/deleteByKey : Error: invalid parameters.")
			self.set_status(400)
			self.write("Error: invalid parameters.")
			return 

		returnMessage = deleteID(column,value)
		self.write(returnMessage)
		
		end = time.time()
		logmessage("deleteByKey GET call took {} seconds.".format(round(end-start,2)))


class replaceID(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}replaceID?pw=pw&key=key&valueFrom=valueFrom&valueTo=valueTo
		start = time.time()
		logmessage('\nreplaceID POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		key = self.get_argument('key',default='')
		valueFrom = self.get_argument('valueFrom', default='')
		valueTo = self.get_argument('valueTo', default='')
		# tableKeys = json.loads( self.request.body.decode('UTF-8') )
		# tablekeys: [ {'table':'stops','key':'stop_id'},{...}]
		
		if not ( len(valueFrom) and len(valueTo) and len(key) ):
			self.set_status(400)
			self.write("Error: Invalid parameters.")
			return 

		# main function:
		returnMessage = replaceIDfunc(key,valueFrom,valueTo)

		self.write(returnMessage)
		
		end = time.time()
		logmessage("replaceID POST call took {} seconds.".format(round(end-start,2)))


class hydGTFS(tornado.web.RequestHandler):
	def post(self):
		start = time.time()
		logmessage('\nhydGTFS POST call')
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		
		files = self.request.files
		#print(files)
		
		# Getting POST form input data, from https://stackoverflow.com/a/32418838/4355695
		#formdata = self.request.body_arguments() # that didn't work
		payload = json.loads( self.get_body_argument("payload", default=None, strip=False) )
		#print(payload)
		
		returnJson = hydGTFSfunc(files, payload)

		#returnMessage = {'status':'Feature Under Construction!'}
		self.write(returnJson)
		
		end = time.time()
		logmessage("hydGTFS POST call took {} seconds.".format(round(end-start,2)))

class frequencies(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}frequencies
		start = time.time()
		logmessage('\nfrequencies GET call')
		
		freqJson = readTableDB('frequencies').to_json(orient='records', force_ascii=False)
		self.write(freqJson)
		end = time.time()
		logmessage("frequences GET call took {} seconds.".format(round(end-start,2)))
		
	def post(self):
		# ${APIpath}frequencies
		start = time.time()
		logmessage('\nfrequencies POST call')
		pw=self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )

		if replaceTableDB('frequencies', data): #replaceTableDB(tablename, data)
			self.write('Saved frequencies data to DB.')
		else:
			self.set_status(400)
			self.write("Error: Could not save to DB.")
		end = time.time()
		logmessage("frequencies POST call took {} seconds.".format(round(end-start,2)))

class tableReadSave(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}tableReadSave?table=table&key=key&value=value
		start = time.time()
		
		table=self.get_argument('table',default='')
		logmessage('\ntableReadSave GET call for table={}'.format(table))
		
		if not table:
			self.set_status(400)
			self.write("Error: invalid table.")
			return 

		key=self.get_argument('key',default=None)
		value=self.get_argument('value',default=None)
		if key and value:
			dataJson = readTableDB(table, key=key, value=value).to_json(orient='records', force_ascii=False)
		else:
			dataJson = readTableDB(table).to_json(orient='records', force_ascii=False)
		
		self.write(dataJson)
		end = time.time()
		logUse('{}_read'.format(table))
		logmessage("tableReadSave GET call for table={} took {} seconds.".format(table,round(end-start,2)))

	def post(self):
		# ${APIpath}tableReadSave?pw=pw&table=table&key=key&value=value
		start = time.time()
		pw=self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		
		table=self.get_argument('table',default='')
		if not table:
			self.set_status(400)
			self.write("Error: invalid table.")
			return 
		
		logmessage('\ntableReadSave POST call for table={}'.format(table))
		
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )

		key = self.get_argument('key',default=None)
		value = self.get_argument('value',default=None)
		if key and value:
			status = replaceTableDB(table, data, key, value)
		else:
			status = replaceTableDB(table, data)

		if status:
			self.write('Saved {} data to DB.'.format(table) )
		else:
			self.set_status(400)
			self.write("Error: Could not save to DB.")
		end = time.time()
		logUse('{}_write'.format(table))
		logmessage("tableReadSave POST call for table={} took {} seconds.".format(table,round(end-start,2)))

class tableColumn(tornado.web.RequestHandler):
	def get(self):
		# API/tableColumn?table=table&column=column&key=key&value=value
		start = time.time()
		logmessage('\nrouteIdList GET call')
		
		table=self.get_argument('table',default='')
		column=self.get_argument('column',default='')
		logmessage('\ntableColumn GET call for table={}, column={}'.format(table,column))
		
		if (not table) or (not column) :
			self.set_status(400)
			self.write("Error: invalid table or column given.")
			return 

		key=self.get_argument('key',default=None)
		value=self.get_argument('value',default=None)
		
		if key and value:
			returnList = readColumnDB(table, column, key=key, value=value)
		else:
			returnList = readColumnDB(table, column)

		returnList.sort()
		self.write(json.dumps(returnList))
		end = time.time()
		logUse('{}_column'.format(table))
		logmessage("tableColumn GET call took {} seconds.".format(round(end-start,2)))


def make_app():
	return tornado.web.Application([
		#(r"/API/data", APIHandler),
		(r"/API/allStops", allStops),
		(r"/API/allStopsKeyed", allStopsKeyed),
		(r"/API/routes", routes),
		(r"/API/fareAttributes", fareAttributes),
		(r"/API/fareRulesPivoted", fareRulesPivoted),
		(r"/API/fareRules", fareRules),
		(r"/API/agency", agency),
		(r"/API/calendar", calendar),
		(r"/API/sequence", sequence),
		(r"/API/trips", trips),
		(r"/API/stopTimes", stopTimes),
		(r"/API/routeIdList", routeIdList),
		(r"/API/tripIdList", tripIdList),
		(r"/API/serviceIds", serviceIds),
		(r"/API/stats", stats),
		(r"/API/commitExport", commitExport),
		(r"/API/pastCommits", pastCommits),
		(r"/API/gtfsImportZip", gtfsImportZip),
		(r"/API/XMLUpload", XMLUpload),
		(r"/API/XMLDiagnose", XMLDiagnose),
		(r"/API/stations", stations),
		(r"/API/fareChartUpload", fareChartUpload),
		(r"/API/xml2GTFS", xml2GTFS),
		(r"/API/gtfsBlankSlate", gtfsBlankSlate),
		(r"/API/translations", translations),
		(r"/API/shapesList", shapesList),
		(r"/API/allShapesList", allShapesList),
		(r"/API/shape", shape),
		(r"/API/listAll", listAll),
		(r"/API/zoneIdList", zoneIdList),
		(r"/API/diagnoseID", diagnoseID),
		(r"/API/deleteByKey", deleteByKey),
		(r"/API/replaceID", replaceID),
		(r"/API/hydGTFS", hydGTFS),
		(r"/API/frequencies", frequencies),
		(r"/API/tableReadSave", tableReadSave),
		(r"/API/tableColumn", tableColumn),
		#(r"/API/idList", idList),
		(r"/(.*)", tornado.web.StaticFileHandler, {"path": root, "default_filename": "index.html"})
	])

# for catching Ctrl+C and exiting gracefully. From https://nattster.wordpress.com/2013/06/05/catch-kill-signal-in-python/
def signal_term_handler(signal, frame):
	# to do: Make this work in windows, ra!
	print('\nClosing Program.\nThank you for using static GTFS Manager. Website: https://github.com/WRI-Cities/static-GTFS-manager/\n')
	sys.exit(0)

if __name__ == "__main__":
	signal.signal(signal.SIGINT, signal_term_handler)
	app = make_app()
	portnum = 5000
	while True: # loop to increment the port number till we find one that isn't occupied
		try:
			port = int(os.environ.get("PORT", portnum))
			app.listen(port)
			break
		except OSError:
			portnum += 1
			if portnum > 9999: 
				print('Can\'t launch as no port number from 5000 through 9999 is free.')
				sys.exit()

	thisURL = "http://localhost:" + str(port)
	webbrowser.open(thisURL)
	logmessage("\n\nOpen {} in your Web Browser if you don't see it opening automatically in 5 seconds.\n\nNote: If this is through docker, then it's not going to auto-open in browser, don't wait.".format(thisURL))
	logUse()
	tornado.ioloop.IOLoop.current().start()



