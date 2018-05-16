FROM python:3.6-stretch

RUN apt-get update && apt-get install -y \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install pandas tornado xmltodict tinydb pycryptodomex --user
RUN mkdir -p /app
WORKDIR /app
COPY . /app/

EXPOSE 5000

CMD cd /app/ && python3 GTFSManager.py