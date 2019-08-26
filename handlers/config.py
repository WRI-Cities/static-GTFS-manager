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
		with open(configFolder + 'apikeys.json') as f:
                        apikeys = json.load(f)
                        self.write(apikeys)

	def post(self):
		user = self.get_argument("username")
		passwd = self.get_argument("password")		
		self.write("Your username is %s and password is %s" % (user, passwd))

