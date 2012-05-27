// ==UserScript==
// @name        Testing 1
// @version     0.01.0847
// @description
// @include     http://musicbrainz.org/artist/*
// @include     http://beta.musicbrainz.org/artist/*
// @include     http://test.musicbrainz.org/artist/*
// @include     http://musicbrainz.org/artist/*/releases
// @include     http://beta.musicbrainz.org/artist/*/releases
// @include     http://test.musicbrainz.org/artist/*/releases
// @include     http://musicbrainz.org/release-group/*
// @include     http://beta.musicbrainz.org/release-group/*
// @include     http://test.musicbrainz.org/release-group/*
// @include     http://musicbrainz.org/label/*
// @include     http://beta.musicbrainz.org/label/*
// @include     http://test.musicbrainz.org/label/*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require     https://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js
// @require     https://github.com/brianfreud/greasemonkey-batchCAA/blob/master/jsjpegmeta.js
// ==/UserScript==

/*global console JpegMeta Blob BlobBuilder GM_xmlhttpRequest */
// See https://github.com/jshint/jshint/issues/541
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, es5:true, expr:true, strict:true, undef:true, curly:true, nonstandard:true, browser:true, jquery:true, maxerr:500, laxbreak:true, newcap:true, laxcomma:true */

/* Installation and requirements:

Firefox: Install as normal.

Chrome: Install script.  Go to settings --> extensions ( chrome://chrome/extensions/ ) and make sure that the checkbox next to
"Allow access to file URLs" for this script is checked.  Then restart Chrome, with the --allow-file-access-from-files switch.
If you reinstall or upgrade the script, you may need to restart the browser before the script works again.

Opera: Compatible?  Definitely requires minimum of version 12.  Also may NOT work for loading remote images; I need to look into it more...
http://userscripts.org/topics/2026 :
"it is possible to have cross-domain GM_xmlhttpRequest in Opera. To do so you need the following: 
- cross-domain XMLHttpRequest implementation scripts (a-lib-stacktrace.js and a-lib-xmlhttp-cd.js) from here: 
http://my.opera.com/community/forums/findpost.p... (I suggest to read the entire thread) 
- wrapper for GM_* functions (aagmfunctions.js) from here: http://www.howtocreate.co.uk/operaStuff/userjs/... (this is the up-to-date 
location for the script mentioned by znerp) 
- enable the following options in Opera: opera:config#UserPrefs|UserJavaScript and opera:config#UserPrefs|UserJavaScriptonHTTPS 
- modify the aagmfunctions.js script to use the cross-domain XMLHttpRequest implementation by changing the following line 
var request = new XMLHttpRequest(); 
into 
var request = new opera.XMLHttpRequest();"

*/

var CONSTANTS = { DEBUGMODE     : true
                , IMAGEPROXY    : ''
                , DEBUGLOG_OVER : false
                , COLORS        : { ACTIVE  : 'lightSteelBlue'
                                  , BORDERS : '1px dotted grey'
                                  , EDITING : '#C1FFC1'
                                  }
                , COVERTYPES    : [ 'Front' /* The order of items in this array matters! */
                                  , 'Back'
                                  , 'Booklet'
                                  , 'Medium'
                                  , 'Obi'
                                  , 'Spine'
                                  , 'Track'
                                  , 'Other'
                                  ]
                , FILESYSTEMSIZE: 50  /* This indicates the number of megabytes to use for the temporary local file system. */
                , IMAGESIZES    : [100, 150, 300]
                , LANGUAGE      : 'en'
                , SIDEBARWIDTH  : (Math.max(Math.round(screen.width/400), 3) * 107) + 15
                , SIDEBARHEIGHT : (screen.height - 300)
                , THROBBER      : localStorage.getItem('throbber')
                , PREVIEWSIZE   : 300
                , BEINGDRAGGED  : { OPACITY : '0.4'
                                  , SHRINK  : '0.7'
                                  }
                , TEXT          : {
                                  en : { 'Add cover art'           : 'Add cover art'
                                       , 'Images'                  : 'Images'
                                       , 'Load CAA images'         : 'Load images from the Cover Art Archive'
                                       , 'Load CAA images for all' : 'Load images from the Cover Art Archive for all releases'
                                       , 'coverType:Front'         : 'Front'
                                       , 'coverType:Back'          : 'Back'
                                       , 'coverType:Booklet'       : 'Booklet'
                                       , 'coverType:Medium'        : 'Medium'
                                       , 'coverType:Obi'           : 'Obi'
                                       , 'coverType:Spine'         : 'Spine'
                                       , 'coverType:Track'         : 'Track'
                                       , 'coverType:Other'         : 'Other'
                                       , 'Preview Image'           : 'Preview'
                                       , 'loading'                 : 'Loading data from the Cover Art Archive, please wait...'
                                       , 'Add image one release'   : 'Add another empty image space to this release.'
                                       , 'Load text one release'   : 'Loads any images already in the Cover Art Archive, and creates spaces for new images, for this release.'
                                       , 'Load text all releases'  : 'Loads images and creates editing spaces, for all displayed releases.'
                                       },
                                  fr : {
                                       'Images' : 'Les Photos'
                                       }
                                  }
                };


/* START remote image accessor functions.  This *has* to happen before main_loader() starts the rest of the script, so that the
   event handler already exists when the other javascript context is created.  It cannot happen as part of main() itself, as that
   new context loses the special permissions granted to userscripts, and thus does not have access to GM_xmlhttpRequest. */

/* Create a hidden div which will be used to pass messages between javascript security contexts. */
var body       = document.getElementsByTagName('body')[0]
  , messageDiv = document.createElement('div')
  ;
messageDiv.id = 'xhrComlink';
body.appendChild(messageDiv);

/* Create an event listener, in the priviledged userscript context, which will listen for new uri additions to the xhrComlink div.
   This cannot use custom events, as they would only exist in one of the two javascript contexts. */
