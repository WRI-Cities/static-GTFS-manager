# python3
from Cryptodome.PublicKey import RSA
from sys import argv

# usage: python3 encrypt.py "password"
# output will be a file "rsa_key.bin" created in the same folder that you can keep in your application and use the decrypt function to authenticate password.

# install pycrpytodome package (and not Crypto or pycrpto or pycryptodome) : 
# pip install pycryptodomex

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
	print('Password encryption utility that uses RSA encryption.');
	print('Normal usage: python3 encrypt.py "password"')
	print('Output will be a file "rsa_key.bin" created in the same folder that you can keep in your application and use the decrypt function to authenticate password.')
	print('\n\nDoing interactive mode. Enter a word or phrase as your password:')
	password = input()
	encrypt(password)
	print('\nOk, created an encrypted key for your password. You should find a new "rsa_key.bin" file created in your working folder. Move it to "pw" folder, replacing the existing key there. Now when you run the program, you will be able to use the new password.')
	print('Press any key to exit.')
	a = input()
