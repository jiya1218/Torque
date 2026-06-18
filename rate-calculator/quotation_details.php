<?php
	include("ka_include/session.php");
	include("ka_include/common_function.php");
	include("ka_include/ka_config.php");
 	include("ka_include/check_admin_login.php");
	// Check Module Rights
    // $query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
    // $module_query = $con->query( $query_module_detail );
    // $row_md_id = $module_query->fetch_array();
    // // echo $row_state['md_id']; exit;
    // $md_right = explode( ",", $row_md_id[ 'md_id' ] );
    // if ( !in_array( "17", $md_right ) ) {
    // header( 'Location: insurance_dashboard.php' );
    // }
    // Check Module Rights

    if (isset($_POST['cmp_id']) && isset($_POST['ctg_id'])) {
        $cmp_id = $_POST['cmp_id'];
        $ctg_id = $_POST['ctg_id'];
      
        $query = "SELECT qtr_percentage, qtr_profit FROM quotation_relationship_detail WHERE cmp_id = ? AND ctg_id = ?";
        $stmt = $con->prepare($query);
        $stmt->bind_param("ii", $cmp_id, $ctg_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
          $row = $result->fetch_assoc();
          echo json_encode([
            'qtr_percentage' => $row['qtr_percentage'],
            'qtr_profit' => $row['qtr_profit']
          ]);
        } else {
          echo json_encode([
            'qtr_percentage' => '',
            'qtr_profit' => ''
          ]);
        }
      
        $stmt->close();
        $con->close();
      }
      

?>