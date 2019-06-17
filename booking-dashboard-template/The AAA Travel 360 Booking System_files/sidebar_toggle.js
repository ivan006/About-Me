// $( ".i-both-sidebar-toggler" ).click(function() {
//   $( ".nav-col" ).toggleClass( "hide" );
//   $( ".logo-col" ).toggleClass( "hide" );
//   $( ".content-col" ).toggleClass( "g-fullwidth" );
//   $( ".footer-col" ).toggleClass( "hide" );
//   $( ".i-both-sidebar-toggler" ).toggleClass( "hide" );
//   $( ".content-col" ).toggleClass( "g-margin-left-5perc" );
// });





  // $( "#i-left-sidebar-toggler" ).click(function() {
  //   $( "#s-left-sidebar" ).toggleClass( "hide" );
  //   $( "#page" )
  //   .toggleClass( "col-xs-10" ).toggleClass( "col-sm-11" ).toggleClass( "col-md-9" ).toggleClass( "col-lg-7" )
  //   .toggleClass( "col-xs-12" ).toggleClass( "col-sm-12" ).toggleClass( "col-md-12" ).toggleClass( "col-lg-10" );
  // });
  // $( "#i-right-sidebar-toggler" ).click(function() {
  //   $( "#s-right-sidebar" ).toggleClass( "hide" );
  //   $( "#page" )
  //   .toggleClass( "col-lg-7" )
  //   .toggleClass( "col-lg-9" );
  // });


  $( ".i-both-sidebar-toggler" ).click(function() {
    $( "#s-left-sidebar" ).toggleClass( "hide" );
    $( "#s-right-sidebar" ).toggleClass( "hide" );
    $( ".i-both-sidebar-toggler-parent" ).toggleClass( "hide" );
    $( "#page" )
    .toggleClass( "col-xs-10" ).toggleClass( "col-sm-11" ).toggleClass( "col-md-9" ).toggleClass( "col-lg-7" )
    // .toggleClass( "col-xs-12" ).toggleClass( "col-sm-12" ).toggleClass( "col-md-12" ).toggleClass( "col-lg-12" );
    .toggleClass( "col-xs-12" ).toggleClass( "col-sm-12" ).toggleClass( "col-md-12" ).toggleClass( "col-lg-10" ).toggleClass( "col-lg-offset-1");

  });
