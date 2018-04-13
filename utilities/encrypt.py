# python3
from Crypto.PublicKey import RSA
from sys import argv

# usage: python3 encrypt.py "password"
# output will be a file "rsa_key.bin" created in the same folder that you can keep in your application and use the decrypt function to authenticate password.

# install pycrpytodome package (and not Crypto or pycrpto) : 
# sudo pip3 install pycryptodome

# from http://pycryptodome.readthedocs.io/en/latest/src/examples.html

def encrypt(password):
	key = RSA.generate(2048)
	encrypted_key = key.exportKey(passphrase=password, pkcs=8, protection="scryptAndAES128-CBC")
	with open("rsa_key.bin", "wb") as file_out:
		file_out.write(encrypted_key)

if len(argv) > 1 :
	password = argv[1]
	encrypt(password)
	print('Encrypted. You can put the file rsa_key.bin in your application and it will be decoded only by your password.')

else:
	print('Usage: python3 encrypt.py "password"')
	print('Output will be a file "rsa_key.bin" created in the same folder that you can keep in your application and use the decrypt function to authenticate password.')
