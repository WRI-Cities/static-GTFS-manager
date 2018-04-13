# tinydb initiate database
from tinydb import TinyDB, Query
import csv
import os
import sys # for sys.exit() command, used in development only
import time
# to do: given a folder, scan for .txt files, and store them all into db.

start = time.time()

GTFSpath = 'uploads/'
dbfile = GTFSpath + 'test.json'

db = TinyDB(dbfile, sort_keys=True, indent=2)
# extra parameters: https://github.com/msiemens/tinydb/issues/180

db.purge_tables() # wipe out the database, clean slate.

# scan for txt files, non-recursively, only at folder level. from https://stackoverflow.com/a/22208063/4355695
filenames = [f for f in os.listdir(GTFSpath) if f.endswith('.txt') and os.path.isfile(os.path.join(GTFSpath, f))]

print(filenames)

for feedfile in filenames:
	with open(GTFSpath + feedfile, encoding='utf8') as f:
		feedArray = list(csv.DictReader(f))
	
	feed = feedfile[:-4] # strip .txt from end
	print("pushing " + feed + " into db..")
	feedDb = db.table(feed)

	# let's try to split this into parts
	
	feedDb.insert_multiple(feedArray)
	del feedArray

end = time.time()
print(dbfile + "test.json creation took {} seconds.".format(round(end-start,2)))

# sys.exit() # terminates program here.
