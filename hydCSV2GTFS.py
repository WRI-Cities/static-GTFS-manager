# hydCSV2GTFS.py

def hydGTFSfunc(files, payload):
	#files
	returnJson = {}
	returnJson['message'] = ''
	csvsFlag = True
	routes = payload.get('routes')
	numRoutes = len(routes)
	missingRules = payload.get('missingStops')
	outputFolder = 'hydcsv_related/output/'

	##################
	# initiating ZIP file
	zf = zipfile.ZipFile(uploadFolder + 'hydMetroGTFS.zip', mode='w')
	
	##################
	# feed_info
	logmessage('\nPreparing feed_info table.')
	feedInfoDF = pd.DataFrame( [payload.get('feed_info',{})])

	feedInfoCols = ['feed_publisher_name','feed_publisher_url','feed_lang','feed_version']
	feedInfoDF.to_csv(outputFolder+'feed_info.txt', index=None,\
		columns=feedInfoCols)

	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'feed_info.txt">feed_info file</a> created with %d entries.<br>'%len(feedInfoDF)
	logmessage('feed_info.txt created, %d entries'%len(feedInfoDF))

	zf.write(outputFolder+'feed_info.txt', arcname='feed_info.txt', compress_type=zipfile.ZIP_DEFLATED )

	##################
	# Stops
	logmessage('\nPreparing stops table.')
	stopsArray = []
	for row in payload.get('stopsData',[]):
		newrow = row.copy()
		# use .copy() to ensure changes don't happen upstream. from https://stackoverflow.com/questions/43895430/python-append-an-original-object-vs-append-a-copy-of-object
		newrow['zone_id'] = row['stop_id']
		newrow['location_type'] = 1
		newrow['wheelchair_boarding'] = 1
		stopsArray.append(newrow.copy())
		newrow['location_type'] = 0
		newrow['parent_station'] = row['stop_id']
		newrow['stop_id'] = row['stop_id'] + '1'
		newrow['stop_name'] = row['stop_name'] + ' Platform 1'
		stopsArray.append(newrow.copy())
		newrow['stop_id'] = row['stop_id'] + '2'
		newrow['stop_name'] = row['stop_name'] + ' Platform 2'
		stopsArray.append(newrow.copy())
	
	# add stops from Stops-Override, payload['replaceStops']:
	stopsSoFar = [ x['stop_id'] for x in stopsArray ]
	
	for row in payload['replaceStops']:
		if row['replace_with'] not in stopsSoFar:
			newrow = [ x for x in stopsArray if x['stop_id'] == row['stop_id'] ][0].copy()
			logmessage('filtered row:',newrow)
			newrow['stop_id'] = row['replace_with']
			newrow['stop_name'] = newrow['stop_name'][:-1] + row['replace_with'][-1]

			logmessage('Adding row to stops: ',newrow)
			stopsArray.append(newrow.copy())
			stopsSoFar.append(row['replace_with'])
	
	stopCols = ['stop_id', 'stop_name', 'stop_lat', 'stop_lon', \
		'zone_id', 'location_type', 'parent_station', \
		'wheelchair_boarding']
	pd.DataFrame(stopsArray).to_csv(outputFolder+'stops.txt', index=None, columns=stopCols)

	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'stops.txt">stops file</a> created with %d entries.<br>'%len(stopsArray)
	logmessage('stops.txt created, %d entries.'%len(stopsArray) )
	
	zf.write(outputFolder+'stops.txt', arcname='stops.txt', compress_type=zipfile.ZIP_DEFLATED )



	###################
	# Agency
	logmessage('\nPreparing agency table.')
	agencyDF = pd.DataFrame({
		'agency_id': [payload['agency']['id']], \
		'agency_name': payload['agency']['name'], \
		'agency_url': payload['agency']['url'], \
		'agency_timezone': payload['agency']['timezone']
		})
	agencyCols = ['agency_id','agency_name','agency_url','agency_timezone']
	agencyDF.to_csv(outputFolder+'agency.txt', index=None,\
		columns=agencyCols)

	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'agency.txt">agency file</a> created with %d entries.<br>'%len(agencyDF)
	logmessage('agency.txt created, %d entries'%len(agencyDF))

	zf.write(outputFolder+'agency.txt', arcname='agency.txt', compress_type=zipfile.ZIP_DEFLATED )
	


	###################
	# Calendar
	logmessage('\nPreparing calendar table.')
	calendarCols = ['service_id','monday','tuesday','wednesday','thursday','friday','saturday','sunday','start_date','end_date']
	calendarDF = pd.DataFrame({
		'service_id' : ['WK','SU'],
		'monday' : [1,0],
		'tuesday' : [1,0],
		'wednesday' : [1,0],
		'thursday' : [1,0],
		'friday' : [1,0],
		'saturday' : [1,0],
		'sunday' : [0,1],
		'start_date' : payload['agency']['start'],
		'end_date' : payload['agency']['end']
		}, columns=calendarCols)
	# columms= needed for specifying order. Then when writing csv it preserves order.
	calendarDF.to_csv(outputFolder+'calendar.txt', index=None)
	
	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'calendar.txt">calendar file</a> created with %d entries.<br>'%len(calendarDF)
	logmessage('calendar.txt created, %d entries'%len(calendarDF))
	
	zf.write(outputFolder+'calendar.txt', arcname='calendar.txt', compress_type=zipfile.ZIP_DEFLATED )



	###################
	# Routes
	logmessage('\nPreparing routes table.')
	routesDF = pd.DataFrame( columns=['route_id','route_short_name',\
		'route_long_name','route_type','agency_id',\
		'route_color','route_text_color'] )
	
	for i,row in enumerate(routes):
		routesDF.loc[i] = [ row['id'], row['short_name'], \
			row['long_name'], 1, payload['agency']['id'], \
			row['color'], row['text_color'] ]

	routesDF.to_csv(outputFolder+'routes.txt', index=None)
	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'routes.txt">routes file</a> created with %d entires.<br>'%len(routesDF)
	logmessage('routes.txt created, %d entries'%len(routesDF))

	zf.write(outputFolder+'routes.txt', arcname='routes.txt', compress_type=zipfile.ZIP_DEFLATED )



	###################
	# Shapes
	logmessage('\nPreparing shapes table.')
	shapesArray = []
	for i in range(numRoutes):
		route_id = routesDF.loc[i]['route_id']
		fileHolder = files.get('route%d_shape'%i,None)
		if fileHolder is None:
			returnJson['message'] +='Shape for route %d not loaded.<br>'%(i+1)
			continue
		
		returnJson['message'] +='Shape for route %d : '%(i+1) + fileHolder[0].filename + '<br>'
		shapefileContent = json.loads(fileHolder[0]['body'].decode('UTF-8'))
		shapesArray += geoJson2shapeHYD(route_id, shapefileContent)
	
	shapeCols = ['shape_id','shape_pt_sequence','shape_pt_lat','shape_pt_lon','shape_dist_traveled']
	if len(shapesArray):
		shapesDF = pd.DataFrame(shapesArray).to_csv(outputFolder+'shapes.txt', index=None, columns=shapeCols)
		
		returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'shapes.txt">shapes file</a> created with %d entries.<br>'%len(shapesArray)
		logmessage('shapes.txt created, %d entries'%len(shapesArray))
		zf.write(outputFolder+'shapes.txt', arcname='shapes.txt', compress_type=zipfile.ZIP_DEFLATED )

	else:
		returnJson['message'] += 'No shapes file created.<br>'
		logmessage('No shapes file created.')
	


	###################
	# Fare Attributes
	logmessage('\nPreparing fare_attributes table.')
	fareAttr = pd.DataFrame(payload.get('fareAttributes',[]))
	fareAttr['currency_type'] = 'INR'
	fareAttr['payment_method'] = 1
	fareAttr['transfers'] = ''
	fareAttr['agency_id'] = 'HMRL'

	fareAttr.to_csv(outputFolder+'fare_attributes.txt', index=False, columns=list(fareAttr))
	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'fare_attributes.txt">fare_attributes file</a> created with %d entries.<br>'%len(fareAttr)
	logmessage('fare_attributes.txt created, %d entries'%len(fareAttr))

	zf.write(outputFolder+'fare_attributes.txt', arcname='fare_attributes.txt', compress_type=zipfile.ZIP_DEFLATED )



	###################
	# Fare Rules
	# one change from existing model : now keeping the figures in, to make it easier for the user. The KMRL model of using F1 F2 etc is confusing.
	# a replacement at end ought to do the job.
	
	if files.get('fareChart',False):
		logmessage('\nPreparing fare_rules table.')
		faresPivotedString = files['fareChart'][0]['body']
		fares_pivoted = pd.read_csv( io.BytesIO(faresPivotedString) )
		keepcols=['origin_id']
		var_header='destination_id'
		value_header='fare_id'
		sortby=['origin_id','destination_id','fare_id']

		firstCol = keepcols[0]
		if list(fares_pivoted)[0] != firstCol:
			fares_pivoted.rename(columns ={list(fares_pivoted)[0]: 'origin_id'}, inplace=True)
		# rename first column, regardless of its orginal value or blank. from https://stackoverflow.com/a/26336314/4355695

		# un-pivoting
		fares_unpivoted = pd.melt(fares_pivoted, id_vars=keepcols, \
			var_name=var_header, value_name=value_header)\
			.sort_values(by=sortby)

		# drop all rows having NaN values. from https://stackoverflow.com/a/13434501/4355695
		fares_unpivoted_clean = fares_unpivoted.dropna()
		
		# doing a find-replace for fare_id's
		priceReplacementJson = { x['price'] : x['fare_id'] \
			for x in payload['fareAttributes'] }
		logmessage('priceReplacementJson:',priceReplacementJson)

		fares_unpivoted_clean.fare_id.replace(priceReplacementJson, inplace=True)


		# writing out
		fares_unpivoted_clean.to_csv(outputFolder+'fare_rules.txt', index=False)
		returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'fare_rules.txt">fare_rules file</a> created with %d entries.<br>'%len(fares_unpivoted_clean)
		logmessage('fare_rules.txt created, %d entries'%len(fares_unpivoted_clean))
		zf.write(outputFolder+'fare_rules.txt', arcname='fare_rules.txt', compress_type=zipfile.ZIP_DEFLATED )

	else:
		returnJson['message'] += 'No fares chart uploaded so not making fare_rules file.<br>'
		logmessage('No fares chart uploaded so not making fare_rules file.')


	################
	# Transfers
	logmessage('\nPreparing transfers table.')
	transfersPairs = payload.get('transfers',[])
	transfersArray = []

	for pair in transfersPairs:
		row = {}
		row['from_stop_id'] = pair[0]
		row['to_stop_id'] = pair[1]
		row['transfer_type'] = 0
		transfersArray.append(row.copy())

	transfersDF = pd.DataFrame(transfersArray)
	# writing out
	transfersDF.to_csv(outputFolder+'transfers.txt', index=False)
	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'transfers.txt">transfers file</a> created with %d entries.<br>'%len(transfersDF)
	logmessage('transfers.txt created, %d entries'%len(transfersDF))
	zf.write(outputFolder+'transfers.txt', arcname='transfers.txt', compress_type=zipfile.ZIP_DEFLATED )

	################
	# Translations
	logmessage('\nPreparing translations table.')
	translationSource = payload.get('translations',[])
	translationsArray = []
	for line in translationSource:
		row = {}
		row['trans_id'] = line['English']
		
		if len(line.get('Telegu','')):
			row['lang'] = 'te' #Telegu
			row['translation'] = line['Telegu']
			translationsArray.append(row.copy())
		
		if len(line.get('Urdu','')):
			row['lang'] = 'ur' #Urdu
			row['translation'] = line['Urdu']
			translationsArray.append(row.copy())
		
		if len(line.get('Hindi','')):
			row['lang'] = 'hi' #Hindi
			row['translation'] = line['Hindi']
			translationsArray.append(row.copy())
	
	translationsDF = pd.DataFrame(translationsArray)
	
	# writing out
	colsOrder = ['trans_id','lang','translation']
	translationsDF.to_csv(outputFolder+'translations.txt', index=False, columns=colsOrder)
	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'translations.txt">translations file</a> created with %d entries.<br>'%len(translationsDF)
	logmessage('translations.txt created, %d entries'%len(translationsDF))
	zf.write(outputFolder+'translations.txt', arcname='translations.txt', compress_type=zipfile.ZIP_DEFLATED )







	######################################
	# Trips and stop_times
	logmessage('\nPreparing stop_times and trips tables.')
	############
	# before processing, first check if all CSVs have been uploaded or not
	for i in range(numRoutes):
		for day in ['WK','SU']:
			fileHolder = files.get('route' + str(i) + day,None)
			if fileHolder is None:
				csvsFlag = False
			else:
				logmessage(fileHolder[0].filename)
		
	if not csvsFlag:
		logmessage('All routes CSVs have NOT been uploaded.')
		returnJson['csvsStatus'] = False
		returnJson['status'] = False
		returnJson['message'] += 'All routes CSVs have NOT been uploaded.<br>'
		return returnJson

	else:
		returnJson['csvsStatus'] = True
		returnJson['message'] += 'All routes CSVs have been uploaded.<br>'


	# initiating dataframes that will collect stop_times and trips entries
	stop_times_collectorDF = pd.DataFrame()
	trips_collectorDF = pd.DataFrame()


	# loop through routes and service_id's
	for i in range(numRoutes):
		for service_id in ['WK','SU']:

			logmessage('i:',i,' service_id:',service_id)

			route_id = routes[i]['id']
			
			logmessage('route_id:',route_id)

			fileHolder = files.get('route%d%s'%(i,service_id),None)
			logmessage(fileHolder[0]['filename'])
			
			df = pd.read_csv( io.BytesIO(fileHolder[0]['body']) )
			# reading csv directly from bytestring received in the formdata.
			# from https://stackoverflow.com/a/20697069/4355695

			#######
			df.columns = df.columns.str.strip().str.lower().str.replace(' ', '').str.replace('(', '').str.replace(')', '')
			# cleanup column names. from https://medium.com/@chaimgluck1/working-with-pandas-fixing-messy-column-names-42a54a6659cd
			
			try:
				df = df[['runid','rundescription','tripid','platform','arrivaltime','departuretime']]
				# cut out unnecessary columns
			
			except KeyError as e:
				returnJson['status'] = False
				returnJson['message'] += 'Invalid CSV file:' + fileHolder[0]['filename']
				return returnJson

			
			#######
			# build accepted stop values : suffix 1 and 2 to sequence
			# logmessage(routes[i]['sequence'])
			acceptedStops = [ x + '1' for x in routes[i]['sequence'] ] + \
				[ x + '2' for x in routes[i]['sequence'] ]
			# logmessage('acceptedStops :', acceptedStops)
			
			# keep ony the rows that match accepted stops
			df = df[ df['platform'].isin(acceptedStops)]
			# from https://stackoverflow.com/a/12065904/4355695
			logmessage('Filtered table down to accepted stops values, length:',len(df))
			
			#######
			# make index as a column so we can sort by it. from https://stackoverflow.com/a/20461206/4355695
			df.reset_index(level=0, inplace=True)

			# make time column having departuretime as a pandas time object, so we can sort by it.
			# from https://codeburst.io/dealing-with-datetimes-like-a-pro-in-pandas-b80d3d808a7f
			df['time'] = pd.to_datetime(df['departuretime'], format='%H:%M:%S')
			
			# sort by: ['runid','rundescription','tripid','index']
			df.sort_values(['runid','rundescription','tripid','time','index'], inplace=True)

			#######
			# split into dfs by trip, and exclude invalid short trips

			logmessage('Intial number of trips in file:,',len(df.tripid.unique().tolist()))
			# have to cut out trips whose length is below 4 less than route sequence length.
			threshold_triplen = len(routes[i]['sequence']) - 4
			logmessage('Min allowed length of a trip:',threshold_triplen)

			# from https://stackoverflow.com/a/43998102/4355695 . 
			# Split the df into dict of df's by grouping by tripid. 
			tripsDict = { str(key): df.loc[value] \
				for key, value in df.groupby("tripid").groups.items() \
				if len(value) >= threshold_triplen }

			# Advantage of this over normal looping : we don't need to get the list of tripid's first.
			# logmessage('Created tripsDict having each trip\'s sequence as a separate df')

			tripsList = list(tripsDict.keys())
			logmessage('After eliminating invalid length trips, total trips in table:',len(tripsList))


			#######
			# have to get rid of all trips that end before 6am.
			# to do that, just find the last departuretime, take hh out and check if its less than 6.
			# also just publish the borderline trips: that start before 6am and end after 6am.
			for trip in tripsList:
				tripdf = tripsDict.get(trip)

				# get last departure time
				last_dep = tripdf.departuretime.tolist()[-1]
				last_dep_h = last_dep.split(':')[0]
				# logmessage('For trip',trip,', last dep time h:',int(last_dep_h))
				if int(last_dep_h) < 6:
					logmessage( 'Removing pre-6am trip',trip )
					tripsDict.pop(trip,None)
				
				else:  
					# implicitly this will run on for int(last_dep_h) >= 6
					# get first departure time
					first_dep = tripdf.departuretime.tolist()[0]
					first_dep_h = first_dep.split(':')[0]
					if int(first_dep_h) < 6:
						logmessage( 'Watch out for borderline trip',trip)
						# logmessage(tripdf)

			# make new tripsList
			tripsList = list(tripsDict.keys())
			logmessage('After eliminating pre-6am trips, total trips in table:',len(tripsList))

			#######
			stop_times_collector = []
			trips_collector = []
			sequence = []
			sequence.append( routes[i]['sequence'].copy() )
			sequence.append( sequence[0].copy() )
			sequence[1].reverse()
			
			sequenceString0 = ','.join(sequence[0])
			sequenceString1 = ','.join(sequence[1])
			
			# LOOP: Processing each trip
			for trip in tripsList:
				tripdf = tripsDict.get(trip)[['platform','arrivaltime','departuretime']].copy()
				
				##################
				# find direction_id
				stopsSequenceString = ','.join( [ x[:-1] for x in tripdf.platform.tolist() ] )
				# make the trip's stops into an array,
				# strip out suffix,
				# join to make one string

				if stopsSequenceString in sequenceString0:
					# this trip id has direciton_id: 0
					direction_id = 0
				
				elif stopsSequenceString in sequenceString1:
					direction_id = 1
				else: 
					logmessage('ALERT! this trip is NOT in any sequence.', trip, stopsSequence)
					continue


				#######
				# find the suffix to put it on top of stop_id below.
				suffix = tripdf['platform'].tolist()[1][-1]
				
				#######
				# let's CONSTRUCT the trip as it should be, from the official sequence.
				# then copy in arrival, dep times from the df by looking up stop_id in platform column
				stop_times_onetrip = []

				for n,base_stop_id in enumerate(sequence[direction_id]):
					
					stop_id = base_stop_id + suffix
					strow = {}
					strow['stop_sequence'] = n+1

					# waiiit, the stop_id's don't have any 1,2 suffix, that needs to be found out!
					strow['stop_id'] = stop_id
					dfentry = tripdf[ tripdf.platform == stop_id ].to_dict('records')
					# logmessage('\nmatching entry in df:\n',dfentry)
					if len(dfentry):
						if len( dfentry[0].get('arrivaltime','')) > 5:
							# in BLU route, some arrivaltime values are '-'. so protecting against that. 
							# This value gets assigned later in missingRules loop.
							strow['arrival_time'] = get_time( get_sec( dfentry[0].get('arrivaltime') ))
						
						if len( dfentry[0].get('departuretime','')) > 5:
							# though not felt needed, putting in this precaution for possible blank departure times too
							strow['departure_time'] = get_time( get_sec( dfentry[0].get('departuretime') ))
						# doing get_time( get_sec( to render the time strings properly (hh:mm:ss)
						strow['timepoint'] = 1
					else:
						strow['timepoint'] = 0
					stop_times_onetrip.append(strow)

				#######
				# 2nd Run:
				# loop through stop_times_onetrip again, with enumerator, 
				# to find and populate timings for missing stops using missingRules

				for n,row in enumerate(stop_times_onetrip):
					stop_id = row.get('stop_id')
					timepoint = row.get('timepoint')

					# load missingRule for this stop_id if present:
					rule = False
					for mRow in missingRules:
						if mRow['route_id'] == route_id and mRow['stop_id'] == stop_id:
							rule = mRow


					if rule and timepoint == 0:
						# logmessage('Missing stop found!',stop_id)
						benchmark_where = getInt(rule,'benchmark_where')
						benchmark_column = rule.get('benchmark_column')
						bench_n = n + benchmark_where
						
						# locate benchmark by traversing to offset row in this trip's stop_times array, and pick designated column
						benchmark_timestring = stop_times_onetrip[bench_n][benchmark_column]
						
						# logmessage('benchmark_timestring:',benchmark_timestring)
						benchmark = get_sec(benchmark_timestring)
						
						arrival_time_offset = getInt(rule,'arrival_time_offset')
						if arrival_time_offset:
							row['arrival_time'] = get_time( benchmark + arrival_time_offset)
						
						departure_time_offset = getInt(rule,'departure_time_offset')
						if departure_time_offset:
							row['departure_time'] = get_time( benchmark + departure_time_offset)
						
						benchmark_arrival_change = getInt(rule,'benchmark_arrival_change')
						if benchmark_arrival_change:
							stop_times_onetrip[bench_n]['arrival_time'] = get_time( benchmark + benchmark_arrival_change)

						benchmark_departure_change = getInt(rule,'benchmark_departure_change')
						if benchmark_departure_change:
							stop_times_onetrip[bench_n]['departure_time'] = get_time( benchmark + benchmark_departure_change)

						# logmessage('Missing data filled for stop:',stop_id,'sequence:',i)
				
				#########
				# create trip_id for this trip

				first_dep = stop_times_onetrip[0].get('departure_time','')\
					.replace(':','')[:4]
				
				if not len(first_dep): logmessage('trip',trip,' not having first departure time.')
				
				trip_id = route_id + '.' + service_id + '.' + str(direction_id) + '.' + first_dep
				
				# create trip_short_name
				trip_short_name = stop_times_onetrip[0].get('departure_time','').replace(':','.')[:5] \
					+ ' ' + routes[i]['short_name'] + ' ' \
					+ ( 'Onward' if direction_id==0 else 'Return' )


				#########
				# assigning formulated trip_id to stop_times array
				for row in stop_times_onetrip:
					row['trip_id'] = trip_id
					row['origtrip'] = trip

				##################
				# stop_times data for this trip is ready. Appending it to the collector array.
				stop_times_collector += stop_times_onetrip

				##################
				# creating row for trips entry
				shape_id = route_id + '_' + str(direction_id)
				triprow = { 'route_id': route_id, 'service_id':service_id, \
					'trip_id':trip_id, 'direction_id': direction_id, \
					'shape_id':shape_id, 'wheelchair_accessible':1,\
					'origtrip': trip, 'trip_short_name':trip_short_name }
				trips_collector.append(triprow)


			##################
			# full-file-level operations on collected trips and stop_times
			
			stop_times_onefileDF = pd.DataFrame(stop_times_collector)
			
			# payload['replaceStops']

			stopsOverrideJson = { x['stop_id']:x['replace_with'] \
				for x in payload['replaceStops'] \
				if x['route_id'] == route_id }
			# creating a dict with substitutions that can directly be passed to pandas
			logmessage('stopsOverrideJson:',stopsOverrideJson)

			stop_times_onefileDF.stop_id.replace(stopsOverrideJson, inplace=True)
			
			stop_times_collectorDF = pd.concat([stop_times_collectorDF, \
				stop_times_onefileDF],\
				ignore_index=True)

			trips_collectorDF = pd. concat( [trips_collectorDF,\
				pd.DataFrame(trips_collector)],\
				ignore_index=True)

		# end of service_id loop
	# end of routes loop










	# finally, writing to CSV
	# stop_times
	colsOrder = ['trip_id','stop_sequence','stop_id',
		'arrival_time','departure_time', 'timepoint','origtrip']	
	stop_times_collectorDF.to_csv(outputFolder+'stop_times.txt', index=None, columns=colsOrder)
	
	# now trips
	colsOrder = ['route_id','service_id','direction_id','trip_id',\
		'trip_short_name', 'shape_id','wheelchair_accessible', 'origtrip']
	trips_collectorDF.to_csv(outputFolder+'trips.txt', index=None, columns=colsOrder)

	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'stop_times.txt">stop_times file</a> created with %d entries.<br>'%len(stop_times_collectorDF)
	logmessage('stop_times.txt created, %d entries'%len(stop_times_collectorDF))
	zf.write(outputFolder+'stop_times.txt', arcname='stop_times.txt', compress_type=zipfile.ZIP_DEFLATED )
	
	returnJson['message'] += '<a target="_blank" href="'+ outputFolder+'trips.txt">trips file</a> created with %d entries.<br>'%len(trips_collectorDF)
	logmessage('trips.txt created, %d entries'%len(trips_collectorDF))
	zf.write(outputFolder+'trips.txt', arcname='trips.txt', compress_type=zipfile.ZIP_DEFLATED )











	###################
	# end
	zf.close()

	importGTFS('hydMetroGTFS.zip')

	returnJson['message'] += '<a target="_blank" href="' + uploadFolder + 'hydMetroGTFS.zip">hydMetroGTFS.zip</a> GTFS zip file created, and imported to DB.<br>'
	returnJson['message'] += '<a target="_blank" href="' + logFolder + 'log.txt" target="_blank">Click here</a> for detailed logs.<br>'
	returnJson['status'] = True
	return returnJson




















