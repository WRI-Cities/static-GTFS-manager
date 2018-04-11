#GTFSserverfunctions.py
# this file is to be inline included in the main script. Seriously, I do not want to keep declaring import statements everywhere.

def csvwriter( array2write, filename, keys=None ):
	if not keys:
		keys = list(array2write[0].keys())
	# Writing dict list to CSV from https://stackoverflow.com/a/3087011/4355695
	with open(filename, 'w', newline='\n', encoding='utf8') as output_file:
		dict_writer = csv.DictWriter(output_file, keys, extrasaction='ignore') 
		# extrasaction='ignore' : ignore extra fields in the dict, from https://stackoverflow.com/a/26944505/4355695
		dict_writer.writeheader()
		dict_writer.writerows(array2write)
	print( 'Created', filename )
	# logmessage( 'Created', filename )


def exportGTFS (dbfile, folder):
	start = time.time()

	# create commit folder
	if not os.path.exists(folder):
		os.makedirs(folder)
	else:
		returnmessage = 'Folder with same name already exists: ' + folder + '. Please choose a different commit name.'
		return returnmessage

	db = tinyDBopen(dbfile)
	# have to do the other params even when I'm just reading, as otherwise it changes that file.

	#folder = 'commitfolder/'
	tables = db.tables()

	print('Tables found in ' + dbfile + ': ' + str(list(tables)) )

	# let's zip them too!
	# may have to delete existing? Nah, it over-writes.
	zf = zipfile.ZipFile(folder + 'gtfs.zip', mode='w')
	
	for tablename in db.tables():
		feedDb = db.table(tablename)
		tableArray = feedDb.all()
		# print( tablename + ': ' + str(len(tableArray)) + ' records' )
		if( len(tableArray) ):
			csvwriter(tableArray, folder + tablename + '.txt')
			zf.write(folder + tablename + '.txt' , arcname=tablename + '.txt', compress_type=zipfile.ZIP_DEFLATED )
			print('Added ' + tablename + '.txt to gtfs.zip')
		else:
			print(tablename + ' is empty so not exporting that.')
	zf.close()
	db.close()

	returnmessage = '<p>Success! Generated GTFS feed at <a href="' + folder + 'gtfs.zip' + '">' + folder + 'gtfs.zip<a></b>. Click to download.</p>'

	end = time.time()
	print("Function to export GTFS from db took {} seconds.".format(round(end-start,2)))

	return returnmessage

