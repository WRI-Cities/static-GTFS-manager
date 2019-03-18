'''
GTFSserverfunctions.py
this file is to be inline included in the main script. Seriously, I do not want to keep declaring import statements everywhere.


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

# to do: how to get these variables declared in the other file to be recognized here?

global uploadFolder
global xmlFolder
global logFolder
global configFolder
global dbFolder
global exportFolder

global sequenceDBfile
global passwordFile
global chunkRulesFile
global configFile

if __name__ == "__main__":
	print("Don't run this, run GTFSManager.py.")

'''

def csvwriter( array2write, filename, keys=None ):
	# 15.4.18: Changing to use pandas instead of csv.DictWriter. Solves https://github.com/WRI-Cities/static-GTFS-manager/issues/3
	df = pd.DataFrame(array2write)
	df.to_csv(filename, index=False, columns=keys)
	logmessage( 'Created', filename )


def exportGTFS (folder):
	# create commit folder
	if not os.path.exists(folder):
		os.makedirs(folder)
	else:
		returnmessage = 'Folder with same name already exists: ' + folder + '. Please choose a different commit name.'
		return returnmessage

	# let's zip them!
	zf = zipfile.ZipFile(folder + 'gtfs.zip', mode='w')

	# find .h5 files.. non-chunk ones first
	filenames = findFiles(dbFolder, ext='.h5', chunk='n')
	print(filenames)

	for h5File in filenames:
		start1 = time.time()
		tablename = h5File[:-3] # remove last 3 chars, .h5

		try:
			df = pd.read_hdf(dbFolder + h5File).fillna('').astype(str)
		except (KeyError, ValueError) as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not have any data.'.format(h5File))
		
		if len(df):
			logmessage('Writing ' + tablename + ' to disk and zipping...')
			df.to_csv(folder + tablename + '.txt', index=False, chunksize=1000000)
			del df
			zf.write(folder + tablename + '.txt' , arcname=tablename + '.txt', compress_type=zipfile.ZIP_DEFLATED )
		else:
			del df
			logmessage(tablename + ' is empty so not exporting that.')
		end1 = time.time()
		logmessage('Added {} in {} seconds.'.format(tablename,round(end1-start1,3)))
	gc.collect()
		
	# Now, process chunk files.

	for tablename in list(chunkRules.keys()):
		start1 = time.time()
		filenames = findFiles(dbFolder, ext='.h5', prefix=tablename)
		if not len(filenames): continue #skip if no files

		print('Processing chunks for {}: {}'.format(tablename,list(filenames)) )

		# first, getting all columns
		columnsList = set()
		for count,h5File in enumerate(filenames):
			try:
				df = pd.read_hdf(dbFolder + h5File,stop=0)
			except (KeyError, ValueError) as e:
				df = pd.DataFrame()
				logmessage('Note: {} does not have any data.'.format(h5File))
			columnsList.update(df.columns.tolist())	
			del df
		gc.collect()
		columnsList = list(columnsList)

		# moving the main ID to first position
		# from https://stackoverflow.com/a/1014544/4355695
		IDcol = chunkRules[tablename]['key']
		columnsList.insert(0, columnsList.pop(columnsList.index(IDcol)))
		logmessage('Columns for {}: {}'.format(tablename,list(columnsList)))

		for count,h5File in enumerate(filenames):
			logmessage('Writing {} to csv'.format(h5File))
			try:
				df1 = pd.read_hdf(dbFolder + h5File).fillna('').astype(str)
			except (KeyError, ValueError) as e:
				df1 = pd.DataFrame()
				logmessage('Note: {} does not have any data.'.format(h5File))
			# in case the final columns list has more columns than df1 does, concatenating an empty df with the full columns list.
			# from https://stackoverflow.com/a/30926717/4355695
			columnsetter = pd.DataFrame(columns=columnsList)
			df2 = pd.concat([df1,columnsetter], ignore_index=True, copy=False, sort=False)[columnsList]
			# adding [columnsList] so the ordering of columns is strictly maintained between all chunks

			appendFlag,headerFlag = ('w',True) if count == 0 else ('a',False)
			# so at first loop, we'll create a new one and include column headers. 
			# In subsequent loops we'll append and not repeat the column headers.
			df2.to_csv(folder + tablename + '.txt', mode=appendFlag, index=False, header=headerFlag, chunksize=10000)

			del df2
			del df1
			gc.collect()
		
		mid1 = time.time()
		logmessage('CSV {} created in {} seconds, now zipping'.format(tablename + '.txt',round(mid1-start1,3)))

		zf.write(folder + tablename +'.txt' , arcname=tablename +'.txt', compress_type=zipfile.ZIP_DEFLATED )

		end1 = time.time()
		logmessage('Added {} to zip in {} seconds.'.format(tablename,round(end1-mid1,3)))

		logmessage('Added {} in {} seconds.'.format(tablename,round(end1-start1,3)))

	zf.close()
	gc.collect()
	logmessage('Generated GTFS feed at {}'.format(folder))
	
	returnmessage = '<p>Success! Generated GTFS feed at <a href="' + folder + 'gtfs.zip' + '">' + folder + 'gtfs.zip<a></b>. Click to download.</p><p>You can validate the feed on <a href="https://gtfsfeedvalidator.transitscreen.com/" target="_blank">GTFS Feed Validator</a> website.</p>'
	return returnmessage

