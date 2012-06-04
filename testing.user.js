// ==UserScript==
// @name        Testing 1
// @version     0.01.1031
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
// ==/UserScript==

// Translations handled at https://www.transifex.net/projects/p/CAABatch/

/*global console JpegMeta Blob BlobBuilder GM_xmlhttpRequest jscolor */
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
                , VERSION       : '0.1.1031'
                , DEBUGLOG_OVER : false
                , BORDERS       : '1px dotted #808080'
                , COLORS        : { ACTIVE     : '#B0C4DE'
                                  , CAABOX     : '#F2F2FC'
                                  , CAABUTTONS : '#4B0082'
                                  , INCOMPLETE : '#FFFF7A'
                                  , COMPLETE   : '#C1FFC1'
                                  , REMOVE     : '#B40000'
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
                , IMAGESIZES    : [50, 100, 150, 300]
                , LANGUAGE      : 'en'
                , SIDEBARWIDTH  : (Math.max(Math.round(screen.width/500), 3) * 107) + 15
                , SIDEBARHEIGHT : (screen.height - 290)
                , THROBBER      : localStorage.getItem('throbber')
                , PREVIEWSIZE   : 300
                , BEINGDRAGGED  : { OPACITY : '0.4'
                                  , SHRINK  : '0.7'
                                  }
                , TEXT          : {
                                  en : { languageName              : 'English'
                                       , 'Add cover art'           : 'Add cover art'
                                       , 'Add image one release'   : 'Add a box for another image.'
                                       , 'bytes'                   : 'bytes'
                                       , 'Colors'                  : 'Colors'
                                       , 'default'                 : 'default'
                                       , 'File size'               : 'File size'
                                       , '(Image) Resolution'      : 'Resolution'
                                       , 'Images'                  : 'Images'
                                       , 'Language'                : 'Language'
                                       , 'Load CAA images for all' : 'Load images from the Cover Art Archive for all releases'
                                       , 'Load CAA images'         : 'Load images from the Cover Art Archive for this release'
                                       , 'loading'                 : 'Loading data from the Cover Art Archive, please wait...'
                                       , 'Load text all releases'  : 'Loads images for all displayed releases.'
                                       , 'Load text one release'   : 'Loads any images already in the Cover Art Archive for this release.'
                                       , 'Magnify image'           : 'Zoom in'
                                       , 'Options'                 : 'Options'
                                       , 'Parse (help)'            : 'Check this box to enable parsing web pages whenever you drop in a link to a web page or a list of webpage URLs.'
                                       , 'Parse web pages'         : 'Parse web pages'
                                       , 'Preview Image'           : 'Preview'
                                       , 'Remove (help)'           : 'Check this box, then click on images to remove them.  Uncheck the box again to turn off remove image mode.'
                                       , 'Remove image'            : 'Click to remove this image'
                                       , 'Remove images'           : 'Remove images mode'
                                       , 'Shrink image'            : 'Zoom out'
                                       , 'Submit edits'            : 'Submit edits'
                                       , 'Changed colors note'     : 'Changes to the color settings will take effect the next time that this script is run.'
                                       , 'Changed language note'   : 'Changes to the language setting will take effect the next time that this script is run.'
                                       , 'take effect next time'   : 'Changes to the language and color settings will take effect the next time that this script is run.'
                                       , 'Version'                 : 'Version'
                                       , 'coverType:Back'          : 'Back'
                                       , 'coverType:Booklet'       : 'Booklet'
                                       , 'coverType:Front'         : 'Front'
                                       , 'coverType:Medium'        : 'Medium'
                                       , 'coverType:Obi'           : 'Obi'
                                       , 'coverType:Other'         : 'Other'
                                       , 'coverType:Spine'         : 'Spine'
                                       , 'coverType:Track'         : 'Track'
                                                                   /* Try to keep the text for these last few very short. */
                                       , ACTIVE                    : 'Droppable area'
                                       , CAABOX                    : 'Empty CAA box'
                                       , CAABUTTONS                : 'Load CAA buttons'
                                       , INCOMPLETE                : 'Incomplete edits'
                                       , COMPLETE                  : 'Edits ready to submit'
                                       , REMOVE                    : 'Remove image highlight'
                                       },
                                  fr : { languageName              : 'Français'
                                       , 'Images'                  : 'Les Photos'
                                       }
                                  }
                };

/* Special case Canadian English, to avoid redundancy with generic English. */
CONSTANTS.TEXT['en-ca']                          = JSON.parse(JSON.stringify(CONSTANTS.TEXT.en));
CONSTANTS.TEXT['en-ca'].languageName             = 'English (Canadian)';
CONSTANTS.TEXT['en-ca'].Colors                   = 'Colours';
CONSTANTS.TEXT['en-ca']['Changed colors note']   = 'Changes to the colour settings will take effect the next time that this script is run.';
CONSTANTS.TEXT['en-ca']['take effect next time'] = 'Changes to the language and colour settings will take effect the next time that this script is run.';

