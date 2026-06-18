<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();
// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "17", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
// Check Module Rights

?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Rate Calculator  -<?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<script>
    function validation() {
      var a = document.getElementById("password").value;
      var b = document.getElementById("confirmPassword").value;
      if (a !== b) {
        alert("New password and Confirm password not mached");
        document.getElementById('password').focus();
        return false;
      }
    }
  </script> 
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
</head>

<body>
<!-- Preloader -->
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<section>
  <div class="leftpanel">
    <div class="logopanel">
      <h1><span>[</span> bracket <span>]</span></h1>
    </div>
    <!-- logopanel -->
    <?php include("left-column.php"); ?>
    <!-- leftpanelinner --> 
  </div>
  <!-- leftpanel -->
  <div class="mainpanel">
    <?php include("header.php"); ?>
    <div class="pageheader">
      <h2><i class="fa fa-plus"></i> Rate Calculator </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
          <li class="active">Rate Calculator </li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
        <form method="post" name="frmadmin_changepwd" enctype="multipart/form-data" id="" class="" action="">
          <div class="panel panel-default">
            <div class="panel-heading">
              <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
              <h4 class="panel-title">Rate Calculator</h4>
            </div>
            <div class="panel-body">
              <div class="form-group">
                <label class="col-sm-3 control-label">Date  </label>
                <div class="col-sm-9">
                  <input type="date" name="plc_date" class="form-control" value="<?php if($plc_date!="") { $datend   = new DateTime($plc_date); echo $datend->format('Y-m-d'); } else { $datend   = new DateTime(); echo $datend->format('Y-m-d'); } ?>" readonly />
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-3 control-label">Company </label>
                <div class="col-sm-9">
                  <select required class="form-control" name="cmp_id" id="cmp_id">
                    <option value="" > Select Company </option>
                    <?php
                  $query_cmp = "SELECT * FROM company_detail WHERE cmp_status=1";
                  $result_cmp = $con->query( $query_cmp );
                  while ( $row_cmp = $result_cmp->fetch_object() ) {
                    ?>
                    <option <?php if($cmp_id==$row_cmp->cmp_id) { ?> selected <?php } ?>  value="<?php echo $row_cmp->cmp_id?>" > <?php echo $row_cmp->cmp_name?> </option>
                    <?php } ?>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-3 control-label">Category </label>
                <div class="col-sm-9">
                  <select required class="form-control" name="ctg_id" id="ctg_id">
                    <option value="" > Select Category </option>
                    <?php
                  $query_ctg = "SELECT * FROM category_detail WHERE ctg_status=1";
                  $result_ctg = $con->query( $query_ctg );
                  while ( $row_ctg = $result_ctg->fetch_object() ) {
                    ?>
                    <option <?php if($ctg_id==$row_ctg->ctg_id) { ?> selected <?php } ?> value="<?php echo $row_ctg->ctg_id?>" > <?php echo $row_ctg->ctg_name?> </option>
                    <?php } ?>
                  </select>

                  <input type="hidden" name="qtr_percentage" id="qtr_percentage" />
                  <input type="hidden" name="qtr_profit" id="qtr_profit" />
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-3 control-label">Net Premium</label>
                <div class="col-sm-9">
                  <input type="number" name="qtr_net_premium" id="qtr_net_premium" value="" min="0" class="form-control" placeholder="ex: 30000" required />
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-3 control-label">Total Premium</label>
                <div class="col-sm-9">
                  <input type="number"  name="qtr_total_premium" id="qtr_total_premium" value="" min="0" class="form-control" placeholder="ex: 34000" required />
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-3 control-label">Rate</label>
                <div class="col-sm-9">
                  <input type="number"  name="qtr_rate" id="qtr_rate" value="" min="0" class="form-control" placeholder="" readonly required />
                </div>
              </div>
              <div class="form-group">
                <label class="col-sm-3 control-label">Benefit</label>
                <div class="col-sm-9">
                  <input type="number"  name="qtr_benefit" id="qtr_benefit" value="" min="0" class="form-control" placeholder="" readonly required />
                </div>
              </div>
            </div>
          </div>
          <!-- panel -->
          </div>
        </form>
        <!-- col-md-6 --> 
      </div>
      <!--row --> 
    </div>
    <!-- contentpanel --> 
  </div>
  <!-- mainpanel --> 
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/select2.min.js"></script> 
<script src="js/jquery.validate.min.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 
<script src="js/custom.js"></script>
<script>
  $(document).ready(function() {
    $('#cmp_id, #ctg_id').change(function() {
      var cmp_id = $('#cmp_id').val();
      var ctg_id = $('#ctg_id').val();

      if (cmp_id && ctg_id) {
        $.ajax({
          url: 'quotation_details.php',
          type: 'POST',
          data: { cmp_id: cmp_id, ctg_id: ctg_id },
          success: function(response) {
            var data = JSON.parse(response);
            $('#qtr_percentage').val(data.qtr_percentage);
            $('#qtr_profit').val(data.qtr_profit);
          },
          error: function(error) {
            console.error('Error fetching data:', error);
          }
        });
      }
    });
  }); 
  
  function calculateValues() {
    var qtr_percentage = parseFloat($('#qtr_percentage').val()) || 0;
    var qtr_profit = parseFloat($('#qtr_profit').val()) || 0;
    var qtr_net_premium = parseFloat($('#qtr_net_premium').val()) || 0;
    var qtr_total_premium = parseFloat($('#qtr_total_premium').val()) || 0;

    if (qtr_percentage > 0 && qtr_profit > 0 && qtr_net_premium > 0 && qtr_total_premium > 0 ) {
      var qtr_rate = qtr_total_premium - (qtr_net_premium * (qtr_percentage / 100)) + qtr_profit;
      $('#qtr_rate').val(Math.round(qtr_rate));

      var qtr_benefit = qtr_total_premium - qtr_rate;
      $('#qtr_benefit').val(Math.round(qtr_benefit));
    } else {
      $('#qtr_rate').val('');
      $('#qtr_benefit').val('');
    }
  }

  $(document).ready(function() {
    $('#qtr_net_premium, #qtr_total_premium, #qtr_percentage, #qtr_profit').on('keyup change', function() {
      calculateValues();
    });
  });
</script>
</body>
</html>