def importGTFS(zipname):
	start1 = time.time()
	
	# take backup first
	if not debugMode:
		backupDB() # do when in production, skip when developing / debugging

	# unzip imported zip
	# make a separate folder to unzip in, so that when importing we don't end up picking other .txt files that happen to be in the general uploads folder.
	unzipFolder = uploadFolder + '{:unzip-%H%M%S}/'.format(datetime.datetime.now())
	if not os.path.exists(unzipFolder):
		os.makedirs(unzipFolder)

	fileToUnzip = uploadFolder + zipname
	logmessage('Extracting uploaded zip to {}'.format(unzipFolder))

	# UNZIP a zip file, from https://stackoverflow.com/a/36662770/4355695
	with zipfile.ZipFile( fileToUnzip,"r" ) as zf:
		zf.extractall(unzipFolder)

	# loading names of the unzipped files
	# scan for txt files, non-recursively, only at folder level. from https://stackoverflow.com/a/22208063/4355695
	filenames = [f for f in os.listdir(unzipFolder) if f.lower().endswith('.txt') and os.path.isfile(os.path.join(unzipFolder, f))]
	logmessage('Extracted files: ' + str(list(filenames)) )

	if not len(filenames):
		return False

	# Check if essential files are there or not.
	# ref: https://developers.google.com/transit/gtfs/reference/#feed-files
	# using set and subset. From https://stackoverflow.com/a/16579133/4355695
	# hey we need to be ok with incomplete datasets, the tool's purpose is to complete them!
	if not set(requiredFeeds).issubset(filenames):
		logmessage('Note: We are importing a GTFS feed that does not contain all the required files as per GTFS spec: %s \
				Kindly ensure the necessary files get created before exporting.' % str(list(requiredFeeds)))


	# purge the DB. We're doing this only AFTER the ZIPfile is successfully uploaded and unzipped and tested.
	purgeDB()
	
	logmessage('Commencing conversion of gtfs feed files into the DB\'s .h5 files')
	for txtfile in filenames:
		tablename = txtfile[:-4]
		# using Pandas to read the csv and write it as .h5 file

		if not chunkRules.get(tablename,None):
			# normal files that don't need chunking
			df = pd.read_csv(unzipFolder + txtfile ,dtype=str, na_values='')
			# na_filter=False to read blank cells as empty strings instead of NaN. from https://stackoverflow.com/a/45194703/4355695
			# reading ALL columns as string, and taking all NA values as blank string

			if not len(df): 
				# skip the table if it's empty.
				print('Skipping',tablename,'because its empty')
				continue 

			h5File = tablename.lower() + '.h5'
			logmessage('{}: {} rows'.format(h5File, str(len(df)) ) )
			df.to_hdf(dbFolder+h5File, 'df', format='table', mode='w', complevel=1)
			# if there is no chunking rule for this table, then make one .h5 file with the full table.
			del df
			gc.collect()

		else:
			# let the chunking commence
			logmessage('Storing {} in chunks.'.format(tablename))
			chunkSize = chunkRules[tablename].get('chunkSize',200000)
			IDcol = chunkRules[tablename].get('key')

			fileCounter = 0
			lookupJSON = OrderedDict()
			carryOverChunk = pd.DataFrame()

			for chunk in pd.read_csv(unzipFolder + txtfile, chunksize=chunkSize, dtype=str, na_values=''):
				# see if can use na_filter=False to speed up

				if not len(chunk): 
					# skip the table if it's empty.
					# there's probably going to be only one chunk if this is true
					print('Skipping',tablename,'because its empty')
					continue

				# zap the NaNs at chunk level
				chunk = chunk.fillna('')

				IDList = chunk[IDcol].unique().tolist()
				# print('first ID: ' + IDList[0])
				# print('last ID: ' + IDList[-1])
				workChunk = chunk[ chunk[IDcol].isin(IDList[:-1]) ]
				if len(carryOverChunk):
					workChunk = pd.concat([carryOverChunk, workChunk],ignore_index=True)
				carryOverChunk = chunk[ chunk[IDcol] == IDList[-1] ]

				fileCounter += 1
				h5File = tablename + '_' + str(fileCounter) + '.h5' # ex: stop_times_1.h5
				logmessage('{}: {} rows'.format(h5File, str(len(workChunk)) ) )
				workChunk.to_hdf(dbFolder+h5File, 'df', format='table', mode='w', complevel=1)
				del workChunk
				gc.collect()

				# making lookup table
				for x in IDList[:-1]:
					if lookupJSON.get(x,None):
						logmessage('WARNING: {} may not have been sorted properly. Encountered a repeat instance of {}={}'
							.format(txtfile,IDcol,x))
					lookupJSON[x] = h5File

			# chunk loop over. 
			del chunk

			# Now append the last carry-over chunk in to the last chunkfile
			logmessage('Appending the {} rows of last ID to last chunk {}'
				.format(str(len(carryOverChunk)),h5File))
			carryOverChunk.to_hdf(dbFolder+h5File, 'df', format='table', append=True, mode='a', complevel=1)
			# need to set append=True to tell it to append. mode='a' is only for file-level.
			# add last ID to lookup
			lookupJSON[ IDList[-1] ] = h5File

			del carryOverChunk
			gc.collect()

			lookupJSONFile = chunkRules[tablename].get('lookup','lookup.json')
			with open(dbFolder + lookupJSONFile, 'w') as outfile:
				json.dump(lookupJSON, outfile, indent=2)
			# storing lookup json
			logmessage('Lookup json: {} created for mapping ID {} to {}_n.h5 chunk files.'.format(lookupJSONFile,IDcol,tablename))
			

	logmessage('Finished importing GTFS feed. You can remove the feed zip {} and folder {} from {} if you want.'.format(zipname,unzipFolder,uploadFolder))
	return True


