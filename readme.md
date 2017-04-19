# federation email fund forwarder
This is a replacement for the stellar federation server, it will work with the same mysql format as stellar federation if no added functionality is needed. otherwise you will need the expanded mysql db with transactions table and added fields in Users.  The added feature is to respond to <email>*funtracker.site if it fails to detect the user already on the federation db it will point to the receiver address of funtracker.site and fill in memo with the email address and ,value with startBalance amount needed.

# Features

* Standard federation name lookup

* Standard federation id reverse lookup of publicId (if domain on account is set)

* If Account doesn't exist in federation database, setup transaction to forward funds and sent to destination target email with simple method for receiver to use them with a simple URL link click.

* Can send any asset type that the anchor (funtracker.site in this case) supports

* With just 20.1 XLM you can have anyone added to federation database and they will have a working funded account seen in there email.

* With just 40.1 XLM sent the wallet has the ability and will auto re-key (when mode is set) so anchor no longer holds secret key to funds

* Uses branched stellar bridge to allow monitoring of XLM transactions

* Is now running as federation server on Funtracker.site anchor, but the new accounts it creates are only testnet as proof of concept and test.

* It's a good example on how to setup and make use of a stellar bridge (modified in this case) 

After payment is sent it is first detected by the bridge monitor that does a callback that adds the transaction to the federation db. The federation_processor then scans for all un-processed payments to be forwarded, creates funded accounts and emails the funds to the email addresses.  The email contains a URL link to a my_wallet that provides the receiver access to the funds with just a click.

In this release we have my_wallet also re-key the account when the link is clicked and have it also update the funtracker.site federation with it's newly created account.  In the future We will then have a time out window of maybe a week if the wallet link is not clicked that the funds will then be returned to the sender.  But for now this works.  At this stage if we were to use it on Live Net (now only testnet) we would just have the sender contact us and we would mannualy return the funds to them if they can prove they sent them with a small tx or message sign verify.

This method allows any stellar wallet that supports federation to send any asset an anchor supports to anyone that they happen to know the email address of, however it also requires trusting funtracker.site anchor or whoever ends up running this server to forward the funds for them. But how much trust do we really need if we are sending about $0.04USD worth of XLM to open an account for someone.  After the account is working you no longer need to trust funtracker.site to forward funds anymore, federation will point direct to the the users newly created re-keyed wallet account.

I still think dzham has a better safer method that involves a no trust multi-sig handshake method that we may all later turn to or something like it rather than this method at some point when all the wallet are upgraded to support it.  We still might use this method as a fallback when nothing else is available.
 
# install federation_processor
cd federation_processor
npm install

# run
node app.js

# bridge install setup
see stellar bridge https://github.com/stellar/bridge-server for detailed info on install and setup and also see provided example bridge.cfg file


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

# install php front end
just copy the index.php, callback.php, config.php into your apache or other web server
modify the config.php file to make needed changes in mysql user password settings and anchor public address
you will also have to point your stellar.toml file at this point in your server

# setup
 you must setup the mysql user: password:  db: that is hard coded within app.js config.xxx  and config.php and bridge.cfg
 then import federation.sql file provided
 for this I use phpmyadmin, if upgrading to the slightly newer sql table format it's best to drop the present table and create a new one.
 you should also delete the test entries in the tables before you run, sorry I never did that for you.

# cron setup example
  this will have the processor scan the db every 5 min. other methods will later be found to triger event on detected fund deposits, but at the moment this works.
*/5 * * * * /home/sacarlson/github/stellar/federation_processor/start.sh



 
