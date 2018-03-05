//(c) 2017 sacarlson (sacarlson_2000@yahoo.com)
// federation processor
// this checks collected transaction that were sent to an email address as seen in memo
// when federation doesn't exist transactions are directed with federation to be sent to the anchor to forward
// this processor will look for any new un-proccessed transactions, will create a new random stellar account, fund it and send
// to the email address seen in memo.
// the email will contain instructions on how to collect funds with a link to my_wallet and/or qr-code for stargazer wallets.
// we can later add time window to collect funds, if fails to collect in window the funds will be returned to sender (7 days?).
var mysql = require("mysql");
var StellarSdk = require('stellar-sdk');
const nodemailer = require('nodemailer');

var config = {};


// this is used as source to create new accounts and forward assets sent to new addresses
// it is the pass bettween account with minimal funding that the sender will send the funds to that will later
// be sent to the new user.  this account must have trustlines in all the set issuers assets, for test the issuer only uses USD
 //GAVUFP3ZYPZUI2WBSFAGRMDWUWK2UDCPD4ODIIADOILQKB4GI3APVGIF  
config.gateway_secret_test = "SA6I....";

 // GDUPQLNDVSUKJ4XKQQDITC7RFYCJTROCR6AMUBAMPGBIZXQU4UTAGX7C // alternate test gateway address
//config.gateway_secret_test = "SDXVR...";

// GATXLX5YVEQQ7X5LZ77TZMK5RPME4XKIDMEO2TZDKV65DI6J2VQAUIHR
config.gateway_secret_live = "SBSL...";

// this should be set to the anchor asset_issuer address like GBUY... for live or GCEZ... for testnet
// at this time we only use asset_code USD from this issuer in test
config.asset_issuer_test = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
// asset_issuer_test secret = SBQWY3DNPFWGSZTFNV4WQZLBOJ2GQYLTMJSWK3TTMVQXEY3INFXGO52X (master testnet account)

//config.asset_issuer_live = "GBUYUAI75XXWDZEKLY66CFYKQPET5JR4EENXZBUZ3YXZ7DS56Z4OKOFU";
config.asset_issuer_live = "GATXLX5YVEQQ7X5LZ77TZMK5RPME4XKIDMEO2TZDKV65DI6J2VQAUIHR";

// note for gmail with this type login you will also have to setup gmail in lesssecure mode https://myaccount.google.com/lesssecureapps?pli=1
// or setup in 0auth2 mode at some point
config.gmail_username = 'myemail@gmail.com';
config.gmail_password = 'password';

config.mysql_host = "localhost";
config.mysql_user = "fed2b";
config.mysql_password = "password";
config.mysql_database = "fed2";

// stellar network test or live;
//config.network = "live";
config.network = "test";
config.net_passphrase_test = "Test SDF Network ; September 2015";
config.net_passphrase_live = "Public Global Stellar Network ; September 2015";
config.stellar_server_host_test = "horizon-testnet.stellar.org";
config.stellar_server_host_live = "horizon.stellar.org";

// this will disable sending the transaction and just do the email if set to true;
// this is for preliminary testing to verify all other parts work before testing stellar transactions
// from send tx to email
//config.disable_submit_tx = true;
config.disable_submit_tx = false;

// enable_rekey mode true will send the funded URL wallet link with the rekey set active
// when set the funds in the wallet will be re-keyed to a new secret seed so you can detect the funds were recieved and the anchor no longer 
// has access to the funds.  Warning with this set if the person you sent the funds looses his key, you and no one else can help him.
config.enable_rekey = false;


if (config.network == "test"){
  config.net_passphrase = config.net_passphrase_test; 
  config.stellar_server_host = config.stellar_server_host_test;
  config.gateway_secret = config.gateway_secret_test;
  config.asset_issuer = config.asset_issuer_test;
}else{
  config.net_passphrase = config.net_passphrase_live; 
  config.stellar_server_host = config.stellar_server_host_live;
  config.gateway_secret = config.gateway_secret_live;
  config.asset_issuer = config.asset_issuer_live;
}
config.gateway_keypair = StellarSdk.Keypair.fromSecret(config.gateway_secret);
config.gateway_publicId = config.gateway_keypair.publicKey();  
     
  var server = new StellarSdk.Server({     
          hostname: config.stellar_server_host,
          port: 443,
          protocol: "https",
        });