def GTFSstats():
	'''
	Gives current stats of the GTFS tables held in DB
	Enlists:
		- agency name(s).
		- mandatory GTFS tables
		- optional GTFS tables
		- extra tables present in feed but not part of traditional GTFS spec (only mentioned if present)
	
	- List number of entries in each
	- Pad to have tabular like view
	- Format numbers to have thousands separators
	- If there are excess agencies, mention only first two and then put number of remaining
	'''
	content = '';
	
	agencyDF = readTableDB('agency')
	if len(agencyDF):
		agencyList = agencyDF.agency_name.tolist()
		if len(agencyList)>2 : agencyList[:] = agencyList[:2] + ['and {} more'.format(len(agencyList)-2 )]
		# if there are excess agencies, mention only first two and then put number of remaining

		content += 'Agency: {}<br>'.format( ', '.join(agencyList) )
	else:
		content += 'Agency: none found.<br>'
	
	filenames = findFiles(dbFolder, ext='.h5', prefix=None, chunk='all')
	
	coveredFiles = []
	
	# first, run through the main GTFS files in proper order
	content += '<br>1. Main tables: (*)<br>'
	for feed in requiredFeeds:
		tablename = feed[:-4] # remove .txt
		count = 0
		
		if tablename not in chunkRules.keys():
			# normal tables
			if os.path.exists(dbFolder+tablename+'.h5'):
				hdf = pd.HDFStore(dbFolder + tablename + '.h5')
				try:
					count = hdf.get_storer('df').nrows
					# gets number of rows, without reading the entire file into memory. From https://stackoverflow.com/a/26466301/4355695
				except (KeyError, ValueError) as e:
					logmessage('Note: {} does not have any data.'.format(tablename + '.h5'))
				hdf.close()
				# have to close this opened file, else will conflict with pd.read_csv later on
				coveredFiles.append(tablename+'.h5')
			message = '{}: {:,} entries'.format( tablename.ljust(20),count )
			# {:,} : does number formattting. from https://stackoverflow.com/q/16670125/4355695
			# .ljust(20): pads spaces to string so that total len=20. from https://stackoverflow.com/a/5676676/4355695
			logmessage(message)
			content += message + '<br>'

		else:
			# chunked files
			chunks = findFiles(dbFolder, ext='.h5', prefix=tablename, chunk='y')
			if chunks:
				for h5File in chunks:
					hdf = pd.HDFStore(dbFolder + h5File)
					try:
						count += hdf.get_storer('df').nrows
					except (KeyError, ValueError) as e:
						logmessage('Note: {} does not have any data.'.format(h5File))
					hdf.close()
					coveredFiles.append(h5File)
			message = '{}: {:,} entries'.format( tablename.ljust(20),count )
			logmessage(message)
			content += message + '<br>'
		
		# requiredFeeds loop over
	
	
	# next, cover optional tables in GTFS spec
	content += '<br>2. Additional tables: (#)<br>'
	for feed in optionalFeeds:
		tablename = feed[:-4] # remove .txt
		count = 0
		
		if tablename not in chunkRules.keys():
			# normal tables
			if os.path.exists(dbFolder+tablename+'.h5'):
				hdf = pd.HDFStore(dbFolder + tablename + '.h5')
				try:
					count = hdf.get_storer('df').nrows
				except (KeyError, ValueError) as e:
					logmessage('Note: {} does not have any data.'.format(tablename + '.h5'))
				hdf.close()
				coveredFiles.append(tablename+'.h5')
			message = '{}: {:,} entries'.format( tablename.ljust(20),count )
			logmessage(message)
			content += message + '<br>'

		else:
			# chunked files
			chunks = findFiles(dbFolder, ext='.h5', prefix=tablename, chunk='y')
			if chunks:
				for h5File in chunks:
					hdf = pd.HDFStore(dbFolder + h5File)
					try:
						count += hdf.get_storer('df').nrows
					except (KeyError, ValueError) as e:
						logmessage('Note: {} does not have any data.'.format(h5File))
					hdf.close()
					coveredFiles.append(h5File)
			message = '{}: {:,} entries'.format( tablename.ljust(20),count )
			logmessage(message)
			content += message + '<br>'
		
		# optionalFeeds loop over

	# now we cover the files that are present in the feed but not part of the GTFS spec
	remainingFiles = set(filenames) - set(coveredFiles)
	if(remainingFiles) : content += '<br>3. Other tables: (^)<br>'
	for h5File in remainingFiles:
		hdf = pd.HDFStore(dbFolder + h5File)
		try:
			count = hdf.get_storer('df').nrows
		except (KeyError, ValueError) as e:
			logmessage('Note: {} does not have any data.'.format(h5File))
			count = 0
		hdf.close()
		message = '{}: {:,} entries'.format( h5File[:-3].ljust(20),count )
		logmessage(message)
		content += message + '<br>'

	# Footnotes
	content += '<br>----<br>*: required part of GTFS spec, needed to make valid GTFS'
	content += '<br>#: part of GTFS spec but not compulsory'
	if(remainingFiles) : content += '<br>^: not part of traditional GTFS spec, used by operator for additional purposes'
	
	return content
	# end of GTFSstats function


def readTableDB(tablename, key=None, value=None):
	'''
	main function for reading a table or part of it from the DB
	read-only
	note: this does not handle non-primary keys for chunked tables. - let's change that!
	'''

	# if tablename is a blank string, return empty array.
	if not len(tablename):
		return pd.DataFrame()
	

	if tablename not in chunkRules.keys():
		# not a chunked file
		h5Files = [tablename + '.h5']

	else:
		# if it's a chunked file
		if key == chunkRules[tablename].get('key'):
			h5File = findChunk(value, tablename)
			if not h5File:
				logmessage('readTableDB: No {} chunk found for key={}'.format(tablename,value))
				h5Files = []
			else: h5Files = [h5File]
		else:
			h5Files = findFiles(dbFolder, ext='.h5', prefix=tablename, chunk='y')

	# so now we have array/list h5Files having one or more .h5 files to be read.
	
	collectDF = pd.DataFrame()
	for h5File in h5Files:

		# check if file exists.
		if not os.path.exists(dbFolder+h5File):
			continue
		
		try:
			df = pd.read_hdf(dbFolder + h5File).fillna('').astype(str)
			# typecasting as str, keeping NA values blank ''
		except (KeyError, ValueError) as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not have any data.'.format(h5File))

		if(key and value):
			logmessage('readTableDB: table:{}, column:{}, value:"{}"'.format(tablename,key,value))
			# check if this column is present or not
			if key not in df.columns:
				logmessage('readTableDB: Error: column {} not found in {}. Skipping it.'.format(key,h5File) )
				continue
			df.query('{} == "{}"'.format(key,value), inplace=True)
			# note: in case the column (key) has a space, see https://github.com/pandas-dev/pandas/issues/6508. Let's avoid spaces in column headers please!
			# dilemma: what if the value is a number instead of a string? let's see that happens!
			# -> solved by typecasting everything as str by default
		collectDF = collectDF.append(df.copy(), ignore_index=True, sort=False)
		del df
	
	logmessage('readTableDB: Loaded {}, {} records'.format(tablename,len(collectDF)) )
	return collectDF
	

def replaceTableDB(tablename, data, key=None, value=None):
	# new Data
	xdf = pd.DataFrame(data).fillna('').astype(str)
	# type-casting everything as string only, it's safer. See https://github.com/WRI-Cities/static-GTFS-manager/issues/82

	if value is not None:
		value = str(value)
	
	# fork out if it's stop_times or other chunked table
	
	if tablename in chunkRules.keys():
		# we do NOT want to come here from the replaceID() function. That should be handled separately.
		# Here, do only if it's coming from the actual data editing side.
		if value is None or key != chunkRules[tablename]['key']:
			# NOPE, not happening! for chunked table, value HAS to be a valid id.
			logmessage('Invalid key-value pair for chunked table',tablename,':',key,'=',value)
			del xdf
			gc.collect()
			return False
		chunkyStatus = replaceChunkyTableDB(xdf, value, tablename) 
		
		del xdf
		gc.collect()
		return chunkyStatus

	# fork over, now back to regular

	h5File = tablename + '.h5'

	# if file doesn't exist (ie, brand new data), make a new .h5 with the data and scram
	if not os.path.exists(dbFolder+h5File):
		xdf.to_hdf(dbFolder+h5File, 'df', format='table', mode='w', complevel=1)
		logmessage('DB file for {} not found so created with the new data.'.format(tablename))

	# else proceed if file exists

	elif ((key is not None) and (value is not None) ):
		# remove entries matching the key and value
		try:
			df = pd.read_hdf(dbFolder+h5File).fillna('').astype(str)
		except (KeyError, ValueError) as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not have any data.'.format(h5File))
		oldLen = len( df[ df[key] == str(value)])
		df.query(key + ' != "' + str(value) + '"', inplace=True)
		
		df3 = pd.concat([df,xdf], ignore_index=True)
		df3.to_hdf(dbFolder+h5File, 'df', format='table', mode='w', complevel=1)

		logmessage('Replaced {} entries for {}={} with {} new entries in {}.'\
			.format(oldLen,key,str(value),str(len(xdf)),tablename ) )
		del df3
		del df

	else:
		# directly replace whatever's there with new data.
		xdf.to_hdf(dbFolder+h5File, 'df', format='table', mode='w', complevel=1)
		logmessage('Replaced {} with new data, {} entries inserted.'.format(tablename,str(len(data)) ) )

	del xdf
	gc.collect()
	return True


