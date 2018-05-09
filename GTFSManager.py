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
from math import sin, cos, sqrt, atan2, radians
# import requests
from json.decoder import JSONDecodeError # used to catch corrupted DB file when tinyDB loads it.
import signal, sys # for catching Ctrl+C and exiting gracefully.

# setting constants
root = os.path.dirname(__file__)
dbfile = 'GTFS/db.json'
sequenceDBfile = 'GTFS/sequence.json'
uploadFolder = 'uploads/'
xmlFolder = 'xml_related/'
logFolder = 'logs/'
passwordFile = 'pw/rsa_key.bin'
thisURL = ''

# create folders if they don't exist
if not os.path.exists(uploadFolder):
	os.makedirs(uploadFolder)

if not os.path.exists(xmlFolder):
	os.makedirs(xmlFolder)

if not os.path.exists(logFolder):
	os.makedirs(logFolder)

# importing GTFSserverfunctions.py, embedding it inline to avoid re-declarations etc
exec(open("./GTFSserverfunctions.py", encoding='utf8').read())
exec(open("./xml2GTFSfunction.py", encoding='utf8').read())

logmessage('Loaded dependencies, starting static GTFS Manager program.')

'''
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
		'''
		# better way to open files.. closes the file and frees up memory after the variable has been assigned.
		with open("GTFS/stops.txt", encoding='utf8') as f: 
			allStopsArray = list(csv.DictReader(f))
		'''
		# reading from database
		allStopsArray = readTableDB(dbfile, 'stops')
		
		self.write(json.dumps(allStopsArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("allStops GET call took {} seconds.".format(round(end-start,2)))
		
	def post(self):
		start = time.time()
		pw=self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
		#csvwriter(data,'stops.txt')
		# save to db..
		if replaceTableDB(dbfile, 'stops', data): #replaceTableDB(dbfile, tablename, data)
			self.write('Saved stops data to DB.')
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
		'''
		with open("GTFS/stops.txt", encoding='utf8') as f:
			allStopsArray = list(csv.DictReader(f))
		'''
		# move to accessing DB
		allStopsArray = readTableDB(dbfile, 'stops')
		# desired: {"ALVA":{"stop_name":"Aluva","stop_lat":10.1099,"stop_lon":76.3495,"zone_id":"ALVA","wheelchair_boarding":1}
		array2 = OrderedDict()
		for row in allStopsArray:
			stop_id = row['stop_id']
			del row['stop_id']
			array2[ stop_id ] = row	
		self.write(json.dumps(array2))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("allStopsKeyed GET call took {} seconds.".format(round(end-start,2)))

		
class allRoutes(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		'''
		with open("GTFS/routes.txt", encoding='utf8') as f:
			allRoutesArray = list(csv.DictReader(f))
		'''
		allRoutesArray = readTableDB(dbfile, 'routes')
		self.write(json.dumps(allRoutesArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("allRoutes GET call took {} seconds.".format(round(end-start,2)))


class fareAttributes(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		'''
		with open("GTFS/fare_attributes.txt", encoding='utf8') as f:
			fareAttributesArray = list(csv.DictReader(f)) 
		'''
		fareAttributesArray = readTableDB(dbfile, 'fare_attributes')

		self.write(json.dumps(fareAttributesArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("fareAttributes GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/fareAttributes
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
	
		# writing back to db
		if replaceTableDB(dbfile, 'fare_attributes', data): #replaceTableDB(dbfile, tablename, data)
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
		fareRulesSimpleArray = readTableDB(dbfile, 'fare_rules')

		self.write(json.dumps(fareRulesSimpleArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("fareRules GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/fareRules
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
	
		# writing back to db
		if replaceTableDB(dbfile, 'fare_rules', data): #replaceTableDB(dbfile, tablename, data)
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
		
		fareRulesArray = readTableDB(dbfile, 'fare_rules')
		# do pivoting operation only if there is data. Else send a blank array. 
		# Solves part of https://github.com/WRI-Cities/static-GTFS-manager/issues/35
		if len(fareRulesArray):
			df = pd.DataFrame(fareRulesArray).drop_duplicates()
			# skipping duplicate entries if any, as pivoting errors out if there are duplicates.
			fareRulesPivotedArray = df.pivot(index='origin_id', columns='destination_id', values='fare_id').reset_index().rename(columns={'origin_id':'zone_id'}).to_dict(orient='records', into=OrderedDict)
		else:
			fareRulesPivotedArray = []

		# multiple pandas ops..
		# .pivot() : pivoting. Keep origin as vertical axis, destination as horizontal axis, and fill the 2D matrix with values from fare_id column.
		# .reset_index() : move the vertical axis in as a column so that we can export it to dict further along. from https://stackoverflow.com/a/20461206/4355695
		# .rename() : rename the index column which we've moved in. Proper name is zone_id.
		# .to_dict(orient='records', into=OrderedDict) : convert to flat list of dicts. from https://pandas.pydata.org/pandas-docs/stable/generated/pandas.DataFrame.to_dict.html

		# to do: if we get a route or two, then order these by the route's sequence.

		self.write( json.dumps(fareRulesPivotedArray) )
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("fareRulesPivoted GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/fareRulesPivoted?pw=${pw}
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
		
		# need to unpivot this. We basically need to do the exact same steps as the get(self) function did, in reverse.
		df = pd.DataFrame(data)
		
		fareRulesArray = pd.melt(df, id_vars=['zone_id'], var_name='destination_id',value_name='fare_id').rename(columns={'zone_id': 'origin_id'}).replace('', pd.np.nan).dropna().sort_values(by=['origin_id','destination_id']).to_dict('records',into=OrderedDict)
		
		# pandas: chained many commands together. explaining..
		# .melt(df.. : that's the UNPIVOT command. id_vars: columns to keep. Everthing else "melts" down. var_name: new column name of the remaining cols serialized into one.
		# .rename(.. : renaming the zone_id ('from' station) to origin_id
		# .replace(.. At frontend some cells might have been set to blank. That comes thru as empty strings instead of null/NaN values. This replaces all empty strings with NaN, so they can be dropped subsequently. From https://stackoverflow.com/a/29314880/4355695
		# .dropna() : drop all entries having null/None values. Example ALVA to ALVA has nothing; drop it.
		# sort_values(.. : sort the table by col1 then col2
		# to_dict(.. : output as an OrderedDict.

		# writing back to db
		if replaceTableDB(dbfile, 'fare_rules', fareRulesArray):
			 self.write('Saved Fare Rules data to DB.')
		else:
			self.set_status(400)
			self.write("Error: could not save to DB.")
		
		end = time.time()
		logmessage("API/fareAttributes POST call took {} seconds.".format(round(end-start,2)))


class agency(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		agencyArray = readTableDB(dbfile, 'agency')
		self.write(json.dumps(agencyArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("agency GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
	
		if replaceTableDB(dbfile, 'agency', data): #replaceTableDB(dbfile, tablename, data)
			self.write('Saved Agency data to DB.')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("saveAgency POST call took {} seconds.".format(round(end-start,2)))


class saveRoutes(tornado.web.RequestHandler):
	def post(self):
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
		# logmessage(data)
		# csvwriter(data,'routes.txt')
		# writing back to db now
		if replaceTableDB(dbfile, 'routes', data): #replaceTableDB(dbfile, tablename, data)
			self.write('Saved routes data to DB')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("saveRoutes POST call took {} seconds.".format(round(end-start,2)))


class sequence(tornado.web.RequestHandler):
	def get(self):
		# API/sequence?route=${route_id}
		start = time.time()
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
			sequence = extractSequencefromGTFS(dbfile, route_id)

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
		route_id = self.get_argument('route', default='')
		if not len(route_id):
			self.set_status(400)
			self.write("Error: invalid route.")
			return 

		tripsArray = readTableDB(dbfile, 'trips', key='route_id', value=route_id)

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
		result = replaceTableDB(dbfile, 'trips', tripsData, key='route_id', value=route_id)
		
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
		trip_id = self.get_argument('trip', default='')
		route_id = self.get_argument('route', default='')
		direction_id = int(self.get_argument('direction',default=0))
		returnMessage = ''

		if not ( len(trip_id) and len(route_id) ):
			self.set_status(400)
			self.write("Error: Invalid trip or route ID given.")
			return

		tripInTrips = readTableDB(dbfile, 'trips', 'trip_id', trip_id)
		if tripInTrips == []:
			self.set_status(400)
			self.write("Error: Please save this trip to DB in the Trips tab first.")
			return

		stoptimesArray = readTableDB(dbfile, 'stop_times', 'trip_id', trip_id)
		
		returnMessage = 'This trip has timings data in the db, so loaded that.'
		newFlag = False
		
		if stoptimesArray == [] :
			returnMessage = 'This trip is new. Loading default sequence, please fill in timings and save to DB.'
			newFlag = True

		# let's send back not just the array but even the message to display.
		returnJson = {'data':stoptimesArray, 'message':returnMessage, 'newFlag':newFlag }
		logmessage(returnJson['message'])

		self.write(json.dumps(returnJson))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("stopTimes GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start  = time.time() # time check, from https://stackoverflow.com/a/24878413/4355695
		# ${APIpath}stopTimes?pw=${pw}&trip=${trip_id}
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
		result = replaceTableDB(dbfile, 'stop_times', timingsData, key='trip_id', value=trip_id)
		
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

		routesArray = readTableDB(dbfile, 'routes')

		route_id_list = [ n['route_id'] for n in routesArray ]
		self.write(json.dumps(route_id_list))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("routeIdList GET call took {} seconds.".format(round(end-start,2)))

class tripIdList(tornado.web.RequestHandler):
	def get(self):
		# API/tripIdList
		start = time.time()
		db = tinyDBopen(dbfile)
		tripsDb = db.table('trips')
		trip_id_list = [ x['trip_id'] for x in tripsDb.all() ]
		self.write(json.dumps(trip_id_list))
		db.close()
		end = time.time()
		logmessage("tripIdList GET call took {} seconds.".format(round(end-start,2)))


class calendar(tornado.web.RequestHandler):
	def get(self):
		# API/calendar
		start = time.time() # time check
		
		calendarArray = readTableDB(dbfile, 'calendar')

		self.write(json.dumps(calendarArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("calendar GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/calendar?pw=${pw}
		start = time.time() # time check
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		calendarData = json.loads( self.request.body.decode('UTF-8') )
		
		#csvwriter(calendarData,'calendar.txt')
		replaceTableDB(dbfile, 'calendar', calendarData)

		self.write('Saved Calendar data to DB.')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("calendar POST call took {} seconds.".format(round(end-start,2)))


class serviceIds(tornado.web.RequestHandler):
	def get(self):
		# API/serviceIds
		start = time.time() # time check
		service_id_list = serviceIdsFunc()
		self.write(json.dumps(service_id_list))
		end = time.time()
		logmessage("serviceIds GET call took {} seconds.".format(round(end-start,2)))

class stats(tornado.web.RequestHandler):
	def get(self):
		# API/stats
		stats = GTFSstats(dbfile)
		self.write(json.dumps(stats))


class gtfsImportZip(tornado.web.RequestHandler):
	def post(self):
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		zipname = uploadaFile( self.request.files['gtfsZipFile'][0] )
		importGTFS(dbfile, zipname)
		
		self.write(zipname)
		

class commitExport(tornado.web.RequestHandler):
	def get(self):
		# API/commitExport?pw=${pw}&commit=${commit}
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		commit = self.get_argument('commit', default='')
		if not len(commit):
			self.set_status(400)
			self.write("Error: invalid commit name.")
			return 
		commitFolder = '{:GTFS/%Y-%m-%d-}'.format(datetime.datetime.now()) + commit + '/'
		finalmessage = exportGTFS (dbfile, commitFolder) 
		# this is the main function. it's in GTFSserverfunctions.py
		
		self.write(finalmessage)
		end = time.time()
		logmessage("commitExport GET call took {} seconds.".format(round(end-start,2)))


class pastCommits(tornado.web.RequestHandler):
	def get(self):
		# API/pastCommits
		start = time.time()
		dirnames = []
		for root, dirs, files in os.walk('GTFS/'):
			for folder in dirs:
				if os.path.isfile('GTFS/' + folder + '/gtfs.zip'):
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

class XMLDiagnose(tornado.web.RequestHandler):
	def get(self):
		# `${APIpath}XMLDiagnose?weekdayXML=${weekdayXML}&sundayXML=${sundayXML}&depot=${depot}`
		start = time.time()
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


class stations(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		'''
		with open(xmlFolder + "stations.csv", encoding='utf8') as f: 
			stationsArray = list(csv.DictReader(f))
		'''
		stationsArray = pd.read_csv(xmlFolder + "stations.csv", na_filter=False).to_dict('records')
		self.write(json.dumps(stationsArray))
		end = time.time()
		logmessage("stations GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start = time.time()
		'''
		with open(xmlFolder + "stations.csv", encoding='utf8') as f: 
			stationsArray = list(csv.DictReader(f))
		'''
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
			fares_array = csvunpivot(uploadFolder + fareChart, ['Stations'], 'destination_id', 'fare_id', ['fare_id','Stations','destination_id'])
	
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


class xml2GTFS(tornado.web.RequestHandler):
	def post(self):
		# `${APIpath}xml2GTFS?pw=${pw}`
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		configdata = json.loads( self.request.body.decode('UTF-8') )
		logmessage(configdata)
		# and so it begins! Ack lets pass it to a function.
		try:
			xml2GTFSConvert(configdata)
			result = 'Imported XML data into database successfully.'
		except:
			self.set_status(400)
			result = 'Import was unsuccessful, please debug on python side.'
		
		self.write(result)
		end = time.time()
		logmessage("xml2GTFS POST call took {} seconds.".format(round(end-start,2)))


class gtfsBlankSlate(tornado.web.RequestHandler):
	def get(self):
		# API/gtfsBlankSlate?pw=${pw}
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		
		# take backup first
		backupfolder = '{:GTFS/%Y-%m-%d-backup-%H%M}/'.format(datetime.datetime.now())
		exportGTFS (dbfile, backupfolder)
		logmessage('backup made to folder '+backupfolder)

		
		db = tinyDBopen(dbfile)
		db.purge_tables() # wipe out the database, clean slate.
		logmessage(dbfile + ' purged.')
		db.close()
		
		# also purge sequenceDB
		db = tinyDBopen(sequenceDBfile)
		
		db.purge_tables() # wipe out the database, clean slate.
		logmessage(sequenceDBfile + ' purged.')
		db.close()
		


		finalmessage = '<font color=green size=6>&#10004;</font> Took a backup and cleaned out the DB.'
		# this is the main function. it's in GTFSserverfunctions.py
		
		self.write(finalmessage)
		end = time.time()
		logmessage("gtfsBlankSlate GET call took {} seconds.".format(round(end-start,2)))

class translations(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		translationsArray = readTableDB(dbfile, 'translations')
		self.write(json.dumps(translationsArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("translations GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/translations?pw=${pw}
		start = time.time() # time check
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		translationsData = json.loads( self.request.body.decode('UTF-8') )
		
		replaceTableDB(dbfile, 'translations', translationsData)

		self.write('Saved Translations data to DB.')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("translations POST call took {} seconds.".format(round(end-start,2)))

class shapesList(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		route_id = self.get_argument('route','')
		if not len(route_id):
			self.set_status(400)
			self.write("Error: invalid route.")
			return 
		
		db = tinyDBopen(dbfile)
		Item = Query()
		
		shapeIDsJson = {}
		
		# shapesDb = db.table('shapes')
		# allShapes = shapesDb.all()
		# shapeIDsJson['all'] = list( pd.DataFrame(allShapes)['shape_id'].replace('', pd.np.nan).dropna().unique() )

		tripsDb = db.table('trips')

		# direction 0
		trips = tripsDb.search( (Item['route_id'] == route_id) & ( (Item['direction_id'] == 0) | (Item['direction_id'] == '0') ) )
		# if there are no shapes in db, then skip the pandas command and assign empty array.
		# should solve https://github.com/WRI-Cities/static-GTFS-manager/issues/35
		if len(trips):
			shapeIDsJson['0'] = list( pd.DataFrame(trips)['shape_id'].replace('', pd.np.nan).dropna().unique() )
		else:
			shapeIDsJson['0'] = []

		# ------------
		# direction 1
		trips = tripsDb.search( (Item['route_id'] == route_id) & ( (Item['direction_id'] == 1) | (Item['direction_id'] == '1') ) )
		if len(trips):
			shapeIDsJson['1'] = list( pd.DataFrame(trips)['shape_id'].replace('', pd.np.nan).dropna().unique() )
		else:
			shapeIDsJson['1'] = []
		


		self.write(json.dumps(shapeIDsJson))
		db.close()
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("shapes GET call took {} seconds.".format(round(end-start,2)))

class shape(tornado.web.RequestHandler):
	def post(self):
		# ${APIpath}shape?pw=${pw}&route=${route_id}&id=${shape_id}&reverseFlag=${reverseFlag}
		start = time.time()
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
			shapeArray = geoJson2shape(shapePrefix, shapefile=uploadFolder+geoJson0, shapefileRev=None)

		if not shapeArray:
			self.set_status(400)
			self.write("Error: One or more geojson files is faulty. Please ensure it's a proper line.")
			return 
		
		shape0 = str(shapePrefix) + '_0'
		shape1 = str(shapePrefix) + '_1'
		shapeArray0 = [ x for x in  shapeArray if x['shape_id'] == shape0 ]
		shapeArray1 = [ x for x in  shapeArray if x['shape_id'] == shape1 ]

		db=tinyDBopen(dbfile)
		shapesDb = db.table('shapes')

		replaceTableDB(dbfile, 'shapes', shapeArray0, key='shape_id', value=shape0)
		replaceTableDB(dbfile, 'shapes', shapeArray1, key='shape_id', value=shape1)


		self.write('Saved ' + shape0 + ', ' + shape1 + ' to shapes table in DB.')
		end = time.time()
		logmessage("shape POST call took {} seconds.".format(round(end-start,2)))

	def get(self):
		# API/shape?shape=${shape_id}
		start = time.time()
		shape_id = self.get_argument('shape', default='')

		if not len(shape_id):
			self.set_status(400)
			self.write("Error: invalid shape.")
			return 

		shapeArray = readTableDB(dbfile, 'shapes', key='shape_id', value=shape_id)

		if not len(shapeArray):
			self.set_status(400)
			self.write("Error: Given shape_id is not present in shapes table in DB.")
			return 

		# need to sort this array before returning it. See https://github.com/WRI-Cities/static-GTFS-manager/issues/22
		sortedShapeArray = sorted(shapeArray, key=lambda k: k['shape_pt_sequence'])
		# from https://stackoverflow.com/a/73050/4355695

		self.write(json.dumps(sortedShapeArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		logmessage("shape GET call took {} seconds.".format(round(end-start,2)))
	
class allShapesList(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
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

		zoneCollector = set()
		
		db = tinyDBopen(dbfile)

		# stops
		tableDB = db.table('stops')
		stopsArray = tableDB.all()
		stop_id_list = [ x['stop_id'] for x in stopsArray ]
		
		# also collect zone_ids
		# put in if loop to prevent error if db is empty. May solve https://github.com/WRI-Cities/static-GTFS-manager/issues/35
		if len(stopsArray):
			df = pd.DataFrame(stopsArray)
			zoneCollector.update( list( df['zone_id'].replace('', pd.np.nan).dropna().unique() ) )
		
		# routes
		tableDB = db.table('routes')
		route_id_list = [ x['route_id'] for x in tableDB.all() ]

		# trips
		tableDB = db.table('trips')
		trip_id_list = [ x['trip_id'] for x in tableDB.all() ]

		# fare zone ids
		tableDB = db.table('fare_rules')
		# put in if loop to prevent error if this table is empty
		fare_rules_array = tableDB.all()
		if len(fare_rules_array):
			# to avoid errors if https://github.com/WRI-Cities/static-GTFS-manager/issues/35
			df = pd.DataFrame(fare_rules_array)
			zoneCollector.update( list( df['origin_id'].replace('', pd.np.nan).dropna().unique() ) )
			zoneCollector.update( list( df['destination_id'].replace('', pd.np.nan).dropna().unique() ) )
		
		# zones collected; transfer all collected zones to zone_id_list
		zone_id_list = list(zoneCollector)
		
		# fare_ids
		# solves https://github.com/WRI-Cities/static-GTFS-manager/issues/36
		tableDB = db.table('fare_attributes')
		fare_attributes_array = tableDB.all()
		fare_id_list = [ x['fare_id'] for x in fare_attributes_array ]

		# agency_ids
		# solves https://github.com/WRI-Cities/static-GTFS-manager/issues/42
		tableDB = db.table('agency')
		agency_array = tableDB.all()
		agency_id_list = [ x['agency_id'] for x in agency_array ]

		db.close()
		
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

		zoneCollector = set()
			
		db = tinyDBopen(dbfile)

		# stops
		tableDB = db.table('stops')
		stopsArray = tableDB.all()
		
		# also collect zone_ids
		# put in if loop to prevent error if db is empty. May solve https://github.com/WRI-Cities/static-GTFS-manager/issues/35
		if len(stopsArray):
			df = pd.DataFrame(stopsArray)
			zoneCollector.update( list( df['zone_id'].replace('', pd.np.nan).dropna().unique() ) )
		
		zoneList = list(zoneCollector)
		zoneList.sort()
		self.write(json.dumps(zoneList))
		end = time.time()
		logmessage("zoneIdList GET call took {} seconds.".format(round(end-start,2)))


class diagnoseID(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}diagnoseID?key=key&value=value&tables=table1,table2&secondarytables=table3,table4
		start = time.time()
		key = self.get_argument('key', default='')
		value = self.get_argument('value', default='')
		tables = self.get_argument('tables', default='').split(',')
		secondarytables = self.get_argument('secondarytables', default='').split(',')
		logmessage(tables)
		logmessage(secondarytables)
		if not ( len(key) and len(value) ):
			self.set_status(400)
			self.write("Error: invalid parameters.")
			return 

		returnJson = collectfromDB(dbfile=dbfile,key=key,value=value,tables=tables,secondarytables=secondarytables)

		if key == 'zone_id':
			returnJson['main'].update( collectfromDB(dbfile=dbfile,key='origin_id',value=value,tables=['fare_rules'],secondarytables=[])['main'] )
			tempJson = collectfromDB(dbfile=dbfile,key='destination_id',value=value,tables=['fare_rules'],secondarytables=[])['main']
			returnJson['main']['fare_rules (destination id)'] = tempJson['fare_rules']

		self.write(json.dumps(returnJson) )
		end = time.time()
		logmessage("diagnoseID GET call took {} seconds.".format(round(end-start,2)))


class deleteByKey(tornado.web.RequestHandler):
	def get(self):
		# ${APIpath}deleteByKey?pw=pw&key=key&value=value&tables=table1,table2
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		key = self.get_argument('key', default='')
		value = self.get_argument('value', default='')
		tables = self.get_argument('tables', default='').split(',')
		if not ( len(key) and len(value) ):
			self.set_status(400)
			self.write("Error: invalid parameters.")
			return 

		deletefromDB(dbfile=dbfile,key=key,value=value,tables=tables)

		self.write('Deleted all entries for ' + key + ' = ' + value +' from tables: ' + ', '.join(tables) + ' and zapped their mentions in other tables.' )
		end = time.time()
		logmessage("deleteByKey GET call took {} seconds.".format(round(end-start,2)))


class replaceID(tornado.web.RequestHandler):
	def post(self):
		# ${APIpath}replaceID?pw=pw&valueFrom=valueFrom&valueTo=valueTo
		start = time.time()
		pw = self.get_argument('pw',default='')
		if not decrypt(pw):
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		valueFrom = self.get_argument('valueFrom', default='')
		valueTo = self.get_argument('valueTo', default='')
		tableKeys = json.loads( self.request.body.decode('UTF-8') )
		# tablekeys: [ {'table':'stops','key':'stop_id'},{...}]
		
		logmessage(tableKeys)
		logmessage(valueFrom)
		logmessage(valueTo)

		if not ( len(valueFrom) and len(valueTo) and len(tableKeys) ):
			self.set_status(400)
			self.write("Error: Invalid parameters.")
			return 

		returnMessage = replaceIDfunc(valueFrom,valueTo,tableKeys)
		
		self.write(returnMessage)
		
		end = time.time()
		logmessage("replaceID POST call took {} seconds.".format(round(end-start,2)))

def make_app():
	return tornado.web.Application([
		#(r"/API/data", APIHandler),
		(r"/API/allStops", allStops),
		(r"/API/allStopsKeyed", allStopsKeyed),
		(r"/API/allRoutes", allRoutes),
		(r"/API/fareAttributes", fareAttributes),
		(r"/API/fareRulesPivoted", fareRulesPivoted),
		(r"/API/fareRules", fareRules),
		(r"/API/agency", agency),
		(r"/API/saveRoutes", saveRoutes),
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
		(r"/(.*)", tornado.web.StaticFileHandler, {"path": root, "default_filename": "index.html"})
	])

# for catching Ctrl+C and exiting gracefully. From https://nattster.wordpress.com/2013/06/05/catch-kill-signal-in-python/
def signal_term_handler(signal, frame):
	print('\nClosing Program.\nThank you for using GTFS Manager. Website: https://github.com/WRI-Cities/static-GTFS-manager/\n')
	sys.exit(0)

if __name__ == "__main__":
	signal.signal(signal.SIGINT, signal_term_handler)
	app = make_app()
	port = int(os.environ.get("PORT", 5000))
	app.listen(port)
	thisURL = "http://localhost:" + str(port)
	webbrowser.open(thisURL)
	logmessage("Open " + thisURL + " in your Browser if you don't see it opening automatically within 5 seconds.")
	tornado.ioloop.IOLoop.current().start()