StellarSdk.Network.use(new StellarSdk.Network(config.net_passphrase));


var con = mysql.createConnection({
  host: config.mysql_host,
  user: config.mysql_user,
  password: config.mysql_password,
  database: config.mysql_database
});

console.log("pre connect");
con.connect(function(err){
  if(err){
    console.log('Error connecting to Db');
    return;
  }
  console.log('Connection established');
});

console.log("post connect");

 
// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.gmail_username,
        pass: config.gmail_password
    }
});

// setup email data example
let mailOptions = {
    to: 'sacarlson_2000@yahoo.com', // list of receivers
    subject: 'Hello test2', // Subject line
    text: 'Hello world ?', // plain text body
    html: '<b>Hello world ?</b>' // html body
};


  function send_email(mail_options){
    // send mail with defined transport object
    transporter.sendMail(mail_options, (error, info) => {
      if (error) {
        return console.log(error);
        update_user_status(mail_options.to,"mail_failed");
      } else {
        update_user_status(mail_options.to,"processed");
      }
      console.log('Message %s sent: %s', info.messageId, info.response);
      
    }); 
  }

  function fix7dec(string) {
    var num = Number(string).toFixed(7);
    string = num.toString();
    return string;
  }

  function gen_key(){
    return StellarSdk.Keypair.random();
  } 

  
  function signMessage(key,message){
    //return signature signed by key of message in base64 format
    console.log("publickey: ", key.publicKey());
    var hash = StellarSdk.hash(StellarSdk.hash(message));
    console.log("sign hash: ", hash);
	return key.sign(hash).toString('base64');
  }
  

  function verifyMessageSig(publickey,msg_string,b64_sig){
    var keys = StellarSdk.Keypair.fromPublicKey(publickey);
    var hash = StellarSdk.hash(StellarSdk.hash(msg_string));
    var sig = new Buffer(b64_sig, 'base64');
    return keys.verify(hash, sig);       
  }

      var transaction;
      function submit_operation(tx_array,from_keypair,to_keypair,username) {
         console.log("start submit_operation");
         server.loadAccount(from_keypair.publicKey())
          .then(function (account) {
             transaction = new StellarSdk.TransactionBuilder(account)            
             tx_array.forEach(function (item) {
               transaction.addOperation(item);
             });
             //transaction.addOperation(operation);
             transaction = transaction.build();
             transaction.sign(from_keypair);
             if (tx_array.length > 1){
               transaction.sign(to_keypair);
             } 
             console.log("sending tx"); 
             console.log(transaction.toEnvelope().toXDR().toString("base64"));
             update_user_tx(transaction.operations[0].destination,transaction.toEnvelope().toXDR().toString("base64")); 
             if (config.disable_submit_tx){
               send_user_mail(username); 
               return;
             }          
             server.submitTransaction(transaction).then(function(result) {              
               console.log("Transaction Completed OK");
               //transaction.operations[0].destination  // update user table db for this account
               console.log("tx destination that completed ok: ",transaction.operations[0].destination);
               // send_user_mail also updates db status
               send_user_mail(username);
             }).catch(function(e) {
               console.log("submitTransaction error");
               console.log("tx destination that failed: ",transaction.operations[0].destination);
               update_user_status(username,"submit_tx_failed");
               console.log(e);
               var error_report = "Transaction Failed";
               if (e.extras.result_codes.transaction == "tx_bad_auth"){
                  error_report = error_report + ": Transaction error: tx_bad_auth"
               } else {           
                 error_report = error_report + "Transaction error: " + e.extras.result_codes.operations[0];
               }
               console.log(error_report);
             });                      
          })
          .then(function (transactionResult) {
            console.log("tx_result");
            console.log(transactionResult);
            if (typeof transactionResult == "undefined") {
              console.log("tx res undefined");
            }            
          })
          .catch(function (err) {
            console.log(err); 
          });
        }

       //function create_funded_account(from_keypair,to_keypair,asset_code,asset_issuer,amount,startingBalance){
       function create_funded_account(params){
               var from_keypair = params.from_keypair;
               var to_keypair = params.to_keypair;    
               var asset_code = params.asset_code;
               var asset_issuer = params.asset_issuer;
               var amount = params.amount;
               var startingBalance = params.startingBalance; 
               var username = params.username;
               console.log("create_funded_account params");
               console.log(params);
               var tx_array = [];
               if (asset_code == "native"){
                 asset_code = "XLM";
               }
               var asset;
               if (asset_code != "XLM" ){
                 // create the new user account
                 tx_array.push(StellarSdk.Operation.createAccount({
                   destination: to_keypair.publicKey(),
                   startingBalance: fix7dec(startingBalance)  
                 }));

                 // setup needed trust for non native asset
                 asset = new StellarSdk.Asset(asset_code, asset_issuer);
                 tx_array.push(StellarSdk.Operation.changeTrust({asset: asset,source:to_keypair.publicKey()}));

         //asset_obj = new StellarSdk.Asset(remote_txData.stellar.payment.asset.code, remote_txData.stellar.payment.asset.issuer);
         //tx_array.push(StellarSdk.Operation.changeTrust({asset: asset_obj,source:keypair_escrow.publicKey()}));

                 // setup payment of non native asset
                 //tx_array.push(StellarSdk.Operation.payment({
                 //  destination: to_keypair.publicKey(),
                 //  amount: fix7dec(amount),
                 //  asset: asset
                 //}));

               }else {
                 tx_array.push(StellarSdk.Operation.createAccount({
                   destination: to_keypair.publicKey(),
                   startingBalance: fix7dec(amount)  
                 }));
               } 
               submit_operation(tx_array,from_keypair,to_keypair,username);
             }       
               
