<?php
// Copyright (c) 2017  Sacarlson  sacarlson_2000@yahoo.com -->
// record signature of challenge to mysql db
// example in: // then to webhook.php: webhook.php??id=GDSA...&sig=abdc&msg=JLSGAIVTHP
// https://www.funtracker.site/fed2/challenge.php?id=GCYZRAUECYEFRZS77F3P6Q57DXJCP6N2XNGXD7RMQN6XO6QFMVLW2XQ3&new_id=GAMFVORH4HI7C7SMSGTQH23EI43OQQLX3PYGP3WHFE3Y74AUTPPVEDLQ

//https://www.funtracker.site/fed2/webhook.php?id=GCYZRAUECYEFRZS77F3P6Q57DXJCP6N2XNGXD7RMQN6XO6QFMVLW2XQ3&sig=ABCD&msg=JLSGAIVTHP

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
 if (isset($_GET["sig"])){
    $sig = $_GET["sig"];
 }else{
   echo "no sig provided";
   return;
 }
 if (isset($_GET["msg"])){
    $msg = $_GET["msg"];
 }else{
   echo "no msg provided";
   return;
 }

  // Create connection
$conn = new mysqli($servername, $mysql_username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
    echo "bad mysql connect error: " . $conn->connect_error;
    die("Connection failed: " . $conn->connect_error);
}

 insert_challenge_response($id,$msg,$sig,"processing");
 //echo "ok";

 function insert_challenge_response($id,$msg,$sig,$status){
    global $conn;
//$sql = "UPDATE Users SET account_id='$account_id', seed='$seed', asset_code='$asset_code', amount='$amount', amount_xlm='$amount_xlm', status='$status', sent_from='$sent_from', date_updated= now() WHERE `username` = '$user'";
    $sql = "UPDATE challenge SET sig='$sig', status='$status', date_updated= now() WHERE `id` = '$id' AND `message` = '$msg'";
    echo "sql: " . $sql;
    //wrt_log("sql: " . $sql . "\n");
    $result = $conn->query($sql);
    if ($result === TRUE) {
       return true;
    } else {
       return false;
    }
  }