messageDiv.addEventListener('click', getUri, true);

/* When a click event alerts the code that a new link is in the communications div, read that link's uri out of the linked span.
   Then convert the binary image into a base64 string, and replace the contents of the linked span with the base64 string.  Finally,
   trigger a doubleclick event to let the other half of this code, in the other javascript context, know that the image data has
   been retrieved. */
function getUri(e) {
    'use strict';
    var thisComlink   = e.target
      , linkedUri     = e.target.innerHTML
      , base64_encode = function base64_encode (data) {  // from http://phpjs.org
                            // http://kevin.vanzonneveld.net
                            // +   original by: Tyler Akins (http://rumkin.com)
                            // +   improved by: Bayron Guevara
                            // +   improved by: Thunder.m
                            // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
                            // +   bugfixed by: Pellentesque Malesuada
                            // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
                            // +   improved by: Rafał Kukawski (http://kukawski.pl)
                            // *     example 1: base64_encode('Kevin van Zonneveld');
                            // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
                            // mozilla has this native
                            // - but breaks in 2.0.0.12!
                            //}
                            var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
                            var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
                                ac = 0,
                                enc = "",
                                tmp_arr = [];
                        
                            if (!data) {
                                return data;
                            } do { // pack three octets into four hexets
                                o1 = data.charCodeAt(i++);
                                o2 = data.charCodeAt(i++);
                                o3 = data.charCodeAt(i++);
                        
                                bits = o1 << 16 | o2 << 8 | o3;
                        
                                h1 = bits >> 18 & 0x3f;
                                h2 = bits >> 12 & 0x3f;
                                h3 = bits >> 6 & 0x3f;
                                h4 = bits & 0x3f;
                    
                                // use hexets to index into b64, and append result to encoded string
                                tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
                            } while (i < data.length);
                            enc = tmp_arr.join('');
                            var r = data.length % 3;
                            return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
                        }
      , data_string = function data_string(data) {
                          // Generate a binary data string from character / multibyte data
                          // from Tim Smart, at http://pastebin.ca/1425789
                          var binary_string = '';
                          for (var i = 0, il = data.length; i < il; i++) {
                              binary_string += String.fromCharCode(data[i].charCodeAt(0) & 0xff);
                          }
                          return binary_string;
                      }
      ;

    var storeImage  = function storeImage (response) {
        var binaryImage       = response.responseText;
        var binaryStringImage = data_string(binaryImage);
        var base64Image       = base64_encode(binaryStringImage);

        thisComlink.innerHTML = '';
        var newtext = document.createTextNode(base64Image);
        thisComlink.appendChild(newtext);

        var evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("dblclick", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        thisComlink.dispatchEvent(evt);
    };

    var gmXHR = GM_xmlhttpRequest; // GM_xmlhttpRequest is not a constructor, but it looks like one to jshint.
    gmXHR({ method: "GET"
          , url: linkedUri
          , responseType : 'arraybuffer'
          , overrideMimeType: 'text/plain; charset=x-user-defined'
          , onload: storeImage
          });
}
/* END remote image accessor functions. */


function main ($, CONSTANTS) {
    'use strict';
    jQuery.noConflict();

    $.log('Script initializing.');

    /* This just forces CONSTANTS.THROBBER to be already be loaded, so that the throbber shows up faster. */
    $('body').append($('<img>').prop('src', CONSTANTS.THROBBER).hide());

    var $imageContainer
      , $previewContainer
      , $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    /* This function does a little magic.  It makes sure that the horizontal scrollbar on CAA rows only shows when it needs to. */
    var checkScroll = function checkScroll ($caaDiv) {
        $.log('Adjusting negative right margin.');
        if ('undefined' === typeof($caaDiv.data('width'))) {
            $caaDiv.data('width', $caaDiv.width());
        }
        var $dropboxes = $caaDiv.find('.CAAdropbox');
        var $dropbox   = $dropboxes.filter(':first')
          , dbCount    = $dropboxes.length;
        var dbWidth    = $dropbox.outerWidth(true);
        var divWidth   = ($('.CAAdropbox').length * dbWidth);
        $.log('Calculated width: ' + ($caaDiv.data('width') - divWidth));
        $caaDiv.css('margin-right', Math.min(0, $caaDiv.data('width') - divWidth - 115) + 'px');
    };

    /* Converts a number into a comma-separated number. */
    var addCommas = function addCommas (numberString) {
        var x
          , x1
          , x2
          , separatorRegexp = /(\d+)(\d{3})/;

        x = ('' + numberString).split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        while (separatorRegexp.test(x1)) {
            x1 = x1.replace(separatorRegexp, '$1' + ',' + '$2');
        }
        return x1 + x2;
    };

    var init = function init () {

        /* This creates a temporary local file system to use to store remote image files. */
        var localFS;
        var storeFS = function store_created_local_file_system (fsObj) {
            $.log('Temporary local file system created. ');
            $.log(fsObj);
            localFS = fsObj;
        };
        window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
        window.requestFileSystem(window.TEMPORARY, CONSTANTS.FILESYSTEMSIZE * 1024 * 1024, storeFS, function (e) {
            $.log('Requesting a temporary local file system failed.  Error message is:');
            $.log(e);
        });
        /* End temporary local file system code. */

        !function init_resize_sidebar () {
            $('#content').css('margin-right', (CONSTANTS.SIDEBARWIDTH + 20) + 'px');
            $('#page').css('background', '#FFF');
        }();

        !function init_create_dropzone () {
            $.log('Creating drop zone.');
            $imageContainer = $('<div id="imageContainer"/>');
            $previewContainer = $('<div id="previewContainer"/>').append($('<img id="previewImage"/>'))
                                                                 .append($('<br/>'))
                                                                 .append($('<div id="previewText"/>'));


            $('#sidebar').empty()
                         .append($('<h1 id="imageHeader"/>').text($.l('Images')))
                         .append($('<br/><br/>'))
                         .append($imageContainer)
                         .append($('<hr/>').css('border-top', CONSTANTS.COLORS.BORDERS))
                         .append($('<h1 id="previewHeader"/>').text($.l('Preview Image')))
                         .append($previewContainer);
        }();

        !function init_add_css () {
            $.log('Adding css rules');
            $.addRule('#page', '{ min-height: ' + (screen.height - 200) + 'px; }');
            $.addRule('#xhrComlink', '{ display: none; }');
            $.addRule('.localImage', '{ padding: 3px; vertical-align: middle; }');
            $.addRule('.existingCAAimage', '{ background-color: #FFF; border: 0px none; }');
            $.addRule('.newCAAimage', '{ background-color: #F2F2FC; border: 1px #AAA dotted; }');
            $.addRule('.workingCAAimage', '{ padding-left: 1px; padding-right: 1px; }');
            $.addRule('.CAAdropbox', JSON.stringify({ 'border-radius'    : '6px;'
                                                    , 'float'            : 'left;'
                                                    , 'margin'           : '6px;'
                                                    , 'min-height'       : '126px;'
                                                    , 'padding'          : '3px;'
                                                    , 'vertical-align'   : 'middle;'
                                                    , 'width'            : '126px;'
                                                    }));
            $.addRule('.CAAdropbox > figcaption', '{ text-align: center; position: relative; height: 14em; }');
            $.addRule('.CAAdropbox > figcaption > input, .CAAdropbox > figcaption > div', '{ clear: both; }');
            $.addRule('.CAAdropbox > figcaption > input', '{ font-size: 12px; width: 90%; }');
            $.addRule('.CAAdropbox > figcaption > div', '{ font-size: 80%; }');
            $.addRule('.newCAAimage > div', JSON.stringify({ 'background-color' : '#E0E0FF;'
                                                           , 'border'           : CONSTANTS.COLORS.BORDERS + ';'
                                                           , 'margin-bottom'    : '6px!important;'
                                                           }));
            $.addRule('.workingCAAimage > div', '{ margin-bottom: 8px!important; }');
            $.addRule('.CAAdropbox > figcaption > div', '{ height: 2.5em; }');
            $.addRule('.CAAdropbox > figcaption > select', JSON.stringify({ 'background-color' : 'transparent;'
                                                                          , 'clear'            : 'both;'
                                                                          , 'clip'             : 'rect(2px 49px 136px 2px);'
                                                                          , 'color'            : '#555;'
                                                                          , 'font-size'        : 'inherit;'
                                                                          , 'padding-top'      : '8px;'
                                                                          , 'position'         : 'absolute;'
                                                                          , 'text-align'       : 'center;'
                                                                          , 'left'             : '36px;'
                                                                          }));
            $.addRule('.CAAdropbox > div', '{ display: block; height: 120px; margin: 3px auto; }');
            $.addRule('.CAAdropbox > div > img', '{ display: block; max-width: 120px; max-height: 120px; margin: 0 auto; }');
            $.addRule('.existingCAAimage > div > img', '{ border: 0px none; }');
            $.addRule('.newCAAimage > div > img', '{ min-height: 120px; }');
            $.addRule('.caaDiv', '{ padding-left: 25px; }');
            $.addRule('div.loadingDiv > img', '{ height: 30px; width: 30px; padding-right: 10px; }');
            $.addRule('table.tbl * table', '{ width: 100%; }');
            $.addRule('.imageRow', '{ overflow-x: auto; padding-bottom: 1em!important; }');
            var shrink = 'scale(' + CONSTANTS.BEINGDRAGGED.SHRINK + ');';
            $.addRule('.beingDragged', JSON.stringify({ 'opacity'    : CONSTANTS.BEINGDRAGGED.OPACITY + ';'
                                                      , 'transform'         : shrink
                                                      , '-webkit-transform' : shrink
                                                      , '-o-transform'      : shrink
                                                      , '-moz-transform'    : shrink
                                                      }));
            $.addRule('.over', '{ background-color: ' + CONSTANTS.COLORS.ACTIVE + '; }');

           /* Start control buttons */
            $.addRule('.caaLoad, .caaAll', JSON.stringify({ 'background-color' : 'indigo!important;'
                                                          , 'border'           : '1px outset #FAFAFA!important;'
                                                          , 'border-radius'    : '7px;'
                                                          , 'color'            : '#FFF!important;'
                                                          , 'font-size'        : '90%;'
                                                          , 'margin-bottom'    : '16px;'
                                                          , 'margin-top'       : '1px!important;'
                                                          , 'opacity'          : '.35;'
                                                          , 'padding'          : '3px 8px;'
                                                          }));
            $.addRule('.caaAdd', JSON.stringify({ 'background-color' : 'green!important;'
                                                , 'border'           : '0px none #FAFAFA!important;'
                                                , 'border-radius'    : '7px;'
                                                , 'color'            : '#FFF!important;'
                                                , 'float'            : 'left;'
                                                , 'font-size'        : '175%;'
                                                , 'font-weight'      : '900!important;'
                                                , 'left'             : '2em;'
                                                , 'margin-left'      : '-1.2em;!important;'
                                                , 'opacity'          : '0.5;'
                                                , 'padding-bottom'   : '0px;'
                                                , 'padding-top'      : '0px;'
                                                , 'position'         : 'absolute;'
                                                }));
           $.addRule('.caaAdd:hover, .caaAll:hover, .caaLoad:hover', '{ opacity: .9; color: lightgrey; }');
           $.addRule('.caaAdd:active, .caaAll:active, .caaLoad:active', '{ opacity: 1; color: #FFF; border-style: inset!important; }');
           /* End control buttons */

           /* Start right side layout */
           $.addRule('#sidebar', JSON.stringify({ 'border-left'  : CONSTANTS.COLORS.BORDERS + ';'
                                                , 'padding-left' : '8px;'
                                                , 'position'     : 'fixed;'
                                                , 'right'        : '20px;'
                                                , 'width'        : CONSTANTS.SIDEBARWIDTH + 'px;'
                                                }));
           $.addRule('#imageContainer, #previewContainer', '{ width: 100%; }');
           $.addRule('#imageContainer', '{ overflow-y: auto; }');
           var size = (CONSTANTS.SIDEBARHEIGHT - CONSTANTS.PREVIEWSIZE) + 'px;';
           $.addRule('#imageContainer', '{ height: ' + size + ' max-height: ' + size + ' }');
           size = (CONSTANTS.PREVIEWSIZE + 37);
           $.addRule('#previewContainer', '{ height: ' + size + 'px; max-height: ' + size + 'px; }');
           size = (CONSTANTS.PREVIEWSIZE + 15) + 'px;';
           $.addRule('#previewImage', JSON.stringify({ 'display' : 'block;'
                                                     , 'height'  : size
                                                     , 'margin'  : '0 auto;'
                                                     , 'padding' : '15px 0 0 0;'
                                                     , 'max-width'   : size
                                                     }));
           /* End right side layout */

           $.addRule('.closeButton', JSON.stringify({ 'background-color' : '#FFD0DB;'
                                                    , 'border'           : '1px solid #EEC9C8;'
                                                    , 'border-radius'    : '8px;'
                                                    , 'cursor'           : 'pointer;'
                                                    , 'float'            : 'right;'
                                                    , 'line-height'      : '.8em;'
                                                    , 'margin-right'     : '-1em;'
                                                    , 'margin-top'       : '-1em;'
                                                    , 'opacity'          : '0.9;'
                                                    , 'padding'          : '2px 4px 5px 4px;'
                                                     }));
           $.addRule('.closeButton:hover', JSON.stringify({ 'background-color' : '#FF82AB;'
                                                    , 'font-weight'      : '900;'
                                                    , 'opacity'          : '1.0;'
                                                     }));

            /* MB's css sets this to 2em, but the column is actually 6em wide.  This needs to be fixed, or else it will break
               when table-layout: fixed is set. */
            $.addRule('table.tbl .count', '{ width: 6em!important; }');

            $('th:eq(2)').css('width', $('th:eq(2)').width() + 'px');
            $('<style id="tblStyle1">table.tbl { table-layout: fixed; }</style>').appendTo($('head'));
            $.addRule('table.tbl * table', '{ width: 100%; }');

            $.log('Adding css stylesheets');
            var sizes = CONSTANTS.IMAGESIZES,
                makeStyle = function make_style (size) {
                                $('<style id="style' + size + '">.localImage { width: ' + size + 'px; }</style>').appendTo($('head'));
                            };
            makeStyle(sizes[0]);
            makeStyle(sizes[1]);
            makeStyle(sizes[2]);

            $.log('Adding css methods');
            var useSheets = function use_stylesheets (small, medium, big) {
                                $('#style' + sizes[0]).prop('disabled', !small);
                                $('#style' + sizes[1]).prop('disabled', !medium);
                                $('#style' + sizes[2]).prop('disabled', !big);
                            };
            $.extend({
                     imagesSmall  : function make_images_small () {
                                        useSheets(1, 0, 0);
                                    },
                     imagesMedium : function make_images_medium () {
                                        useSheets(0, 1, 0);
                                    },
                     imagesLarge  : function make_images_big () {
                                        useSheets(0, 0, 1);
                                    }
                     });

            $.log('Setting active style');
            $.imagesSmall();
        }();

        var addImageToDropbox = function add_image_to_dropbox (file, source, uri) {
                $.log('Running addImageToDropbox');

                var dataURLreader = new FileReader()
                  , binaryReader  = new FileReader()
                  , title         = (source === 'local') ? 'Local file: ' + (file.name)
                                                         : source + ' file from ' + uri
                  ;
                var $img          = $('<img/>').addClass('localImage')
                                               .data('source', source)
                                               .data('file', file)
                                               .prop({ alt       : title
                                                     , draggable : true
                                                     , title     : title
                                                     });
                dataURLreader.onload = function add_attributes_to_dropped_image(event) {
                    $.log('Running addImageToDropbox -> dataURLreader.onload');
                    $img.prop('src', event.target.result);
                    $imageContainer.append($img);
                };
                binaryReader.onloadend = function get_exif_for_dropped_image(event) {
                    $.log('Running addImageToDropbox -> binaryReader.onloadend');
                    var jpeg = new JpegMeta.JpegFile(this.result, file.name);
                    $img.data('resolution', jpeg.general.pixelWidth.value + ' x ' + jpeg.general.pixelHeight.value);
                    $img.data('depth', jpeg.general.depth.value);
                    $img.data('size', file.size || file.fileSize);
                    $img.data('size', addCommas($img.data('size')));
                    $img.data('name', file.name || file.fileName);
                    var logStr = 'Loaded new image: ' + $img.data('name') +
                                 '.  Image has a resolution of ' + $img.data('resolution') + ', '
                                 + $img.data('depth') + '-bit color depth, ' +
                                 'and a filesize of ' + $img.data('size') + ' bytes.';
                    $.log(logStr);
                };
                dataURLreader.readAsDataURL(file);
                binaryReader.readAsBinaryString(file);
            };

        var loadLocalFile = function load_local_file (e) {
            var files = (e.files || e.dataTransfer.files);
            for (var i = 0; i < files.length; i++) {
                if (!files[i].type.match(/image\/p?jpeg/)) {
                    continue;
                }
                addImageToDropbox(files[i], 'local');
            }
        };

        var testImageUri = function test_for_valid_image_uri (uri) {
            /* Testing for: jpg jpeg jpe jfif jif pjpeg */
            var jpegTest = /\.p?j(pg|peg?|f?if)$/i;
            return jpegTest.test(uri);
        };

        var loadRemoteFile = function load_remote_file (uri) {
            if (!testImageUri(uri)) {
                $.log(uri + ' does not appear to be a jpeg, skipping.');
                return;
            }
            $.log(uri + ' appears to be a jpeg, continuing.');

            var loadStage = '';
            var handleError = function error_handler_for_loadRemoteFile_XHR (e) {
                                  $.log('loadRemoteFile\'s XMLHttpRequest had an error during ' + loadStage + '.');
                                  $.log(e);
                                };

            var $xhrComlink = $('#xhrComlink');
            $.log('Creating comlink to trigger other context to get the image.');
            $('<pre>' + uri + '</pre>').appendTo($xhrComlink)
                                         .trigger('click')
            /* At this point, the event handler in the other javascript scope takes over.  It will then trigger a dblclick
               event, which will then continue the import. */           
                                         .on('dblclick', function create_blob_and_add_thumbnail (e) {
                                                             $.log('dblclick detected on comlink; creating file and thumbnail.');
                                                             var $comlink = $(this);
                                                             var imageBase64 = $(this).text();
                                                             var jpegTest = /pjpeg$/i;
                                                             var mime = jpegTest.test(uri) ? 'pjpeg' : 'jpeg';
                                                             var imageFile = $.dataURItoBlob(imageBase64, mime);
                                                             var thisImageFilename = 'image' + Date.now() + '.jpg';
                                                             /* Create a new file in the temp local file system. */
                                                             loadStage = 'getFile';
                                                             localFS.root.getFile(thisImageFilename, { create: true, exclusive: true }, function (thisFile) {
                                                                 /* Write to the new file. */
                                                                 loadStage = 'createWriter';
                                                                 thisFile.createWriter(function temp_file_system_file_writer_created (fileWriter) {
                                                                     fileWriter.onwritestart = function fileWriter_onwritestart (e) {
                                                                         // fileWriter.position points to 0.
                                                                         $.log('fileWriter is writing a remote image file to a local file.');
                                                                     };
                                                                     fileWriter.onwriteend = function fileWriter_onwriteend (e) {
                                                                         // fileWriter.position points to the next empty byte in the file.
                                                                         $.log('fileWriter has ' + ((fileWriter.position) ? '' : 'NOT ') + 'successfully finished writing a remote image file to a local file.');
                                                                         if (fileWriter.position) {
                                                                             $.log('Adding remote image to the drop zone.');
                                                                             thisFile.file(function (file) {
                                                                                 addImageToDropbox(file, 'Remote', uri);
                                                                             });
                                                                         }
                                                                     };

                                                                     loadStage = 'createWriter: problem within the writer.';
                                                                     fileWriter.onerror = handleError(e);
                                                                     loadStage = 'createWriter: abort within the writer.';
                                                                     fileWriter.onabort = handleError(e);

                                                                     fileWriter.write(imageFile);
                                                                     $.log('Remote file has been retrieved and writen.');
                                                                     $.log(localFS);
                                                                     $comlink.remove();
                                                                 }, handleError);
                                                             }, handleError);
                                                         });
        };

        !function init_activate_dnd_at_dropzone () {
            $.log('Attaching events to drop zone.');
            $imageContainer.on({
                dragenter: function dragEnter (e) {
                    $.log('imageContainer: dragenter.');
                    $(this).addClass('over');
                },
                dragleave: function dragLeave (e) {
                    $.log('imageContainer: dragleave.');
                    $(this).removeClass('over');
                },
                dragover: function dragOver (e) {
                    $.log('imageContainer: dragover.', 1);
                    e.preventDefault();
                },
                drop: function drop (e) {
                    $.log('imageContainer: drop.');
                    $(this).removeClass('over');

                    e = e.originalEvent || e;

                    var uriTest = /\b(?:https?|ftp):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|]/gi;
                    var dropped = { file_list : e.dataTransfer.files
                                  , text      : e.dataTransfer.getData('Text').match(uriTest) || ''
                                  , uri       : e.dataTransfer.getData('text/uri-list')
                                  };

                    $.log(dropped);
                    switch (!0) {
                        case !!dropped.file_list.length: // local file
                            $.log('imageContainer: drop ==> local file'); 
                            loadLocalFile(e); 
                            break;
                        case !!dropped.uri.length: // remote image drag/dropped
                            $.log('imageContainer: drop ==> image uri');
                            loadRemoteFile(dropped.uri);
                            break;
                        case !!dropped.text.length: // plaintext list of urls drag/dropped
                            $.log('imageContainer: drop ==> list of uris');
                            for (var i = 0, len = dropped.text.length; i < len; i++) {
                                loadRemoteFile(dropped.text[i]);
                            }
                            break;
                        default:
                            $.log('Whatever was just dropped is not something which can provide a jpeg.');
                    }
                    
                }
            });
        }();

        !function init_add_caa_row_controls () {
            $.log('Adding CAA controls and event handlers.');

            /* The second selector here allows for the release links added by http://userscripts.org/scripts/show/93894 */
            var releaseSelector = 'a[resource^="[mbz:release/"], a[href^="/release/"]'
              , $thisForm       = $('form[action*="merge_queue"]')
              , $caaBtn         = $('<input type=button>').prop('value', $.l('Load CAA images'))
                                                          .prop('title', $.l('Load text one release'))
                                                          .addClass('caaLoad')
              , $addBtn         = $('<input type=button>').prop('value', '+')
                                                          .prop('title', $.l('Add image one release'))
                                                          .addClass('caaAdd')
                                                          .hide()
              , $loadingDiv     = $('<div>').text($.l('loading'))
                                            .prepend($('<img>').prop('src', CONSTANTS.THROBBER)
                                                               .addClass('throbberImage'))
                                            .addClass('loadingDiv')
                                            .hide()
              , getMBID         = function get_release_MBID (attrStr) {
                                      return attrStr.split('/')
                                                    .pop()
                                                    .replace('#_','');
                                  }
              ;

            var makeCAATypeList = function makeCAATypeList () {
                                      $.log('Creating CAA type select.');
                                      var types  = CONSTANTS.COVERTYPES
                                        , $newOption
                                        , $typeList = $('<select multiple="multiple">').prop('size', types.length)
                                        ;

                                      for (var i = 0, len = types.length; i < len; i++) {
                                          $newOption = $('<option>').prop('value', i+1)
                                                                    .text($.l('coverType:' + types[i]));
                                          $typeList.append($newOption);
                                      }
                                      return $typeList;
                                  };

            var makeDropbox = function makeDropbox () {
                                  $.log('Creating dropbox.');
                                  var $types = makeCAATypeList();
                                  var $dropbox = $('<figure>').addClass('CAAdropbox newCAAimage')
                                                              .append($('<header>').text('x')
                                                                                   .addClass('closeButton'))
                                                              .append($('<img>').addClass('dropBoxImage')
                                                                                .wrap('<div>').parent())
                                                              .append($('<figcaption>').append($('<input type="text"/>').prop('placeholder', 'image comment'))
                                                                                       .append($('</br>'))
                                                                                       .append($types))
                                                              .on('click', '.closeButton', function close_button_for_db_click_handler (e) {
                                                                                               $.log('Removing drop box');
                                                                                               $(this).parent().find('.dropBoxImage') /* Any image in the drop box */
                                                                                                      .appendTo($('#imageContainer'))
                                                                                                      .addClass('localImage')
                                                                                                      .removeClass('dropBoxImage');
                                                                                               $(this).parent().remove();
                                                                                           });
                                  return $dropbox;
                             };

            var $dropBox = makeDropbox();

            var addCAARow = function add_new_row_for_CAA_stuff (event) {
                                $.log('Release row handler triggered.');
                                var $releaseAnchor = $(this),
                                    $releaseRow;
                                if ('undefined' !== typeof(event) && event.hasOwnProperty('originalEvent')) {
                                    $.log('Release row handler is running due to a mutation event.');
                                    $releaseRow = $(event.originalEvent.srcElement);
                                    $releaseAnchor = $releaseRow.find('a:first');
                                    if (event.originalEvent.srcElement.localName !== 'tr') {
                                        $.log('Aborting; mutation event was not triggered by a tr insertion.');
                                        return;
                                    } else if ($releaseAnchor.text() === 'edit') {
                                        $.log('Edit links from the "expand/collapse release groups" script found; removing the row.');
                                        $releaseRow.remove();
                                        return;
                                    }
                                }
                                if (typeof($releaseAnchor.attr('href')) === 'undefined') {
                                    $.log('Aborting; not a valid release tr.');
                                    return;
                                }
                                if ($releaseAnchor.parents('tr:first').find('td').length === 3) {
                                    $.log('Aborting; tr describes a track, not a release.');
                                    return;
                                }

                                $releaseRow = $releaseAnchor.parents('tr:first');
                                var colCount    = $releaseRow.find('td').length
                                  , thisMBID    = getMBID($releaseAnchor.attr('href'))
                                  , $imageRow   = $('<td/>').prop('colspan', colCount)
                                                            .addClass('imageRow')
                                                            .wrap('<tr>')
                                                            .parent()
                                  ;

                                $.log('New release found, attaching a CAA row.');
                                var $thisAddBtn = $addBtn.clone()
                                                         .data('entity', thisMBID);
                                var $thisCAABtn = $caaBtn.clone()
                                                         .data('entity', thisMBID);
                                var $thisLoadingDiv = $loadingDiv.clone();
                                var $newCAARow  = $imageRow.clone()
                                                           .find('td').append($('<div>').addClass('caaDiv')
                                                                                        .before($thisAddBtn)
                                                                                        .before($thisLoadingDiv)
                                                                                        .append($thisCAABtn)).end()
                                                           .prop('class', $releaseRow.prop('class'));
                                $thisForm.data(thisMBID, $newCAARow);

                                // This next is done via event to allow for script-initiated row transforms (e.g. TableSorter)
                                $.log('Attaching DOMNodeInserted event handler.');
                                $releaseRow.on('DOMNodeInserted', function node_inserted_so_try_to_add_caa_row () {
                                    $.log('DOMNodeInserted event handler triggered.');
                                    $releaseRow.after($newCAARow);
                                }).trigger('DOMNodeInserted');

                                $thisAddBtn.on('click', function invoke_Add_image_space_button_click_handler () {
                                    $.log('Add new CAA image space button triggered.');
                                    var $imageDiv = $(this).next();
                                    $imageDiv.append($dropBox.clone(true));
                                    checkScroll($imageDiv);

                                });

                                $thisCAABtn.on('click', function invoke_CAA_row_button_click_handler () {
                                    $.log('Add CAA images to release row button triggered.');
                                    $newCAARow.find('.loadingDiv').show();
                                    $newCAARow.find('.caaLoad').hide();
                                    $newCAARow.find('.caaDiv').slideUp();
                                    var $widthEle = $('.caaLoad:first').parents('td:first')
                                      , $tableParent = $('.caaLoad:first').parents('table:first')
                                      , caaRequest = 'http://coverartarchive.org/release/' + $(this).data('entity')
                                      ;
                                    if (!$tableParent.hasClass('tbl')) {
                                        $widthEle = $tableParent.parents('td:first');
                                    }
                                    for (var i = 0, repeats = Math.max(3, Math.round($widthEle.width()/132) - 5); i < repeats; i++) {
                                           $(this).after($dropBox.clone(true));
                                    }
                                    $.log('Requesting CAA info for ' + $(this).data('entity'));
                                    $.ajax({ cache    : false
                                           , context  : this
                                           , url      : caaRequest
                                           , error    : function handler(jqXHR, textStatus, errorThrown) {
                                                            /* Reference http://tickets.musicbrainz.org/browse/CAA-24 */
                                                            $.log('Ignore the XMLHttpRequest error.  CAA returned XML stating that CAA has no images for this release.');
                                                            $newCAARow.find('div.loadingDiv, .caaAdd').toggle();
                                                            $newCAARow.find('div.caaDiv').slideDown('slow');
                                                        }
                                           , success  : function caaResponseHandler (response) {
                                                            $.log('Received CAA, parsing...');
                                                            if (jQuery.isEmptyObject(response)) {
                                                                $.log('CAA response: no images in CAA for this release.');
                                                            } else {
                                                                $.each(response.images, function parseCAAResponse (i) {
                                                                    $.log('Parsing CAA response: image #' + i);
                                                                    if ($newCAARow.find('.newCAAimage').length === 0) {
                                                                        $thisAddBtn.trigger('click');
                                                                    }
                                                                    var $emptyDropBox = $newCAARow.find('.newCAAimage:first');
                                                                    $emptyDropBox.find('input').replaceWith($('<div>').text(this.comment)).end()
                                                                                 .find('br, .closeButton').remove().end()
                                                                                 .find('select').prop('disabled', true).end()
                                                                                 .removeClass('newCAAimage');

                                                                    /* This next bit of code does the same thing as the lowsrc attribute.  This would have
                                                                       been easier, but lowsrc no longer exists in HTML5, and Chrome has dropped support for it.
                                                                       http://www.ssdtutorials.com/tutorials/title/html5-obsolete-features.html */
                                                                    var $img = $emptyDropBox.find('img');
                                                                    $img[0].src = CONSTANTS.THROBBER;
                                                                    $img.css('padding-top', '20px');
                                                                    var realImg = new Image();
                                                                    realImg.src = this.image;
                                                                    realImg.onload = function assign_real_caa_image () {
                                                                        $img.prop('src', realImg.src)
                                                                            .css('padding-top', '0px');
                                                                    };
                                                                    /* End lowsrc workaround. */

                                                                    $.each(this.types, function assign_image_type (i) {
                                                                        var value = $.inArray(this, CONSTANTS.COVERTYPES) + 1;
                                                                        $emptyDropBox.find('option[value="' + value + '"]').prop('selected', true);
                                                                    });
                                                                    checkScroll($newCAARow.find('div.loadingDiv'));
                                                                });
                                                            }
                                                        $newCAARow.find('.loadingDiv, .caaAdd').toggle();
                                                        $newCAARow.find('.caaDiv').slideDown('slow');
                                                        }
                                           });
                                });
                            };

            // handle pre-existing release rows
            $(releaseSelector).each(addCAARow);

            // handle dynamically added release rows (e.g. http://userscripts.org/scripts/show/93894 )
            $.log('Adding release row event handler.');
            $thisForm.find('tbody:first')
                     .on('DOMNodeInserted', 'table', addCAARow);
        }();

        !function init_add_caa_table_controls () {
            $.log('Adding CAA load all releases button.');
            var $caaAllBtn = $('<input type=button>').prop('value', $.l('Load CAA images for all'))
                                                     .prop('title', $.l('Load text all releases'))
                                                     .addClass('caaAll');
            $('table.tbl').before($('<br/>'))
                          .before($caaAllBtn);
            $caaAllBtn.on('click', function caaAllBtn_click_handler () {
                $.log('CAA load all releases\' images button has been clicked.');
                $('.caaLoad:visible').each(function caaAllBtn_click_each_release_button () {
                    $.log('Triggering a click on a CAA load images button.');
                    $(this).trigger('click');
                });
            });
        }();
    };

    /* Preview functionality */
    $('body').on('click', '.localImage, .CAAdropbox:not(.newCAAimage) * .dropBoxImage', function send_image_to_preview_box () {
        $.log('Setting new image for preview box.');
        $('#previewImage').prop('src', $(this).prop('src'));
//TODO: previewText
    });

    /* START: functionality to allow dragging from the Images box to a specific caa image box. */
    var $draggedImage = null,
        inChild       = false;

    /* http://weblog.bocoup.com/using-datatransfer-with-jquery-events/ */
    jQuery.event.props.push('dataTransfer');

    $('body').on({
                 dragstart : function localImage_dragStart (e) {
                                 $.log('localImage: dragstart');
                                 $draggedImage = $(this).addClass('beingDragged');
                                 e.dataTransfer.dropEffect='move';
                                 e.dataTransfer.effectAllowed = 'move';
                             },
                 dragend   : function localImage_dragEnd (e) {
                                 $.log('localImage: dragend');
                                 if ($draggedImage !== null) {
                                     $draggedImage.removeClass('beingDragged');
                                     $('figure').removeClass('over');
                                 }
                                 $draggedImage = null;
                             }
    }, '.localImage');

    $('body').on({
                dragover : function newCAAimage_dragOver (e) {
                                $.log('newCAAimage: dragover');
                                e.preventDefault();
                                return false;
                            },
                dragenter : function newCAAimage_dragEnter (e) {
                                $.log('newCAAimage: dragenter');
                                e.preventDefault();
                                if ($draggedImage !== null) {
                                    inChild = !$(e.target).hasClass('newCAAimage');
                                    $('figure').removeClass('over');
                                    $(this).addClass('over');
                                }
                                return false;
                            },
                dragleave : function newCAAimage_dragLeave (e) {
                                $.log('loadingDiv: dragleave');
                                e.preventDefault();
                                if ($draggedImage !== null) {
                                    /* https://bugs.webkit.org/show_bug.cgi?id=66547 */
                                    if (!inChild) {
                                        $(this).removeClass('over');
                                    }
                                }
                                return false;
                            },
                drop      : function newCAAimage_drop (e) {
                                $.log('newCAAimage: drop');
                                e.preventDefault();
                                if ($draggedImage !== null) {
                                    $(this).find('.dropBoxImage').replaceWith($draggedImage);
                                    $draggedImage.toggleClass('beingDragged dropBoxImage localImage')
                                                 .parents('figure:first').toggleClass('newCAAimage workingCAAimage over')
                                                                         .css('background-color', CONSTANTS.COLORS.EDITING);
                                    $('figure').removeClass('over');
                                    $draggedImage = null;
                                }
                                return false;
                }
    }, '.newCAAimage');
    /* END: functionality to allow dragging from the Images box to a specific caa image box. */

    /* Adjust the table layout and CAA rows after a screen resize event occurs. */
    window.onresize = function adjust_table_after_window_resize () {
        $.log('Screen resize detected, adjusting layout.');
        if ((window.outerHeight - window.innerHeight) > 100) {
            $('#tblStyle1').prop('disabled',true);
            $('th:eq(2)').css('width', $('th:eq(2)').width() + 'px');
            $('#tblStyle1').prop('disabled',false);
        }
        $('div.caaDiv').each(function () {
            checkScroll($(this));
        });
    };

    !function add_manual_starter_for_init () {
        $.log('Adding manual starter link.');
        var $triggerLink = $('<a>' + $.l('Add cover art') + '</a>').css('cursor', 'pointer')
                                                                   .wrap('<li>')
                                                                   .on('click', function start_cover_art_script () { init(); })
                                                                   .parent();
        $('ul.links').find('hr:first').before($triggerLink);
    }();
}

