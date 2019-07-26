$(function(){

	var myDropzone;
	var addedFiles = 0;
	var fileName = '';
	var image;
	var cropper;
	var aspectRatio;

	$(window).load(function(){


	});

	function getCroppedImageBlob(dataURI) {
	    var byteString = atob(dataURI.split(',')[1]);
	    var ab = new ArrayBuffer(byteString.length);
	    var ia = new Uint8Array(ab);
	    for (var i = 0; i < byteString.length; i++) {
	        ia[i] = byteString.charCodeAt(i);
	    }
	    return new Blob([ab], { type: 'image/jpeg' });
	}


	function setDropzone(prefix)
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

				$('#' + prefix + '-uploadCanvas').modal('hide');
				alert("All files have been succesfully uploaded");
					// execute any js echoed by the controller
					eval(response);
					// alert($('#' + prefix + '-uploadCanvas').data('reload'));
				if( $('#' + prefix + '-uploadCanvas').data('reload') == true ){

					window.location.reload();
				}
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


	$('button.upload-canvas').click(function(event){

		event.preventDefault();

		elementId = $(event.target).attr('id') + '-uploadCanvas';
		setDropzone($(event.target).attr('id'));

		$('#' + elementId).modal('show');


	});

	$('button.upload-files').click(function(event){

		event.preventDefault();

		myDropzone.processQueue();

	});




});