def importGTFS(dbfile, zipname):
	start1 = time.time()
	
	# take backup first
	print('Taking backup of existing contents of db')
	backupfolder = '{:GTFS/%Y-%m-%d-backup-%H%M}/'.format(datetime.datetime.now())
	exportGTFS (dbfile, backupfolder)
	print('backup made to folder '+backupfolder)

	# unzip imported zip

	# to do: make a separate folder to unzip in, so that when importing we don't end up picking other .txt files that happen to be in the general uploads folder.
	if not os.path.exists(uploadFolder):
		os.makedirs(uploadFolder)

	fileToUnzip = uploadFolder + zipname
	# UNZIP a zip file, from https://stackoverflow.com/a/36662770/4355695
	with zipfile.ZipFile( fileToUnzip,"r" ) as zf:
		zf.extractall(uploadFolder)

	# loading names of the unzipped files
	# scan for txt files, non-recursively, only at folder level. from https://stackoverflow.com/a/22208063/4355695
	filenames = [f for f in os.listdir(uploadFolder) if f.lower().endswith('.txt') and os.path.isfile(os.path.join(uploadFolder, f))]
	print(filenames)

    # initiating and purging the db
	db = tinyDBopen(dbfile)
	db.purge_tables() # wipe out the database, clean slate.
	print(dbfile + ' purged.')

	# also purge sequenceDB
	db2 = TinyDB(sequenceDBfile, sort_keys=True, indent=2)
	db2.purge_tables() # wipe out the database, clean slate.
	print(sequenceDBfile + ' purged.')
	db2.close()

	# Pandas: defining certain columns to be read as string by passing a json to dtype option. from https://stackoverflow.com/a/36938326/4355695
	dtype_dic= {
		'service_id':str, 'end_date':str, 'start_date':str, #calendar
		'route_id':str, 'route_short_name':str, 'route_long_name':str, 'route_text_color': str, 'route_color' : str, #routes
		'fare_id': str, 'shape_id':str, 
		'stop_id': str, 'zone_id': str, 'stop_name':str, #stops
		'trip_id' : str, 'block_id': str, 'trip_headsign':str, #trips
		'trans_id':str, 'translation':str, #translation
		'agency_id':str, 'agency_name':str, 'agency_timezone':str, 'agency_url':str #agency
	}
	# damn this is getting exhausting. And what if the user uploads a feed having custom columns that also need to be string?? There should be a way to define all columns as string except a chosen few. Posted a question on stackoverflow for it: https://stackoverflow.com/questions/49684951/pandas-read-csv-dtype-read-all-columns-but-few-as-string		
	
	for feedfile in filenames:
		#with open(uploadFolder + feedfile, encoding='utf8') as f:
			#feedArray = list(csv.DictReader(f))
		# using Pandas to read the csv.
		feedArray = pd.read_csv(uploadFolder + feedfile , na_filter=False, dtype = dtype_dic).to_dict('records')
		# na_filter=False to read blank cells as empty strings instead of NaN. from https://stackoverflow.com/a/45194703/4355695
		# and passing the dtype options defined above to read certain columns as string.
		# at end, converting the pandas dataframe to a dict array.

		feed = feedfile[:-4].lower() # strip .txt from end, and set to lowercase
		feedDb = db.table(feed)
		feedDb.insert_multiple(feedArray)
		del feedArray

	db.close()



	end1 = time.time()
	print("Loaded external GTFS.. full function took {} seconds.".format( round(end1-start1,2) ))


def GTFSstats(dbfile):
	start = time.time()
	db = tinyDBopen(dbfile)
	content = '';
	for tablename in db.tables():
		feedDb = db.table(tablename)
		count = len(feedDb)
		if count:
			content = content + tablename + ': ' + str( count ) + ' entries<br>'
	
	db.close()
	# to do: last commit mention
	end = time.time()
	print("GTFSstats function took {} seconds.".format( round(end-start, 2) ) )
	return content


def readTableDB(dbfile, tablename, key=None, value=None):
	db = tinyDBopen(dbfile)
	tableDb = db.table(tablename)
	
	if(key and value):
		Item = Query()
		count = tableDb.count(Item[key] == value)
		print(tablename + ' has ' + str(count) + ' rows for ' + key + ' = ' + str(value) )
		
		tableArray = tableDb.search(Item[key] == value)
		# print(tableArray) 
		#oh good the query doesn't error out when no match found, it merely returns empty array!

	else:
		tableArray = tableDb.all()

	db.close()
	return tableArray


def replaceTableDB(dbfile, tablename, data, key=None, value=None):
	db = tinyDBopen(dbfile)
	tableDb = db.table(tablename)

	if(key and value):
		Item = Query()
		count = tableDb.count(Item[key] == value)
		tableDb.remove(Item[key] == value)
	else:
		tableDb.purge() #this is a bit scary..
		print('Table ' + tablename + ' emptied in ' + dbfile)

	tableDb.insert_multiple(data)
	print('Inserted ' + str(len(data)) + ' entries into table ' + tablename + ' in ' + dbfile )
	db.close()
	return True