function thirdParty($, CONSTANTS) {
    /*jshint strict:false */
    jQuery.noConflict();

    var addRule = function addRule (selector, rule) {
        $('<style>' + selector + rule.replace(/[",]/g,'') + '</style>').appendTo($('head'));
    };

    var debug = function debug () {
        return CONSTANTS.DEBUGMODE;
    };

    var l = function l (str) {
        return (CONSTANTS.TEXT[CONSTANTS.LANGUAGE][str] || CONSTANTS.TEXT.en[str]);
    };

    var log = function log (str, over) {
        'undefined' === typeof(over) && (over = false);
        debug() && (CONSTANTS.DEBUGLOG_OVER ? !over : true) && console.log(str);
    };

    // Modified from http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
    var dataURItoBlob = function dataURItoBlob(dataURI, mime) {
        // convert base64 to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0) {
            byteString = atob(dataURI.split(',')[1]);
        } else {
            byteString = atob(dataURI); // The followup at stackoverflow is wrong here; this version is fixed.
        }

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // write the ArrayBuffer to a blob, and you're done
        /* The deprecated BlobBuilder format is normally prefixed;
           we need to find the right one.  (The Blob constructor which
           has replaced BlobBuilder is not yet implemented. */
        var Builder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;
        var bb = new Builder();
        bb.append(ab);
        return bb.getBlob('image/' + mime);
    };


    jQuery.extend({
        addRule   : function addrule_handler (selector, rule) {
                        return addRule(selector, rule);
                  },
        dataURItoBlob : function dataURItoBlob_handler (dataURI, mime) {
                            return dataURItoBlob(dataURI, mime);
                  },
        debug     : function debug_handler() {
                        return debug();
                  },
        l         : function gettext_handler(str) {
                        return l(str);
                  },
        log       : function log_handler(str) {
                        return log(str);
                  }
    });

    // http://james.padolsey.com/javascript/regex-selector-for-jquery/
/*
    jQuery.expr[':'].regex = function jQuery_regexp (elem, index, match) {
        var matchParams = match[3].split(','),
            validLabels = /^(data|css):/,
            attr = {
                method: matchParams[0].match(validLabels) ?
                            matchParams[0].split(':')[0] : 'attr',
                property: matchParams.shift().replace(validLabels,'')
            },
            regexFlags = 'ig',
            regex = new RegExp(matchParams.join('').replace(/^\s+|\s+$/g,''), regexFlags);
        return regex.test(jQuery(elem)[attr.method](attr.property));
    };
*/
}



!function main_loader(i) {
    'use strict';
    var script
      , head = document.getElementsByTagName('head')[0]
      , requires = ['https://raw.github.com/brianfreud/greasemonkey-batchCAA/master/scripts.js']
      , makeScript = function makeScript () {
            script = document.createElement('script');
            script.type = 'text/javascript';
        }
      , loadLocal = function loadLocal (fn) {
            makeScript();
            script.textContent = '(' + fn.toString() + ')(jQuery, ' + JSON.stringify(CONSTANTS) + ');';
            head.appendChild(script);
        }
      ;
    (function script_loader (i) {
        var continueLoading = function continueLoading () {
                                  loadLocal(thirdParty);
                                  loadLocal(main);
                              };
        if (typeof($) !== 'undefined' && $.browser.mozilla) {
            continueLoading();
        } else if (requires.length === 1 && localStorage.getItem('jQuery') !== null) {
            i++;
            requires[1] = 'jQuery';
            requires[2] = 'jQueryUI';
            requires[3] = 'jsjpegmeta';
        }
        if (i === 0) { /* Scripts are not cached in localStorage, go get them and cache them. */
            makeScript();
            script.src = requires[0];
            script.addEventListener('load', function loader_move_to_next_script () {
                script_loader(1);
            }, true);
            head.appendChild(script);
        } else { /* Scripts are cached in localStorage; load them. */
            for (var j = 1, k = requires.length; j < k; j++) {
                makeScript();
                script.textContent = localStorage.getItem(requires[j]);
                head.appendChild(script);
            }
            continueLoading();
        }
    })(i || 0);
}();