function process_challenges(config){
  console.log("start process_challenges");
  // as seen from challenge table db
  // index2: 3,
  // id: GADXD..,
  // new_id: GBDSA...,
  // new_email: test@yahoo.com,
  // message: dskdjfsld,
  // sig: fjkdjs...,
  // status: processing // awaiting.. // processed,
  // date_updated: Mon Apr 10 2017 09:37:30 GMT+0700 (ICT)
  con.query('SELECT * FROM challenge WHERE status = "processing"',function(err,rows){
      if(err) throw err;
      console.log(rows);
      for (var i = 0; i < rows.length; i++) {
         console.log(rows[i]);
         if (verifyMessageSig(rows[i].id,rows[i].message,decodeURIComponent(rows[i].sig))){
           console.log("id sig verified, will update id in user fed for index: ",rows[i].index2);
           update_user_id(rows[i].id,rows[i].new_id,rows[i].new_email,rows[i].index2); 
         }else{
           console.log("id sig verify failed for index: ",rows[i].index2);
         } 
      }
  });
}

function process_accounts(config){
   console.log("start process_accounts");
  // as seen returned from transactions table db
  //id: 8,
  //username: 'sacarlson_2000@yahoo.com',
  //sent_to: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ',
  //sent_from: 'GCETSDG...',
  //amount: '35',
  //asset_code: 'USD',
  //status: 'processing',
  //memo: 'sacarlson_2000@yahoo.com,12',
  //date_added: Mon Apr 10 2017 09:37:30 GMT+0700 (ICT),
  //date_updated: Mon Apr 10 2017 09:37:30 GMT+0700 (ICT) 
   var user_keypair;
   var user_publicId;
   var user_secret;
   var amount_xlm;
   var array;
   var params = {};
   con.query('SELECT * FROM transactions WHERE status = "processing"',function(err,rows){
      if(err) throw err;
      console.log("rows");
      console.log(rows);
      for (var i = 0; i < rows.length; i++) {
        console.log(rows[i]);
        user_keypair = gen_key();
        user_publicId = user_keypair.publicKey();
        user_secret = user_keypair.secret();
        if (rows[i].asset_code == "XLM" || rows[i].asset_code == "native"){
          amount_xlm = 0;
        } else {
          console.log("asset recieved was not XLM will ignore forwarding");
          amount_xlm = 0;
          rows[i].amount = 0;          
        }
        array = rows[i].memo.split(",");
        if (array.length >1){
            console.log("parsefloat amount");
            console.log(parseFloat(rows[i].amount));
            if (parseFloat(rows[i].amount) > 1.5002){
              console.log("rows.amount was grater than 1.5002");
              //subtract 0.0002 from amount to send for transaction fee's to create two operations to add trustline
              // at this time we will only allow adding 1 asset to created account
              rows[i].asset_code = array[1];
              amount_xlm = rows[i].amount - 0.0002;
              amount_xlm = amount_xlm.toString();
              rows[i].amount = "0";
            } else{
              console.log("didn't fund enuf less than 1.5002 amount");
              rows[i].amount = 0;
              amount_xlm = 0;
            }
        }
        console.log("amount_xlm");
        console.log(amount_xlm);
        console.log(rows[i].amount);
        //update_user(rows[i].username,user_publicId,user_secret,"funding");
        update_user_seed(rows[i].username,user_publicId,user_secret);

        params.from_keypair = config.gateway_keypair;
        params.to_keypair = user_keypair;   
        params.asset_code = rows[i].asset_code;
        params.asset_issuer = config.asset_issuer;
        params.amount = rows[i].amount;
        params.startingBalance = amount_xlm;
        params.username = rows[i].username;
        //function create_funded_account(from_keypair,to_keypair,asset_code,asset_issuer,amount,startingBalance){
        //create_funded_account(config.gateway_keypair,user_keypair,rows[i].asset_code,config.asset_issuer,rows[i].amount,amount_xlm); 
        create_funded_account(params);                       
      }
      console.log("post query");   
    });    
  }




