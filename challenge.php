<?php
// Copyright (c) 2017  Sacarlson  sacarlson_2000@yahoo.com -->
// challenge uses dzham's method to create a challenge that
// will have to be returned to the callback signed 
//{
//	"stellar": {
//		"challenge": {
//			"id":		ACCOUNT_ID,
//			"message":	MESSAGE,
//			"url":		WEBHOOK_URL
//		}
//	}
//}
// example get: https://www.funtracker.site/fed2/challenge.php?id=GCYZRAUECYEFRZS77F3P6Q57DXJCP6N2XNGXD7RMQN6XO6QFMVLW2XQ3&new_id=GAMFVORH4HI7C7SMSGTQH23EI43OQQLX3PYGP3WHFE3Y74AUTPPVEDLQ
// example returned: {"stellar":{"challenge":{"id":"GCYZRAUECYEFRZS77F3P6Q57DXJCP6N2XNGXD7RMQN6XO6QFMVLW2XQ3","message":"JLSGAIVTHP,"url":"https://www.funtracker.site/fed2/webhook.php"}}}
// then to webhook.php: webhook.php??id=GDSA...&sig=abdc&message=JLSGAIVTHP
 header('Content-type: application/json');
  //header('Vary: Origin'); 
  //header('Access-Control-Allow-Origin: *'); 
  //header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT');
 
 include('config.php');


 if (isset($_GET["id"])){
    $id = $_GET["id"];
 }else{
   echo "no id provided";
   return;
 }
 if (isset($_GET["new_id"])){
    $new_id = $_GET["new_id"];
 }else{
   //echo "no new_id provided";
   //return;
   $new_id = "";
 }

 if (isset($_GET["new_email"])){
    $new_email = $_GET["new_email"];
 }else{
   if (isset($_GET["new_id"]) != true){
     echo ("no new_id and no new_mail error");
     die("no new_id and no new_mail error");
     return;
   }else{
     $new_email = "";
   }
 }

 // Create connection
$conn = new mysqli($servername, $mysql_username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
    echo "bad mysql connect error: " . $conn->connect_error;
    die("Connection failed: " . $conn->connect_error);
}

 $rand_string = substr(str_shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZ"), -10);
 $send_l1 = '{"stellar":{"challenge":{"id":"'. $id . '","message":"'; 
 $send_l2 = $rand_string . '","url":"' . $webhook_url .'"}}}';
 $send = $send_l1 . $send_l2;
 insert_challenge($id,$new_id,$new_email,$rand_string,"awaiting_sig");
 echo $send;

  function insert_challenge($id,$new_id,$new_email,$message,$status){
    global $conn;
    $sql = "INSERT INTO challenge (id,new_id,new_email,message,status) VALUES ('$id','$new_id','$new_email','$message','$status');";
    //echo "sql: " . $sql;
    //wrt_log("sql: " . $sql . "\n");
    $result = $conn->query($sql);
    
    if ($result === TRUE) {
       return true;
    } else {
       return false;
    }
  }
 
