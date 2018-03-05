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
Note: this is no longer needed as this is now run from callback.php to update when transaction is detected

# todo list:
1) figure out what to do if non existant user is looked up a second time before processing and a transaction detected. at present looks we return not_found until a transaction from the source that first looked it up is detected.  I guess this was to prevent more than one account from being created for one email address. 
  done: now on second look up within 2 hours of not getting a transaction it will return the same as first attempt.
  after 2 hours the index of this lookup will be deleted from user records and if looked up again a new index and record will be created

2) need to have a timeout of maybe 10 minutes to mark processing as expired.  This way if a transaction from source is never made that the created account will be ignored and never processed.  then next time someone sends to this email it will again create a new processing line.  Maybe also delete the record instead of marking as expired or at least at some point maybe in 24 hours or a week delete them.
  Done: time out to delete an attempted lookup will be deleted in 2 hours by default

3) I think we will have to stop giving away XLM to create accounts for free when added non-native assets are detected at create account time.  This will and already has been abused at some points.  We need another solution that we can prove that the original sender also sent XLM to create the new account before we create an account with both non-native and XLM to prevent abuse from greedy people that just want free XLM.
  Done: We now only accept creating new accounts with an XLM deposits.  Optionally we now allow adding a single trustline asset to the newly created account with an added coma delimited value added to memo index,  example if orignal memo index is "96" then manually modify to "96,USD" wouuld add USD trustline to this account when created.  the transaction also must have needed deposit of 1.5002+ XLM deposit or the creation of the account and forwarding will be ignoored and nothing done.  This accounts for the amount needed for fee's and reserve to create the forwarded account.  Also any forwarding of less than 1.0001 if no added trustline is added will also be ignoored for the same reason. 

4) At some point we could make it so we can add more than one trustline at first creation time by just adding more asset_code in memo with coma delimited example "101,USD,THB,BTC" would add 3 trustlines on funtracker.site on the account.  This will be done later if people end up asking for it.