function get_user_transaction(username){
  //id: 8,
  //username: 'sacarlson_2000@yahoo.com',
  //sent_to: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ',
  //sent_from: '',
  //amount: '35',
  //asset_code: 'USD',
  //status: 'processing',
  //memo: 'sacarlson_2000@yahoo.com,12',
  //date_added: 2017-04-10T02:37:30.000Z,
  //date_updated: 2017-04-11T04:43:40.000Z }

    console.log("get_user_transaction");
    con.query('SELECT * FROM transactions WHERE username = "' + username + '" AND status = "processing"',function(err,rows){
      if(err) throw err;
      console.log(rows);
      console.log("rows: ", rows[0]);
      console.log("username: ", rows[0].username);
      console.log(user);
    });
  }

function send_user_mail(username){
    //{
    //index: 37,
   // username: 'sacarlson_2000@yahoo.com',
   // account_id: 'GCGN2UK4W6XFNCCUHL76DHRKOGWO64AUZ2KMOCHNFJWEYSFJZNGM4OFR',
    //seed: 'SC4TLUBDB5LQIPJKVD2W2H7RMDFK7L7SIMPKDMSTJ2VI4UR2NQL6JP4E',
   // date_added: 2017-04-10T02:37:30.000Z,
   // date_updated: 2017-04-11T00:12:46.000Z,
   // status: 'processing',
    //b64_tx_last: 'test_b64' } ]
// user
//{ username: 'sacarlson_2000@yahoo.com',
//  seed: 'SC4TLUBDB5LQIPJKVD2W2H7RMDFK7L7SIMPKDMSTJ2VI4UR2NQL6JP4E',
//  account_id: 'GCGN2UK4W6XFNCCUHL76DHRKOGWO64AUZ2KMOCHNFJWEYSFJZNGM4OFR' }

     //id: 8,
  //username: 'sacarlson_2000@yahoo.com',
  //sent_to: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ',
  //sent_from: '',
  //amount: '35',
  //asset_code: 'USD',
  //status: 'processing',
  //memo: 'sacarlson_2000@yahoo.com,12',
  //date_added: 2017-04-10T02:37:30.000Z,
  //date_updated: 2017-04-11T04:43:40.000Z }
    var tx_info = {};
    console.log("get_user");
    con.query('SELECT * FROM Users WHERE username = "' + username + '"',function(err,rows){
      if(err) throw err;
      console.log(rows[0]);
      //console.log("rows: ", rows[0]);
      //console.log("username: ", rows[0].username);
      tx_info.username = rows[0].username;
      tx_info.seed = rows[0].seed;
      tx_info.account_id = rows[0].account_id;
      console.log("user: ",tx_info.username);
      //console.log(user);
      con.query('SELECT * FROM transactions WHERE username = "' + username + '"',function(err,rows){
        if(err) throw err;
        console.log("tx");
        console.log(rows[0]);
        //update_user_status(username,"processed");
        tx_info.sent_from = rows[0].sent_from;
        tx_info.sent_to = rows[0].sent_to;
        tx_info.amount = rows[0].amount;
        tx_info.asset_code = rows[0].asset_code;
        tx_info.memo = rows[0].memo;
        tx_info.date_added = rows[0].date_added;
        console.log(tx_info);
        //make_email(tx_info);
        send_email(make_email(tx_info));
      });
      console.log("here");
    });
  }

