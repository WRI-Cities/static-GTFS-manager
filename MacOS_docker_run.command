#!/bin/sh
cd "`dirname "$0"`"
docker run -it -p 5000:5000 -v "`pwd`":/app static-gtfs-manager