def sequenceSaveDB(sequenceDBfile, route_id, data, shapes=None):
	'''
	data = [
		['ALVA','PNCU','CPPY','ATTK','MUTT','KLMT','CCUV','PDPM','EDAP','CGPP','PARV','JLSD','KALR','LSSE','MGRD'],
		['MACE','MGRD','LSSE','KALR','JLSD','PARV','CGPP','EDAP','PDPM','CCUV','KLMT','MUTT','ATTK','CPPY','PNCU','ALVA']
	];
	'''
	dataToUpsert = {'route_id': route_id, '0': data[0], '1': data[1] }
	if shapes:
		dataToUpsert.update({ 'shape0':shapes[0], 'shape1':shapes[1] })

	db = tinyDBopen(sequenceDBfile)
	Item = Query()
	status = True
	try:
		db.upsert( dataToUpsert, Item['route_id'] == route_id )
	except:
		status = False
	db.close()
	return status

def sequenceReadDB(sequenceDBfile, route_id):
	db = tinyDBopen(sequenceDBfile)
	
	Item = Query()
	'''
	check = db.contains(Item['route_id'] == route_id)
	if not check:
		db.close()
		return False
	'''
	sequenceItem = db.search(Item['route_id'] == route_id)
	db.close()

	if sequenceItem == []:
		return False

	sequenceArray = [ sequenceItem[0]['0'], sequenceItem[0]['1'] ]
	print('Got the sequence from sequence db file.')
	return sequenceArray
	'''
	sequenceItem = db.search(Item['route_id'] == route_id)
	sequenceArray = [ sequenceItem[0]['0'], sequenceItem[0]['1'] ]
	print(sequenceArray)
	db.close()
	return False
	'''

def extractSequencefromGTFS(dbfile, route_id):
	db = tinyDBopen(dbfile)
	Item = Query()
	tripsDB = db.table('trips')

	# note: for AND or OR conditions within a tinDB query, have to use &,| and enclose everthing in brackets. From https://tinydb.readthedocs.io/en/latest/usage.html#query-modifiers

	check = tripsDB.contains( (Item['route_id'] == route_id) & ( (Item['direction_id'] == 0) | (Item['direction_id'] == '0') ) )
	if check:
		oneTrip0 = tripsDB.search( (Item['route_id'] == route_id) & ( (Item['direction_id'] == 0) | (Item['direction_id'] == '0') ) )[0]['trip_id']
		print('oneTrip0 found: '+oneTrip0)
	else: 
		# no trips found, return a blank sequence and get out!
		print('Nothing found for oneTrip0')
		db.close()
		sequence = [ [], [] ]
		return sequence

	check = tripsDB.contains( (Item['route_id'] == route_id) & ( (Item['direction_id'] == 1) | (Item['direction_id'] == '1') ) )
	if check:
		oneTrip1 = tripsDB.search( (Item['route_id'] == route_id) & ( (Item['direction_id'] == 1) | (Item['direction_id'] == '1') ) )[0]['trip_id']
		print('oneTrip1 found: '+oneTrip1)
	else:
		# no reverse direction.. no probs, set as None
		oneTrip1 = None

	'''
	oneTrip0 = list( filter( lambda x : x['route_id'] == route_id and x['direction_id'] == '0', tripsArray ))[0]['trip_id']		
	oneTrip1 = list( filter( lambda x : x['route_id'] == route_id and x['direction_id'] == '1', tripsArray ))[0]['trip_id']
	# note: for circular routes that don't have a second direction id this will result in error. Need to handle that.
	'''
	'''
	stoptimesArray = readTableDB(dbfile, 'stop_times')	
	# list comprehension: directly extracting stop_id's from stop_times full array with trip filter applied
	sequence.append( [n['stop_id'] for n in stoptimesArray if n['trip_id'] == oneTrip0 ] )
	sequence.append( [n['stop_id'] for n in stoptimesArray if n['trip_id'] == oneTrip1 ] )
	'''
	stop_timesDB = db.table('stop_times')

	# commenting this out because it seems its unnecessary..
	'''
	check = stop_timesDB.contains(Item['trip_id'] == oneTrip0)
	if check:
		array0 = [ n['stop_id'] for n in stop_timesDB.search(Item['trip_id'] == oneTrip0) ]
	else:
		array0 = []
	
	check = stop_timesDB.contains(Item['trip_id'] == oneTrip1)
	# possible gamble : for circular routes, oneTrip1 will be None as per above. So this should result in check being False.
	if check:
		array1 = [ n['stop_id'] for n in stop_timesDB.search(Item['trip_id'] == oneTrip1) ]
	else:
		array1 = []
	'''
	array0 = [ n['stop_id'] for n in stop_timesDB.search(Item['trip_id'] == oneTrip0) ]
	array1 = [ n['stop_id'] for n in stop_timesDB.search(Item['trip_id'] == oneTrip1) ]
	# if the condition doesn't work out, then these arrays will be empty arrays, won't error out.
	
	sequence = [array0, array1]

	# to do: If the selected route is absent from trips.txt at present, then pass an empty sequence.
	# sequence = [ [], [] ]
	db.close()
	return sequence