function make_email(tx_info){
  // this is sent with send_email(mail_options)
  // tx_info
  //{ username: 'sacarlson_2000@yahoo.com',
  //seed: 'SC4TL...',
  //account_id: 'GCGN2UK4W6XFNCCUHL76DHRKOGWO64AUZ2KMOCHNFJWEYSFJZNGM4OFR',
  //sent_from: '',
  //sent_to: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ',
  //amount: '35',
  //asset_code: 'USD',
  //memo: 'sacarlson_2000@yahoo.com,12',
  //date_added: 2017-04-10T02:37:30.000Z }
  //config.asset_issuer
// example funded wallet link
//https://sacarlson.github.io/my_wallet/?json=%7B%22seed%22:%22SAYRX7...T%22%7D

  if (tx_info.asset_code == "native"){
    tx_info.asset_code = "XLM";
  }

  var l1 = '<h1 style="text-align: center;"><span style="color: #ff0000;">You have been sent Stellar.org asset funds</span></h1><h4 style="text-align: center;">Anchored by Funtracker.site Bank</h4>';
  if (config.network == "test"){
    var l1_1 = '<h2 style="text-align: center;"><span style="color: #ff0000;">This is FAKE money (testnet) for TEST only</span></h2>';
  }else {
    var l1_1 = '';
  }
  
  var l2 = '<h3>Funds sent by: '; 
  var l3 = tx_info.sent_from +'</h3>';
  var l4 = '<h3>Amount: ';
  var l5 = tx_info.amount +'</h3>';
  var l6 = '<h3>Asset Code: ';
  var l7 = tx_info.asset_code + '</h3>';
  if (tx_info.asset_code != "XLM"){
    var l8 = '<h3>Issuer: ';
    var l9 = config.asset_issuer + '</h3>';
  }else{
    var l8 = "";
    var l9 = "";
  }
  var l9_1 = '<h3>Date Sent: ';
  var l9_2 = tx_info.date_added + '</h3>';
  var l10 = '<h1>Click <a title="My_wallet funded wallet link" href="https://sacarlson.github.io/my_wallet/?json=%7B%22seed%22:%22';
  if (config.network == "test"){
    if (config.enable_rekey == true){
      var l11 = tx_info.seed + '%22,%22network%22:%22test%22,%22rekey%22:%221%22%7d" target="_blank">Here</a> To collect</h1>';
    }else{
      var l11 = tx_info.seed + '%22,%22network%22:%22test%22%7d" target="_blank">Here</a> To collect</h1>';
    }
  } else{
     if (config.enable_rekey == true){     
      var l11 = tx_info.seed + '%22,%22network%22:%22live%22,%22rekey%22:%221%22%7d" target="_blank">Here</a> To collect</h1>';
    }else{
      var l11 = tx_info.seed + '%22,%22network%22:%22live%22%7d" target="_blank">Here</a> To collect</h1>';
    }
  }
  var l12 = '<p>For more info or if you have problems with the collection please contact us at <a title="funtracker chat direct" href="https://chat.funtracker.site"  target="_blank">https://chat.funtracker.site</a>.</p>'
  var mail_html_body = l1 + l1_1 + l2 + l3 + l4 + l5 + l6 + l7 + l8 +l9 + l9_1 +l9_2 +l10 + l11 + l12;
  
  var mailOptions = {
    to: tx_info.username, // list of receivers
    subject: 'Stellar funds of the amount: ' + tx_info.amount + tx_info.asset_code + " recieved", // Subject line
    html: mail_html_body // html body
  };
  console.log("mailOptions: ", mailOptions);
  return mailOptions;
}