def sequenceSaveDB(sequenceDBfile, route_id, data, shapes=None):
	'''
	save onward and return stops sequence for a route
	'''
	dataToUpsert = {'route_id': route_id, '0': data[0], '1': data[1] }
	if shapes:
		if len(shapes[0]):
			dataToUpsert.update({ 'shape0':shapes[0] })
		if len(shapes[1]):
			dataToUpsert.update({ 'shape1':shapes[1] })
	# add shapes names to sequence DB only if they are valid shape names, not if they are blank strings.
	# solves part of https://github.com/WRI-Cities/static-GTFS-manager/issues/38

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
	logmessage('Got the sequence from sequence db file.')
	return sequenceArray

def sequenceFull(sequenceDBfile, route_id):
	# 20.4.18 : writing this to pass on shapes data too. in future, change things on JS end and merge the sequenceReadDB function with this.
	db = tinyDBopen(sequenceDBfile)
	Item = Query()
	sequenceItem = db.search(Item['route_id'] == route_id)
	db.close()

	if sequenceItem == []:
		return False

	sequenceArray = sequenceItem[0]
	logmessage('Got the sequence from sequence db file.')
	return sequenceArray


def extractSequencefromGTFS(route_id):
	# idea: scan for the first trip matching a route_id, in each direction, and get its sequence from stop_times. 
	# In case it hasn't been provisioned yet in stop_times, will return empty arrays.

	tripsdf = readTableDB('trips', key='route_id', value=route_id)
	if not len(tripsdf):
		logmessage('extractSequencefromGTFS: no trips found for {}. Skipping.'.format(route_id))
		return [ [], [] ]
	
	if 'direction_id' not in tripsdf.columns:
		logmessage('extractSequencefromGTFS: Trips table doesn\'t have any direction_id column. Well, its optional.. taking the first trip only for route {}.'.format(route_id))
		oneTrip0 = tripsdf.iloc[0].trip_id
		oneTrip1 = None

	else: 
		dir0df = tripsdf[ tripsdf.direction_id == '0'].copy().reset_index(drop=True).trip_id
		oneTrip0 = dir0df.iloc[0] if len(dir0df) else tripsdf.iloc[0].trip_id
		# using first trip's id as default, for cases where direction_id is blank.

		dir1df = tripsdf[ tripsdf.direction_id == '1'].copy().reset_index(drop=True).trip_id
		oneTrip1 = dir1df.iloc[0] if len(dir1df) else None
		# reset_index: re-indexes as 0,1,... from https://stackoverflow.com/a/20491748/4355695

		del dir0df
		del dir1df
	del tripsdf

	if oneTrip0:
		array0 = readColumnDB('stop_times','stop_id', key='trip_id', value=oneTrip0)
		logmessage('extractSequencefromGTFS: Loading sequence for route {}, onward direction from trip {}:\n{}'.format(route_id,oneTrip0,str(list(array0[:50])) ))
	else:
		array0 = []
		logmessage('No onward sequence found for route {}'.format(route_id))
	
	if oneTrip1:
		array1 = readColumnDB('stop_times','stop_id', key='trip_id', value=oneTrip1)
		logmessage('extractSequencefromGTFS: Loading sequence for route {}, return direction from trip {}:\n{}'.format(route_id,oneTrip1,str(list(array1[:50])) ))
	else:
		array1 = []
		logmessage('No return sequence found for route {}'.format(route_id))


	sequence = [array0, array1]
	return sequence

def uploadaFile(fileholder):
	# adapted from https://techoverflow.net/2015/06/09/upload-multiple-files-to-the-tornado-webserver/
	# receiving a form file object as argument.
	# saving to uploadFolder. In case same name file already exists, over-writing.
	
	filename = fileholder['filename'].replace("/", "")
	# zapping folder redirections if any

	logmessage('Saving filename: ' + filename + ' to ' + uploadFolder)
	
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
		logmessage('Depot stations: ' + str(depotsList) )
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
		
		logmessage(str(len(scheduleHolder)) + ' route(s) found in ' + weekdayXML)

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
		
		logmessage(str(len(scheduleHolder)) + ' route(s) found in ' + sundayXML)
		
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
	'''
	This is for KMRL Metro file import
	'''
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
	
	if len(password) == 0:
		logmessage("Why u no entering password! Top right! Top right!")
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
	logmessage( 'Loading and unpivoting',filename)
	fares_unpivoted = pd.melt(fares_pivoted, id_vars=keepcols, var_name=var_header, value_name=value_header).sort_values(by=sortby)
	
	# rename header 'Stations' to 'origin_id', from https://stackoverflow.com/questions/11346283/renaming-columns-in-pandas/
	# and drop all rows having NaN values. from https://stackoverflow.com/a/13434501/4355695
	fares_unpivoted_clean = fares_unpivoted.rename(columns={'Stations': 'origin_id'}).dropna() 
	# 4.9.18: returns a dataframe now
	return fares_unpivoted_clean

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
		logmessage('tinyDBopen: DB file {} has invalid json. Making a backup copy and creating a new blank one.'.format(filename))
		shutil.copy(filename, filename + '_backup') # copy file. from http://www.techbeamers.com/python-copy-file/
		
	except FileNotFoundError:
		logmessage('tinyDBopen: {} not found so creating.'.format(filename))
		open(filename, 'w').close() # make a blank file. from https://stackoverflow.com/a/12654798/4355695
		db = TinyDB(filename, sort_keys=True, indent=2)

	return db

def geoJson2shape(route_id, shapefile, shapefileRev=None):
	with open(shapefile, encoding='utf8') as f:
		# loading geojson, from https://gis.stackexchange.com/a/73771/44746
		data = json.load(f)
	logmessage('Loaded',shapefile)
		
	output_array = []
	try:
		coordinates = data['features'][0]['geometry']['coordinates']
	except:
		logmessage('Invalid geojson file ' + shapefile)
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
		output_array.append(newrow.copy())
		prevlat = item[1]
		prevlon = item[0]
	
	# Reverse trip now.. either same shapefile in reverse or a different shapefile	
	if( shapefileRev ):
		with open(shapefileRev, encoding='utf8') as g:
			data2 = json.load(g)
		logmessage('Loaded',shapefileRev)
		try:
			coordinates = data2['features'][0]['geometry']['coordinates']
		except:
			logmessage('Invalid geojson file ' + shapefileRev)
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
		output_array.append(newrow.copy())
		prevlat = item[1]
		prevlon = item[0]
	
	return output_array

