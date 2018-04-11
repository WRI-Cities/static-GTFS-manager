'''
# dry run XML 2 GTFS
import json
import os
import time, datetime

import xmltodict, csv
import pandas as pd
from collections import OrderedDict
import zipfile, zlib
from tinydb import TinyDB, Query
import webbrowser
import pandas as pd
from Crypto.PublicKey import RSA
import shutil # used in fareChartUpload to fix header if changed
import pathlib
from math import sin, cos, sqrt, atan2, radians

# setting constants
root = os.path.dirname(__file__)
dbfile = 'GTFS/db.json'
sequenceDBfile = 'GTFS/sequence.json'
uploadFolder = 'uploads/'
xmlFolder = 'xml_related/'
passwordFile = 'js/rsa_key.bin'

# importing functions.py, embedding it inline to avoid re-declarations etc
#exec(open("functions-from-ph1.py", encoding='utf8').read())
exec(open("GTFSserverfunctions.py", encoding='utf8').read())

configdata = {'checkFaresFlag': True, 'checkCalendarFlag': True, 'sundayXML': '8S0845_MACE.xml', 'stations': 'stations.csv', 'agency_id': 'KMRL', 'start_date': '20180404', 'routes': [{'sundaySchedule': '8S0845_MACE', 'route_long_name': 'Route 1', 'route_short_name': 'R1', 'route_id': 'R1', 'weekdaySchedule': '8W0845_MACE'}], 'agency_name': 'Kochi Metro', 'agency_url': 'http://www.kochimetro.org/', 'fareschart': 'fares-chart.csv', 'checkAgencyFlag': True, 'checkRoutesFlag': True, 'fares': {'F1': 10, 'F2': 20, 'F5': 50, 'F4': 40, 'F3': 30}, 'agency_timezone': 'Asia/Kolkata', 'weekdayXML': '8W0845_MACE.xml', 'end_date': '20990101', 'depotstations': 'STA_COD_3512T_BH,STA_COD_3509T_DN'}

print('config params:')
print(configdata)
'''
def xml2GTFSConvert(configdata):
	outpath = xmlFolder + 'xml2GTFS/'
	pathlib.Path(outpath).mkdir(parents=True, exist_ok=True) 

	# way to get json value: trip.get('SERVICE_ID')

	##########################################################
	# Loading stops lookup table from stations.csv
	# from https://stackoverflow.com/a/38370569/4355695
	with open(xmlFolder + configdata.get('stations','stations.csv'), encoding='utf8') as f: 
			stations = list(csv.DictReader(f))

	stations_total_distance = float( stations[ (len(stations) -1) ]['distance'] )
	print( "Loaded stations.csv, total stops :", len(stations) )
	
	##########################################################
	# Loading list of routes
	routeslist = [n['route_id'] for n in configdata.get('routes')]
	
	##########################################################
	# Loading misc parameters
	timepoint = configdata.get('timepoint',1)
	wheelchair_accessible = configdata.get('wheelchair_accessible',1)
	depot = configdata.get('depotstations','STA_COD_3512T_BH,STA_COD_3509T_DN')
	depotstations = depot.split(',') if depot else []

	##########################################################
	# Initializing the arrays that will collect data for GTFS files
	stop_times_array = []
	trips_array = []
	routes_array = []
	sequences_array = []
	shapes_array = []

	##########################################################
	# make loop for cycling thru routes
	print('Looping thru ' + str(len(configdata.get('routes'))) + ' route(s)')
	for route in configdata.get('routes'):
		route_id = route.get('route_id')
		# Creating row for this route in routes_array which will be stored in GTFS routes.txt
		routes_row = OrderedDict()
		routes_row['route_id'] = route.get('route_id')
		routes_row['route_short_name'] = route.get('route_short_name')
		routes_row['route_long_name'] = route.get('route_long_name')
		routes_row['route_type'] = configdata.get('route_type',1)
		routes_row['route_color'] = configdata.get('route_color','00B7F3')
		routes_row['route_text_color'] = configdata.get('route_text_color','000000')
		routes_array.append(routes_row)

		##########################################################
		# Shape of route
		# skipping.

		##########################################################
		# Begin weekday-sunday loop

		# ditch the old ways! Now we go by schedule!

		#route.get('weekdaySchedule')
		#route.get('sundaySchedule')
		print('Looping thru weekday and sunday')
		for day in ['weekday','sunday']:
			# Loading XML file
			with open( uploadFolder + configdata.get(day+'XML') , encoding='utf8' ) as fd:
				# apologies.. this actually translates to something like open('uploads/XYZ.xml')
				fileholder = xmltodict.parse(fd.read(), attr_prefix='')

			scheduleHolder = fileholder.get('ROOT').get('SCHEDULE')
			# whether the node is single or repeating in the XML, convert it so that it becomes a list to iterate through
			if type(scheduleHolder) == type(OrderedDict()) :
				scheduleHolder = [scheduleHolder]

			scheduleRow = next((x for x in scheduleHolder if x.get('NAME') == route.get(day+'Schedule')), None )
			# takes the first instance. from https://stackoverflow.com/a/34894322/4355695
			
			if not scheduleRow:
				continue

			trips_from_xml = scheduleRow.get('TRIPS').get('TRIP')
			
			service_id = 'SU' if (day == 'sunday') else 'WK'
			# in GTFS calendar.txt, service_id used to indicate whether it's for weekdays or sunday. It is also used in GTFS trips.txt
			
			##########################################################
			# Starting trips loop
			print('Looping thru ' + str(len(trips_from_xml)) + ' trips')
			for trip in trips_from_xml :
				# cycle through each trip
				stopsnum = len(trip.get('STOP'))
				if( ( trip['STOP'][0]['TOP'] in depotstations) or (trip['STOP'][-1]['TOP'] in depotstations) ):
					# if trip's starting or terminating station is the MUTTOM depot, then exclude that trip
					continue
				'''
				Trip_id naming convention : R001WKL055600
				R001 : route numer. We have only one route till now, so R001
				WK : weekday. for sunday, SU
				L : Left direction. opposite trips: R for Right. In future if nomenclature changes to up/down then U/D would be used.
				055600 : start time of trip (arrival_time of first stop). 
				'''
				direction = 'R' if (trip['DIRECTION'] == 'RIGHT') else 'L'
				direction_id = 0 if (trip['DIRECTION'] == 'RIGHT') else 1 # to be used in GTFS trips.txt
				timestamp = trip['ENTRY_TIME'].replace(':','')
				
				trip_id = str( route_id + service_id + direction + timestamp )
				
				timer_var = get_sec(trip['ENTRY_TIME'])
				
				##########################################################
				# Creating row for GTFS trips.txt
				trips_row = OrderedDict()	
				trips_row['route_id'] = route_id
				trips_row['service_id'] = service_id
				trips_row['trip_id'] = trip_id

				# finding the last stop of this trip because we need it for the trip's headsign
				last_stop_technicalname = trip['STOP'][-1]['TOP']
				findstationrow = next((item for item in stations if (item["down_id"] == last_stop_technicalname or item["up_id"] == last_stop_technicalname) ), None)
				trips_row['trip_headsign'] = findstationrow['stop_name']

				trips_row['direction_id'] = direction_id
				trips_row['block_id'] = int( trip['SERVICE_ID'] ) # vehicle number is stored in "SERVICE_ID"
				
				# shape related.. assigning blank for now so the column makes its way to csv
				# trips_row['shape_id'] = route_id + '_' + str(direction_id)
				trips_row['shape_id'] = ''

				trips_row['wheelchair_accessible'] = int(wheelchair_accessible)
				trips_array.append( trips_row )

				##########################################################
				# Looping through the stops in the trip
				# print('Looping thru ' + str(stopsnum) + ' stops')
				for i in range(stopsnum):
					# cycle through each stop
					if i > 0 :
						previous_dwell = int(trip['STOP'][i-1]['DWELLTIME'])
						previous_run = int(trip['RUN'][i-1]['RUNTIME'])
						timer_var +=  previous_dwell + previous_run
						previous_technicalstopname = str( trip['STOP'][i-1]['TOP'] )
					else :  previous_technicalstopname = None

					trip['STOP'][i]['arrival_time'] = time.strftime('%H:%M:%S', time.gmtime(timer_var))
				
					this_dwell = int(trip['STOP'][i]['DWELLTIME'])
					
					trip['STOP'][i]['departure_time'] = time.strftime('%H:%M:%S', time.gmtime(timer_var + this_dwell ) )
					
					# Calculating time_offset : time between arrival at this stop and arrival at last stop
					
					time_offset = get_sec(trip['STOP'][i]['arrival_time']) - get_sec(trip['STOP'][int(i-1)]['arrival_time']) if( i > 0 ) else  0

					##########################################################
					# stop_id lookup
					technicalstopname = str( trip['STOP'][i]['TOP'] )
					
					# searching the stations array/dict for the first occureance https://stackoverflow.com/a/8653568/4355695
					findstationrow = next((item for item in stations if (item["down_id"] == technicalstopname or item["up_id"] == technicalstopname) ), None)
					stop_id = str( findstationrow['stop_id']) if findstationrow else "ERROR"

					##########################################################
					# distance calculations
					shape_dist_traveled = float( format( float(findstationrow['distance']), '.2f' )) if ( direction_id == 0 ) else float(format( ( stations_total_distance - float(findstationrow['distance']) ), '.2f'))
					
					if ( previous_technicalstopname and findstationrow ) :
						previous_findstationrow = next((item for item in stations if (item["down_id"] == previous_technicalstopname or item["up_id"] == previous_technicalstopname) ), None)
						if ( previous_findstationrow ) :
							LLdist = lat_long_dist( previous_findstationrow['stop_lat'], previous_findstationrow['stop_lon'], findstationrow['stop_lat'], findstationrow['stop_lon'] )
						else : LLdist = 0
					else : LLdist = 0

					##########################################################		
					# arranging in the format of GTFS stop_times.txt
					newrow = OrderedDict() # instead of {} . Maintains order. from https://stackoverflow.com/a/28231217/4355695
					newrow["trip_id"] = trip_id
					newrow["arrival_time"] = trip['STOP'][i]['arrival_time']
					newrow["departure_time"] = trip['STOP'][i]['departure_time']
					newrow["stop_id"] = stop_id
					newrow["stop_sequence"] = int( i + 1 )
					newrow["timepoint"] = timepoint
					newrow["shape_dist_traveled"] = shape_dist_traveled
					
					# additional fields
					newrow["route_id"] = route_id
					newrow["direction"] = direction # this is specific to KMRL.. for generic its better to stick to direction_id
					newrow["direction_id"] = direction_id
					newrow["dwelltime"] = this_dwell
					newrow["time_offset"] = time_offset
					newrow["block_id"] = intcheck( trip.get('SERVICE_ID') ) # one id for each vehicle
					newrow["tripnum"] = intcheck(trip.get('NUMBER'))
					newrow["next_tripnum"] = intcheck(trip.get('NEXT_NUMBER'))
					newrow["prev_tripnum"] = intcheck(trip.get('PREVIOUS_NUMBER'))
					newrow['LLdist'] = LLdist
					
					# adding this dict / json obect as an array element in stop_times_array
					stop_times_array.append( newrow ) # note: this will happen (total trips x total stops) times
				
					# End of stops loop
				# End of trips loop
			# End of weekday-sunday loop
		# End of routes loop
	##########################################################

	# Creating output files	
	# How about directly inserting into the database?

	###############
	# take backup first
	print('Taking backup of existing contents of db')
	backupfolder = '{:GTFS/%Y-%m-%d-backup-%H%M}/'.format(datetime.datetime.now())
	#if not os.path.exists(backupfolder):
	#	os.makedirs(backupfolder)
	returnmsg = exportGTFS (dbfile, backupfolder)
	# print(returnmsg)
	print('backup made to folder '+backupfolder)
	
	###############
	# open DB
	db = TinyDB(dbfile, sort_keys=True, indent=2)
	db.purge_tables() # wipe out the database, clean slate.
	print(dbfile + ' purged.')

	# also purge sequenceDB
	db2 = TinyDB(sequenceDBfile, sort_keys=True, indent=2)
	db2.purge_tables() # wipe out the database, clean slate.
	print(sequenceDBfile + ' purged.')
	db2.close()

	###############
	# agency.txt
	agencyArray = [{ 'agency_id': configdata.get('agency_id','KMRL'), 'agency_name':configdata.get('agency_name','Kochi Metro'), 'agency_url':configdata.get('agency_url','http://www.kochimetro.org/'), 'agency_timezone':configdata.get('agency_timezone','Asia/Kolkata') }]
	agencyDB = db.table('agency')
	agencyDB.insert_multiple(agencyArray)
	print('Inserted agency data into DB')

	###############
	# calendar
	calendarArray = []
	calHead = "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date".split(',')
	calWeek = [ 'WK',1,1,1,1,1,1,0,configdata.get('start_date'),configdata.get('end_date')]
	calSun = [ 'SU',0,0,0,0,0,0,1,configdata.get('start_date'),configdata.get('end_date')]
	calendarArray = [ dict(zip(calHead,calWeek)), dict(zip(calHead,calSun)) ]
	calendarDB = db.table('calendar')
	calendarDB.insert_multiple(calendarArray)
	print('Inserted calendar data into DB')
	
	####################
	# stops
	for row in stations: row['zone_id'] = row['stop_id'] 
	# cloning zone_id column, same as stop_id. For use in fares.
	stops_keys = ['stop_id','stop_name','stop_lat','stop_lon','zone_id','wheelchair_boarding']

	stopsArray = [ { i:row[i] for i in stops_keys } for row in stations ]
	# holy smokes, it worked!! iterate thru stops_keys to produce a dict, then iterate thru stations to make array
	stopsDB = db.table('stops')
	stopsDB.insert_multiple(stopsArray)
	print('Inserted stops data into DB')

	##############
	#routes
	routesDB = db.table('routes')
	routesDB.insert_multiple(routes_array)
	print('Inserted routes data into DB')

	##############
	# trips
	tripsDB = db.table('trips')
	tripsDB.insert_multiple(trips_array)
	print('Inserted trips data into DB')

	# stop_times
	stop_times_keys = ['trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence', 'timepoint', 'shape_dist_traveled']
	stop_times_select = [ { i:row[i] for i in stop_times_keys } for row in stop_times_array ]
	stop_timesDB = db.table('stop_times')
	stop_timesDB.insert_multiple(stop_times_select)
	print('Inserted stop_times data into DB')

	# fares
	fares_rules_array = csvunpivot(uploadFolder + configdata.get('fareschart','fares-chart.csv'), ['Stations'], 'destination_id', 'fare_id', ['Stations','destination_id','fare_id'])
	# update: csvunpivot function now by itself renames "Stations" to "origin_id" and removes all NaN values. And the last argument is for sorting by values!. Pandas dude: you don't need to do shit with dict when you've got freakin pandas.
	fare_rulesDB = db.table('fare_rules')
	fare_rulesDB.insert_multiple(fares_rules_array)
	print('Inserted fare_rules data into DB')

	# fare attributes
	# we directly have them in configdata json.
	# fare_id,price,currency_type,payment_method,transfers
	currency_type = configdata.get('currency_type','INR')
	payment_method = configdata.get('payment_method',0)
	transfers = configdata.get('transfers','')
	
	faresHolder = configdata.get('fares')
	fare_attributes_array = [ {'fare_id': x, 'price':faresHolder[x], 'currency_type':currency_type, 'payment_method':payment_method, 'transfers':transfers,  } for x in faresHolder ]

	fare_attributesDB = db.table('fare_attributes')
	fare_attributesDB.insert_multiple(fare_attributes_array)
	print('Inserted fare_attributes data into DB')


	# translations
	# stop names
	secondlang = configdata.get('secondlang','ml')
	translations_array = [ {'trans_id': x['stop_name'], 'lang':secondlang, 'translation': x['stop_name_secondlang'] } for x in stations ]
	
	# adding agency
	translations_array.append( { 'trans_id': configdata.get('agency_name','Kochi Metro'), 'lang':secondlang, 'translation': configdata.get('agency_name_translation','കൊച്ചി മെട്രോ') } )
	translationsDB = db.table('translations')
	translationsDB.insert_multiple(translations_array)
	print('Inserted translations data into DB')


	# and finally ending it by closing db file
	db.close()
	print('\nXML data successfully imported into DB.')


# running it
# xml2GTFSConvert(configdata)