function separate_username_memo(memo_value){
  var array = memo_value.split(","); 
  return array[0];
}

function update_user_seed(username,account_id,seed){
  // find username and update values account_id, seed, status
  console.log("update_user");
   con.query("UPDATE `Users` SET account_id= '" + account_id + "', seed='" + seed + "', date_updated = now()  WHERE username = '" + username + "';",function(err,rows){
      if(err) throw err;
      console.log(rows);        
   });    
}

function update_user_status(username,status){
  // find username and update values account_id, seed, status
  console.log("update_user");
   con.query("UPDATE `Users` SET status= '" + status + "', date_updated = now()  WHERE username = '" + username + "';",function(err,rows){
      if(err) throw err;
      console.log(rows);
      con.query("UPDATE `transactions` SET status= '" + status + "', date_updated = now()  WHERE username = '" + username + "';",function(err,rows){
        if(err) throw err;
        console.log(rows);        
      });        
   });    
}

function update_user_tx(account_id,b64_tx_last){
  // find users account_id and update b64_tx_last, status
  console.log("update_user");
   con.query("UPDATE `Users` SET b64_tx_last= '" + b64_tx_last + "', date_updated = now()  WHERE account_id = '" + account_id + "';",function(err,rows){
      if(err) throw err;
      console.log(rows);        
   });    
}

function update_user_id(account_id,new_id,new_username,challenge_index){
  // find users account_id and update to a new_id or new_username, update status of challenge status to processed
  console.log("update_user_id");
   var sql = '';
   if (new_id.length == 0 && new_username.length > 0){
     sql = "UPDATE `Users` SET username= '" + new_username + "', date_updated = now()  WHERE account_id = '" + account_id + "';";
   }
   if (new_id.length > 0 && new_username.length == 0){
     sql = "UPDATE `Users` SET account_id= '" + new_id + "', date_updated = now()  WHERE account_id = '" + account_id + "';";
   }
   if (new_id.length > 0 && new_username.length > 0 && account_id.length == 0){
     sql = "INSERT INTO Users (username,account_id,status, date_updated) VALUES ('" + new_user + "','" + new_id + "','proccessed',now());";
   }
   if (sql.length == 0){
     console.log("sql length zero do nothing");
     return;
   }
   con.query(sql,function(err,rows){
      if(err) throw err;
      console.log(rows);
      var sql2 = "UPDATE `challenge` SET status= 'proccessed', date_updated = now()  WHERE index2 = '" + challenge_index + "';";
      con.query(sql2,function(err,rows){ 
        if(err) throw err;
        console.log(rows); 
      });      
   });    
}

 
 function update_transaction_user(username,status){
  console.log("update_transaction");
   con.query("UPDATE `transactions` SET status= '" + status + "', date_updated = now()  WHERE username = '" + username + "';",function(err,rows){
      if(err) throw err;
      console.log(rows);        
   });    
 }
  

  function start(config){
    console.log("start");
    process_accounts(config);
  }
  

  function close_db(){
    con.end(function(err) {
    // The connection is terminated gracefully
    // Ensures all previously enqueued queries are still
    // before sending a COM_QUIT packet to the MySQL server.
    });
 }

  function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
  }

  

setTimeout(close_db,15000);

process_accounts(config);

process_challenges(config);


