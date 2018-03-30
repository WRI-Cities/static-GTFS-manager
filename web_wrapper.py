import tornado.ioloop
import tornado.web
import json
import os
import time, datetime

import xmltodict, csv
import pandas as pd
from collections import OrderedDict
import zipfile, zlib
from tinydb import TinyDB, Query

		
# importing GTFSserverfunctions.py, embedding it inline to avoid re-declarations etc
exec(open("./GTFSserverfunctions.py", encoding='utf8').read())

root = os.path.dirname(__file__)
password = 'kmrl'
dbfile = 'GTFS/db.json'
sequenceDBfile = 'GTFS/sequence.json'
uploadFolder = 'uploads/'

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
		print("/API/allStops GET call took {} seconds.".format(round(end-start,2)))
		

	def post(self):
		start = time.time()
		pw=self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
		#csvwriter(data,'stops.txt')
		# save to db..
		if replaceTableDB(dbfile, 'stops', data): #replaceTableDB(dbfile, tablename, data)
			self.write('ok replaced stops table, refresh page to see changes')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/allStops POST call took {} seconds.".format(round(end-start,2)))


	def set_default_headers(self):
		print("setting headers!!!")
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
		print("/API/allStopsKeyed GET call took {} seconds.".format(round(end-start,2)))

		
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
		print("/API/allRoutes GET call took {} seconds.".format(round(end-start,2)))


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
		print("/API/fareAttributes GET call took {} seconds.".format(round(end-start,2)))