if (CONSTANTS.DEBUGMODE) {
    CONSTANTS.TEXT.test = { languageName              : 'Testing'
                          , 'Add cover art'           : '-·· -··- -····'
                          , 'Add image one release'   : '·-· -- -· -·- ··--- --···'
                          , 'bytes'                   : '·--· ···-'
                          , 'Colors'                  : '····· · -·-'
                          , 'default'                 : ' ··--·· -- ··· --·-'
                          , 'File size'               : '··--- ··· ·-'
                          , '(Image) Resolution'      : '···· --·- ····- ·· ·-·'
                          , 'Images'                  : '-·· ····'
                          , 'Language'                : '····- --· ·-'
                          , 'Load CAA images for all' : '·--- ·-·· -·- · -··· -----'
                          , 'Load CAA images'         : '··--·· --- ··- -· ·-·· ---·· ··--·· ·--- -··- -- ··- ·· --- ···- ---·· -- --· -·-· ·---- ·-·-·- -·-· -·· ·· -·-'
                          , 'loading'                 : '··-· ·--· ---·· ··· -· ·· ·-· ·-·· --·· ----· --·- ----- ····· ·-· -· ·- -·· --··-- ··· ----- ·---- ····· ·· --· ·· ···· ···--'
                          , 'Load text all releases'  : '-···· ··- ···- ·---- ·-·-·- ·-· - -·--'
                          , 'Load text one release'   : '·-·-·- -· -·- ·-·· ·--· ····- --- · --- ·· ···-- ·-·-·- --··--'
                          , 'Magnify image'           : '··-· ··--- ·····'
                          , 'Options'                 : '·- ·-·'
                          , 'Parse (help)'            : '--- ·- ·-·· --··-- -· -·- ····- --··-- ··-· ·--- --··· --- - ·---- ·-·-·- ·- --· -·-- --·· ···-- ·-- - ·-·· --··-- -- ··- ·- ··- ····· ----· --··-- -·-· ···- -· ·--'
                          , 'Parse web pages'         : '- ·-- ··-· -···· --··· --- - ·--· ----· ·--· ·-·-·- -·- -- ·-- -·· ···· ··--- - · ·--'
                          , 'Preview Image'           : '···- ----- -- ---'
                          , 'Remove (help)'           : '·-· ·-·· ····- --··-- ·- -- ··· -·· ···- -··- · -·· --·- ····- ··· -· ·-- ·-·· ·---- ----· ··· -··- ·---- ··--·· -· ·· --·'
                          , 'Remove image'            : '-··· -··- ··· - ···- ·---- ·-·-·'
                          , 'Remove images'           : '-·-· ·---- --· ···· ·-·· ···- ·- - ··- -···'
                          , 'Shrink image'            : '-·· ····- ·--·'
                          , 'Submit edits'            : '-··- ·-· ·· -·- -- -·-· ···· ·- --· ···· -·-- -··- -·-- --'
                          , 'Changed colors note'     : '---·· ··--·· ·--- -··- -- ··- ·· --- ···- ---·· -- --· -·-· ·---- ·-·-·- -·-· -·· ·· -·- ··-·'
                          , 'Changed language note'   : '-·- -·-· --·- -···· ··· · ·· ·---- ---·· ·-·-·- ·-- --- ·-·· -·-- --'
                          , 'take effect next time'   : '--·- ··--- ··· ·- ···· --·- ····- ·· ·-· -·· ···· ····· · -·- -·-· ····- --· ·- ·--- ---·· ·- --· -- ·---- ···--'
                          , 'Version'                 : '··--·· -- ···'
                          , 'coverType:Back'          : '---·· ·- --· --'
                          , 'coverType:Booklet'       : '·---- ···--'
                          , 'coverType:Front'         : '-·- -·-·'
                          , 'coverType:Medium'        : '--·- -····'
                          , 'coverType:Obi'           : '··· · ·· ·----'
                          , 'coverType:Other'         : '---··'
                          , 'coverType:Spine'         : '---'
                          , 'coverType:Track'         : '·-·-·- ·--'
                          , ACTIVE                    : '--· - ----- ·---- ··- ···-'
                          , CAABOX                    : '--··· --··-- · --- · --· -·-·'
                          , CAABUTTONS                : '··--- --- - -··- -·-- --··--'
                          , INCOMPLETE                : '-·· -··- -····'
                          , COMPLETE                  : '·-· -- -·'
                          , REMOVE                    : '-·- ··--- --··· ·--· ···-'
                          };
}

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

  // START from http://phpjs.org
  var base64_encode = function base64_encode(data) {
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
            }
            do { // pack three octets into four hexets
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
        };
    // END (phpjs.org)
  
    // START from Tim Smart at http://pastebin.ca/1425789
    var data_string = function data_string(data) {
            // Generate a binary data string from character / multibyte data
            var binary_string = '';
            for (var i = 0, il = data.length; i < il; i++) {
                binary_string += String.fromCharCode(data[i].charCodeAt(0) & 0xff);
            }
            return binary_string;
        };
    // END (Tim Smart)

    var bin2base64 = function bin2base64 (binary) {
        return base64_encode(data_string(binary));
    };

    var storeImage = function storeImage(response) {
            var thisComlink = e.target
              , evt         = document.createEvent("MouseEvents")
              ;

            thisComlink.innerHTML = '';

            thisComlink.appendChild(
                document.createTextNode(
                    bin2base64(response.responseText)
                )
            );

            evt.initMouseEvent("dblclick", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            thisComlink.dispatchEvent(evt);
        };

    var gmXHR = GM_xmlhttpRequest; // Workaround to jshint, since GM_xmlhttpRequest is not a constructor but looks like one to jshint.
    gmXHR({ method           : "GET"
          , overrideMimeType : 'text/plain; charset=x-user-defined'
          , onload           : storeImage
          , responseType     : 'arraybuffer'
          , url              : e.target.innerHTML
          });
}
/* END remote image accessor functions. */

