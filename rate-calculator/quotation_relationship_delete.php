<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
if ( !empty( $_GET[ 'qtr_id' ] ) ) {
  $qtr_id = $_GET[ 'qtr_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];
  $qtr_updated = date( "Y-m-d H:i:s" );
  $sql_quotation_relationship_updt = "UPDATE quotation_relationship_detail SET qtr_status='3', updated_by='" . $updated_by . "', qtr_updated='" . $qtr_updated . "' WHERE qtr_id=" . $qtr_id;
  $updated_qu = $con->query( $sql_quotation_relationship_updt );
  header( 'Location: quotation_relationship_view.php?flag=3' );
}
?>