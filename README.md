# sandwich

![alt tag](/resources/sandwich.png)

Aggregates responses from the semantic interface of n+1 BMLT root servers

In the future, the tomato will supercede this.  https://github.com/jbraswell/tomato

### More information

http://archsearch.org/sandwich/

If running locally you will need to generate a self-signed cert or use something like Let's Encrypt.  If you self sign a certificate you may have some issues generating a Certificate Chain file which is required by sandwich.  

A simple workaround is to create a symbolic link.

`ln -s certs/cert.pem certs/chain.pem`