function main ($, CONSTANTS) {
    'use strict';
    jQuery.noConflict();

    $.log('Script initializing.');

    var supportedImageFormats = ['bmp', 'gif', 'jpg', 'png'];

    /* This forces CONSTANTS.THROBBER to be already be loaded, so that the throbber shows up faster. */
    $('body').append($('<img>').prop('src', CONSTANTS.THROBBER).hide());

    var $imageContainer
      , $previewContainer
      , sizeStatus
      , $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    /* This function does a little magic.  It makes sure that the horizontal scrollbar on CAA rows only shows when it needs to. */
    var checkScroll = function checkScroll ($caaDiv) {
        $.log('Adjusting negative right margin.');
        if ('undefined' === typeof $caaDiv.data('width')) {
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

        x  = ('' + numberString).split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        while (separatorRegexp.test(x1)) {
            x1 = x1.replace(separatorRegexp, '$1' + ',' + '$2');
        }
        return x1 + x2;
    };

    /* Checks that an editbox has both an image and a cover type.  Returns the associated color for the current editbox' status. */
    var getEditColor = function get_edit_color_by_completeness ($ele) {
        $.log('Testing edit status to determine background color for dropbox.');
        if ($ele.find('option:selected').length && $ele.find('img').hasProp('src')) {
            return getColor('COMPLETE');
       } else {
            return getColor('INCOMPLETE');
       }
    };

    // Gets a color value stored in localStorage.
    var getColor = function getColor (color) {
        return localStorage.getItem('caaBatch_colors_' + color);
    };

    // Converts a hex color string into an rgba color string
    var hexToRGBA = function hexToRGBA (hex, opacity) {
        $.log('Converting ' + hex + ' to RGBA.');
        hex = ('#' === hex.charAt(0) ? hex.substring(1, 7) : hex);
        var R = parseInt(hex.substring(0, 2), 16)
          , G = parseInt(hex.substring(2, 4), 16)
          , B = parseInt(hex.substring(4, 6), 16)
          ;
        return 'rgba(' + [R, G, B, opacity].join(',') + ')';
    };

    var tintImageRed = function tint_image_Red (image) {
        $.log('Tinting image');
        var $image = $(image);
        $image.wrap('<figure>')
              .data('oldtitle', $image.prop('title'))
              .prop('title', $.l('Remove image'))
              .addClass('tintImage');
        $image.parent()
              .addClass('tintContainer')
              .css({ height : ($image.height() + 6) + 'px'
                   , width  : ($image.width() + 6) + 'px'
                   });
        return $image;
    };

    /* Takes a localStorage value name, and inserts the script stored there (as a string) into the DOM. */
    var addScript = function addScript (scriptSource) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.textContent = localStorage.getItem(scriptSource);
        document.getElementsByTagName('head')[0].appendChild(script);
    };

    /* Polyfill to add FileSystem API support to Firefox. */
    if ('undefined' === typeof (window.requestFileSystem || window.webkitRequestFileSystem)) {
            addScript('idbFileSystem');
    }

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
            $imageContainer    = $('<div id="imageContainer"/>');
            $previewContainer  = $('<div id="previewContainer"/>');
            var $previewInfo   = $('<dl id="previewText"/>').hide()
              , $dtResolution  = $('<dt>').text($.l('(Image) Resolution'))
                                          .addClass('previewDT')
              , $ddResolution  = $('<dd id="previewResolution">')
              , $dtFilesize    = $('<dt>').text($.l('File size'))
                                          .addClass('previewDT')
              , $ddFilesize    = $('<dd id="previewFilesize">')
              , $sizeContainer = $('<div id="imageSizeControlsMenu">')
              , $imageShrink   = $('<div id="imageShrink">').addClass('imageSizeControl')
                                                            .prop('title', $.l('Shrink image'))
              , $imageMagnify  = $('<div id="imageMagnify">').addClass('imageSizeControl')
                                                            .prop('title', $.l('Magnify image'))
              , $optionsControl = $('<div id="optionsHeader"/>').prop('title', $.l('Options'))
              , optionsImage   = localStorage.getItem('iconSettings')
              , $optionsMenu   = $('<fieldset id="optionsMenu"/>').hide()
              , $optionsLegend = $('<legend/>').text($.l('Options'))
              , $version       = $('<span id="caaVersion"/>').text([$.l('Version'), ' ', CONSTANTS.VERSION].join(''))
              , $removeLabel   = $('<label for="caaOptionRemove"/>').text($.l('Remove images'))
                                                                    .prop('title', $.l('Remove (help)'))
              , $removeControl = $('<input type="checkbox" id="caaOptionRemove"/>').prop('title', $.l('Remove (help)'))
              , $parseLabel    = $('<label for="caaOptionRemove"/>').text($.l('Parse web pages'))
                                                                    .prop('title', $.l('Parse (help)'))
              , $parseControl  = $('<input type="checkbox" id="caaOptionParse"/>').prop('title', $.l('Parse (help)'))
              , $langLabel     = $('<label id="languageSelectLabel" for="languageSelect"/>').text($.l('Language') + ':')
                                                                                        .prop('title', $.l('Changed language note'))
              , $langList      = $('<select id="languageSelect"/>').prop('size', 3)
                                                                 .prop('title', $.l('Changed language note'))

              , $previewImage  = $('<img id="previewImage"/>').prop('draggable', false)
              , $colorField    = $('<fieldset>')
              , $colorLegend   = $('<legend/>').text($.l('Colors'))
              , $colorSelect   = $('<select id="colorSelect" />').prop('title', $.l('Changed colors note'))
              , colorOptions   = []
              , $colorPicker   = $('<input type="color" value="66ff00" id="colorPicker"/>').prop('title', $.l('Changed colors note'))
              , $colorDefault  = $('<input type="button" id="ColorDefaultBtn"/>').prop('value', $.l('default'))
                                                                                 .prop('title', $.l('Changed colors note'))
              , $optionsNote   = $('<div id="optionsNote">').text($.l('take effect next time'))
              , baseImage      = localStorage.getItem('magnifyingGlassBase')
              ;
            var minusImage     = baseImage + localStorage.getItem('magnifyingGlassMinus')
              , plusImage      = baseImage + localStorage.getItem('magnifyingGlassPlus')
              ;

            /* Populate the colors list */
            $colorSelect.prop('size', Object.keys(CONSTANTS.COLORS).map(function (colorItem) {
                var color       = CONSTANTS.COLORS[colorItem]
                  , $option     = $('<option/>').addClass('colorOption')
                  ;
                var $thisOption = $option.clone()
                                         .prop('value', colorItem)
                                         .data('default', color)
                                         .text($.l(colorItem));
                if (localStorage.getItem('caaBatch_colors_' + colorItem) === null) {
                    $.log('Initializing localStorage for ' + 'caaBatch_colors_' + colorItem + ' to ' + color);
                    localStorage.setItem('caaBatch_colors_' + colorItem, color);
                }
                colorOptions.push($thisOption);
            }).length);

            /* Populate the languages list */
            var languages = []
              , $option   = $('<option/>')
              ;
            Object.keys(CONSTANTS.TEXT).forEach(function(key) {
                languages.push([key, CONSTANTS.TEXT[key].languageName]);
            });
            languages.sort(function (a, b) {
                return a[1] === b[1] ? 0                 // a[1] == b[1] ->  0
                                     : a[1] > b[1] ? 1   // a[1] >  b[1] ->  1
                                                   : -1; // a[1] <  b[1] -> -1
            });
            var userLang  = localStorage.getItem('caaBatch_language') || 'en';
            var $ARRlangs = languages.map(function (language) {
                                              return $option.clone()
                                                            .prop('selected', (language[0] === userLang))
                                                            .prop('value', language[0])
                                                            .text(language[1]);
                                          });

            /* Populate the DOM */
            $('#sidebar').empty()
                         .appendAll([ $('<h1 id="imageHeader"/>').text($.l('Images'))
                                    , $sizeContainer.appendAll([ $imageMagnify.append(plusImage)
                                                               , $imageShrink.append(minusImage)
                                                               ])
                                    , $optionsControl.append(optionsImage)
                                    , $imageContainer.append($optionsMenu.appendAll([ $optionsLegend
                                                                                    , $version
                                                                                    , $removeControl
                                                                                    , $removeLabel
                                                                                    , $('<br/>')
                                                                                    , $parseControl
                                                                                    , $parseLabel
                                                                                    , $('<br/>')
                                                                                    , $langLabel.append($langList.appendAll($ARRlangs))
                                                                                    , $colorField.appendAll([ $colorLegend
                                                                                                            , $colorSelect.appendAll(colorOptions)
                                                                                                            , $colorPicker
                                                                                                            , $colorDefault
                                                                                                            ])
                                                                                    , $optionsNote
                                                                                    ]))
                                    , $('<hr/>').css('border-top', CONSTANTS.BORDERS)
                                    , $('<h1 id="previewHeader"/>').text($.l('Preview Image'))
                                    , $previewContainer.appendAll([ $previewImage
                                                                  , $previewInfo.appendAll([ $dtResolution
                                                                                           , $ddResolution
                                                                                           , $dtFilesize
                                                                                           , $ddFilesize
                                                                                           ])
                                                                  ])
                                    ]);

            $optionsControl.click(function optionsControl_click_handler () {
                                       $.browser.mozilla ? $optionsMenu.toggle() : $optionsMenu.slideToggle();
                                  });
        }();

        /* Add functionality to the language selector. */
        !function add_color_select_handler () {
            $.log('Adding handler for language selector.');
            $('#languageSelect').on('change', function (e) {
                localStorage.setItem('caaBatch_language', $(this).find(':selected').val());
            });
        }();

        /* Create the color picker. */
        $.log('Creating color picker');
        var myPicker = new jscolor.color(document.getElementById('colorPicker'), {});
        myPicker.hash = true;
        myPicker.pickerFace = 5;
        myPicker.pickerInsetColor = 'black';

        /* Add functionality to the color picker. */
        !function add_color_select_handler () {
            $.log('Adding handler for color picker.');
            $('#colorSelect').on('change', function (e) {
                var color = localStorage.getItem('caaBatch_colors_' + $(this).find(':selected').val());
                $.log('Getting localStorage for ' + 'caaBatch_colors_' + $(this).find(':selected').val() + '.  Result: ' + color);
                myPicker.fromString(color);
            });
            /* Store new color value in localStorage. */
            $('#colorPicker').change(function (e) {
                localStorage.setItem('caaBatch_colors_' + $('#colorSelect').find(':selected').val(), this.value);
                $.log('Setting localStorage for ' + 'caaBatch_colors_' + $('#colorSelect').find(':selected').val() + ' to ' + this.value);
            });
            var $firstOption = $('#colorSelect').find('option:first');
            $firstOption.prop('selected', true);
            myPicker.fromString(
                               getColor([ $firstOption.val() ])
                               );
        }();

        !function add_default_color_handler () {
            $.log('Adding handler for default color button.');
            $('#ColorDefaultBtn').on('click', function default_color_button_click_handler (e) {
                                                  var color = $('#colorSelect').find(':selected')
                                                                               .data('default');
                                                  myPicker.fromString(color);
                                                  $.log('Setting localStorage for ' + 'caaBatch_colors_' + $('#colorSelect').find(':selected').val() + ' to ' + color);
                                                  localStorage.setItem('caaBatch_colors_' + $('#colorSelect').find(':selected').val(), color);
                                              });
        }();

        !function add_remove_image_handlers () {
            $.log('Adding handlers for remove image mode.');
            $('#imageContainer').on('mouseenter', '.localImage', function localImage_hover_in_handler (e) {
                                    $('#caaOptionRemove').prop('checked') && tintImageRed(e.target);
                                })
                                .on('mouseleave', '.localImage', function localImage_hover_out_handler (e) {
                                    var $e = $(e.target);
                                    $e.parents('.tintContainer:first').length && $e.removeClass('tintImage')
                                                                                   .prop('title', $e.data('oldtitle'))
                                                                                   .unwrap();
                                })
                                .on('click', '.tintImage', function remove_image_click_handler (e) {
                                    $(e.target).parent()
                                               .remove();
                                });
        }();

        !function init_add_css () {
            $.log('Adding css rules');
            $.addRule('*', '{ -moz-box-sizing: border-box; -webkit-box-sizing: border-box; box-sizing: border-box; }');
            $.addRule('#page', '{ min-height: ' + (screen.height - 200) + 'px; }');
            $.addRule('#xhrComlink', '{ display: none; }');
            $.addRule('#caaVersion', '{ float: right; font-size: 75%; margin-top: -15px; }');
            $.addRule('.localImage', '{ padding: 3px; vertical-align: top; }');
            $.addRule('#optionsMenu * select', '{ font-size: 105%; }');
            $.addRule('#languageSelect', '{ padding: 6px; margin: 10px 10px -27px 6px; }');
            $.addRule('fieldset', JSON.stringify({ 'border'        : '1px solid lightGrey;'
                                                 , 'border-radius' : '8px;'
                                                 , 'margin'        : '30px -4px 7px -4px;'
                                                 , 'padding'       : '6px;'
                                                 }));
            $.addRule('legend', '{ font-size: 108%!important; color: black!important; }');
            $.addRule('#colorSelect', '{ padding: 5px; float: left; width: 202px; }');
            $.addRule("input[type='color'], #ColorDefaultBtn", JSON.stringify({ 'border'        : '1px outset lightGrey;'
                                                                              , 'border-radius' : '6px;'
                                                                              , 'cursor'        : 'pointer;'
                                                                              , 'float'         : 'right;'
                                                                              , 'margin-right'  : '0;'
                                                                              , 'outline'       : 'none;'
                                                                              , 'text-align'    : 'center;'
                                                                              , 'width'         : '74px;'
                                                                              }));
            $.addRule('#optionsNote', '{ font-size: 85%; font-style: oblique; }');
            $.addRule('#ColorDefaultBtn', '{ background-color: lightGrey; }');
            $.addRule('.tintContainer', JSON.stringify({ 'background'    : hexToRGBA(getColor('REMOVE'), '0.8').replace(/,/g,'^') + ';'
                                                       , 'border-radius' : '5px;'
                                                       , 'opacity'       : '0.8;'
                                                       /* The rest of these rules are a css reset. */
                                                       , 'margin'         : '0;'
                                                       , 'padding'        : '0;'
                                                       , 'outline'        : '0;'
                                                       , 'vertical-align' : 'baseline;'
                                                       , 'display'        : 'inline-block;'
                                                       }));
            $.addRule('.tintImage', '{ opacity: 0.4; }');
            $.addRule('#imageHeader', '{ float: left; width: 30%; }');
            $.addRule('#optionsHeader', '{ display: inline-block; float: right; margin-right: -24px; margin-top: -3px; width: 40%; }');
            $.addRule('#optionsMenu', JSON.stringify({ 'border'        : '1px solid lightGrey;'
                                                     , 'border-radius' : '8px;'
                                                     , 'line-height'   : '2;'
                                                     , 'margin'        : '10px 3px;'
                                                     , 'padding'       : '8px;'
                                                     }));
            $.addRule('#optionsMenu > label, #optionsMenu > label > select', '{ margin-left: 5px; }');
            $.addRule('#optionsMenu > label > select', '{ padding: 3px; }');
            $.addRule('#optionsMenu > summary', '{ line-height: 2; }');
            $.addRule('#imageSizeControlsMenu', '{ float: right; width: 25%; height: 24px; }');
            $.addRule('.imageSizeControl, #optionsHeader', '{ float: right; height: 26px; width: 26px; cursor: pointer; }');
            $.addRule('.imageSizeControl', '{ opacity: 0.4;}');
            $.addRule('#optionsHeader', '{ opacity: 0.3;}');
            $.addRule('.imageSizeControl:hover, #optionsHeader:hover', '{ opacity: 1;}');
            $.addRule('.existingCAAimage', '{ background-color: #FFF; border: 0px none; }');
            $.addRule('.newCAAimage', '{ background-color: ' + getColor('CAABOX') + '; border: 1px #AAA dotted; }');
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
                                                           , 'border'           : CONSTANTS.BORDERS + ';'
                                                           , 'margin-bottom'    : '6px!important;'
                                                           }));
            $.addRule('.workingCAAimage > div', '{ margin-bottom: 8px!important; }');
            $.addRule('.CAAdropbox > figcaption > div', '{ height: 2.5em; }');
            $.addRule('.CAAdropbox > figcaption > select', JSON.stringify({ 'background-color' : 'transparent;'
                                                                          , 'clear'            : 'both;'
                                                                          , 'clip'             : 'rect(2px 49px 145px 2px);'
                                                                          , 'color'            : '#555;'
                                                                          , 'font-size'        : 'inherit;'
                                                                          , 'padding-bottom'   : '20px;'
                                                                          , 'padding-right'    : '20px;'
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
            $.addRule('.over', '{ background-color: ' + getColor('ACTIVE') + '; }');

           /* Start control buttons */
            $.addRule('.caaLoad, .caaAll', JSON.stringify({ 'background-color' : getColor('CAABUTTONS') + '!important;'
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
                                                , 'opacity'          : '0.3;'
                                                , 'padding-bottom'   : '0px;'
                                                , 'padding-top'      : '0px;'
                                                , 'position'         : 'absolute;'
                                                }));
           $.addRule('.caaAdd:hover, .caaAll:hover, .caaLoad:hover', '{ opacity: .9; color: lightgrey; }');
           $.addRule('.caaAdd:active, .caaAll:active, .caaLoad:active', '{ opacity: 1; color: #FFF; border-style: inset!important; }');
           /* End control buttons */

           /* Start right side layout */
           $.addRule('#sidebar', JSON.stringify({ 'border-left'  : CONSTANTS.BORDERS + ';'
                                                , 'padding-left' : '8px;'
                                                , 'position'     : 'fixed;'
                                                , 'right'        : '20px;'
                                                , 'width'        : CONSTANTS.SIDEBARWIDTH + 'px;'
                                                }));
           $.addRule('#imageContainer, #previewContainer', '{ width: 100%; }');
           $.addRule('#imageContainer', '{ overflow-y: auto; }');
           var size = (CONSTANTS.SIDEBARHEIGHT - CONSTANTS.PREVIEWSIZE);
           if ($.browser.mozilla) {
               size = size - 100;
           }
           size += 'px;';
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
           $.addRule('#previewText', '{ width: 60%; margin: 0 auto; padding-top: 10px; line-height: 140%; }');
           $.addRule('.previewDT', '{ clear: left; float: left; font-weight: 700; }');
           $.addRule('.previewDT::after', '{ content: ~: ~; }');
           $.addRule('#previewText > dd', '{ float: right; }');

           /* End right side layout */

           $.addRule('.closeButton', JSON.stringify({ 'background-color' : '#FFD0DB;'
                                                    , 'border'           : '1px solid #EEC9C8;'
                                                    , 'border-radius'    : '8px;'
                                                    , 'cursor'           : 'pointer;'
                                                    , 'float'            : 'right;'
                                                    , 'line-height'      : '.8em;'
                                                    , 'margin-right'     : '-1em;'
                                                    , 'margin-top'       : '-0.95em;'
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
            makeStyle(sizes[3]);

            $.log('Adding css methods');
            var useSheets = function use_stylesheets (tiny, small, medium, big) {
                                $('#style' + sizes[0]).prop('disabled', !tiny);
                                $('#style' + sizes[1]).prop('disabled', !small);
                                $('#style' + sizes[2]).prop('disabled', !medium);
                                $('#style' + sizes[3]).prop('disabled', !big);
                            };
            $.extend({
                     imagesTiny  : function make_images_small () {
                                        useSheets(1, 0, 0, 0);
                                    },
                     imagesSmall  : function make_images_small () {
                                        useSheets(0, 1, 0, 0);
                                    },
                     imagesMedium : function make_images_medium () {
                                        useSheets(0, 0, 1, 0);
                                    },
                     imagesLarge  : function make_images_big () {
                                        useSheets(0, 0, 0, 1);
                                    }
                     });

            $.log('Setting active style');
            $.imagesSmall();
            sizeStatus = 2;
        }();

        var imageSize = function imageSize (change) {
            sizeStatus += change;
            var $shrink  = $('#imageShrink')
              , $magnify = $('#imageMagnify')
              ;
            switch (sizeStatus) {
                case 0: sizeStatus = 1;
                          /* falls through */
                case 1:
                        $shrink.vis(0);
                        $magnify.vis(1);
                        $.imagesTiny();
                        break;
                case 2:
                        $shrink.add($magnify)
                               .vis(1);
                        $.imagesSmall();
                        break;
                case 3:
                        $shrink.add($magnify)
                               .vis(1);
                        $.imagesMedium();
                        break;
                case 5: sizeStatus = 4;
                          /* falls through */
                case 4:
                        $shrink.vis(1);
                        $magnify.vis(0);
                        $.imagesLarge();
                        break;
            }
        };

        $('#imageShrink').on('click', function () {
            imageSize(-1);
        });
        $('#imageMagnify').on('click', function () {
            imageSize(1);
        });

        var addImageToDropbox = function add_image_to_dropbox (file, source, uri) {
                $.log('Running addImageToDropbox');

                var dataURLreader = new FileReader()
                  , binaryReader  = new FileReader()
                  , title         = (source === 'local') ? 'Local file: ' + (file.name)
                                                         : source + ' file: ' + uri
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
                    $img.data('size', addCommas(file.size || file.fileSize));
                    $img.data('name', file.name || file.fileName || uri);
                    var logStr = 'Loaded new image: ' + $img.data('name') +
                                 '.  Image has a resolution of ' + $img.data('resolution') + ', '
                                 + $img.data('depth') + '-bit color depth, ' +
                                 'and a filesize of ' + $img.data('size') + ' bytes.';
                    $.log(logStr);
                };

                dataURLreader.readAsDataURL(file);
                binaryReader.readAsBinaryString(file);
            };

        var testUriJPG = function (uri) {
                return (/\.p?j(pg|peg?|f?if)$/i).test(uri);  /* jpg jpeg jpe jfif jif pjpeg */
            }
          , testUriBMP = function (uri) { return (/\.bmp$/i).test(uri); }
          , testUriGIF = function (uri) { return (/\.gif$/i).test(uri); }
          , testUriJNG = function (uri) { return (/\.jng$/i).test(uri); }
          , testUriJP2 = function (uri) { return (/\.j(2c|2k|p2|pc|pt)$/i).test(uri); } /* j2c j2k jp2 jpc jpt */
          , testUriPCX = function (uri) { return (/\.pcx$/i).test(uri); }
          , testUriPNG = function (uri) { return (/\.png$/i).test(uri); }
          , testUriTGA = function (uri) { return (/\.tga$/i).test(uri); }
          , testUriTIF = function (uri) { return (/\.tiff?$/i).test(uri); }
          , testUriWebP = function (uri) { return (/\.webp$/i).test(uri); }
          ;
        var supportedImageType = function supportedImageType (uri) {
            switch (!0) {
                case testUriJPG(uri): return 'jpg';
                case testUriBMP(uri): return 'bmp';
                case testUriGIF(uri): return 'gif';
                case testUriJNG(uri): return 'jng';
                case testUriJP2(uri): return 'jp2';
                case testUriPCX(uri): return 'pcx';
                case testUriPNG(uri): return 'png';
                case testUriTGA(uri): return 'tga';
                case testUriTIF(uri): return 'tif';
                case testUriWebP(uri): return 'webp';
                default: return false;
            }
        };

        var convertImage = function convertImage (inputImage, type, source) {
/* 
Native support:
    Chrome:
        Fail:
            bmp - 16bit 1, bmp - 16bit 2, bmp - 32bit 2
            j2k
            jng
            jp2
            jpc
            pcx
            tga
            tif - compressed, tif - Deflate, tif - LZW, tif - no compression, tif - Pack Bits
        Pass:
            bmp - 16bit 3, bmp - 24bit, bmp - 32bit 1
            gif
            png - interlaced, png - non-interlaced
            webp

    Firefox:
        Fail:
            bmp - 32bit 2 -> https://github.com/devongovett/bmp.js/issues/1 possible future support
            j2k
            jng
            jp2
            jpc
            pcx
            tga
            tif - compressed, tif - Deflate, tif - LZW, tif - no compression, tif - Pack Bits
            webp
        Pass:
            bmp - 16bit 1, bmp - 16bit 2, bmp - 16bit 3, bmp - 24bit, bmp - 32bit 1
            gif
            png - interlaced, png - non-interlaced

bmp: possible future workaround support: https://github.com/devongovett/bmp.js/issues/1
*/

                $.log(['convertImage: received ', type, ' file: "', source, '"'].join(''));
                var canvas = document.createElement("canvas"),
                    reader = new FileReader();
                var ctx = canvas.getContext("2d");

                reader.onload = function (e) {
                    var img = new Image();
                    var useCanvasData = function useCanvasData () {
                        $.log('Appending temporary canvas item to the body.');
                        CONSTANTS.DEBUGMODE && $('body').append($(canvas)).prop('title', source);
                        $.log('Converting image to jpg, sending new blob to addImageToDropbox().');
                        addImageToDropbox(
                                         $.dataURItoBlob(
                                                        canvas.toDataURL("image/jpeg"), 'jpeg'
                                                        ),
                                         'converted local ' + type, source
                                         );
                    };

                    if (type === 'webp' && $.inArray(type, supportedImageFormats) === -1) {
                        // WebP-support test
                        img.onload = img.onerror = function () {
                            if (img.height === 2) { // Only load the polyfill if WebP is not yet supported within this session.
                                supportedImageFormats.push('webp');
                            }
                        };
                        img.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
                    }

                    // Convert image if its image format is supported via either polyfill or native
                    if ($.inArray(type, supportedImageFormats) + 1) {
                        img.onload = function () {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            useCanvasData();
                        };

                        img.src = reader.result;
                    } else {
                        /* Unsupported, but potentially converted here: j2k, jng, jp2, jpc, pcx, tga, tif */
                    }
                };

                if (type !== 'b') {
                    reader.readAsDataURL(inputImage);
                } else {
                    reader.readAsArrayBuffer(inputImage);
                }
                return;
            };

        var loadLocalFile = function load_local_file (e) {
            var file
              , name
              , type
              , files = (e.files || e.dataTransfer.files || e.file_list);
            for (var i = 0, len = files.length; i < len; i++) {
                file = files[i];
                name = file.name;
                type = supportedImageType(name);
                if (!type) {
                    $.log(['loadLocalFile: for file "', name, '", file ', (i+1), ' of ', len, ', unusable file type detected'].join(''));
                    continue;
                }
                $.log(['loadLocalFile: for file "', name, '", file ', (i+1), ' of ', len, ', usable file type "', type, '" detected'].join(''));
                if (type !== 'jpg') {
                    file = convertImage(file, type, name);
                } else {
                    addImageToDropbox(file, 'local');
                }
            }
        };

        var loadRemoteFile = function load_remote_file (uri, imgType) {
            'undefined' === typeof imgType && (imgType = 'jpg');
            var loadStage = ''
              , $xhrComlink = $('#xhrComlink')
              ;
            var handleError = function error_handler_for_loadRemoteFile_XHR (e) {
                                  $.log('loadRemoteFile\'s XMLHttpRequest had an error during ' + loadStage + '.');
                                  $.log(e);
                                };

            $.log('Creating comlink to trigger other context to get the image.');
            $('<pre>' + uri + '</pre>').appendTo($xhrComlink)
                                         .trigger('click')
            /* At this point, the event handler in the other javascript scope takes over.  It will then trigger a dblclick
               event, which will then continue the import. */           
                                         .on('dblclick', function create_blob_and_add_thumbnail (e) {
                                                             $.log('dblclick detected on comlink; creating file and thumbnail.');
                                                             var $comlink = $(this)
                                                               , imageBase64 = $(this).text()
                                                               , mime
                                                               , thisImageFilename = 'image' + Date.now() + '.jpg'
                                                               ;

                                                             switch (imgType) {
                                                                 case ('jpg'): mime = (/pjpeg$/i).test(uri) ? 'pjpeg' : 'jpeg'; break;
                                                                 case ('bmp'): mime = 'bmp'; break;
                                                                 case ('gif'): mime = 'gif'; break;
                                                                 case ('jng'): mime = 'x-jng'; break;
                                                                 case ('jp2'): mime = 'jp2'; break;
                                                                 case ('pcx'): mime = 'pcx'; break;
                                                                 case ('png'): mime = 'png'; break;
                                                                 case ('tga'): mime = 'tga'; break;
                                                                 case ('tif'): mime = 'tiff'; break;
                                                                 case ('webp'): mime = 'webp'; break;

                                                             }
                                                             var imageFile = $.dataURItoBlob(imageBase64, mime);
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
                                                                                 if (imgType !== 'jpg') {
                                                                                     file = convertImage(file, imgType, uri);
                                                                                     addImageToDropbox(file, 'converted remote ' + imgType, uri);
                                                                                 } else {
                                                                                     addImageToDropbox(file, 'Remote', uri);
                                                                                 }
                                                                             });
                                                                         }
                                                                     };

                                                                     loadStage = 'createWriter: problem within the writer. (But ignore this error.)';
                                                                     fileWriter.onerror = handleError(e);
                                                                     loadStage = 'createWriter: abort within the writer. (But ignore this error.)';
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
                    e.preventDefault();
                    e = e.originalEvent || e;

                    var uriTest = /\b(?:https?|ftp):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|]/gi;
                    var dropped = { file_list : e.dataTransfer.files
                                  , text      : e.dataTransfer.getData('Text').match(uriTest) || ''
                                  , uri       : e.dataTransfer.getData('text/uri-list')
                                  };

                    $.log(dropped);
                    switch (!0) {
                        case !!dropped.file_list.length: // local file(s)
                            $.log('imageContainer: drop ==> local file'); 
                            loadLocalFile(e); 
                            break;
                        case !!dropped.uri.length: // remote image drag/dropped
                            $.log('imageContainer: drop ==> uri');
                            dropped.text = [dropped.uri];
                            /* falls through */
                        case !!dropped.text.length: // plaintext list of urls drag/dropped
                            $.log('imageContainer: drop ==> list of uris');
                            var type, uri;
                            for (var i = 0, len = dropped.text.length; i < len; i++) {
                                uri = dropped.text[i];
                                type = supportedImageType(uri);
                                $.log('imageContainer: ' + type + ' detected');
                                if (type) {
                                    loadRemoteFile(uri, type);
                                    break;
                                } else {
//TODO: Add loading webpages
                                $.log(uri + ' does not appear to be a jpeg, skipping.');
                                }
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
                                                                                       .addClass('caaSelect')
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
                                                                                .prop('draggable', false)
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
                                if ('undefined' !== typeof event && event.hasOwnProperty('originalEvent')) {
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
                                if (typeof $releaseAnchor.attr('href') === 'undefined') {
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
                                           , success  : function caaResponseHandler (data, textStatus, jqXHR) {
                                                            $.log('Received CAA, parsing...');
                                                            if (jQuery.isEmptyObject(data)) {
                                                                $.log('CAA response: no images in CAA for this release.');
                                                            } else {
                                                                $.each(data.images, function parseCAAResponse (i) {
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
                                                                        $img.data('resolution', realImg.naturalWidth + ' x ' + realImg.naturalHeight)
                                                                            .css('padding-top', '0px');
                                                                        var xhrReq = $.ajax({
                                                                            url: realImg.src,
                                                                            success: function (request) {
                                                                                $img.data('size', addCommas(request.length))
                                                                                    .prop('src', realImg.src);
                                                                            }
                                                                          });
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
        if (!$('#caaOptionRemove').prop('checked')) {
            $.log('Setting new image for preview box.');
            $('#previewImage').prop('src', $(this).prop('src'));
            $('#previewResolution').text($(this).data('resolution'));
            $('#previewFilesize').text($(this).data('size') + ' ' + $.l('bytes'));
            $('#previewText').show();
        }
    });

    /* Edit completeness testing for the select list in each dropbox.  This tests for completeness after a change to a select;
       testing for completeness after an image is added is tested within that drop handler. */
    $('body').on('change', '.caaSelect', function select_change_handler (e) {
        var $figure = $(e.target).parents('figure:first');
        $figure.css('background-color', getEditColor($figure));
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
                                                                         .css('background-color', getEditColor($(this)));
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
    /* Despite the name, each function in thirdParty is by Brian Schweitzer unless otherwise noted. */

    /*jshint strict:false */
    jQuery.noConflict();

    var addRule = function addRule (selector, rule) {
        $('<style>' + selector + rule.replace(/[",]/g,'').replace(/~/g,'"').replace(/\^/g,',') + '</style>').appendTo($('head'));
    };

    // A very basic version of a gettext function.
    var l = function l (str) {
        return (CONSTANTS.TEXT[localStorage.getItem('caaBatch_language') || 'en'][str]);
    };

    // Logs a message to the console if debug mode is on.
    var log = function log (str, over) {
        'undefined' === typeof over && (over = false);
        CONSTANTS.DEBUGMODE && (CONSTANTS.DEBUGLOG_OVER ? !over : true) && console.log(str);
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
        var ab = new ArrayBuffer(byteString.length)
          , ia = new Uint8Array(ab)
          ;
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
        l         : function gettext_handler(str) {
                        return l(str);
                  },
        log       : function log_handler(str) {
                        return log(str);
                  } 
    });

    // By Brian Schweitzer and Naftali Lubin
    // Appends an array of jQuery objects to a jQuery object
    $.fn.appendAll = function (arrayToAdd) {
        return this.append.apply(this, arrayToAdd);
    };

    // Sets the css visibility using a boolean value rather than a string value
    $.fn.vis = function (i) {
        return this.css('visibility', i ? 'visible'
                                        : 'hidden');
    };

    // Tests whether an element has a defined property value.
    $.fn.hasProp = function (property) {
        property = $(this).prop(property);
        return ('undefined' !== typeof property && property.length);
    };

    $.browser.chrome = navigator.userAgent.toString().toLowerCase().indexOf('chrome');
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
        if ( requires.length === 1 &&
             localStorage.getItem('caaBatch') !== null &&
             localStorage.getItem('caaBatch') === CONSTANTS.VERSION) {
            i++;
            requires[1] = 'jQuery';
            requires[2] = 'jQueryUI';
            requires[3] = 'jsjpegmeta';
            requires[4] = 'jscolor';
            requires[5] = 'canvasToBlob';
        } else { /* Scripts are not cached in localStorage, go get them and cache them. */
            makeScript();
            script.src = requires[0];
            script.addEventListener('load', function loader_move_to_next_script () {
                localStorage.setItem('caaBatch', CONSTANTS.VERSION);
                script_loader(1);
            }, true);
            head.appendChild(script);
            return;
        }
        /* Scripts are cached in localStorage; load them. */
        for (var j = 1, k = requires.length; j < k; j++) {
            makeScript();
            script.textContent = localStorage.getItem(requires[j]);
            head.appendChild(script);
        }
        continueLoading();
    })(i || 0);
}();
