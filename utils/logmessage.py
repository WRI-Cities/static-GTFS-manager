import os
import time, datetime

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