def uploadaFile(fileholder):
	# adapted from https://techoverflow.net/2015/06/09/upload-multiple-files-to-the-tornado-webserver/
	# receiving a form file object as argument.
	# saving to uploadFolder. In case same name file already exists, over-writing.
	
	filename = fileholder['filename'].replace("/", "")
	# zapping folder redirections if any

	print('Saving filename: ' + filename + ' to ' + uploadFolder)
	
	if not os.path.exists(uploadFolder):
		os.makedirs(uploadFolder)

	with open(uploadFolder+filename, "wb") as out:
		# Be aware, that the user may have uploaded something evil like an executable script ...
		# so it is a good idea to check the file content (xfile['body']) before saving the file
		out.write(fileholder['body'])
	return filename

###########################

def diagnoseXMLs(weekdayXML, sundayXML, depot=None) :
	try:
		weekdayReport = '<p>Weekday XML: <a target="_blank" href="' + uploadFolder + weekdayXML + '">' + weekdayXML + '&#x2197;</a></p>'
		sundayReport = '<p>Sunday XML: <a target="_blank" href="' + uploadFolder + sundayXML + '">' + sundayXML + '&#x2197;</a></p>'
		weekdaySchedules = []
		sundaySchedules = []
		fullStopsList = set()

		# depot trip checking:
		dropDepotTrips = 0
		
		if depot:
			depotsList = depot.split(',')
		else:
			depotsList = []
		print('Depot stations: ' + str(depotsList) )
		# logic: if first stop or last stop is in depotsList, then increment dropDepotTrips counter. 

		# 1. before processing XMLs, lets get the mapped stops list from the resident stations.csv
		mappedStopsList = readStationsCSV(xmlFolder + 'stations.csv')
		

		# 2. Loading Weekday XML file.
		with open( uploadFolder + weekdayXML , encoding='utf8' ) as fd:
			fileholder = xmltodict.parse(fd.read(), attr_prefix='')
		# trips_from_xml = fileholder['ROOT']['SCHEDULE']['TRIPS']['TRIP']
		scheduleHolder = fileholder['ROOT']['SCHEDULE']
		# whether the node is single or repeating in the XML, convert it so that it becomes a list to iterate through
		if type(scheduleHolder) == type(OrderedDict()) :
			scheduleHolder = [scheduleHolder]
			# this makes a single schedule compatible with multiple schedule entries in xml
		
		print(str(len(scheduleHolder)) + ' route(s) found in ' + weekdayXML)

		for schedule in scheduleHolder:
			schedule_name = schedule['NAME']
			stopsList = set()
			directions = set()
			vehicles = set()
			timesList = set()
			for trip in schedule['TRIPS']['TRIP']:
				timesList.add(trip['ENTRY_TIME'])
				directions.add(trip['DIRECTION'])
				vehicles.add(trip['SERVICE_ID'])
				# check if first or last stop is in depotsList
				if (trip['STOP'][0]['TOP'] in depotsList) or ( trip['STOP'][-1]['TOP'] in depotsList ):
					dropDepotTrips += 1
				for stop in trip['STOP']:
					stopsList.add(stop['TOP'])
			fullStopsList.update(stopsList)

			# sorting: https://www.tutorialspoint.com/python/list_sort.htm
			sortedTimesList = list(timesList)
			sortedTimesList.sort()

			weekdayReport += '<p><b>Schedule: ' + schedule_name + '</b>'
			weekdayReport += '<br>Trips: ' + str( len( schedule['TRIPS']['TRIP'] ))
			weekdayReport += '<br>Vehicles: ' + str( len( vehicles ))
			weekdayReport += '<br>Directions: ' + str( len( directions ))
			weekdayReport += '<br>First trip: ' + sortedTimesList[0]
			weekdayReport += '<br>Last trip: ' + sortedTimesList[-1] + '</p>'
			weekdaySchedules.append(schedule_name)


		################
		# 3. Loading Sunday XML file.
		with open( uploadFolder + sundayXML , encoding='utf8' ) as fd:
			fileholder = xmltodict.parse(fd.read(), attr_prefix='')
		# trips_from_xml = fileholder['ROOT']['SCHEDULE']['TRIPS']['TRIP']
		scheduleHolder = fileholder['ROOT']['SCHEDULE']
		# whether the node is single or repeating in the XML, convert it so that it becomes a list to iterate through
		if type(scheduleHolder) == type(OrderedDict()) :
			scheduleHolder = [scheduleHolder]
			# this makes a single schedule compatible with multiple schedule entries in xml
		
		print(str(len(scheduleHolder)) + ' route(s) found in ' + sundayXML)
		
		for schedule in scheduleHolder:
			schedule_name = schedule['NAME']
			stopsList = set()
			directions = set()
			vehicles = set()
			timesList = set()
			for trip in schedule['TRIPS']['TRIP']:
				timesList.add(trip['ENTRY_TIME'])
				directions.add(trip['DIRECTION'])
				vehicles.add(trip['SERVICE_ID'])
				# check if first or last stop is in depotsList
				if (trip['STOP'][0]['TOP'] in depotsList) or ( trip['STOP'][-1]['TOP'] in depotsList ):
					dropDepotTrips += 1
				for stop in trip['STOP']:
					stopsList.add(stop['TOP'])
			fullStopsList.update(stopsList)

			sortedTimesList = list(timesList)
			sortedTimesList.sort()

			sundayReport += '<p><b>Schedule: ' + schedule_name + '</b>'
			sundayReport += '<br>Trips: ' + str( len( schedule['TRIPS']['TRIP'] ))
			sundayReport += '<br>Vehicles: ' + str( len( vehicles ))
			sundayReport += '<br>Directions: ' + str( len( directions ))
			sundayReport += '<br>First trip: ' + sortedTimesList[0]
			sundayReport += '<br>Last trip: ' + sortedTimesList[-1] + '</p>'
			sundaySchedules.append(schedule_name)

		############
		# 4. Calculate missing stops and write verbose.
		check = len(fullStopsList - mappedStopsList)

		if not check:
			missingStopsReport = '<p><font color="green"><b><font size="6">&#10004;</font> All internal stops are mapped!</b></font><br>We are good to proceed to step 3.</p>';
			stationsStatus = missingStopsReport
			allStopsMappedFlag = True
		else :
			missingListing = ''
			for item in (fullStopsList - mappedStopsList):
				missingListing += '<li>' + item + '</li>'
			missingStopsReport = '<p><font color="red"><b><font size="5">&#10008;</font>  ' + str(check) + ' stop(s) are missing</b></font> from the stations mapping list.<br>Proceed to step 2, and ensure that the following internal station names are present under either <b><i>up_id</i></b> or <b><i>down_id</i></b> columns, with the corresponding columns filled properly:<br><b><ul>' + missingListing + '</ul></b></p>'
			stationsStatus = '<p><font color="red"><b><font size="5">&#10008;</font>  ' + str(check) + ' stop(s) are missing</b></font> from the stations mapping list.<br>Ensure that the following internal station names are present under either <b><i>up_id</i></b> or <b><i>down_id</i></b> columns, with the corresponding columns filled in properly:<br><b><ul>' + missingListing + '</ul></b></p>'
			allStopsMappedFlag = False

		######### 
		# 5. putting the report together in HTML
		diagBox = '<small><div class="row"><div class="col">' + weekdayReport + '</div><div class="col">' + sundayReport + '</div></div></small>' + '<hr>' + missingStopsReport
		
		######### 
		# 6. Appending 
		dropDepotTripsText = '<div class="alert alert-warning">Note: Total <u><b>' + str(dropDepotTrips) + '</b> trips will be dropped</u> from the XMLs as they are depot trips, ie, they originate from or terminate at the depot station (chosen in step 2).</div>'
		diagBox += dropDepotTripsText
		stationsStatus += dropDepotTripsText

		######### 
		# 6. Return a dict
		return { 'report':diagBox, 'stationsStatus':stationsStatus, 'weekdaySchedules':weekdaySchedules,
		'sundaySchedules':sundaySchedules, 'allStopsMappedFlag':allStopsMappedFlag }
	except:
		return False
