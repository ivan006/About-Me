function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
      var pair = vars[i].split("=");
      if (pair[0] == variable) {
        return pair[1];
      }
    }
    return false;
};

var imageBoard;
var category = "bug";
var priority = "normal";
var isTicketDirty = false;

$(document).ready(function(){
    var addedFiles = 0;
    var fileName = '';
    var image;
    var cropper;
    var aspectRatio;

    // Add tooltips where required.
    $('[data-toggle="tooltip"]').tooltip();

    // Take a screenshot and save the image data
    $('#take-screenshot').on("click", function(e){
      e.preventDefault();
      $("body").toggleClass("flash-effect");
      setTimeout(function(){$("body").toggleClass("flash-effect"); }, 500);

      $("#screenshot-saved").hide();
      $("#screenshot-saving").show();
      html2canvas(document.querySelector("#page"), {useCORS: true, allowTaint: true,
        onclone: function(doc) {
          let wrapperWidth = $(".inner-content", "#page").width();
          let modalWidthBuffer = 30;
          console.log(wrapperWidth);
          doc.getElementById("page").style.width = wrapperWidth + "px";
          $(".modal-dialog", "#modal-screenshot").width((wrapperWidth + modalWidthBuffer) + "px");
        }
      }).then(
        function (canvas) {
          $("#screenshot-editor").empty();
          var img = new Image();
          img.src = canvas.toDataURL("image/png");
          $("#screenshot-saving").hide("fast", function(){
            $("#screenshot-saved").show("fast");
          });
          var width = canvas.width;
          var height = canvas.height;
          $("#screenshot-editor").css("width", width);
          $("#screenshot-editor").css("height", height);
          imageBoard = new DrawingBoard.Board('screenshot-editor', {
            background: canvas.toDataURL("image/png"),
            webStorage: false,
            controls: [
              'Color',
              { Size: { type: 'dropdown' } },
              { DrawingMode: { filler: false } },
              'Navigation'
            ]
          });
       });
    });

    $('#modal-help').on('hidden.bs.modal', function () {
        $("#screenshot-body").empty();
        $("#screenshot-saving").hide();
        $("#screenshot-saved").hide();

        $(".category-select").removeClass('btn-success');
        $(".category-select").removeClass('g-btn-grey');
        $('.category-select').first().addClass('btn-success');
        $(".category-select").not(':first').addClass('g-btn-grey');

        $(".priority-select").removeClass('btn-success');
        $(".priority-select").removeClass('g-btn-grey');
        $('.priority-select').first().addClass('btn-success');
        $(".priority-select").not(':first').addClass('g-btn-grey');

    });

    $("#edit-screenshot").on('click', function(e){
      $("#modal-screenshot").modal("show");
    });

    $("#save-screenshot-editor").on("click", function(e){
      $("#modal-screenshot").modal("hide");
    });

    $('#modal-help').on('shown.bs.modal', function () {
      setCustomDropzone("upload-image");
    });

    $("#save-ticket").on("click", function (e) {
        e.preventDefault();
        let queuedFiles = myDropzone.getQueuedFiles();
        if( queuedFiles.length > 0 ){
          myDropzone.processQueue();
        }else{
          saveTicket(null, null);
        }

    });

    $("#add-ticket-comment").on("click", function(e){
      e.preventDefault();
      let ticketId = $("#ticket-id").val();
      let comment = $("#comment").val();

      if(comment.length == 0)
      {
        alert("Please enter in a comment before submitting");
        return;
      }


      var data = {
        ticketId: ticketId,
        comment: comment
      };

      $("#reply-box-loading").show();
      $.ajax({
        type: "POST",
        url: "/system/tickets/save-new-comment",
        data: data,
        dataType: "json",
        success: function (response) {
          $("#comment").val('');
          $("#reply-box-loading").hide();
          let commentElement = document.createElement("div");
          commentElement.classList.add('well', 'well-lg', 'new-comment');
          commentElement.innerHTML = `<strong>${response.person.first_name} said at ${response.formatted_date}</strong><br>${response.comment}`;
          $("#comment-list").append(commentElement);
        }
      });
    });

    $(".category-select").on("click", function(e){
      e.preventDefault();
      $(".category-select").removeClass('btn-success');
      $(".category-select").removeClass('g-btn-grey');
      $(this).addClass('btn-success');
      $(".category-select").not(this).addClass('g-btn-grey');
      category = $(this).data('category');
    });

    $(".priority-select").on("click", function(e){
      e.preventDefault();
      $(".priority-select").removeClass('btn-success');
      $(".priority-select").removeClass('g-btn-grey');
      $(this).addClass('btn-success');
      $(".priority-select").not(this).addClass('g-btn-grey');
      priority  = $(this).data('priority');
    });

    $("#view-screenshot-link").on("click", function(e){
      e.preventDefault();
      let imageData = $("img", this).attr("src");
      $("#view-large-screenshot").attr("src", imageData);
      $("#modal-ticket-screenshot").modal('show');
    });

    $("#update-ticket-status").on("click", function () {
        let formData = $("#ticket-info-form").serializeArray();
        isTicketDirty = true;
        if(isTicketDirty)
        {
          $.ajax({
            type: "post",
            url: "/system/tickets/update-ticket",
            data: formData,
            dataType: "json",
            success: function (response) {
              $("#ticket-updated-alert").show()
              setTimeout(function(){
                $("#ticket-updated-alert").fadeOut();
              }, 3000);
            }
          });
        }
    });

    function setCustomDropzone(prefix)
    {

      var formID = prefix + '-upload-form';
      var htmlElement = $('#' + formID).get(0);
      myDropzone  = htmlElement.dropzone;
      aspectRatio = getAspectRatio(String($('#' + prefix + '-uploadCanvas').data('aspect')));
      myDropzone.options.thumbnailWidth = aspectRatio.width;
      myDropzone.options.thumbnailHeight = aspectRatio.height;
      myDropzone.options.acceptedFiles = getFileTypes(String($('#' + prefix + '-uploadCanvas').data('types')));
      myDropzone.options.maxFilesize   = parseFloat($('#' + prefix + '-uploadCanvas').data('size'));
      myDropzone.options.maxFiles      = parseFloat($('#' + prefix + '-uploadCanvas').data('max-files'));
      myDropzone.options.headers = getHeaders(String($('#' + prefix + '-uploadCanvas').data('headers')));

      $('#canvas-header').text($('#' + prefix + '-uploadCanvas').data('name'));
      myDropzone.on("success", function(file, response){

      myDropzone.removeFile(file);

      var queuedFiles = myDropzone.getQueuedFiles();
      if( queuedFiles.length > 0 ){

        myDropzone.processQueue();
      }
      else{
        let responseObject = JSON.parse(response);
        saveTicket(responseObject.attachment_url, responseObject.attachment_name);
      }
    });

      myDropzone.on('thumbnail', function (file) {

        var crop = String($('#' + prefix + '-uploadCanvas').data('crop'));

        if (file.cropped || crop === "") {
            return;
        }

        //$('.upload-modal').hide();
        fileName = file.name;
        myDropzone.removeFile(file);
        addedFiles = addedFiles - 1;
        var reader = new FileReader();
        reader.onloadend = function(){

          $('div.image-container > img').attr('src', reader.result);
          image = document.getElementById('crop-image');
          var aspect = aspectRatio.width / aspectRatio.height;

          cropper = new Cropper(image, {

            aspectRatio: aspect,
            autoCropArea: 0.5,
            movable: false,
            cropBoxResizable: true,
            minContainerWidth: 790,
            minContainerHeight: 400,

          });

          var data = cropper.getImageData();
          $('#current-width b').text('Cropped width : ' + data.width);
          $('#current-height b').text('Cropped height : ' + data.height);

        };
        reader.readAsDataURL(file);
        $('#cropper-modal').modal('show');

        $('#done-cropping').on('click', function(){

          var imageData = cropper.getData();

          var blob = cropper.getCroppedCanvas().toDataURL();
          var newFile = getCroppedImageBlob(blob);
          newFile.cropped = true;
          newFile.name = fileName;
          myDropzone.addFile(newFile);
          $('#cropper-modal').modal('hide');
          cropper.destroy();

        });

        $('#cropper-close').click(function(){

          event.preventDefault();

          $('#cropper-modal').modal('hide');

        });

      });


      $('button.cancel-file-upload').click(function(event){

        event.preventDefault();

        var files = myDropzone.getQueuedFiles();

        files.forEach(function(file){

          myDropzone.removeFile(file);

        });

        $('#' + prefix + '-uploadCanvas').modal('hide');

      });

      myDropzone.on("addedfile", function(file){

        addedFiles =  addedFiles + 1;
      });

      myDropzone.on("removedfile", function(file){

        addedFiles =  addedFiles - 1;
      });

      myDropzone.on("canceled", function(file){

        alert('Upload Cancelled');
        addedFiles =  addedFiles - 1;
      });

      myDropzone.on('maxfilesexceeded', function(){

        alert('You have exceeded the maximum number of files that you can upload, please remove one file, before proceeding!');

      });
    }

    function getFileTypes(fileTypeString)
    {

      if( fileTypeString == 'null' ){

        return null;
      }
      else{

        return fileTypeString;
      }
    }

    function getHeaders(headerString)
    {

      headers     = {};
      tempHeaders = headerString.split('-');

      tempHeaders.forEach(function(header){

        var head     = header.split(':');
        var key      = head[0];
        var value    = head[1];

        headers[key] = value;

      });

      return headers;

    }

    function getAspectRatio(aspectRatioString)
    {

      aspects     = {};
      tempRatios  = aspectRatioString.split('-');

      tempRatios.forEach(function(ratios){

        var ratio    = ratios.split(':');
        var key      = ratio[0];
        var value    = parseInt(ratio[1]);

        aspects[key] = value;

      });

      return aspects;

    }

    function saveTicket(attachment_url, attachment_name){
      var subject = $("#ticket-subject").val();
      var comment = $("#ticket-comment").val();
      var referenceNumber = "SAFI153555";
      var imageData;
      if("undefined" !== typeof(imageBoard))
      {
          imageData = imageBoard.getImg();
      }
      $("#saving-ticket-loading").show();

      var data = {
            subject: subject,
            comment: comment,
            referenceNumber: referenceNumber,
            category: category,
            priority: priority,
            url: window.location.href,
            imageData: imageData,
            attachment: attachment_url,
            attachment_name: attachment_name
        };

        $.ajax({
            type: "POST",
            url: "/system/tickets/save-new-ticket",
            data: data,
            dataType: "json",
            success: function (response) {
              $("#ticket-subject").val('');
              $("#ticket-comment").val('');

              $(".category-select").removeClass('btn-success');
              $(".category-select").removeClass('g-btn-grey');
              $('.category-select').first().addClass('btn-success');
              $(".category-select").first().addClass('g-btn-grey');

              $(".priority-select").removeClass('btn-success');
              $(".priority-select").removeClass('g-btn-grey');
              $('.priority-select').first().addClass('btn-success');
              $(".priority-select").first().addClass('g-btn-grey');


              $("#saving-ticket-loading").hide();
              $("#modal-help").modal('hide');
              $("#screenshot-editor").empty();
              imageBoard = undefined;

            }
        });

    }


});
