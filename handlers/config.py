import tornado.web
import tornado.ioloop
import json
import io,os

root = os.path.dirname(__file__) # needed for tornado
configFolder = os.path.join(root,'../config/')
# Tornado API functions template:
class APIKeys(tornado.web.RequestHandler):
        def get(self):
                # get the Argument that User had passed as name in the get request
                # userInput=self.get_argument('name')
                self.set_header("Content-Type", "application/x-json")                
                with open(configFolder + 'apikeys.json') as f:
                        apikeys = json.load(f)
                        self.write(apikeys)

        def post(self):                
                with open(configFolder + 'apikeys.json','w') as f:
                        f.write(self.request.body.decode('UTF-8'))                        
                        self.write(json.dumps({'status': 'ok', 'data': []}))
                        #self.write(json.dumps({'status': 'ok', 'data': []}))