#######################

def geoJson2shapeHYD(route_id, shapefileContent, shapefileRev=None):
	output_array = []
	try:
		coordinates = shapefileContent['features'][0]['geometry']['coordinates']
	except KeyError as e:
		logmessage('Invalid geojson file.')
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
		newrow['shape_dist_traveled'] = float(format( dist_traveled , '.2f' )) 
		#rounding. From https://stackoverflow.com/a/28142318/4355695

		i = i + 1
		newrow['shape_pt_sequence'] = i
		output_array.append(newrow)
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
		newrow['shape_dist_traveled'] = float(format( dist_traveled , '.2f' )) 
		#rounding. From https://stackoverflow.com/a/28142318/4355695

		i = i + 1
		newrow['shape_pt_sequence'] = i
		output_array.append(newrow)
		prevlat = item[1]
		prevlon = item[0]
	
	return output_array










####################################
def get_sec(time_str):
	'''
	convert a hh:mm:ss string into seconds
	'''
	h, m, s = time_str.split(':')
	return int(h) * 3600 + int(m) * 60 + int(s)


####################################
def get_time(n):
	'''
	convert a seconds int value into a hh:mm:ss string
	'''
	return time.strftime('%H:%M:%S', time.gmtime(n))

def getInt(rule,key,default=0):
	test = rule.get(key,default)
	if test == '' or test==False or test==True:
		return 0
	else:
		return int(test)
