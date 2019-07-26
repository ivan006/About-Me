// flash effect start
$(document).ready(function(){
  $("#take-screenshot").click(function(){
    $("body").toggleClass("flash-effect");
    setTimeout(function(){$("body").toggleClass("flash-effect"); }, 3000);
  });
});
// flash effect end