##############################

def readStationsCSV(csvfile = xmlFolder + 'stations.csv'):
	stations = pd.read_csv(csvfile)
	
	# load up_id and down_id columns, but removing blank/null values. From https://stackoverflow.com/a/22553757/4355695
	upList = stations[stations['up_id'].notnull()]['up_id']
	downList = stations[stations['down_id'].notnull()]['down_id']

	mappedStopsList = set() # non-repeating list. Silently drops any repeating values getting added.
	mappedStopsList.update( upList )
	mappedStopsList.update( downList )
	return mappedStopsList

##############################

def decrypt(password):
	# from https://stackoverflow.com/questions/2490334/simple-way-to-encode-a-string-according-to-a-password
	# passwordHash
	# 'not all who wander are lost'

	if len(password) == 0:
		print("Why u no entering password! Top right! Top right!")
		return False

	with open(passwordFile, "rb") as f:
			encoded_key = f.read()

	try:
		key = RSA.import_key(encoded_key, passphrase=password)
		return True
	except ValueError:
		return False


##############################

def csvunpivot(filename, keepcols, var_header, value_header, sortby):
	# brought in from xml2GTFS functions.py
	fares_pivoted = pd.read_csv(filename, encoding='utf8')
	print( 'Loading and unpivoting',filename)
	fares_unpivoted = pd.melt(fares_pivoted, id_vars=keepcols, var_name=var_header, value_name=value_header).sort_values(by=sortby)
	
	# rename header 'Stations' to 'origin_id', from https://stackoverflow.com/questions/11346283/renaming-columns-in-pandas/
	# and drop all rows having NaN values. from https://stackoverflow.com/a/13434501/4355695
	fares_unpivoted_clean = fares_unpivoted.rename(columns={'Stations': 'origin_id'}).dropna() 

	fares_dict = fares_unpivoted_clean.to_dict('records')
	return fares_dict