def allShapesListFunc():
	shapeIDsJson = {}

	shapeIDsJson['all'] = readColumnDB('shapes','shape_id')

	db = tinyDBopen(sequenceDBfile)
	allSequences = db.all()
	db.close()
	
	shapeIDsJson['saved'] = { x['route_id']:[ x.get('shape0', ''), x.get('shape1','') ]  for x in allSequences }
	
	return shapeIDsJson

def serviceIdsFunc():
	calendarDF = readTableDB('calendar')
	collectorSet = set()
	if len(calendarDF):
		collectorSet.update( calendarDF['service_id'].tolist() )
		# service_id_list = calendarDF['service_id'].tolist()
	
	calendarDatesDF = readTableDB('calendar_dates')
	if len(calendarDatesDF):
		collectorSet.update( calendarDatesDF['service_id'].tolist() )

	return list(collectorSet)


#################################################3

def replaceIDfunc(key,valueFrom,valueTo):
	returnList = []
	# to do: wean off tableKeys, bring in the deleteRules.csv code blocks from diagnose, delete functions.
	
	# load the delete config file
	content = ''
	deleteRulesDF = pd.read_csv(configFolder + 'deleteRules.csv', dtype=str).fillna('')
	deleteRulesDF.query('key == "{}"'.format(key), inplace=True)
	if len(deleteRulesDF):
		deleteRulesDF.reset_index(drop=True,inplace=True)
	else:
		logmessage('No deleteRules found for column',key)
		content = 'No deleteRules found for this column.'

	if debugMode: logmessage(deleteRulesDF)

	for i,row in deleteRulesDF.iterrows():
		searchColumn = row.column_name if len(row.column_name) else row.key
		
		if row.table in chunkRules.keys():
			# chunked table
			filesLoop = replaceIDChunk(valueFrom,valueTo,row.table,searchColumn)
			# doesn't do actualy replacing yet, but edits the lookup json if needed 
			# and returns the list of files to be worked on.
			if not filesLoop: continue

		else:
			# normal table
			filesLoop = [ row.table + '.h5' ]

		for h5File in filesLoop:
			replacingStatus = replaceTableCell(h5File,searchColumn,valueFrom,valueTo)
			if replacingStatus:
				returnList.append(replacingStatus)

	# hey, don't forget sequence db!
	if key in ['shape_id', 'stop_id', 'route_id']:
		sDb = tinyDBopen(sequenceDBfile)
		sItem = Query()
		rows = sDb.all()
		somethingEditedFlag = False
		for row in rows:

			if key == 'shape_id':
				editedFlag = False
				if row.get('shape0') == valueFrom :
					row['shape0'] = valueTo
					editedFlag = True
				if row.get('shape1') == valueFrom :
					row['shape1'] = valueTo
					editedFlag = True
				
				if editedFlag:
					a = 'Replaced shape_id = {} with {} in sequence DB for route {}'\
						.format(valueFrom,valueTo,row.get('route_id') )
					logmessage('replaceIDfunc:',a) 
					returnList.append(a)
					somethingEditedFlag = True

			if key == 'stop_id':
				editedFlag = False
				if valueFrom in row['0']:
					row['0'][:] = [ x if (x != valueFrom) else valueTo for x in row['0']  ]
					editedFlag = True
				
				if valueFrom in row['1']:
					row['1'][:] = [ x if (x != valueFrom) else valueTo for x in row['1'] ]
					editedFlag = True
				
				if editedFlag:
					a = 'Replaced stop_id = {} with {} in sequence DB for route {}'.format(valueFrom,valueTo,row['route_id'])
					logmessage('replaceIDfunc:',a)
					returnList.append(a)
					somethingEditedFlag = True

			if key == 'route_id':
				if row.get('route_id') == valueFrom:
					row['route_id'] = valueTo
					a = 'Replaced route_id = {} with {} in sequence DB'\
						.format(valueFrom,valueTo )
					logmessage('replaceIDfunc:',a) 
					returnList.append(a)
					somethingEditedFlag = True
		
		if somethingEditedFlag: sDb.write_back(rows) # write updated data back only if you've edited something, else don't bother.
		sDb.close();

	returnMessage = 'Success.<br>' + '<br>'.join(returnList)
	return returnMessage

######################
def replaceIDChunk(valueFrom,valueTo,tablename,column):
	'''
	replaceIDChunk: this function finds the relevant chunks where replacement is to be done, and passes back the filenames in a list.
	It does NOT do the actual replacing in the .h5 file. That is done by the subsequently called replaceTableCell function.
	But it does edit the lookup JSON in case the column to be edited is the primary column of the chunked table. (like: stop_times > trip_id)
	'''
	# do NOT call any other function for replacing db etc now!
	# first, figure out if this is a key column or other column
	if column == chunkRules[tablename]['key']:
		if debugMode: logmessage('replaceIDChunk: {} is the primary key. So, we need only load its corresponding chunk.'.format(column))

		# find the chunk that has valueFrom
		h5File = findChunk(valueFrom,tablename)
		if not h5File:
			logmessage('replaceIDChunk: No entry in lookupJSON for {} .'.format(valueFrom))
			return False
		filesLoop = [ h5File ]

		# replace it in the json too.
		lookupJSONFile = chunkRules[tablename]['lookup']
		with open(dbFolder + lookupJSONFile) as f:
			table_lookup = json.load(f)

		table_lookup[valueTo] = h5File # make a new key-value pair
		table_lookup.pop(valueFrom,None) # delete old key which is getting replaced
		
		with open(dbFolder + lookupJSONFile, 'w') as outfile:
			json.dump(table_lookup, outfile, indent=2)
		logmessage('replaceIDChunk: replaced {} with {} in lookupJSON {}'\
			.format( valueFrom,valueTo,lookupJSONFile  ))	
		# replacing lookupJSON done.

	else:
		if debugMode: logmessage('replaceIDChunk: {} is NOT the primary key ({}). So, we have to loop through all the chunks.'.format(column,chunkRules[tablename]['key']))
		filesLoop = findFiles(dbFolder, ext='.h5', prefix=tablename, chunk='y')
		if debugMode: logmessage('replaceIDChunk: filesLoop:',filesLoop)

	return filesLoop


