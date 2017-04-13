<?php
// Copyright (c) 2017  Sacarlson  sacarlson_2000@yahoo.com -->
// stellar federation server
// mysql needed table Users
// fields index, username, account_id, seed same as stellar go federation with added seed text field added

  header('Content-type: application/json');
  //header('Vary: Origin'); 
  //header('Access-Control-Allow-Origin: *'); 
  //header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT');
 
 include('config.php');
//$file = file_get_contents('config.php');
//$file = substr($file, 3, strlen($file));

 //echo "start";
  // test: http://b.funtracker.site/fed2?q=sacarlson*funtracker.site&type=name
  // test2: http://b.funtracker.site/fed2?q=sacarlson@yahoo.com*funtracker.site&type=name

 $q = $_GET['q'];
 $type = $_GET['type'];

 // Create connection
$conn = new mysqli($servername, $mysql_username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
    echo "bad mysql connect error: " . $conn->connect_error;
    die("Connection failed: " . $conn->connect_error);
}
 
 if ($mysql_enable == "true"){
   //echo " mysql enabled";
   if ($type == "name"){
     fed_lookup_name($anchor_publicid);
   }
   if ($type == "id"){
     fed_lookup_id($anchor_domain);
   }
   //insert_data(); 
   $conn->close();
 }

 
 //logsession();

function fed_lookup_name($anchor_publicid){
  global $conn;

  $array = explode("*",$_GET['q']);
  $username = $array[0];
  $domain = $array[1];
// output should be
//{
//  "stellar_address": <username*domain.tld>,
//  "account_id": <account_id>,// "memo_type": <"text", "id" , or "hash"> *optional*
//  "memo": <memo to attach to any payment. if "hash" type then will be base64 encoded> *optional*
//}

  //echo "username: $username, domain: $domain";
  
    $sql = "SELECT * FROM `Users` WHERE  `username` = '" . $username . "'";
    if(!$result = $conn->query($sql)){
      echo "error mysql 2";
      //wrt_log("check user query fail: " . mysqli_error($conn) . "\n");
      return FALSE;
    }
  
  if ($result->num_rows > 0) {
    //wrt_log("username exists true \n");
    $user = $result->fetch_assoc();
    echo '{"stellar_address":"' . $_GET['q'] . '","account_id":"' . $user["account_id"] . '"}';
    return TRUE;
    // check if username is an email address must have @ in it 
  } else if (!filter_var($GET['q'], FILTER_VALIDATE_EMAIL)){
    echo '{"stellar_address":"' . $_GET['q'] . '","account_id":"' . $anchor_publicid . '","memo_type":"text","memo":"' . $username . ',61"}';  
    return FALSE;
  } else{
    echo '{"stellar_address":"' . $_GET['q'] . '","account_id":"' . "not_found" . '"}'; 
  }
}

  function insert_user($user,$account_id,$status){
    global $conn;
    $sql = "INSERT INTO Users (username,account_id,status) VALUES ('$user','$account_id','$status');";
    //echo "sql: " . $sql;
    //wrt_log("sql: " . $sql . "\n");
    $result = $conn->query($sql);
    if ($result === TRUE) {
       return true;
    } else {
       return false;
    }
  }

  function fed_lookup_id($anchor_domain){
    global $conn; 
// output should be
//{
//  "stellar_address": <username*domain.tld>,
//  "account_id": <account_id>,
//  "memo_type": <"text", "id" , or "hash"> *optional*
//  "memo": <memo to attach to any payment. if "hash" type then will be base64 encoded> *optional*
//}

  //echo "account_id: $_GET['q']";
    //$sql = "SELECT * FROM `Users` WHERE  `username` = '" . $username . "'";
    $sql = "SELECT * FROM `Users` WHERE  `account_id` = '" . $_GET['q'] . "'";
    if(!$result = $conn->query($sql)){
      echo "error mysql 2";
      return FALSE;
    }
  
  if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo '{"stellar_address":"' . $user["username"] . "*". $anchor_domain . '","account_id":"' . $_GET['q'] . '"}';
    return TRUE;
  } else {
    echo '{"stellar_address":"' . "not_found" . '","account_id":"' . $_GET['q'] . '"}';  
    return FALSE;
  }
}

function logsession() {
 global $datetime, $id, $timestamp, $lat, $lon, $speed, $bearing, $altitude, $status,$type,$batt;
 //date_default_timezone_set('Asia/Bangkok');
 $datetime = date("F j, Y, g:i a");
 $outString =  $datetime . " : " . $id . " : " . $timestamp . " : ". $lat ." : ". $lon . " : " . $speed . " : " . $bearing . " : " . $altitude  . " : " . $batt . " : ".  $status . " : " . $type . "\n";
 wrt_log( $outString );
 return;
 }

 function wrt_log( $string) {
   $f = fopen("./session_track.log", "a");
   fwrite( $f, $string );
   fclose($f);
   return;
 }  


?>