##############################

def get_sec(time_str):
    h, m, s = time_str.split(':')
    return int(h) * 3600 + int(m) * 60 + int(s)

def lat_long_dist(lat1,lon1,lat2,lon2):
	# function for calculating ground distance between two lat-long locations
	R = 6373.0 # approximate radius of earth in km. 

	lat1 = radians( float(lat1) )
	lon1 = radians( float(lon1) )
	lat2 = radians( float(lat2) )
	lon2 = radians( float(lon2) )

	dlon = lon2 - lon1
	dlat = lat2 - lat1

	a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
	c = 2 * atan2(sqrt(a), sqrt(1 - a))

	distance = float(format( R * c , '.2f' )) #rounding. From https://stackoverflow.com/a/28142318/4355695
	return distance

def intcheck(s):
	s = s.strip()
	return int(s) if s else ''

def tinyDBopen(filename):
	# made for the event when db file is corrupted. using this instead of default db open statement will reset the file if corrupted.
	try:
		db = TinyDB(filename, sort_keys=True, indent=2)
	except JSONDecodeError:
		print('DB file ' + filename + ' has invalid json. Making a backup copy and creating a new blank one. Please ask dev to check the backup, named '+ filename+'_backup')
		shutil.copy(filename, filename + '_backup') # copy file. from http://www.techbeamers.com/python-copy-file/
		open(filename, 'w').close() # make a blank file. from https://stackoverflow.com/a/12654798/4355695
		db = TinyDB(filename, sort_keys=True, indent=2)
	return db