class fareRulesPivoted(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		'''
		with open("GTFS/fare_rules.txt", encoding='utf8') as f:
			fareRulesArray = list(csv.DictReader(f))
		'''
		fareRulesArray = readTableDB(dbfile, 'fare_rules')

		df = pd.DataFrame(fareRulesArray)
		pivotdf = df.pivot(index='origin_id', columns='destination_id', values='fare_id')
		#print(pivotdf)
		keyedDict = pivotdf.to_dict(orient='dict',into=OrderedDict)
		# It seems converting from pandas dataframe to dict inherently makes keyed dicts only. Tried various options.
		
		# Now we un-key this array, flatten it as the tabulator needs a flattened array of jsons, not a keyed one. Dping it the old way of manually cycling thru each part and assigning to a new array of ordered dicts.
		fareRulesPivotedArray = []
		for key in keyedDict:
			row = OrderedDict() # OrderedDict from https://stackoverflow.com/a/47407838/4355695
			row['zone_id'] = key
			row.update(keyedDict[key])
			fareRulesPivotedArray.append(row)
		self.write( json.dumps(fareRulesPivotedArray) )
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/fareRulesPivoted GET call took {} seconds.".format(round(end-start,2)))


class agency(tornado.web.RequestHandler):
	def get(self):
		start = time.time()
		'''
		with open("GTFS/agency.txt", encoding='utf8') as f:
			agencyArray = list(csv.DictReader(f))  # whole CSV loaded into a dict variable in one line.
		'''
		agencyArray = readTableDB(dbfile, 'agency')
		self.write(json.dumps(agencyArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/agency GET call took {} seconds.".format(round(end-start,2)))


class saveAgency(tornado.web.RequestHandler):
	def post(self):
		start = time.time()
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
	
		# csvwriter(data,'agency.txt')
		# writing back to db now
		if replaceTableDB(dbfile, 'agency', data): #replaceTableDB(dbfile, tablename, data)
			self.write('Saved Agency data to DB.')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/saveAgency POST call took {} seconds.".format(round(end-start,2)))


class saveRoutes(tornado.web.RequestHandler):
	def post(self):
		start = time.time()
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		data = json.loads( self.request.body.decode('UTF-8') )
		# print(data)
		# csvwriter(data,'routes.txt')
		# writing back to db now
		if replaceTableDB(dbfile, 'routes', data): #replaceTableDB(dbfile, tablename, data)
			self.write('Saved routes data to DB')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/saveRoutes POST call took {} seconds.".format(round(end-start,2)))


class sequence(tornado.web.RequestHandler):
	def get(self):
		# API/sequence?route=${route_id}
		start = time.time()
		route_id = self.get_argument('route')

		#to do: first check in sequence db. If not found there, then for first time, scan trips and stop_times to load sequence. And store that sequence in sequence db so that next time we fetch from there.

		sequence = sequenceReadDB(sequenceDBfile, route_id)
		# read sequence db and return sequence array. If not found in db, return false.

		if not sequence:
			print('sequence not found in sequence DB file, so extracting from gtfs tables instead.')
			# Picking the first trip instance for each direction of the route.
			
			sequence = extractSequencefromGTFS(dbfile, route_id)

			# we have extracted the sequence from trips and stop_times tables. That took time! Now we store it in the separate sequence db so that next time it's accessed quicker.
			print("Saving extracted sequence to  sequence DB file so it doesn't take long next time.")
			sequenceSaveDB(sequenceDBfile, route_id, sequence)
	
		# so either way, we now have a sequence array.
		
		self.write(json.dumps(sequence))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/sequence GET call took {} seconds.".format(round(end-start,2)))


	#using same API endpoint, post request for saving.
	def post(self):
		# /API/sequence?pw=${pw}&route=${selected_route_id}
		start = time.time()
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		route_id = self.get_argument('route')
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		'''
		# sample data = [
			['ALVA','PNCU','CPPY','ATTK','MUTT','KLMT','CCUV','PDPM','EDAP','CGPP','PARV','JLSD','KALR','LSSE','MGRD'],
			['MACE','MGRD','LSSE','KALR','JLSD','PARV','CGPP','EDAP','PDPM','CCUV','KLMT','MUTT','ATTK','CPPY','PNCU','ALVA']
		];
		'''
		data = json.loads( self.request.body.decode('UTF-8') )
		
		if sequenceSaveDB(sequenceDBfile, route_id, data):
			self.write('saved sequence to sequence db file.')
		else:
			self.set_status(400)
			self.write("Error, could not save to sequence db for some reason.")
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("API/sequence POST call took {} seconds.".format(round(end-start,2)))


class trips(tornado.web.RequestHandler):
	def get(self):
		# API/trips?route=${route_id}
		start = time.time()
		route_id = self.get_argument('route')
		'''
		with open("GTFS/trips.txt", encoding='utf8') as f:
			tripsArray = list(csv.DictReader(f))
		'''
		tripsArray = readTableDB(dbfile, 'trips')
		
		# to do: check if 
		routeTrips = list( filter( lambda x : x['route_id'] == route_id, tripsArray ))
		self.write(json.dumps(routeTrips))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/trips GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start  = time.time() # time check, from https://stackoverflow.com/a/24878413/4355695
		# ${APIpath}trips?pw=${pw}&route=${route_id}
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		route_id = self.get_argument('route')
		if not route_id :
			self.set_status(400)
			self.write("Error: invalid route_id.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		tripsData = json.loads( self.request.body.decode('UTF-8') )

		# heres where all the action happens:
		result = replaceTableDB(dbfile, 'trips', tripsData, key='route_id', value=route_id)
		
		if result:
			self.write('Changed trips data for route '+route_id)
		else:
			self.set_status(400)
			self.write("Some error happened.")
		
		end = time.time()
		print("/API/trips POST call took {} seconds.".format(round(end-start,2)))


class stopTimes(tornado.web.RequestHandler):
	def get(self):
		# API/stopTimes?trip=${trip_id}
		start = time.time()
		trip_id = self.get_argument('trip')
		'''
		with open("GTFS/stop_times.txt", encoding='utf8') as f:
			stoptimesArray = list(csv.DictReader(f))
		'''
		stoptimesArray = readTableDB(dbfile, 'stop_times')
		
		tripRows = list( filter( lambda x : x['trip_id'] == trip_id, stoptimesArray ))
		self.write(json.dumps(tripRows))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/stopTimes GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		start  = time.time() # time check, from https://stackoverflow.com/a/24878413/4355695
		# ${APIpath}stopTimes?pw=${pw}&trip=${trip_id}
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		trip_id = self.get_argument('trip')
		if not trip_id :
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
		print("/API/stopTimes POST call took {} seconds.".format(round(end-start,2)))


class routeIdList(tornado.web.RequestHandler):
	def get(self):
		# API/routeIdList
		start = time.time()
		'''
		with open("GTFS/routes.txt", encoding='utf8') as f:
			routesArray = list(csv.DictReader(f))
		'''
		routesArray = readTableDB(dbfile, 'routes')

		route_id_list = [ n['route_id'] for n in routesArray ]
		self.write(json.dumps(route_id_list))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/routeIdList GET call took {} seconds.".format(round(end-start,2)))


class calendar(tornado.web.RequestHandler):
	def get(self):
		# API/calendar
		start = time.time() # time check
		
		calendarArray = readTableDB(dbfile, 'calendar')

		self.write(json.dumps(calendarArray))
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/calendar GET call took {} seconds.".format(round(end-start,2)))

	def post(self):
		# API/calendar?pw=${pw}
		start = time.time() # time check
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		# received text comes as bytestring. Convert to unicode using .decode('UTF-8') from https://stackoverflow.com/a/6273618/4355695
		calendarData = json.loads( self.request.body.decode('UTF-8') )
		
		#csvwriter(calendarData,'calendar.txt')
		replaceTableDB(dbfile, 'calendar', calendarData)

		self.write('ok got it bro')
		# time check, from https://stackoverflow.com/a/24878413/4355695
		end = time.time()
		print("/API/calendar POST call took {} seconds.".format(round(end-start,2)))


class serviceIds(tornado.web.RequestHandler):
	def get(self):
		# API/serviceIds
		
		calendarArray = readTableDB(dbfile, 'calendar')
		
		service_id_list = [ n['service_id'] for n in calendarArray ]
		self.write(json.dumps(service_id_list))

class stats(tornado.web.RequestHandler):
	def get(self):
		# API/stats
		stats = GTFSstats(dbfile)
		self.write(json.dumps(stats))


class gtfsImportZip(tornado.web.RequestHandler):
	def post(self):
		pw = self.get_argument('pw')
		if pw != password:
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
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 
		commit = self.get_argument('commit')
		commitFolder = '{:GTFS/%Y-%m-%d-}'.format(datetime.datetime.now()) + commit + '/'
		finalmessage = exportGTFS (dbfile, commitFolder) 
		# this is the main function. it's in GTFSserverfunctions.py
		
		self.write(finalmessage)
		end = time.time()
		print("/API/commitExport GET call took {} seconds.".format(round(end-start,2)))


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

		writeback = { "commits": dirnames }
		self.write(json.dumps(writeback))
		end = time.time()
		print("pastCommits GET call took {} seconds.".format(round(end-start,2)))


class XMLUpload(tornado.web.RequestHandler):
	def post(self):
		# `${APIpath}XMLUpload?pw=${pw}`,
		start = time.time()
		pw = self.get_argument('pw')
		if pw != password:
			self.set_status(400)
			self.write("Error: invalid password.")
			return 

		weekdayXML = uploadaFile( self.request.files['weekdayXML'][0] )
		sundayXML = uploadaFile( self.request.files['sundayXML'][0] )
		
		self.write(weekdayXML + ',' + sundayXML)
		end = time.time()
		print("XMLUpload POST call took {} seconds.".format(round(end-start,2)))



def make_app():
	return tornado.web.Application([
		#(r"/API/data", APIHandler),
		(r"/API/allStops", allStops),
		(r"/API/allStopsKeyed", allStopsKeyed),
		(r"/API/allRoutes", allRoutes),
		(r"/API/fareAttributes", fareAttributes),
		(r"/API/fareRulesPivoted", fareRulesPivoted),
		(r"/API/agency", agency),
		(r"/API/saveAgency", saveAgency),
		(r"/API/saveRoutes", saveRoutes),
		(r"/API/calendar", calendar),
		(r"/API/sequence", sequence),
		(r"/API/trips", trips),
		(r"/API/stopTimes", stopTimes),
		(r"/API/routeIdList", routeIdList),
		(r"/API/serviceIds", serviceIds),
		(r"/API/stats", stats),
		(r"/API/commitExport", commitExport),
		(r"/API/pastCommits", pastCommits),
		(r"/API/gtfsImportZip", gtfsImportZip),
		(r"/API/XMLUpload", XMLUpload),
		(r"/(.*)", tornado.web.StaticFileHandler, {"path": root, "default_filename": "index.html"})
	])

if __name__ == "__main__":
	app = make_app()
	port = int(os.environ.get("PORT", 5000))
	app.listen(port)
	print("Open http://localhost:" + str(port) + " in your Browser")
	tornado.ioloop.IOLoop.current().start()

'''
# UNZIP a zip file, from https://stackoverflow.com/a/36662770/4355695
with zipfile.ZipFile("file.zip","r") as zip_ref:
    zip_ref.extractall("targetdir")
'''