#functions.py

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

	db = TinyDB(dbfile, sort_keys=True, indent=2)
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
	print("Function to export GTFS from db took {} seconds.".format(end-start))

	return returnmessage

def importGTFS(dbfile, zipname):
	start1 = time.time()
	
	# take backup first
	print('Taking backup of existing contents of db')
	backupfolder = '{:GTFS/%Y-%m-%d-backup-%H%M}/'.format(datetime.datetime.now())
	if not os.path.exists(backupfolder):
		os.makedirs(backupfolder)
	exportGTFS (dbfile, backupfolder)
	print('backup made to folder GTFS/yyyy-dd-mm-backup-hhmm/')

	# unzip imported zip
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
	db = TinyDB(dbfile, sort_keys=True, indent=2)
	db.purge_tables() # wipe out the database, clean slate.

	for feedfile in filenames:
		with open(uploadFolder + feedfile, encoding='utf8') as f:
			feedArray = list(csv.DictReader(f))
		
		feed = feedfile[:-4].lower() # strip .txt from end, and set to lowercase
		feedDb = db.table(feed)
		feedDb.insert_multiple(feedArray)
		del feedArray

	db.close()

	end1 = time.time()
	print("Loaded external GTFS.. full function took {} seconds.".format( round(end1-start1,2) ))



def GTFSstats(dbfile):
	start = time.time()
	db = TinyDB(dbfile, sort_keys=True, indent=2)
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


def readTableDB(dbfile, tablename):
	db = TinyDB(dbfile, sort_keys=True, indent=2)
	tableDb = db.table(tablename)
	
	tableArray = tableDb.all()

	db.close()
	return tableArray


def replaceTableDB(dbfile, tablename, data, key=None, value=None):
	db = TinyDB(dbfile, sort_keys=True, indent=2)
	tableDb = db.table(tablename)

	if(key and value):
		Item = Query()
		tableDb.remove(Item[key] == value)	
	else:
		tableDb.purge() #this is a bit scary..

	tableDb.insert_multiple(data)
	db.close()
	return True

def sequenceSaveDB(sequenceDBfile, route_id, data):
	'''
	data = [
		['ALVA','PNCU','CPPY','ATTK','MUTT','KLMT','CCUV','PDPM','EDAP','CGPP','PARV','JLSD','KALR','LSSE','MGRD'],
		['MACE','MGRD','LSSE','KALR','JLSD','PARV','CGPP','EDAP','PDPM','CCUV','KLMT','MUTT','ATTK','CPPY','PNCU','ALVA']
	];
	'''
	db = TinyDB(sequenceDBfile, sort_keys=True, indent=2)
	Item = Query()
	status = True
	try:
		db.upsert( {'route_id': route_id, '0': data[0], '1': data[1] }, Item['route_id'] == route_id )
	except:
		status = False
	db.close()
	return status

def sequenceReadDB(sequenceDBfile, route_id):
	db = TinyDB(sequenceDBfile, sort_keys=True, indent=2)
	Item = Query()

	check = db.contains(Item['route_id'] == route_id)
	if not check:
		db.close()
		return False

	# else..
	sequenceItem = db.search(Item['route_id'] == route_id)
	sequenceArray = [ sequenceItem[0]['0'], sequenceItem[0]['1'] ]
	print('Got the sequence from sequence db file.')
	db.close()
	return sequenceArray
	'''
	sequenceItem = db.search(Item['route_id'] == route_id)
	sequenceArray = [ sequenceItem[0]['0'], sequenceItem[0]['1'] ]
	print(sequenceArray)
	db.close()
	return False
	'''

def extractSequencefromGTFS(dbfile, route_id):
	
	#WAIT why are we bothering getting a huge db into a dict and filtering it, why not query the db! let's change this!
	tripsArray = readTableDB(dbfile, 'trips')
	
	db = TinyDB(dbfile, sort_keys=True, indent=2)
	Item = Query()
	tripsDB = db.table('trips')

	check = tripsDB.contains(Item['route_id'] == route_id and Item['direction_id'] == '0')
	if check:
		oneTrip0 = tripsDB.search(Item['route_id'] == route_id and Item['direction_id'] == '0')[0]['trip_id']
		print('oneTrip0 found: '+oneTrip0)
	else: 
		# no trips found, return a blank sequence and get out!
		print('Nothing found for oneTrip0')
		db.close()
		sequence = [ [], [] ]
		return sequence

	check = tripsDB.contains(Item['route_id'] == route_id and Item['direction_id'] == '1')
	if check:
		oneTrip1 = tripsDB.search(Item['route_id'] == route_id and Item['direction_id'] == '1')[0]['trip_id']
		print('oneTrip1 found: '+oneTrip1)
	else:
		# no reverse direction.. no probs, set as None
		oneTrip1 = None

	'''
	oneTrip0 = list( filter( lambda x : x['route_id'] == route_id and x['direction_id'] == '0', tripsArray ))[0]['trip_id']		
	oneTrip1 = list( filter( lambda x : x['route_id'] == route_id and x['direction_id'] == '1', tripsArray ))[0]['trip_id']
	# note: for circular routes that don't have a second direction id this will result in error. Need to handle that.
	'''
	sequence = []
	'''
	stoptimesArray = readTableDB(dbfile, 'stop_times')	
	# list comprehension: directly extracting stop_id's from stop_times full array with trip filter applied
	sequence.append( [n['stop_id'] for n in stoptimesArray if n['trip_id'] == oneTrip0 ] )
	sequence.append( [n['stop_id'] for n in stoptimesArray if n['trip_id'] == oneTrip1 ] )
	'''
	stop_timesDB = db.table('stop_times')
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

	sequence = [array0, array1]

	# to do: If the selected route is absent from trips.txt at present, then pass an empty sequence.
	# sequence = [ [], [] ]
	db.close()
	return sequence

def uploadaFile(fileholder):
	# adapted from https://techoverflow.net/2015/06/09/upload-multiple-files-to-the-tornado-webserver/
	filename = fileholder['filename'].replace("/", "")
	print('saving filename: ' + filename + ' to uploads')
	
	if not os.path.exists(uploadFolder):
		os.makedirs(uploadFolder)

	with open(uploadFolder+filename, "wb") as out:
		# Be aware, that the user may have uploaded something evil like an executable script ...
		# so it is a good idea to check the file content (xfile['body']) before saving the file
		out.write(fileholder['body'])
	return filename