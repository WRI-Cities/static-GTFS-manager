from tinydb import TinyDB, Query
import csv, os, sys, time, zipfile, zlib

exec(open("./GTFSserverfunctions.py", encoding='utf8').read())

'''
# moved to GTFSserverfunctions.py
def exportGTFS (dbfile, folder):
	start = time.time()
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
		print( tablename + ': ' + str(len(tableArray)) + ' records' )
		if( len(tableArray) ):
			csvwriter(tableArray, folder + tablename + '.txt')
			zf.write(folder + tablename + '.txt' , arcname=tablename + '.txt', compress_type=zipfile.ZIP_DEFLATED )
			print('Added ' + tablename + '.txt to gtfs.zip')
		else:
			print(tablename + ' is empty so not exporting that.')
	zf.close()
	
	end = time.time()
	print("Function to export GTFS from db took {} seconds.".format(end-start))

'''

exportGTFS('test.json','commitfolder/')

