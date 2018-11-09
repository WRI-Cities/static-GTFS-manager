# python3.6
import pandas as pd
import os
from sys import argv
# note: ensure module 'tables' is also installed, pandas needs that to work with HDF5 (.h5)file format.

def findFiles(folder, ext='.h5'):
	filenames = [f for f in os.listdir(folder) 
		if f.lower().endswith(ext) 
        and os.path.isfile(os.path.join(folder, f))]
	return filenames



print('This utility program will read all the existing HDF5 (.h5) files in the db folder and create csv dumps of the same in the working folder.\nNote: some files may be in chunks.')

print('\nDefault target folder: ../db/ (one level up and in db)\n\nIf you want to specify another folder path, please run this program with the path as argument.\nExample: python3 h5toCSV.py "../helloDB/filesHere"\n')

dbFolder = '../db/'

if len(argv) > 1 :
	dbFolder = argv[1]

if not os.path.exists(dbFolder):
    print('\nFolder: "{}" not found. Please specify another folder.'.format(dbFolder))

allFiles = findFiles(dbFolder)
if not len(allFiles):
    print('\nNo .h5 files found in path "{}", please specify another folder.'.format(dbFolder))

for h5File in allFiles:
    tablename = h5File[:-3]
    try:
        df = pd.read_hdf(dbFolder + h5File).fillna('').astype(str)
    except (KeyError, ValueError) as e:
        df = pd.DataFrame()
        logmessage('Note: {} does not have any data.'.format(h5File))
    
    if len(df):
        print('Writing {} to disk as {}.csv'.format(h5File,tablename))
        df.to_csv(tablename + '.csv', index=False, chunksize=1000000)

print('\nHave a nice day.')