def geoJson2shape(route_id, shapefile, shapefileRev=None):
	with open(shapefile, encoding='utf8') as f:
		# loading geojson, from https://gis.stackexchange.com/a/73771/44746
		data = json.load(f)
	print('Loaded',shapefile)
		
	output_array = []
	try:
		coordinates = data['features'][0]['geometry']['coordinates']
	except:
		print('Invalid geojson file ' + shapefile)
		return False

	prevlat = coordinates[0][1]
	prevlon = coordinates[0][0]
	dist_traveled = 0
	i = 0
	for item in coordinates:
		newrow = OrderedDict()
		newrow['shape_id'] = route_id + '_0'
		newrow['shape_pt_lat'] = item[1]
		newrow['shape_pt_lon'] = item[0]
		calcdist = lat_long_dist(prevlat,prevlon,item[1],item[0])
		dist_traveled = dist_traveled + calcdist
		newrow['shape_dist_traveled'] = dist_traveled
		i = i + 1
		newrow['shape_pt_sequence'] = i
		output_array.append(newrow)
		prevlat = item[1]
		prevlon = item[0]
	
	# Reverse trip now.. either same shapefile in reverse or a different shapefile	
	if( shapefileRev ):
		with open(shapefileRev, encoding='utf8') as g:
			data2 = json.load(g)
		print('Loaded',shapefileRev)
		try:
			coordinates = data2['features'][0]['geometry']['coordinates']
		except:
			print('Invalid geojson file ' + shapefileRev)
			return False
	else:
		coordinates.reverse()
	
	prevlat = coordinates[0][1]
	prevlon = coordinates[0][0]
	dist_traveled = 0
	i = 0
	for item in coordinates:
		newrow = OrderedDict()
		newrow['shape_id'] = route_id + '_1'
		newrow['shape_pt_lat'] = item[1]
		newrow['shape_pt_lon'] = item[0]
		calcdist = lat_long_dist(prevlat,prevlon,item[1],item[0])
		dist_traveled = float(format( dist_traveled + calcdist , '.2f' )) 
		newrow['shape_dist_traveled'] = dist_traveled
		i = i + 1
		newrow['shape_pt_sequence'] = i
		output_array.append(newrow)
		prevlat = item[1]
		prevlon = item[0]
	
	return output_array

def allShapesListFunc():
	db = tinyDBopen(dbfile)
	shapeIDsJson = {}
	
	shapesDb = db.table('shapes')
	allShapes = shapesDb.all()
	db.close()
	shapeIDsJson['all'] = list( pd.DataFrame(allShapes)['shape_id'].replace('', pd.np.nan).dropna().unique() )

	db = tinyDBopen(sequenceDBfile)
	allSequences = db.all()
	db.close()

	shapeIDsJson['saved'] = { x['route_id']:[ x.get('shape0', ''), x.get('shape1','') ]  for x in allSequences }
	return shapeIDsJson

def serviceIdsFunc():
	calendarArray = readTableDB(dbfile, 'calendar')
	service_id_list = [ n['service_id'] for n in calendarArray ]
	return service_id_list

