$(function(){

  $('.btn-void').each(function() {
    if ($(this).text().toLowerCase().indexOf("void") >= 0) {
      $(this).wrap('<div class="voidAvoidWrap"></div>');
    }
  });

  $('.voidAvoidWrap').each(function() {
    this.addEventListener('click', function (e) {
      var reason = prompt('Please enter a reason for voiding this entry (at least 10 characters)');
      if (reason !== null) {
        if (reason.length < 10) {
          alert('Reason submitted was not at least 10 characters, voiding has been cancelled.');
          e.preventDefault();
          e.stopPropagation();
        } else {
          var url = window.location.href;
          submitReason(url, reason);
          alert('Thank you, this entry will now be voided.');
        }
      } else {
        alert('No reason submitted, voiding has been cancelled.');
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    // var html = '<div class="voidAvoid"></div>';
    // $(this).append(html);
  });

  function submitReason(url, reason) {
    $.ajax({
      url: base_url + "system/void-note",
      type: "POST",
      data: {'url': url, 'reason': reason },
      success: function(data) {
      },
      error: function(xhr){
      }
    });
  }

});