def replaceTableCell(h5File,column,valueFrom,valueTo):
	returnStatus = False
	# check if file exists.
	if not os.path.exists(dbFolder + h5File):
		logmessage('replaceTableCell: {} not found.'.format(h5File))
		return False
	
	try:
		df = pd.read_hdf(dbFolder + h5File).fillna('').astype(str)
	except (KeyError, ValueError) as e:
		df = pd.DataFrame()
		logmessage('Note: {} does not have any data.'.format(h5File))
	if column not in df.columns:
		if debugMode: logmessage('replaceTableCell: column {} not found in {}. Skipping this one.'\
			.format(column,h5file) )
		return False

	count = len( df[df[column] == valueFrom ])
	if count:
		# the replacing:
		df[column].replace(to_replace=str(valueFrom), value=str(valueTo), inplace=True )
		# hey lets do this for the ordinary tables too!
		logmessage('replaceTableCell: replaced {} instances of "{}" with "{}" in {} column in {}'\
			.format(count,valueFrom,valueTo,column,h5File) )
		# write it back
		df.to_hdf(dbFolder + h5File,'df', format='table', mode='w', complevel=1)
		returnStatus = 'Replaced {} instances of "{}" with "{}" in {} column in {}'\
			.format(count,valueFrom,valueTo,column,h5File)
	else:
		pass
		#returnStatus = 'Nothing found in {} for {}="{}"'.format(h5File,column,valueFrom)

	del df
	return returnStatus


############################


def logmessage( *content ):
	timestamp = '{:%Y-%b-%d %H:%M:%S} :'.format(datetime.datetime.now())
	# from https://stackoverflow.com/a/26455617/4355695
	line = ' '.join(str(x) for x in list(content))
	# str(x) for x in list(content) : handles numbers in the list, converts them to string before concatenating. 
	# from https://stackoverflow.com/a/3590168/4355695
	print(line) # print to screen also
	f = open(logFolder + 'log.txt', 'a', newline='\r\n', encoding='utf8') #open in append mode
	print(timestamp, line, file=f)
	# `,file=f` argument at end writes the line, with newline as defined, to the file instead of to screen. 
	# from https://stackoverflow.com/a/2918367/4355695
	f.close()


def readColumnDB(tablename, column, key=None, value=None):
	returnList = []
	# check if chunking:
	if tablename not in chunkRules.keys():
		# Not chunking
		df = readTableDB(tablename, key, value)
		if len(df):
			if column in df.columns:
				returnList = df[column].replace('', np.nan).dropna().unique().tolist()
			else:
				logmessage('readColumnDB: Hey, the column {} doesn\'t exist in the table {} for {}={}'\
						.format(column,tablename,key,value))
		del df
	
	else:
		# Yes chunking
		# to do:
		# if the column seeked is the same as the primary key of the chunk, then just get that list from the json.
		# but if the column is something else, then load that chunk and get the column.

		if column == chunkRules[tablename]['key']:
			lookupJSONFile = chunkRules[tablename]['lookup']
			# check if file exists.
			if not os.path.exists(dbFolder + lookupJSONFile):
				print('readColumnDB: HEY! {} does\'t exist! Returning [].'.format(lookupJSONFile))
			else:
				with open(dbFolder + lookupJSONFile) as f:
					table_lookup = json.load(f)
				returnList = list( table_lookup.keys() )
			# so now we have the ids list taken from the lookup json itself, no need to open .h5 files.
		
		else:
			if key == chunkRules[tablename]['key']:
				df = readTableDB(tablename, key=key, value=value)
			else:	
				if debugMode: logmessage('readColumnDB: Note: reading a chunked table {} by non-primary key {}. May take time.'\
					.format(tablename,key))
				df = readChunkTableDB(tablename, key=key, value=value)

			if column in df.columns:
				# in a chunked file, give the values as-is, don't do any unique'ing business.
				returnList = df[column].tolist()
			else:
				logmessage('readColumnDB: Hey, the column {} doesn\'t exist in the chunked table {} for {}={}'\
					.format(column,tablename,key,value))
			del df

	gc.collect()
	return returnList


def purgeDB():
	# purging existing .h5 files in dbFolder
	for filename in os.listdir(dbFolder):
		if filename.endswith('.h5'):
			os.unlink(dbFolder + filename)
	logmessage('Removed .h5 files from ' + dbFolder)

	# purge lookup files of chunked files too
	for filename in os.listdir(dbFolder):
		if filename.endswith('.json'):
			os.unlink(dbFolder + filename)
	logmessage('Removed .json files from ' + dbFolder)

	# also purge sequenceDB
	db2 = TinyDB(sequenceDBfile, sort_keys=True, indent=2)
	db2.purge_tables() # wipe out the database, clean slate.
	logmessage(sequenceDBfile + ' purged.')
	db2.close()


def backupDB():
	backupfolder = exportFolder + '{:%Y-%m-%d-backup-%H%M}/'.format(datetime.datetime.now())
	logmessage('\nbackupDB: Creating backup of DB in {}.'.format(backupfolder))
	exportGTFS(backupfolder)
	logmessage('Backup created.\n')


def replaceChunkyTableDB(xdf, value, tablename='stop_times'):

	chunkFile = findChunk(value, tablename)
	key = chunkRules[tablename]['key']
	lookupJSONFile = chunkRules[tablename]['lookup']

	if chunkFile:
		logmessage('Editing ' + chunkFile)
		try:
			df = pd.read_hdf(dbFolder + chunkFile).fillna('').astype(str)
		except (KeyError, ValueError) as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not have any data.'.format(chunkFile))
		initLen = len(df)
		
		df = df[df[key] != str(value)]
		# df.query('trip_id != "' + str(trip_id) + '"', inplace=True)
		reducedLen = len(df)

		if reducedLen == initLen:
			logmessage('Warning: id {} was supposed to be in {} but no entries there. \
			Cross-check later. Proceeding with insering new data for now.'.format(value,chunkFile))
		else:
			logmessage('{} older entries for id {} removed.'.format( str( initLen - reducedLen ),value ))

		
	else:
		# if the trip wasn't previously existing, take the smallest chunk and add in there.
		chunkFile = smallestChunk(tablename)
		try:
			df = pd.read_hdf(dbFolder + chunkFile).fillna('').astype(str)
		except (KeyError, ValueError) as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not have any data.'.format(chunkFile))
		except FileNotFoundError as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not exist yet, so we will likely create it.'.format(chunkFile))
	
	# next 3 lines to be done in either case
	# newdf = pd.concat([df,xdf],ignore_index=True)
	newdf = df.append(xdf, ignore_index=True, sort=False)
	logmessage('{} new entries for id {} added. Now writing to {}.'.format( str( len(xdf) ),value, chunkFile ))
	newdf.to_hdf(dbFolder+chunkFile, 'df', format='table', mode='w', complevel=1)

	
	# add entry for new trip in stop_times_lookup.json
	with open(dbFolder + lookupJSONFile) as f:
		table_lookup = json.load(f)

	# adding a new key in the json.
	table_lookup[value] = chunkFile

	with open(dbFolder + lookupJSONFile, 'w') as outfile:
		json.dump(table_lookup, outfile, indent=2)

	# for cross-checking
	logmessage('Making new.csv and test.csv in {} for cross-checking.'.format(uploadFolder))
	xdf.to_csv(uploadFolder + 'new.csv', index_label='sr')
	newdf.to_csv(uploadFolder + 'test.csv', index_label='sr')

	# clean up after job done
	del newdf
	del df
	gc.collect()
	return True