def deletefromDB(dbfile,key,value,tables):
	
	# first, delete linked trips if it is a route. INCEPTION! aka recursive function.
	if key == 'route_id':
		db = tinyDBopen(dbfile)
		Item = Query()
		tableDb = db.table('trips')
		tripsList = [ x['trip_id'] for x in tableDb.search(Item['route_id'] == value) ]
		db.close()
		[ deletefromDB(dbfile,key='trip_id',value=x,tables=['stop_times']) for x in tripsList ]

	db = tinyDBopen(dbfile)
	Item = Query()

	for tablename in tables:
		tableDb = db.table(tablename)
		print('removing entries from ' + tablename + ' having '+key+'='+str(value))
		tableDb.remove(Item[key] == value)

	if key == 'shape_id':
		# blank its entries in trips table
		# https://tinydb.readthedocs.io/en/latest/usage.html#replacing-data
		tableDb = db.table('trips')
		rows = tableDb.search(Item['shape_id'] == value)
		for row in rows:
			row['shape_id'] = ''
		tableDb.write_back(rows)
		print('Zapped shape_id:' + value + ' values in trips table, while keeping those rows.')
	
	if key == 'service_id':
		# blank its entries in trips table
		tableDb = db.table('trips')
		rows = tableDb.search(Item['service_id'] == value)
		for row in rows:
			row['service_id'] = ''
		tableDb.write_back(rows)
		count = tableDb.search(Item['service_id'] == value)
		print('Trying to zap shape_id values. Now the count is ' + str(count))

	if key == 'route_id':
		# drop it from sequence DB too.
		sdb = tinyDBopen(sequenceDBfile)
		sItem = Query()
		print('Removing entires for stop_id '+value +' in sequenceDB too if any.')
		sdb.remove(sItem[key] == value)
		sdb.close();

	if key == 'zone_id':
		# drop either origin_id or destination_id rows
		tableDb = db.table('fare_rules')
		print('removing entries from fare_rules having origin_id or destination_id ='+str(value))
		tableDb.remove(Item['origin_id'] == value)
		tableDb.remove(Item['destination_id'] == value)
		
		# blank its entries in stops table
		tableDb = db.table('stops')
		rows = tableDb.search(Item['zone_id'] == value)
		for row in rows:
			row['zone_id'] = ''
		tableDb.write_back(rows)
		print('Zapped zone_id:' + value + ' values in stops table, while keeping those rows.')

	'''
	if key == 'stop_id':
		# drop the stop from sequence DB too.
	'''

	db.close()
	return True


def collectfromDB(dbfile,key,value,tables,secondarytables):
	db = tinyDBopen(dbfile)
	Item = Query()
	returnJson = OrderedDict()
	returnJson['main']= OrderedDict()
	returnJson['zap']= OrderedDict()

	for tablename in tables:
		tableDb = db.table(tablename)
		tableArray = tableDb.search(Item[key] == value)
		returnJson['main'][tablename] = tableArray
		print(str(len(tableArray)) + ' rows to be deleted in ' + tablename +' for ' + key + '=' + 'value'  )

	if not secondarytables == ['']:
		for tablename in secondarytables:
			tableDb = db.table(tablename)
			tableArray = tableDb.search(Item[key] == value)
			returnJson['zap'][tablename] = tableArray
			print(str(len(tableArray)) + ' rows to be zapped in ' + tablename +' where ' + key + '=' + 'value'  )
	db.close()
	return returnJson

def replaceIDfunc(valueFrom,valueTo,tableKeys):
	db = tinyDBopen(dbfile)
	Item = Query()
	returnList = []
	# https://tinydb.readthedocs.io/en/latest/usage.html#replacing-data
	for row in tableKeys:
		tablename = row['table']
		key = row['key']
		tableDb = db.table(tablename)
		rows = tableDb.search(Item[key] == valueFrom)
		count = str(len(rows))
		for row in rows:
			row[key] = valueTo
		tableDb.write_back(rows)
		returnList.append('Replaced ' + key + ' = ' + valueFrom + ' with <b>' + valueTo + '</b> in ' + tablename + ' table, <b>' + count + '</b> rows edited.')

	db.close()
	returnMessage = '<br>'.join(returnList)
	return returnMessage