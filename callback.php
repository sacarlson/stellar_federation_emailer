<?php
// Copyright (c) 2017  Sacarlson  sacarlson_2000@yahoo.com -->
// stellar federation server callback
// testing with $_GET
//http://b.funtracker.site/fed2/callback.php?token=abcde&memo=sacarlson_2000@yahoo.com,12&amount=33&from=GBDES..&asset_code=USD

//https://www.funtracker.site/fed2/callback.php?token=abcde&memo=sacarlson_2000@yahoo.com,12&amount=33&from=GBDES..&asset_code=USD

  //header('Content-type: text/html'); 
  header('Access-Control-Allow-Origin: *'); 
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT');
  include('config.php');

  if (isset($_POST["memo"])){
    $memo = $_POST["memo"];
  }else{
    if (isset($_GET["memo"])){
      $memo = $_GET["memo"];
    }else{
      echo "no memo return";
      return;
    }
  }
  
  if (isset($_POST["memo_type"])){
    $memo_type = $_POST["memo_type"];
  }
  if (isset($_POST["from"])){
    $from = $_POST["from"];
  }
  if (isset($_GET["from"])){
    $from = $_GET["from"];
  }
  if (isset($_POST["amount"])){
    $amount = $_POST["amount"];
  }
  if (isset($_GET["amount"])){
    $amount = $_GET["amount"];
  }
  if (isset($_POST["asset_code"])){
    $asset_code = $_POST["asset_code"];
  }
  if (isset($_GET["asset_code"])){
    $asset_code = $_GET["asset_code"];
  }
  if (isset($_POST["id"])){
    $id = $_POST["id"];
  }
  if (isset($_POST["token"])){
    $token_sent = $_POST["token"];
  }
  if (isset($_GET["token"])){
    $token_sent = $_GET["token"];
  }

  if ($token != $token_sent){
    echo "bad token";
    return;
  }

  $array = explode("*",$memo);
  $username = $array[0];
  $domain = $array[1];
  if ( strlen($username) < 1){
    echo "username length 0 return";
    return;
  }
  if (count($array) > 1){
    $array2 = explode(",",$array[1]);
  } else {
    $array2 = explode(",",$array[0]);
  }
  //$domain = $array[0];
  $count = count($array2);
  if (count($array2) > 1){
    $amount_xlm = $array2[1];
    $username = $array2[0];
  }else{
    $amount_xlm = 0;
  }

  //echo "$username : $domain : $amount_xlm : $amount : $asset_code : $from : $count " ;

  // Create connection
  $conn = new mysqli($servername, $mysql_username, $password, $dbname);
  // Check connection
  if ($conn->connect_error) {
    //echo "bad mysql connect error: " . $conn->connect_error;
    die("Connection failed: " . $conn->connect_error);
  }
 
 if ($mysql_enable == "true"){  
   insert_transaction($username,$anchor_publicid,$asset_code,$amount, "processing",$from,$memo); 
   //insert_transaction($username,$sent_to,$seed,$asset_code,$amount, $status,$sent_from,$memo);
   insert_user($username,"processing");  
   $conn->close();
 }

  function check_user_exist($username){
    global $conn;
    $sql = "SELECT * FROM `Users` WHERE  `username` = '" . $username . "'";
    $result = $conn->query($sql);
    if ($result->num_rows > 0) {
       $user = $result->fetch_assoc();       
       return $user["account_id"];
    } else {
       // username not exist in db
       return false;
    }
  }

  function insert_user($user, $status){
    global $conn;
    $sql = "INSERT INTO Users (username,status) VALUES ('$user','$status');";
    //echo "sql: $sql";
    $result = $conn->query($sql);
    if ($result === TRUE) {
       return true;
    } else {
       echo "error insert";
       return false;
    }
  }

  function insert_transaction($username,$sent_to,$asset_code,$amount, $status,$sent_from,$memo){
    global $conn;
    $sql = "INSERT INTO transactions (username,sent_to,asset_code,amount,status,sent_from,memo) VALUES ('$username','$sent_to','$asset_code', '$amount',  '$status', '$sent_from','$memo' );";
    //echo "sql: $sql";
    $result = $conn->query($sql);
    if ($result === TRUE) {
       return true;
    } else {
       echo "error insert";
       return false;
    }
  }

  function update_user($user,$account_id,$seed,$asset_code, $amount,$amount_xlm, $status, $sent_from){
    global $conn;
    //$sql = "INSERT INTO Users (username,account_id,seed) VALUES ('$user','$account_id','$seed' );";
    $sql = "UPDATE Users SET account_id='$account_id', seed='$seed', asset_code='$asset_code', amount='$amount', amount_xlm='$amount_xlm', status='$status', sent_from='$sent_from', date_updated= now() WHERE `username` = '$user'";
    //echo "sql: " . $sql;
    $result = $conn->query($sql);
    if ($result === TRUE) {
       return true;
    } else {
       echo "error update";
       return false;
    }
  }