def findChunk(value, tablename="stop_times"):
	lookupJSONFile = chunkRules[tablename]['lookup']
	print('lookup for {}: {}'.format(tablename,lookupJSONFile))

	try:
		with open(dbFolder + lookupJSONFile) as f:
			table_lookup = json.load(f)
	except FileNotFoundError:
		logmessage(dbFolder + lookupJSONFile,'not found so creating it as empty json.')
		with open(dbFolder + lookupJSONFile, 'a') as f:
			f.write('{}')
		table_lookup = {}
	
	chunkFile = table_lookup.get(value,None)
	print('Found chunk for id {}: {}'.format(value,chunkFile) )
	return chunkFile


def smallestChunk(prefix, maxSizeMB=configRules.get('MAX_CHUNK_SIZE',1) ):
	'''
	Find the smallest chunk of a chunked table, by size, as the place to put a new set of records in.
	This helps to balance the sizes out over time.
	In case ALL the chunks are too heavy (set some limit), then christen the next chunk.
	'''
	# filenames = [f for f in os.listdir(dbFolder) if f.lower().endswith('.h5') and ( f.lower().startswith(prefix) ) and os.path.isfile(os.path.join(dbFolder, f))]
	filenames = findFiles(dbFolder, prefix=prefix, chunk='y')

	if not len(filenames):
		# no chunks present, return tablename_1
		return prefix + '_1.h5'
	
	# chunkFile = sorted(filenames, key=lambda filename: os.path.getsize(os.path.join(dbFolder, filename)))[0]
	# sort the list of files by size and pick first one. From https://stackoverflow.com/a/44215088/4355695
	sizeList = [ os.path.getsize(os.path.join(dbFolder, filename))/(2**20) for filename in filenames ]
	# get sizes in MB
	if min(sizeList) < maxSizeMB:
		chunkFile = filenames[ sizeList.index(min(sizeList)) ]
	else:
		nextChunkNum = len(filenames) + 1
		chunkFile = '{}_{}.h5'.format(prefix, nextChunkNum)
		logmessage('smallestChunk: All chunks for {} too big, lets create a new one, {}'.format(prefix,chunkFile))
	return chunkFile


def findFiles(folder, ext='.h5', prefix=None, chunk='all'):
	# chunk : 'all','n' for not chunked,'y' for chunked
	filenames = [f for f in os.listdir(folder) 
		if f.lower().endswith(ext) 
		and ( checkPrefix(f,prefix) ) 
		and ( chunkFilter(f,chunk) )
		and os.path.isfile(os.path.join(folder, f))]
	return filenames


def checkPrefix(f,prefix):
	if not prefix: return True
	return f.lower().startswith(prefix)

def chunkFilter(f,chunk):
	'''
	Tells you if the given file is to be taken or not depending on whether you want all, chunked-only or not-chunked-only
	'''
	if chunk=='all': return True
	chunkList = list(chunkRules.keys())
	if any([f.startswith(x) for x in chunkList]) and chunk=='y': return True
	if ( not any([f.startswith(x) for x in chunkList]) ) and chunk=='n': return True
	return False


###################

def diagnoseIDfunc(column,value):
	'''
	function to take column, value and find its occurence throughout the DB, and return the tables the value appears in.
	'''
	# load the delete config file
	content = ''
	deleteRulesDF = pd.read_csv(configFolder + 'deleteRules.csv', dtype=str).fillna('')
	deleteRulesDF.query('key == "{}"'.format(column), inplace=True)
	if len(deleteRulesDF):
		deleteRulesDF.reset_index(drop=True,inplace=True)
	else:
		logmessage('No deleteRules found for column',column)
		content = 'No deleteRules found for this column.'

	if debugMode: logmessage(deleteRulesDF)

	counter = 1
	for i,row in deleteRulesDF.iterrows():
		dbPresent = findFiles(dbFolder, ext='.h5', prefix=row.table, chunk='all')
		if dbPresent:
			searchColumn = row.column_name if len(row.column_name) else row.key
			
			if row.table not in chunkRules.keys():
				df = readTableDB(row.table, key=searchColumn, value=value)
			else:
				if searchColumn == chunkRules[row.table].get('key'):
					df = readTableDB(row.table, key=searchColumn, value=value)
				else:
					df = readChunkTableDB(row.table, key=searchColumn, value=value)

			if len(df):
				content += '{}] {} rows to {} in table "{}":\n'\
					.format(counter,len(df),row.action,row.table)
				content += df.to_csv(index=False, sep='\t')
				content += '\n' + '#'*100 + '\n'
				counter += 1
	return content

def readChunkTableDB(tablename, key, value):
	'''
	function to collect data from all the chunks of a chunked table when the key is not the primary key
	'''
	collectDF = pd.DataFrame()
	if (key is None) or (value is None):
		# very nice! take a blank table, go!
		logmessage('readChunkTableDB: Sorry, cannot extract data from table {} with key={} and value={}'\
			.format(tablename,key,value))
		return pd.DataFrame()

	collect = []
	chunksHaving = []
	for i,h5File in enumerate( findFiles(dbFolder, ext='.h5', prefix=tablename, chunk='y') ):
		try:
			df = pd.read_hdf(dbFolder+h5File).fillna('').astype(str)\
					.query( '{}=="{}"'.format(key,value) )
		except (KeyError, ValueError) as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not have any data.'.format(h5File))
		if len(df): 
			collect.append(df.copy())
			chunksHaving.append(h5File)
		del df

	if len(collect): 
		collectDF = pd.concat(collect, ignore_index=True)
		logmessage('readChunkTableDB: Collected {} rows from table {} for {}={}'\
			.format(len(collectDF),tablename,key,value),\
			'\nChunks having entries:',chunksHaving)
		return collectDF
	else:
		logmessage('readChunkTableDB: No rows found in chunked table {} for {}={}'\
			.format(tablename,key,value))
		return pd.DataFrame()


