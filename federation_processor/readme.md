# Federation Proccesor 
This program is used to process payments that were setup by the php_federation server.  The php_federation server will attempt to lookup a federation address. If the address doesn't exist in the fed db and it is an email address before "*" it will set destination address to this anchors recieving address that is set in the federation server with an added memo with details with the email and the startbalance needed to forward the funds to the email address.

When this transaction is sent this federation_processor processes the payment that was stored in a mysql db that was put there by the running bridge app.  An email is then sent by this federation processor  that provides a URL wallet link to the funds sent by the sender with key and asset trustlines aready setup for the destination user, there by forwarding the funds to the new user.
 
# install
cd federation_processor
npm install

# run
node app.js

# on fresh ubuntu install
 apt-get install npm
 npm install 
 nodejs app.js
or run ./start.sh that can also be run from cron
note for ./start.sh you will have to modify the path to suit your install point
note this method won't work without upgrade as you need node version 6+ this installs 4.X
you will need to add:
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs
to upgrade nodejs to version 6+

# setup
 you must setup the mysql user: password:  db: that is hard coded within app.js config.xxx
 then import federation.sql file provided
 for this I use phpmyadmin, if upgrading to the slightly newer sql table format it's best to drop the present table and create a new one.
 you should also delete the test entries in the tables before you run, sorry I never did that for you.

# cron setup example
  this will have the processor scan the db every 5 min. other methods will later be found to triger event on detected fund deposits, but at the moment this works.
*/5 * * * * /home/sacarlson/github/stellar/federation_processor/start.sh



 
