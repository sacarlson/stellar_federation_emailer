<?php
$results = exec('cd ./federation_processor; node app.js ',$data);
print_r($data);
echo($results);
echo "end";
 
?>