def deleteID(column,value):
	'''
	Note: this is a container function. 
	The actual deleting is taking place in deleteInTable() func below.
	'''
	content = ''

	# special case: if its a route_id or a calendar service_id, have to delete all the trips under it first, so their respective entries in stop_times are deleted too.
	if column in ['route_id','service_id']:
		tripsList = readColumnDB(tablename='trips', column='trip_id', key=column, value=value)
		message = 'deleteID: Deleting {} trips first under {}="{}"'.format(len(tripsList),column,value) 
		logmessage(message)
		content += message + '<br>'
		content += ''.join([deleteID('trip_id',trip_id) for trip_id in tripsList]) + '<br>'

	# load deleteRules csv from config folder
	deleteRulesDF = pd.read_csv(configFolder + 'deleteRules.csv', dtype=str).fillna('')
	deleteRulesDF.query('key == "{}"'.format(column), inplace=True)
	if len(deleteRulesDF):
		deleteRulesDF.reset_index(drop=True,inplace=True)
	else:
		logmessage('No deleteRules found for column',column)
		content = 'No deleteRules found for column {}.'.format(column)
		return content
	
	if debugMode: logmessage(deleteRulesDF)

	for i,row in deleteRulesDF.iterrows():
		dbPresent = findFiles(dbFolder, ext='.h5', prefix=row.table, chunk='all')
		if dbPresent:
			searchColumn = row.column_name if len(row.column_name) else row.key
			
			content += deleteInTable(tablename=row.table, key=searchColumn, value=value, action=row.action)

	# sequence DB
	content += sequenceDel(column,value)

	return content

def deleteInTable(tablename, key, value, action="delete"):
	if tablename not in chunkRules.keys():
		# its not a chunked table
		h5Files = [tablename + '.h5']
		# since we've composed this filename, check if file exists.
		if not os.path.exists(dbFolder + h5Files[0]):
			logmessage('deleteInTable: {} not found.'.format(h5Files[0]))
			return ''
	else:
		# its a chunked table
		if key == chunkRules[tablename].get('key'):
			h5Files = [findChunk(value, tablename)]
			
			# delete it in the lookup json too.
			lookupJSONFile = chunkRules[tablename]['lookup']
			with open(dbFolder + lookupJSONFile) as f:
				table_lookup = json.load(f)

			table_lookup.pop(value,None) # delete old key which is getting replaced
			
			with open(dbFolder + lookupJSONFile, 'w') as outfile:
				json.dump(table_lookup, outfile, indent=2)

		else:
			# list all the chunks
			h5Files = findFiles(dbFolder, ext='.h5', prefix=tablename, chunk='y')

	# now in h5Files we have which all files to process.
	returnMessage = ''
	for h5File in h5Files:
		try:
			df = pd.read_hdf(dbFolder + h5File).fillna('').astype(str)
		except (KeyError, ValueError) as e:
			df = pd.DataFrame()
			logmessage('Note: {} does not have any data.'.format(h5File))

		# check if given column is present in table or not
		if key not in df.columns:
			logmessage('deleteInTable: Column {} not found in {}. Skipping.'.format(key,h5File) )
			continue

		numDel = len(df.query('{} == "{}"'.format(key,value)) )
		if not numDel: continue

		if action == 'delete':
			df.query('{} != "{}"'.format(key,value), inplace=True)
			df.reset_index(drop=True, inplace=True)
			
			returnMessage += 'Deleted {} rows with {}="{}" in table: {}<br>'.format(numDel,key,value,tablename)
		else: # for zap
			df[key] = df[key].apply(lambda x: '' if x==value else x)
			# zap all occurences of value in the column [key] to blank. leave all other values as-is
			returnMessage += 'Zapped {} occurences of {}="{}" in table: {}<br>'.format(numDel,key,value,tablename)
		
		# commenting out while developing
		df.to_hdf(dbFolder+h5File, 'df', format='table', mode='w', complevel=1)
	logmessage(returnMessage)
	return returnMessage

##########################
# Redo the delete functions to accommodate multiple values. 
# For pandas it doesn't make any difference whether its one value or multiple

##########################

def sequenceDel(column,value):
	content = []
	if column == 'route_id':
		# drop it from sequence DB too.
		sDb = tinyDBopen(sequenceDBfile)
		sItem = Query()
		sDb.remove(sItem['route_id'] == value)
		sDb.close();

		message = 'Removed entries if any for route_id: '+value +' in sequenceDB.'
		logmessage(message)
		content.append(message)

	if column == 'stop_id':
		# drop the stop from sequence DB too.
		sDb = tinyDBopen(sequenceDBfile)
		sItem = Query()
		changesFlag = False
		rows = sDb.all()

		# do this this only if sequenceDBfile is not empty
		if len(rows):
			for row in rows:
				# do zapping only if the stop is present in that sequence
				if value in row['0']:
					row['0'][:] = ( x for x in row['0'] if x != value )
					changesFlag = True
					message = 'Zapped stop_id: ' + value + ' from sequence DB for route: '+ row['route_id'] + ' direction: 0'
					logmessage(message)
					content.append(message)
				if value in row['1']:
					row['1'][:] = ( x for x in row['1'] if x != value )
					changesFlag = True
					message = 'Zapped stop_id: ' + value + ' from sequence DB for route: '+ row['route_id'] + ' direction: 1'
					logmessage(message)
					content.append(message)
			
			# rows loop over, now run write_back command only if there have been changes.
			if changesFlag:
				sDb.write_back(rows)
		
		sDb.close();

	if column == 'shape_id':
		sDb = tinyDBopen(sequenceDBfile)
		sItem = Query()
		changesFlag = False
		rows = sDb.all()

		# do this this only if sequenceDBfile is not empty
		if len(rows):
			somethingEditedFlag = False
			routesAffected = []
			for row in rows:
				if row.get('shape0','') == value:
					row.pop('shape0',None)
					routesAffected.append(row.get('route_id'))
					somethingEditedFlag = True
				if row.get('shape1','') == value:
					row.pop('shape1s',None)
					routesAffected.append(row.get('route_id'))
					somethingEditedFlag = True
			if somethingEditedFlag:
				sDb.write_back(rows)
				message = 'Zapped shape_id: {} in Sequence DB for route(s): {}'\
					.format(value,','.join(routesAffected) )
				logmessage(message)
				content.append(message)
		sDb.close();

	return '<br>'.join(content)

def calendarCurrent():
	calendarDF = readTableDB('calendar')
	today = float( '{:%Y%m%d}'.format(datetime.datetime.now()) )
	logmessage(today)
	calendarDF.end_date = calendarDF.end_date.astype(float)
	return calendarDF[ calendarDF.end_date >= today ]

def logUse(action='launch'):
	payload = {'idsite': 3,  'rec': 1, 'send_image':0}
	payload['action_name'] = action
	cvar = {}
	cvar['1'] = ['OS', platform.system()]
	cvar['2'] = ['processor',platform.processor()]
	if cvar['1'][1] == 'Linux':
		cvar['1'][1] = platform.linux_distribution()[0]
		cvar['3'] = ['version', platform.linux_distribution()[1] ]
	else:
		cvar['3'] = ['version', platform.release() ]
	payload['_cvar'] = json.dumps(cvar)
	try:
		r = requests.get('http://nikhilvj.co.in/tracking/piwik.php', params=payload, verify=False, timeout=1)
	except requests.exceptions.RequestException as e:
		# print('exception',e)
		pass