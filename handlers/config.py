import tornado.web
import tornado.ioloop
import json


# Tornado API functions template:
class APIKeys(tornado.web.RequestHandler):
	def get(self):
		#get the Argument that User had passed as name in the get request
		#userInput=self.get_argument('name')
		welcomeString='Hello'
		#return this as JSON
		self.write(json.dumps(welcomeString))

	def post(self):
		user = self.get_argument("username")
		passwd = self.get_argument("password")		
		self.write("Your username is %s and password is %s" % (user, passwd))

