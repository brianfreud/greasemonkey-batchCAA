// ==UserScript==
// @name        Testing 1
// @version     0.02.0021
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
// @exclude     http://musicbrainz.org/label/*/*
// ==/UserScript==
/*global console JpegMeta Blob BlobBuilder GM_xmlhttpRequest jscolor requestFileSystem webkitRequestFileSystem TEMPORARY */
/*jshint smarttabs:true, bitwise:false, forin:true, noarg:true, noempty:true, eqeqeq:true, es5:true, expr:true, strict:true, undef:true, curly:true, nonstandard:true, browser:true, jquery:true, maxerr:500, laxbreak:true, newcap:true, laxcomma:true, evil:true */

/* ----------------------------------------------------------------------------------------------------------|

Installation and requirements:

Firefox: Requires version 11 or higher.  Install as normal.  When the script is run the first time, a
confirmation prompt will be displayed.  Make sure to click "accept"!

Chrome: Install script.  Go to settings --> extensions ( chrome://chrome/extensions/ ) and make sure that
the checkbox next to "Allow access to file URLs" for this extension is checked.  Then restart Chrome.  If
you reinstall or upgrade the script, you may need to restart the browser before the script works again.

Opera: Not compatible, sorry.

|------------------------------------------------------------------------------------------------------------|

Translations are handled at https://www.transifex.net/projects/p/CAABatch/

|---------------------------------------------------------------------------------------------------------- */

//TODO: Finish refactoring:
//TODO: Refactor: util.getRemotePage
//TODO: Refactor: util.addRemoteImage
//TODO: Refactor: addImageToDropbox
//TODO: Refactor: convertImage
//------------------------------------
//TODO: Use the persistent parse webpages setting
//TODO: Edit submission
//TODO: Clean up the temp file system after edit submissions and when images are removed
//TODO: Add support for editing MB's existing CAA image data
//TODO: Add support for removing existing CAA images
//TODO: Add support for positioning/repositioning CAA images
//TODO: import images from linked ARs - Discogs, ASIN, other databases, others?  What UI?
//TODO: Handle preview image dimensions when image is really wide.  Test w/ http://paulirish.com/wp-content/uploads/2011/12/mwf-ss.jpg
//TODO: Add webp support for Firefox
//TODO: Apply rotation, if any, after a flip is done in the image editor
//TODO: Resize Images/Preview area on screen resize
//TODO: Fullsize image editor option
//TODO: HSL controls in image editor

if (!document.body) {
	document.body = document.getElementsByTagName('body')[0];
}

/* Initialize constants. */
var OUTERCONTEXT =
	{ CONTEXTS: {}
	, UTILITY:
		{ extend :
			function (objOne, objTwo) {
				'use strict';
				var temp
				  , len
				  ;
				if (!Object.keys(objOne).length) {
					return objTwo;
				}
				if (2 < arguments.length) {
					for (temp = 1, len = arguments.length; temp < len; temp++) {
						this.extend(objOne, arguments[temp]);
					}
				} else {
					Object.keys(objTwo).forEach(function (key) {
						objOne[key] = objTwo[key];
					});
				}
				return objOne;
			}
		, height :
			function get_client_height(id) {
				'use strict';
				return document.getElementById(id).clientHeight;
			}
		}
	};

OUTERCONTEXT.CONSTANTS =
	{ DEBUGMODE: true
	, VERSION: '0.1.1438'
	, NAMESPACE: 'Caabie'
	, DEBUG_VERBOSE: false
	, BORDERS: '1px dotted #808080'
	, COLORS:
		{ ACTIVE     : '#B0C4DE'
		, CAABOX     : '#F2F2FC'
		, CAABUTTONS : '#4B0082'
		, EDITOR     : '#F9F9F9'
		, EDITORMENU : '#D5D5FF'
		, INCOMPLETE : '#FFFF7A'
		, COMPLETE   : '#C1FFC1'
		, REMOVE     : '#B40000'
		, MASK       : '#000'
		}
	, COVERTYPES: /* The order of items in this array matters! */
		[ 'Front'
		, 'Back'
		, 'Booklet'
		, 'Medium'
		, 'Obi'
		, 'Spine'
		, 'Track'
		, 'Other'
		]
	, IESHADOWLVL: 75
	, FILESYSTEMSIZE: 50 /* This indicates the number of megabytes to use for the temporary local file system. */
	, IMAGESIZES: [ 50, 100, 150, 300 ]
	, LANGUAGE: 'en'
	, SIDEBARWIDTH: ( Math.max(window.innerWidth / 500 << 0, 3) * 107 ) + 15
	, SIDEBARHEIGHT: window.innerHeight - OUTERCONTEXT.UTILITY.height( 'header' ) - OUTERCONTEXT.UTILITY.height( 'footer' ) - 25
	, THROBBER: localStorage.getItem( 'throbber' )
	, PREVIEWSIZE: 300
	, IMAGEFORMATS: [ 'bmp', 'gif', 'jpg', 'png' ]
	, BEINGDRAGGED:
		{ OPACITY : '0.4'
		, SHRINK  : '0.7'
		}
	, CREDITS:
		{ 'Developer and programmer':
			[
			  { name: 'Brian Schweitzer (“BrianFreud”)'
			  , urlN: 'userscripts.org/users/28107'
			  , mb  : 'brianfreud'
			  }
			]
		, Translations:
			[
			  { name: 'Calvin Walton (“kepstin”)'
			  , what: 'Canadian English'
			  , urlN: 'www.kepstin.ca'
			  , mb  : 'kepstin'
			  }
			]
		, Icons:
			[
			  { name: '“Mapto”'
			  , what: 'Magnifying glass icons'
			  , urlN: 'commons.wikimedia.org/wiki/User:Mapto'
			  , urlW: 'commons.wikimedia.org/wiki/File:View-zoom-in.svg'
			  }
			, { name: '“Inductiveload”'
			  , what: 'Magnifying glass icons'
			  , urlN: 'commons.wikimedia.org/wiki/User:Inductiveload'
			  , urlW: 'commons.wikimedia.org/wiki/File:View-zoom-out.svg'
			  }
			, { name: '“ablonevn”'
			  , what: 'Gear icon'
			  , urlW: 'www.clker.com/clipart-169255.html'
			  }
			, { name: '“El T”'
			  , what: 'Information icon'
			  , urlN: 'en.wikipedia.org/wiki/User:El_T'
			  , urlW: 'en.wikipedia.org/wiki/File:Information_icon.svg'
			  }
			, { name: 'Timur Gafforov & Avraam Makhmudov'
			  , what: 'Throbber image'
			  , urlW: 'preloaders.net'
			  }
			]
		, Plugins:
			[
			  { name: 'Ben Barnett'
			  , what: 'jQuery.animate-enhanced v0.91'
			  , urlN: 'benbarnett.net'
			  , urlW: 'github.com/benbarnett/jQuery-Animate-Enhanced'
			  }
			, { name: 'Ryan Wheale & Tim Banks'
			  , what: 'jQuery.getHiddenDimensions'
			  , urlN: 'www.foliotek.com/devblog/author/timlanit'
			  , urlW: 'www.foliotek.com/devblog/getting-the-width-of-a-hidden-element-with-jquery-using-width'
			  }
			, { name: 'Brian Schweitzer & Naftali Lubin'
			  , what: 'jQuery.appendAll'
			  }
			, { name: 'James Padolsey'
			  , what: 'jQuery.single'
			  , urlN: 'james.padolsey.com'
			  , urlW: 'james.padolsey.com/javascript/76-bytes-for-faster-jquery'
			  }
			, { name: '“Cowboy” Ben Alman'
			  , what: 'jQuery.detach+ v0.1pre'
			  , urlN: 'benalman.com'
			  , urlW: 'gist.github.com/978520'
			  }
			]
		, Polyfills:
			[
			  { name: 'Eric Bidelman'
			  , what: 'idb.filesystem.js v0.0.1'
			  , urlN: 'ericbidelman.tumblr.com'
			  , urlW: 'github.com/ebidel/idb.filesystem.js'
			  }
			, { name: 'Jan Odvarko'
			  , what: 'jscolor v1.3.13'
			  , urlW: 'jscolor.com'
			  }
			  , { name: 'Jonathan Stipe'
			  , what: 'number polyfill'
			  , urlW: 'github.com/jonstipe/number-polyfill'
			  }
			, { name: 'Sebastian Tschan (“blueimp”)'
			  , what: 'javaScript canvas to blob 2.0'
			  , urlN: 'blueimp.net'
			  , urlW: 'github.com/blueimp/JavaScript-Canvas-to-Blob'
			  }
			]
		, Tools:
			[
			  { name: 'Jeff Schiller'
			  , what: 'Scour'
			  , urlW: 'www.codedread.com/scour'
			  }
			, { name: 'Google'
			  , what: 'Google Closure Compiler'
			  , urlW: 'closure-compiler.appspot.com/home'
			  }
			  , { name: 'Site Project ApS'
			  , what: 'JavaScript string encoder'
			  , urlW: 'www.htmlescape.net/stringescape_tool.html'
			  }
			, { name: 'Yahoo!'
			  , what: 'Yahoo! Query Language'
			  , urlW: 'developer.yahoo.com/yql/'
			  }
			]
		, Libraries:
			[
			  { name: 'Tim Smart'
			  , what: 'data_string function'
			  , urlN: 'github.com/Tim-Smart'
			  , urlW: 'pastebin.ca/1425789'
			  }
			, { name: 'Tyler Akins, Bayron Guevara, Thunder.m, Kevin van Zonneveld, Pellentesque Malesuada, Rafał Kukawski & Brian Schweitzer'
			  , what: 'base64_encode function from PHPJS'
			  , urlN: 'rumkin.com'
			  , urlW: 'phpjs.org/functions/base64_encode'
			  }
			, { name: 'Steven Thurlow (“Stoive”)'
			  , what: 'dataURItoBlob'
			  , urlN: 'github.com/stoive'
			  , urlW: 'stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata'
			  }
			, { name: 'Ben Leslie'
			  , what: 'jsjpegmeta'
			  , urlN: 'benno.id.au/'
			  , urlW: 'code.google.com/p/jsjpegmeta/'
			  }
			, { name: 'John Resig and the rest of the jQuery team'
			  , what: 'jQuery 1.7.2'
			  , urlN: 'jquery.org/team'
			  , urlW: 'jquery.com'
			  }
			, { name: 'The jQueryUI team'
			  , what: 'jQuery UI 1.8.19'
			  , urlN: 'jqueryui.com/about'
			  , urlW: 'jqueryui.com'
			  }
			]
		}
	, TEXT: {
		en: {
			'languageName'               : 'English'
			, 'Add cover art'            : 'Add cover art'
			, 'Add image one release'    : 'Add a box for another image.'
			, 'Bottom'                   : 'Bottom'
			, 'bytes'                    : 'bytes'
			, 'Changed colors note'      : 'Changes to the color settings will take effect the next time that this script is run.'
			, 'Changed language note'    : 'Changes to the language setting will take effect the next time that this script is run.'
			, 'Click to edit this image' : 'Left click to edit this image'
			, 'Colors'                   : 'Colors'
			, 'Crop image'               : 'Crop'
			, 'default'                  : 'default'
			, 'degrees'                  : 'degrees'
			, 'File size'                : 'File size'
			, 'Flip image'               : 'Flip'
			, 'How dark the bkgrnd'      : 'Image editor shadow'
			, 'How many degrees'         : 'How many degrees to rotate the image'
			, '(Image) Resolution'       : 'Resolution'
			, 'Images'                   : 'Images'
			, 'Language'                 : 'Language'
			, 'Left'                     : 'Left'
			, 'Load CAA images for all'  : 'Load image data for all releases'
			, 'Load CAA images'          : 'Load image data for this release'
			, 'loading'                  : 'Loading data from the Cover Art Archive, please wait...'
			, 'Load text all releases'   : 'Loads images for all displayed releases.'
			, 'Load text one release'    : 'Loads any images already in the Cover Art Archive for this release.'
			, 'Crop mask color'          : 'Mask color'
			, 'Magnify image'            : 'Zoom in'
			, 'Options'                  : 'Options'
			, 'Parse (help)'             : 'Check this box to enable parsing web pages whenever you drop in a link to a web page or a list of webpage URLs.'
			, 'Parse web pages'          : 'Parse web pages'
			, 'Preview Image'            : 'Preview'
			, 'Remove (help)'            : 'Check this box, then click on images to remove them.  Uncheck the box again to turn off remove image mode.'
			, 'Remove image'             : 'Click to remove this image'
			, 'Remove images'            : 'Remove images mode'
			, 'Remove stored images nfo' : 'This removes any images from other websites that you have stored while this script was not running.'
			, 'Remove stored images'     : 'Remove stored images'
			, 'Right'                    : 'Right'
			, 'Rotate image'             : 'Rotate'
			, 'Shrink image'             : 'Zoom out'
			, 'Submit as autoedits'      : 'Submit edits as autoedits'
			, 'Submit edits'             : 'Submit edits'
			, 'take effect next time'    : 'Changes to the language and color settings will take effect the next time that this script is run.'
			, 'Top'                      : 'Top'
			, 'Version'                  : 'Version'
			, 'coverType:Back'           : 'Back'
			, 'coverType:Booklet'        : 'Booklet'
			, 'coverType:Front'          : 'Front'
			, 'coverType:Medium'         : 'Medium'
			, 'coverType:Obi'            : 'Obi'
			, 'coverType:Other'          : 'Other'
			, 'coverType:Spine'          : 'Spine'
			, 'coverType:Track'          : 'Track'
			, 'About'                    : 'About'
			, 'Developer and programmer' : 'Developer and programmer'
			, 'Icons'                    : 'Icons'
			, 'Plugins'                  : 'Plugins'
			, 'Polyfills'                : 'Polyfills'
			, 'Translations'             : 'Translations'
			, 'Tools'                    : 'Tools'
			, 'Libraries'                : 'Libraries'
			, 'Save'                     : 'Save'
			, 'Save changes'             : 'Save changes'
			, 'Cancel'                   : 'Cancel'
			, 'Error'                    : 'Error'
			, 'Error too much cropping'  : 'Cropping this much would remove the entire image!'
			, 'Apply'                    : 'Apply'
			, 'ACTIVE'                   : 'Droppable area'
			, 'CAABOX'                   : 'Empty CAA box'
			, 'CAABUTTONS'               : 'Load CAA buttons'
			, 'EDITOR'                   : 'Image editor background'
			, 'EDITORMENU'               : 'Image editor menu'
			, 'INCOMPLETE'               : 'Incomplete edits'
			, 'COMPLETE'                 : 'Edits ready to submit'
			, 'REMOVE'                   : 'Remove image highlight'
			, 'MASK'                     : 'Default crop mask color'
		}
	}
};

/* Special case Canadian English. */
OUTERCONTEXT.CONSTANTS.TEXT['en-ca'] = JSON.parse(JSON.stringify(OUTERCONTEXT.CONSTANTS.TEXT.en));
OUTERCONTEXT.UTILITY.extend( OUTERCONTEXT.CONSTANTS.TEXT['en-ca'],
	                         { 'languageName': 'English (Canadian)'
	                         , 'Colors': 'Colours'
	                         , 'Changed colors note': OUTERCONTEXT.CONSTANTS.TEXT['en-ca']['Changed colors note'].replace('color', 'colour')
	                         , 'take effect next time': OUTERCONTEXT.CONSTANTS.TEXT['en-ca']['take effect next time'].replace('color', 'colour')
	                         }
	                       );


/* Conditionally add the debug "language". */
if (OUTERCONTEXT.CONSTANTS.DEBUGMODE) {
	OUTERCONTEXT.CONSTANTS.TEXT.test =
		{ strings: {}
		, generateMorse:
			function() {
				'use strict';
				var chars = [' ', '-', '·']
					, morseString = ''
					, repeats = Math.random() * 50 >> 0;
				while (repeats--) {
					morseString += chars[Math.random() * 3 >> 0];
				}
				return morseString;
			}
		, init:
			function() {
				'use strict';
				var self = this;
				Object.keys(OUTERCONTEXT.CONSTANTS.TEXT.en).forEach(function(text) {
					self.strings[text] = self.generateMorse();
				});
				this.strings.languageName = 'pseudo-Morse code';
				return this.strings;
			}
		}.init();
}

OUTERCONTEXT.UTILITY.extend( OUTERCONTEXT.UTILITY,
	                         { getColor:
		                         // Gets a color value stored in localStorage.
		                         function getColor(colors, color) {
			                         'use strict';
			                         var thisColor = localStorage.getItem('Caabie_colors_' + color);

			                         if (arguments.length === 1) {
				                         color = colors;
				                         colors = OUTERCONTEXT.CONSTANTS.COLORS;
			                         }

			                         thisColor === null && (thisColor = colors[color]);
			                         return thisColor;
		                         }
		                     , hexToRGBA:
		                         // Converts a hex color string into an rgba color string
		                         function hexToRGBA(hex, opacity) {
			                         'use strict';
			                         hex = ('#' === hex.charAt(0) ? hex.substring(1, 7) : hex);

			                         var R = parseInt(hex.substring(0, 2), 16)
			                           , G = parseInt(hex.substring(2, 4), 16)
			                           , B = parseInt(hex.substring(4, 6), 16)
			                           ;
			
			                         return 'rgba(' + [R, G, B, opacity || 1].join(',') + ')';
		                         }
	                         }
	                       );

/* Define repeated css strings used while defining the CSS constants. */
OUTERCONTEXT.CSSSTRINGS = { SHRINK : ['scale', '(', OUTERCONTEXT.CONSTANTS.BEINGDRAGGED.SHRINK, ')'].join('') };

/* Initialize CSS constants which are persistantly stored in localStorage. */
null === localStorage.getItem('Caabie_editorShadow') && localStorage.setItem('Caabie_editorShadow', 75);

/* Define the CSS constants. */
OUTERCONTEXT.CONSTANTS.CSS =
	{ '#Options‿input‿color‿colors, #CAAeditorSaveImageBtn, #CAAeditorCancelBtn, #CAAeditorApplyCropBtn':
		{ 'background-color'       : '#DDD'
		}
	, '.CAAversion':
		{ 'float'                  : 'right'
		, 'font-size'              : '75%'
		, 'margin-top'             : '-15px'
		}
	, '#Options‿input‿color‿colors, #CAAeditorMaskColorControl':
		{  border                  : '1px outset #D3D3D3'
		}
	, '#Options‿select‿colors':
		{ 'float'                  : 'left'
		,  padding                 : '5px'
		,  width                   : '202px'
		}
	, '#Options‿input‿number‿shadow':
		{ 'margin-left'            : '5px'
		,  width                   : '3.5em'
		}
	, '#Options‿label‿shadow::after':
		{  content                 : '"%"'
		}
	, '#CAAeditorCanvas':
		{ 'background-color'       : '#FFF'
		}
	, '#CAAeditorRotateControl':
		{ 'margin-right'           : '2px'
		,  width                   : '4em'
		}
	, '#CAAeditorMenu':
		{ 'background-color'       : OUTERCONTEXT.UTILITY.getColor('EDITORMENU')
		, 'border-radius'          : '20px'
		,  border                  : '1px dotted navy'
		,  height                  : '60%'
		,  padding                 : '16px'
		,  position                : 'absolute'
		,  right                   : '40px'
		,  top                     : '20%'
		}
	, '#CAAeditorCanvasDiv':
		{  position                : 'relative'
		}
	, '.CAAmask':
		{  position                : 'absolute'
		,  height                  : 0
		,  width                   : 0
		}
	, '#CAAmaskLeft, #CAAmaskRight':
		{  height                  : '100%'
		}
	, '#CAAmaskTop, #CAAmaskBottom':
		{  width                   : '100%'
		}
	, '#CAAmaskLeft':
		{ 'z-index'                : 300
		,  left                    : 0
		,  top                     : 0
		}
	, '#CAAmaskRight':
		{ 'z-index'                : 301
		,  right                   : 0
		,  top                     : 0
		}
	, '#CAAmaskTop':
		{ 'z-index'                : 302
		,  left                    : 0
		,  top                     : 0
		}
	, '#CAAmaskBottom':
		{ 'z-index'                : 303
		,  left                    : 0
		,  bottom                  : 0
		}
	, '.cropLabel':
		{  clear                   : 'both'
		,  display                 : 'block'
		, 'margin-bottom'          : '4px'
		}
	, '.cropControl':
		{  height                  : '24px'
		,  margin                  : '0 4px 2px 0!important'
		, 'vertical-align'         : 'middle'
		,  width                   : '45px'
		}
	, '.flipControl':
		{ 'border-radius'          : '21px'
		, 'border-width'           : '1px'
		, 'font-size'              : '130%'
		, 'font-weight':            600
		,  padding                 : '0px 15px'
		}
	, '#Options‿div‿shadow':
		{  display                 : 'inline-block'
		}
	, '#Main‿div‿imageContainer':
		{  height                  : (OUTERCONTEXT.CONSTANTS.SIDEBARHEIGHT - 25) + 'px'
		, 'max-height'             : (OUTERCONTEXT.CONSTANTS.SIDEBARHEIGHT - 25) + 'px'
		}
	, '#Main‿div‿imageHolder':
		{ 'margin-bottom'          : '1em'
		, 'overflow-y'             : 'auto'
		,  width                   : '100%'
		}
	, '#Main‿h1‿imageHeader':
		{ 'float'                  : 'left'
		,  width                   : '30%'
		}
	, '#Main‿div‿image_size':
		{ 'float'                  : 'right'
		, 'height'                 : '24px'
		,  width                   : '25%'
		}
	, '#Options‿select‿language':
		{  height                  : '5em'
		,  margin                  : '10px 10px -27px 6px'
		,  padding                 : '6px'
		}
	, '#Main‿div‿options_control, #Main‿div‿about_control':
		{  display                 : 'inline-block'
		, 'float'                  : 'right'
		,  opacity                 : '0.4'
		}
	, '#Main‿div‿options_control':
		{ 'margin-right'           : '-26px'
		, 'margin-top'             : '-3px'
		}
	, '#Main‿div‿about_control':
		{ 'margin-top'             : '-1px'
		,  height                  : '23px'
		,  width                   : '23px'
		}
	, '#Options‿fieldset‿main, #About‿fieldset‿main':
		{  border                  : '1px solid #D3D3D3'
		, 'border-radius'          : '8px'
		, 'line-height'            : '2!important'
		,  margin                  : '10px 3px'
		,  padding                 : '8px'
		}
	, '#Options‿fieldset‿main * select':
		{ 'font-size'              : '105%'
		}
	, '#Options‿fieldset‿main > label > select':
		{  padding                 : '3px'
		}
	, '#Options‿fieldset‿main > label, #Options‿fieldset‿main > label > select':
		{ 'margin-left'            : '5px'
		, 'margin-top'             : '5px'
		}
	, '#Options‿div‿note':
		{ 'font-size'              : '85%'
		, 'font-style'             : 'oblique'
		}
	, '#page':
		{ 'min-height'             : (OUTERCONTEXT.CONSTANTS.SIDEBARHEIGHT - 50) + 'px'
		}
	, '#Preview‿dl‿info':
		{ 'line-height'            : '140%'
		,  margin                  : '0 auto'
		, 'padding-top'            : '10px'
		,  width                   : '60%'
		}
	, '#Preview‿dl‿info > dd':
		{ 'float'                  : 'right'
		}
	, '#triggerLink':
		{ 'cursor'                 : 'pointer'
		}
	, '#xhrComlink':
		{  display                 : 'none'
		}
	, '#CAAoverlay':
		{  background              : '#000'
		,  bottom                  : 0
		,  left                    : 0
		,  opacity                 : localStorage.getItem('Caabie_editorShadow') / 100
		,  position                : 'fixed'
		,  top                     : 0
		,  width                   : '100%'
		, 'z-index'                : 400
		}
	, '#CAAimageEditor':
		{ 'background-color'       : OUTERCONTEXT.UTILITY.getColor('EDITOR')
		, 'box-shadow'             : 'inset 0 0 10px #FFF, 2px 2px 8px 3px #111'
		,  border                  : '1px outset grey'
		, 'border-radius'          : '20px'
		,  height                  : '86%'
		,  left                    : '50%'
		,  margin                  : '0 auto'
		, 'margin-left'            : '-43%'
		, 'margin-top'             : '5%'
		,  padding                 : '2%'
		,  position                : 'fixed'
		,  width                   : '86%'
		, 'z-index'                : 500
		}
	, '#CAAeditorDiv':
		{  height                  : '96%'
		,  margin                  : '2%'
		,  width                   : '96%'
		}
	, '.beingDragged':
		{  opacity                 : OUTERCONTEXT.CONSTANTS.BEINGDRAGGED.OPACITY
		,  transform               : OUTERCONTEXT.CSSSTRINGS.SHRINK
		}
	, '.CAAdropbox':
		{ 'border-radius'          : '6px'
		,  display                 : 'inline-block'
		,  margin                  : '6px'
		, 'min-height'             : '126px'
		,  padding                 : '3px'
		, 'vertical-align'         : 'middle'
		,  width                   : '126px'
		}
	, '.CAAdropbox > div':
		{  display                 : 'block'
		,  height                  : '120px'
		,  margin                  : '3px auto'
		}
	, '.CAAdropbox > div > img':
		{  display                 : 'block'
		, 'image-rendering'        : 'optimizeQuality'
		,  margin                  : '0 auto'
		, 'max-height'             : '120px'
		, 'max-width'              : '120px'
		}
	, '.CAAdropbox > figcaption':
		{  height                  : '15em'
		,  position                : 'relative'
		, 'text-align'             : 'center'
		}
	, '.CAAdropbox > figcaption > div':
		{ 'font-size'              : '80%'
		,  height                  : '2.5em'
		}
	, '.CAAdropbox > figcaption > input':
		{ 'font-size'              : '12px'
		,  width                   : '90%'
		}
	, '.CAAdropbox > figcaption > input, .CAAdropbox > figcaption > div':
		{  clear                   : 'both'
		}
	, '.CAAdropbox > figcaption > select':
		{ 'background-color'       : 'transparent'
		,  clear                   : 'both'
		,  clip                    : 'rect(2px, 49px, 145px, 2px)'
		,  color                   : '#555'
		, 'font-size'              : 'inherit'
		,  left                    : '36px'
		, 'padding-bottom'         : '20px'
		, 'padding-right'          : '20px'
		, 'padding-top'            : '8px'
		,  position                : 'absolute'
		, 'text-align'             : 'center'
		}
	, '.caaAdd':
		{ 'background-color'       : 'green!important'
		,  border                  : '0 none #FAFAFA!important'
		, 'border-radius'          : '7px'
		,  color                   : '#FFF!important'
		, 'float'                  : 'left'
		, 'font-size'              : '175%'
		, 'font-weight'            : '900!important'
		,  left                    : '2em'
		, 'margin-left'            : '-1.2em'
		,  opacity                 : '0.3'
		, 'padding-bottom'         : 0
		, 'padding-top'            : 0
		,  position                : 'absolute'
		}
	, '.caaAdd:active, .caaAll:active, .caaLoad:active':
		{ 'border-style'           : 'inset!important'
		,  color                   : '#FFF'
		,  opacity                 : 1
		}
	, '.caaAdd:hover, .caaAll:hover, .caaLoad:hover':
		{  color                   : '#D3D3D3'
		,  opacity                 : '.9'
		}
	, '.caaDiv':
		{  display                 : 'inline-block'
		, 'overflow-x'             : 'auto!important'
		, 'padding-left'           : '25px'
		, 'white-space'            : 'nowrap'
		,  width                   : '100%'
		}
	, '.caaLoad, .caaAll':
		{ 'background-color'       : OUTERCONTEXT.UTILITY.getColor('CAABUTTONS') + '!important'
		,  border                  : '1px outset #FAFAFA!important'
		, 'border-radius'          : '7px'
		,  color                   : '#FFF!important'
		, 'font-size'              : '90%'
		, 'margin-bottom'          : '16px'
		, 'margin-top'             : '1px!important'
		,  opacity                 : '.35'
		,  padding                 : '3px 8px'
		}
	, '.caaMBCredit':
		{ 'font-size'              : '85%'
		, 'white-space'            : 'nowrap'
		}
	, '.newCAAimage':
		{ 'background-color'       : OUTERCONTEXT.UTILITY.getColor('CAABOX')
		}
	, '.newCAAimage > div':
		{ 'background-color'       : '#E0E0FF'
		,  border                  : OUTERCONTEXT.CONSTANTS.BORDERS
		, 'margin-bottom'          : '6px!important'
		}
	, '.tintWrapper':
		{ 'background-color'       : OUTERCONTEXT.UTILITY.hexToRGBA(OUTERCONTEXT.UTILITY.getColor('REMOVE'), '0.8')
		, 'border-radius'          : '5px'
		,  display                 : 'inline-block'
		,  margin                  : 0
		,  opacity                 : '0.8'
		,  outline                 : 0
		,  padding                 : 0
		, 'vertical-align'         : 'baseline'
		}
	, '#Main‿div‿previewContainer':
		{  bottom                  : 0
		, 'border-top'             : OUTERCONTEXT.CONSTANTS.BORDERS
		,  height                  : (OUTERCONTEXT.CONSTANTS.PREVIEWSIZE + 59) + 'px'
		, 'max-height'             : (OUTERCONTEXT.CONSTANTS.PREVIEWSIZE + 59) + 'px'
		, 'padding-top'            : '1em'
		,  position                : 'absolute'
		}
	, '#Preview‿img‿preview_image':
		{  cursor                  : 'pointer'
		,  display                 : 'block'
		,  height                  : (OUTERCONTEXT.CONSTANTS.PREVIEWSIZE + 15) + 'px'
		,  margin                  : '0 auto'
		, 'max-height'             : (OUTERCONTEXT.CONSTANTS.PREVIEWSIZE + 15) + 'px'
		,  padding                 : '15px 0 0 0'
		}
	, '.CAAsidebar':
		{ 'border-left'            : OUTERCONTEXT.CONSTANTS.BORDERS
		, 'padding-left'           : '8px'
		,  position                : 'fixed'
		,  right                   : '20px'
		,  width                   : OUTERCONTEXT.CONSTANTS.SIDEBARWIDTH + 'px!important'
		}
	, '.CAAcreditWho':
		{ 'text-indent'            : '-2em'
		}
	, '.closeButton':
		{ 'background-color'       : '#FFD0DB'
		,  border                  : '1px solid #EEC9C8'
		, 'border-radius'          : '8px'
		,  cursor                  : 'pointer'
		, 'float'                  : 'right'
		, 'line-height'            : '.8em'
		, 'margin-right'           : '-1em'
		, 'margin-top'             : '-.95em'
		,  opacity                 : '0.9'
		,  padding                 : '2px 4px 5px'
		}
	, '.closeButton:hover':
		{ 'background-color'       : '#FF82AB'
		, 'font-weight'            : 900
		,  opacity                 : 1
		}
	, '.existingCAAimage':
		{ 'background-color'       : '#FFF'
		,  border                  : '0 none'
		}
	, '.existingCAAimage > div > img':
		{  border                  : '0 none'
		, 'image-rendering'        : 'optimizeQuality'
		}
	, '.imageRow':
		{ 'padding-bottom'         : '1em!important'
		}
	, '.imageSizeControl, #Main‿div‿options_control, #Main‿div‿about_control':
		{  cursor                  : 'pointer'
		, 'float'                  : 'right'
		}
	, '.imageSizeControl, #Main‿div‿options_control':
		{  height                  : '26px'
		,  width                   : '26px'
		}
	, '.imageSizeControl:hover, #Main‿div‿options_control:hover, #Main‿div‿about_control:hover':
		{  opacity                 : 1
		}
	, '.localImage':
		{  padding                 : '3px'
		, 'vertical-align'         : 'top'
		}
	, '.newCAAimage > div > img':
		{ 'min-height'             : '120px'
		, 'image-rendering'        : 'optimizeQuality'
		}
	, '.over':
		{ 'background-color'       : OUTERCONTEXT.UTILITY.getColor('ACTIVE')
		}
	, '.previewDT':
		{  clear                   : 'left'
		, 'float'                  : 'left'
		, 'font-weight'            : 700
		}
	, '.previewDT::after, #About‿fieldset‿main * dt::after':
		{  color                   : '#000'
		,  content                 : '": "'
		}
	, '#About‿fieldset‿main * dt::before':
		{  color                   : '#000'
		,  content                 : '" • "'
		}
	, '.tintImage, .imageSizeControl':
		{  opacity                 : '0.4'
		}
	, '.workingCAAimage':
		{ 'padding-left'           : '1px'
		, 'padding-right'          : '1px'
		}
	, '.workingCAAimage > div':
		{ 'margin-bottom'          : '8px!important'
		}
	, 'div.loadingDiv > img':
		{  height                  : '30px'
		, 'image-rendering'        : 'optimizeQuality'
		, 'padding-right'          : '10px'
		,  width                   : '30px'
		}
	, 'fieldset':
		{  border                  : '1px solid #D3D3D3'
		, 'border-radius'          : '8px'
		,  margin                  : '30px -4px 7px'
		,  padding                 : '6px'
		}
	, '#CAAeditorMenu > fieldset':
		{  border                  : 'none'
		,  margin                  : '16px -4px 7px'
		}
	, 'figure':
		{  border                  : OUTERCONTEXT.CONSTANTS.BORDERS
		}
	, 'input[type="color"]':
		{  padding                 : 0
		}
	, 'input[type="color"], #Options‿input‿button‿colors, #Options‿input‿button‿clear_storage, #CAAeditorSaveImageBtn, #CAAeditorCancelBtn, #CAAeditorApplyCropBtn':
		{  border                  : '1px outset #EEE!important'
		, 'border-radius'          : '6px'
		,  cursor                  : 'pointer'
		, 'font-family'            : 'Bitstream Vera Sans, Verdana, Arial, sans-serif'
		, 'font-size'              : '100%'
		, 'margin-right'           : 0
		, 'outline'                : 'none'
		,  padding                 : '3px'
		, 'text-align'             : 'center'
		}
	, '#Options‿input‿button‿clear_storage':
		{ 'background-color'       : 'red'
		,  color                   : '#FFF'
		, 'font-weight'            : 700
		,  opacity                 : '.7'
		,  width                   : '190px'
		}
	, '#Options‿input‿button‿colors':
		{ 'background-color'       : 'lightgray'
		}
	, '#Options‿input‿button‿clear_storage:disabled':
		{ 'background-color'       : 'grey'
		,  color                   : '#000'
		, 'text-decoration'        : 'line-through'
		}
	, '#Options‿input‿color‿colors, #Options‿input‿button‿colors, #CAAeditorSaveImageBtn, #CAAeditorCancelBtn, #CAAeditorApplyCropBtn':
		{ 'float'                  : 'right'
		,  width                   : '79px'
		}
	, '#Options‿input‿color‿colors:active, #Options‿input‿button‿colors:active, #Options‿input‿button‿clear_storage:active, #CAAeditorMaskColorControl:active, #CAAeditorSaveImageBtn:active, #CAAeditorCancelBtn:active, #CAAeditorApplyCropBtn:active':
		{  border                  : '1px inset #D3D3D3'
		,  opacity                 : 1
		}
	, 'legend':
		{ color                    : '#000!important'
		, 'font-size'              : '110%!important'
		, 'font-variant'           : 'small-caps'
		}
	, 'table.tbl * table, #Main‿div‿imageContainer, #Main‿div‿previewContainer':
		{  width                   : '100%'
		}
	, 'table.tbl .count':
		{  width                   : '6em!important'
		}
	, 'h4':
		{ 'font-size'              : '115%'
		}
	, 'h5':
		{ 'margin-after'           : 0
		, 'margin-before'          : '1em'
		}
	, '#About‿fieldset‿main * h5':
		{ 'font-size'              : '100%'
		}
	, '#About‿fieldset‿main * dd':
		{ 'padding-bottom'         : '5px'
		}
	, '#About‿h4‿1':
		{ 'margin-top'             : 0
		}

	/* css for the number polyfill */
	, 'div.number-spin-btn-container':
		{  display                 : 'inline-block'
		,  margin                  : 0
		,  padding                 : 0
		,  position                : 'relative'
		, 'vertical-align'         : 'bottom'
		}
	, 'div.number-spin-btn':
		{ 'background-color'       : '#CCCCCC'
		,  border                  : '2px outset #CCCCCC'
		,  height                  : '11.5px!important'
		,  width                   : '1.2em'
		}
	, 'div.number-spin-btn-up':
		{ 'border-bottom-width'    : '1px'
		, 'border-radius'          : '3px 3px 0px 0px'
		}
	, 'div.number-spin-btn-up:before':
		{  content                 : '""'
		, 'border-color'           : 'transparent transparent #000 transparent'
		, 'border-style'           : 'solid'
		, 'border-width'           : '0 0.3em 0.3em 0.3em'
		,  height                  : 0
		,  left                    : '50%'
		,  margin                  : '-0.15em 0 0 -0.3em'
		,  padding                 : 0
		,  position                : 'absolute'
		,  top                     : '25%'
		,  width                   : 0
		}
	, 'div.number-spin-btn-down':
		{ 'border-radius'          : '0px 0px 3px 3px'
		, 'border-top-width'       : '1px'
		}
	, 'div.number-spin-btn-down:before':
		{  content                 : '""'
		,  width                   : 0
		,  height                  : 0
		, 'border-width'           : '0.3em 0.3em 0 0.3em'
		, 'border-style'           : 'solid'
		, 'border-color'           : '#000 transparent transparent transparent'
		,  position                : 'absolute'
		,  top                     : '75%'
		,  left                    : '50%'
		,  margin                  : '-0.15em 0 0 -0.3em'
		,  padding                 : 0
		}
	, 'div.number-spin-btn:hover':
		{  cursor                  : 'pointer'
		}
	, 'div.number-spin-btn:active':
		{ 'background-color'       : '#999999'
		,  border                  : '2px inset #999999'
		}
	, 'div.number-spin-btn-up:active:before':
		{ 'border-color'           : 'transparent transparent #FFF transparent'
		,  left                    : '51%'
		,  top                     : '26%'
		}
	, 'div.number-spin-btn-down:active:before':
		{ 'border-color'           : '#FFF transparent transparent transparent'
		,  left                    : '51%'
		,  top                     : '76%'
	}
};

/* START remote file accessor functions.  This *has* to happen before main_loader() starts the rest of the script, so that the
   event handler already exists when the other javascript context is created.  It cannot happen as part of main() itself, as that
   new context loses the special permissions granted to userscripts, and thus does not have access to GM_xmlhttpRequest. */

/* Create a hidden div which will be used to pass messages between javascript security contexts. */
OUTERCONTEXT.COMLINK = { messageDiv : document.createElement('div') };
OUTERCONTEXT.COMLINK.messageDiv.id = 'xhrComlink';
document.body.appendChild(OUTERCONTEXT.COMLINK.messageDiv);

/* When a click event alerts the code that a new link is in the communications div, read that link's uri out of the linked span.
   Then convert the binary file into a base64 string, and replace the contents of the linked span with the base64 string.  Finally,
   trigger a doubleclick event to let the other halves of this code, in the other javascript context, know that the file data has
   been retrieved. */
OUTERCONTEXT.COMLINK.getUri = function getURI (e) {
	'use strict';

	// START from http://phpjs.org
	var base64_encode = function base64_encode(data) {
		// http://kevin.vanzonneveld.net
		// + original by: Tyler Akins (http://rumkin.com)
		// + improved by: Bayron Guevara
		// + improved by: Thunder.m
		// + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// + bugfixed by: Pellentesque Malesuada
		// + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
		// + improved by: Rafał Kukawski (http://kukawski.pl)
		// + improved by: Brian Schweitzer
		// * example 1: base64_encode('Kevin van Zonneveld');
		// * returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
		// mozilla has this native
		// - but breaks in 2.0.0.12!
		//}
		var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".split('');
		var o1, o2, o3, h1, h2, h3, bits, i = 0,
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
			bits &= 0x3f;

			// use hexets to index into b64, and append result to encoded string
			tmp_arr.push([b64[h1], b64[h2], b64[h3], b64[bits]].join(''));
		} while (i < data.length);
		enc = tmp_arr.join('');
		o1 = data.length % 3;
		return (o1 ? enc.slice(0, o1 - 3) : enc) + '==='.slice(o1 || 3);
	};
	// END (phpjs.org)

	// START from Tim Smart at http://pastebin.ca/1425789
	var data_string = function data_string(data) {
		// Generate a binary data string from character / multibyte data
		for (var binary_string = '', i = 0, len = data.length; i < len; i++) {
			binary_string += String.fromCharCode(data[i].charCodeAt(0) & 0xff);
		}
		return binary_string;
	};
	// END (Tim Smart)

	var bin2base64 = function bin2base64 (binary) {
		return base64_encode(data_string(binary));
	};

	var storeRetrievedFile = function storeRetrievedFile(response) {
		var base64File
		  , thisComlink = e.target
		  , evt         = document.createEvent("MouseEvents")
		  ;

		thisComlink.innerHTML = '';
		thisComlink.appendChild( document.createTextNode( bin2base64(response.responseText) ) );

		evt.initMouseEvent("dblclick", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		thisComlink.dispatchEvent(evt);
	};

	var gm_xmlhttpRequest = GM_xmlhttpRequest; // Workaround to jshint, since GM_xmlhttpRequest looks like a constructor to jshint.
	gm_xmlhttpRequest({ method           : 'GET'
	                  , overrideMimeType : 'text/plain; charset=x-user-defined'
	                  , onload           : storeRetrievedFile
	                  , url              : e.target.innerHTML
	                  });
};

OUTERCONTEXT.COMLINK.getUriWorkaround = function getUriWorkaround (e) {
// This works around http://wiki.greasespot.net/0.7.20080121.0_compatibility in Firefox
	'use strict';
	setTimeout(function getUriWorkaround_internal () {
		OUTERCONTEXT.COMLINK.getUri(e);
	}, 0);
};

/* Create an event listener, in the priviledged userscript context, which will listen for new uri additions to the xhrComlink div.
   This cannot use custom events, as they would only exist in one of the two javascript contexts. */
OUTERCONTEXT.COMLINK.messageDiv.addEventListener('click', OUTERCONTEXT.COMLINK.getUriWorkaround, true);

/* END remote file accessor functions. */

OUTERCONTEXT.CONTEXTS.INNER = function INNER ($, INNERCONTEXT) {
	'use strict';

	$.log('Script initializing.');

	INNERCONTEXT.UTILITY.extend(INNERCONTEXT,
		{ DATA      : {}
		, DOM       : { body       : $(document.body)
		              , head       : $(document.head)
		              , xhrComlink : $('#xhrComlink')
                      }
		, TEMPLATES : { MENUS : {} }
		}
	);

	INNERCONTEXT.UTILITY.extend(INNERCONTEXT.UTILITY, {
		addClass : function addClass (e) {
			$.single( this ).addClass(e.data['class']);
		},

		addCommas : function addCommas (numberString) {
			// Converts a number into a comma-separated string.
			$.log('Inserting commas.');

			var x  = ('' + numberString).split('.')
			  , x1 = x[0]
			  , x2 = x.length > 1 ? '.' + x[1] : ''
			  , separatorRegexp = /(\d+)(\d{3})/
			  ;

			while (separatorRegexp.test(x1)) {
				x1 = x1.replace(separatorRegexp, '$1' + ',' + '$2');
			}
			return x1 + x2;
		},

		antiSquish: function antiSquish (init) {
			/* http://musicbrainz.org/artist/{mbid} does not set a width for the title or checkbox columns.
			   This prevents those columns getting squished when the table-layout is set to fixed layout. */
			$.log('AntiSquishing...', 1);

			var rules = [];

			void 0 !== init && $('.CAAantiSquish').remove();
			$('th.pos').remove();
			for (var $th = $(document.getElementsByTagName('th')), i = 0, len = $th.length; i < len; i++) {
				rules.push(
					[ 'thead > tr > th:nth-child(', (i + 1), ')'
					, '{ width:', ($th.quickWidth(i) + 10), 'px!important;}'
					].join('')
				);
			}
			$.addRule(rules.join(''), '', { 'class': 'CAAantiSquish' });
		},

		adjustContainerHeights : function adjustContainerHeights () {
			var containerHeight = $('#Main‿div‿imageContainer').height() - $('#Main‿div‿previewContainer').height() - 42 + 'px';
			$('#Main‿div‿imageHolder').css({ 'height'     : containerHeight
			                                , 'max-height' : containerHeight
			                                });
		},

		assemble : function assemble (constructor, components) {
			var eles = []
			  , children
			  ;

			if (void 0 === components) {
				components = constructor;
				constructor = 'GenericElement';
			}

			components.length > 0 && components.forEach(function (component) {
				if (component.constructor === Array && eles.length > 0) {
					eles[eles.length-1].appendAll( INNERCONTEXT.UTILITY.assemble(constructor, component) );
				} else if (component.constructor === $) {
					eles.push( component );
				} else {
					eles.push( INNERCONTEXT.UI[constructor](component).make() );
				}
			});
			return eles;
		},

		changeImageSize : function changeImageSize (e) {
			var $shrink    = INNERCONTEXT.DOM['Main‿div‿imageShrink']
			  , $magnify   = INNERCONTEXT.DOM['Main‿div‿imageMagnify']
			  , data       = INNERCONTEXT.DATA
			  ;

			data.sizeStatus += e.data.change;

			switch (data.sizeStatus) {
				case 0: data.sizeStatus = 1;
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
				case 5: data.sizeStatus = 4;
						/* falls through */
				case 4:
						$shrink.vis(1);
						$magnify.vis(0);
						$.imagesLarge();
						break;
			}
		},

		checkScroll : function checkScroll ($caaDiv) {
			// This function ensures that the horizontal scrollbar on CAA rows only shows when it needs to.
			$.log('Adjusting negative right margin.', 1);

			void 0 === $caaDiv.data('width') && $caaDiv.data('width', $caaDiv.quickWidth(0));
			var $parents   = $caaDiv.parents()
			  , $dropboxes = $caaDiv.find('.CAAdropbox')
			  , divWidth   = $dropboxes.length * $dropboxes.filter(':first').outerWidth(true)
			  ;

			$caaDiv.css('margin-right', Math.min(0, $caaDiv.data('width') - divWidth - 115) + 'px');
			$parents.filter('td.imageRow').css('width', $parents.filter('.tbl:first').outerWidth(true) + 'px');
		},

		clearImageStore : function clearImageStore () {
			INNERCONTEXT.UTILITY.setLSValue('imageCache', '[]');
			INNERCONTEXT.DOM['Options‿input‿button‿clear_storage'].prop('disabled', true);
			INNERCONTEXT.DATA.cachedImages = [];
		},

		closeDialogGeneric : function closeDialogGeneric (e) {
			$.single( this ).parent()
			              .find('.dropBoxImage') // Any image in the drop box
			              .appendTo($('#Main‿div‿imageContainer'))
			              .addClass('localImage')
			              .removeClass('dropBoxImage');
			INNERCONTEXT.UTILITY.removeWrappedElement(e);
		},

		closeDialogImageEditor : function closeDialogImageEditor (e) {
			$('#CAAimageEditor').animate({ height  : 'toggle'
			                             , opacity : 'toggle'
			                             }, 'slow');
			$('#CAAoverlay').fadeOut('fast');
			$('#CAAimageEditor, #CAAoverlay').remove();
			INNERCONTEXT.UTILITY.closeDialogGeneric(e);
		},

		getEditColor : function getEditColor ($ele) {
			// Checks that an editbox has both an image and a cover type.  Returns the associated color for the current editbox' status.
			$.log('Testing edit status to determine background color for dropbox.');

			var state = ($ele.find(':selected').length && $ele.find('img').hasProp('src'));
			return INNERCONTEXT.UTILITY.getColor(state ? 'COMPLETE' : 'INCOMPLETE');
		},

		getLSValue : function getLSValue (key, unprefixed) {
			var storedValue = INNERCONTEXT.DATA[key];

			if (!storedValue) {
				var lsKey = !unprefixed ? [INNERCONTEXT.CONSTANTS.NAMESPACE, '_', key].join('') : key;
				storedValue = INNERCONTEXT.DATA[key] = localStorage.getItem(lsKey);
			}

			return storedValue;
		},
		
		getRemoteFile : function getRemoteFile (uri, imageType) {
			$.make('pre', { 'class'     : 'image' })
			 .data({ 'uri'  : uri
			       , 'type' : imageType || 'jpg'
			       })
			 .text(uri)
			 .appendTo('#xhrComlink')
			 .trigger('click');
			// At this point, the event handler for #xhrComlink, in the other javascript scope, takes over.
		},

		handleDroppedResources : function handleDroppedResources (e) {
			var $util        = INNERCONTEXT.UTILITY
			  , dataTransfer = e.dataTransfer
			  , getData      = dataTransfer.getData
			  , getText      = getData( 'Text' )
			  ;

			$util.removeClass( e, 'over' );
			$util.preventDefault( e );
			e = e.originalEvent || e;

			var dropped = { file_list : dataTransfer.files
			              , base      : $( getText ).find( 'base' ).attr( 'href' ) || ''
			              , text      : getText.match( INNERCONTEXT.CONSTANTS.REGEXP.uri ) || ''
			              , uri       : getData( 'text/uri-list' )
			              , e         : e
			              };

			$.log(dropped);
			$util.handleURIs( dropped );
		},

		handleURIs : function handleURIs (uris) {
			var $domIC = INNERCONTEXT.DOM['Main‿div‿imageContainer'];

			var walkURIArray = function walkURIArray (uri) {
				$domIC.trigger({ type: 'haveRemote', uri: uri }, [INNERCONTEXT.UTILITY.supportedImageType(uri)]);
			};

			switch (!0) {
				case (!!uris.file_list && !!uris.file_list.length): // local file(s)
					$domIC.trigger({ type: 'haveLocalFileList' , list: uris.e });
					break;
				case (!!uris.uri && !!uris.uri.length): // remote image drag/dropped
					uris.uri.forEach(walkURIArray);
					break;
				case (!!uris.text && !!uris.text.length): // plaintext list of urls drag/dropped
					uris.text.forEach(walkURIArray);
					break;
				default:
					$.log('This is not something which can provide a usable image.');
			}
		},

		inherit : function inherit (child, parent) {
		   child.prototype = parent.prototype;
		},

		 loadLocalFile : function loadLocalFile (event) {
			var file, name, type
			  , e = event.data.e
			  , debugMsg = ''
		      , files = (e.files || e.dataTransfer.files || e.file_list)
		      , len = files.length
		      , i = len
		      , $util = INNERCONTEXT.UTILITY
		      ;
			while (0 < i--) {
				file = files[i];
				name = file.name;
				type = $util.supportedImageType(name);
				INNERCONTEXT.CONSTANTS.DEBUGMODE && (debugMsg = ['loadLocalFile: for file "', name, '", file ', (i+1), ' of ', len].join(''));
				if (!type) {
					$.log(debugMsg + ', unusable file type detected');
					continue;
				}
				$.log([debugMsg, ', usable file type "', type, '" detected'].join(''));
//				"jpg" === type ? addImageToDropbox(file, "local")
//							   : convertImage(file, type, name);
			}
		},

		makeEleName : function makeEleName (prefix, eleType, disambig, type) {
			var name = [prefix, eleType];
			if (void 0 !== type) {
				name.push(type);
			}
			name.push(disambig);
			return name.join('‿');
		},

		preventDefault : function preventDefault (e) {
			e.preventDefault();
		},

		removeClass : function removeClass (e, classToRemove) {
			$.single(e.target).removeClass(e.data['class'] || classToRemove);
		},

		setLSValue : function setLSValue (e) {
			var value = ''
			  , $self = $.single( this )
			  ;

			switch (e.data.type) {
				case 'text'     : value = $self.val(); break;
				case 'checkbox' : value = $self.is(':checked'); break;
				case 'select'   : value = $self.find(':selected').val();
			}
			localStorage.setItem([INNERCONTEXT.CONSTANTS.NAMESPACE, '_', e.data.key].join(), value);
			INNERCONTEXT.DATA[e.data.key] = value;
		},

		redTintImage : function redTintImage ($image) {
			$.log('Tinting image');

			var $tint = $.make('figure', { 'class': 'tintWrapper' }).css({ height : ($image.quickHeight(0) + 6) + 'px'
			                                                             , width  : ($image.quickWidth(0) + 6) + 'px'
			                                                             });
			$image.wrap($tint)
				  .data('oldtitle', $image.prop('title'))
				  .prop('title', $.l('Remove image'))
				  .addClass('tintImage');
		},

		removeWrappedElement : function removeWrappedItem (e) {
			$(e.target).parent().remove();
		},

		supportedImageType : function supportedImageType (uri) {
			var matches = INNERCONTEXT.CONSTANTS.REGEXP.image.exec(uri);
			if (matches === null) {
				return false;
			}
			var matched = matches[0];
			$.log('Testing file with extension "' + matched + '" to see if it is a supported extension.');
			switch (matched) {
				// JPEG
				case '.jpg'   : // falls through
				case '.jpeg'  : // falls through
				case '.jpe'   : // falls through
				case '.jfif'  : // falls through
				case '.jif'   : // falls through
				// Progressive JPEG
				case '.pjp'   : // falls through
				case '.pjpeg' : return 'jpg';
				// Portable Network Graphics
				case '.png'   : return 'png';
				// GIF
				case '.gif'   : return 'gif';
				// Bitmap
				case '.bmp'   : return 'bmp';
				// Google WebP
				case '.webp'  : return 'webp';
				// Icon
				case '.ico'   : return 'ico';
				// JPEG Network Graphics
				case '.jng'   : return 'jng';
				// JPEG2000
				case '.j2c'   : // falls through
				case '.j2k'   : // falls through
				case '.jp2'   : // falls through
				case '.jpc'   : // falls through
				case '.jpt'   : return 'jp2';
				// ZSoft IBM PC Paintbrush
				case '.pcx'   : return 'pcx';
				// Lotus Picture
				case '.pic'   : return 'pic';
				// Macintosh
				case '.pict'   : return 'pict';
				// MacPaint file format
				case '.pnt'   : return 'pnt';
				// Targa file format
				case '.tga'   : return 'tga';
				// Aldus Tagged Image File Format
				case '.tif'   : // falls through
				case '.tiff'  : return 'tiff';
				default       : return false;
			}
		},

        toggleRedTint : function toggleRedTint (e) {
			if (INNERCONTEXT.DOM['Options‿input‿checkbox‿remove_images'].prop('checked')) {
				var $target = $(e.target)
				  , type    = e.type
				  ;

				if (type === 'mouseenter') {
					INNERCONTEXT.UTILITY.redTintImage($target);
				} else if (type === 'mouseleave') {
					INNERCONTEXT.UTILITY.unTintImage($target);
				}
			}
		},

		unTintImage : function unTintImage ($image) {
			$.log('Untinting image');

			if ($image.parents('.tintWrapper:first').length) {
				$image.removeClass('tintImage')
				      .prop('title', $image.data('oldtitle'))
				      .unwrap();
			}
		}

	});

	INNERCONTEXT.WIDGETS = 
		(function defineINNERCONTEXT_WIDGETS () {
			var getVal = INNERCONTEXT.UTILITY.getLSValue;
			return {
				IMAGES: { about   : getVal('infoIcon', 1)
					    , zoomIn  : getVal('magnifyingGlassBase', 1) + getVal('magnifyingGlassMinus', 1)
					    , zoomOut : getVal('magnifyingGlassBase', 1) + getVal('magnifyingGlassPlus', 1)
					    , options : getVal('iconSettings', 1)
					    }
			};
		}());

	INNERCONTEXT.UI = {
		addNewImageDropBox : function addNewImageDropBox ( $div ) {
			$.log('Add new CAA image space button triggered.');
			
			$div = $div.append ? $div : $.single( this ).nextAll( '.caaDiv' );
			$div.append( INNERCONTEXT.UI.$makeDropbox() );
			INNERCONTEXT.UTILITY.checkScroll( $div );
		},

		addImageRow : function addImageRow (event) {
			var $releaseAnchor = $.single( this );

			if ( $releaseAnchor[0].nodeName === 'TABLE' ) { // Detect bitmap's script's expandos.

				/* DOMNodeInserted is triggered for each new element added to the table by bitmap's script.
				   This looks for the editing tr he adds at the end, since that is the last DOMNodeInserted which is
				   triggered when a RG is expanded.  He does not add that row for expanded releases, so this only
				   kicks in when a RG is expanded, and only when that entire expando has been inserted. */
				
				var $editRow = $releaseAnchor.find('a[href^="/release/add?release-group"]').parent();

				if ( $editRow.length ) {
					$editRow.remove();
					$releaseAnchor.find( 'a' )
								  .filter( '[href^="/release/"]' )
								  .each( INNERCONTEXT.UI.addImageRow );
				}
				return;
			}

			var $releaseRow = $releaseAnchor.parents('tr:first');
			INNERCONTEXT.UTILITY.assemble(
				INNERCONTEXT.TEMPLATES.image_row(
					{ $row : $releaseRow
					, cols: $releaseRow[0].getElementsByTagName('td').length
					, MBID: INNERCONTEXT.CONSTANTS.REGEXP.mbid.exec($releaseAnchor.attr('href'))
					}
				)
			)[0].insertAfter($releaseRow);
		},

		$makeAddDropboxButton : function $makeAddDropboxButton () {
			$.log('Creating add dropbox button.', 1);

			var widgets = INNERCONTEXT.WIDGETS;

			if (void 0 === widgets.$addDropboxButton) {
				widgets.$addDropboxButton = $.make('input', { 'class' : 'caaAdd'
				                                            , title   : $.l('Add image one release')
				                                            , type    : 'button'
				                                            , value   : '+'
				                                            });
			}
			return widgets.$addDropboxButton.quickClone(false);
		},

		$makeCloseButton : function $makeCloseButton () {
			/* Creates a generic close button.  */
			return $.make('header', { 'class': 'closeButton' }).text('x');
		},

		$makeCoverTypeSelect : function $makeCoverTypeSelect () {
			$.log('Creating CAA type select.');

			var widgets = INNERCONTEXT.WIDGETS;

			if (void 0 === widgets.$coverTypeSelect) {
				var types = INNERCONTEXT.CONSTANTS.COVERTYPES
				  , $typeList = $.make('select', { 'class'  : 'caaSelect'
				                                 , multiple : 'multiple'
				                                 , size     : types.length
				                                 })
				  ;

				var $makeCoverTypeOption = function $makeCoverTypeOption (type, i) {
					return $.make('option', { value : i+1 }).text($.l('coverType:' + type));
				};

				widgets.$coverTypeSelect = $typeList.appendAll(types.map($makeCoverTypeOption));
			}
			return widgets.$coverTypeSelect.quickClone(true);
		},

		$makeDropbox : function $makeDropbox () {
			$.log('Creating dropbox.');

			var widgets = INNERCONTEXT.WIDGETS;
			
			if (void 0 === widgets.$coverTypeSelect) {
				var $image = $.make('img', { 'class'   : 'dropBoxImage'
				                           , draggable : false
				                           }).wrap('<div>')
				                             .parent()
				  , $figcaption = $.make('figcaption').appendAll([ $.make('input', { type        : 'text'
																				   , placeholder : 'image comment'
																				   })
																 , $.make('br')
																 , INNERCONTEXT.UI.$makeCoverTypeSelect()
																 ])
				  , $dropbox = $.make('figure', { 'class' : 'CAAdropbox newCAAimage' })
				  ;

				widgets.$dropBox = $dropbox.appendAll([ INNERCONTEXT.UI.$makeCloseButton()
																   , $image
																   , $figcaption
																   ]);
			}
			return widgets.$dropBox.quickClone(true);
		},

		$makeIcon : function $makeIcon (which) {
			return [ $(INNERCONTEXT.WIDGETS.IMAGES[which]) ];
		},

		$makeLoadDataButton : function $makeLoadDataButton () {
			$.log('Creating add dropbox button.');

			var widgets = INNERCONTEXT.WIDGETS;

			if (void 0 === widgets.$loadDataButton) {
				widgets.$loadDataButton = $.make('input', { 'class' : 'caaLoad'
																	   , title   : $.l('Load text one release')
																	   , type	: 'button'
																	   , value   : $.l('Load CAA images')
																	   });
			}
			return widgets.$loadDataButton.quickClone(false);
		},

		$makeColorsList : function $makeColorsList () {
			var colors		= Object.keys(INNERCONTEXT.CONSTANTS.COLORS)
			  , colorsMap	 = []
			  , $colorOptions = []
			  ;

			var prepColorList = function prep_color_list_for_sorting (color, i) {
				colorsMap.push({ index: i
							   , value: $.l(color).toLowerCase()
							   });
			};

			var sortColors = function sort_color_list (a, b) {
				return a.value > b.value ? 1 : -1;
			};

			var makeColorList = function make_colors_list (map) {
				var colorItem   = colors[map.index]
				  , color	   = INNERCONTEXT.CONSTANTS.COLORS[colorItem]
				  , lsItemName  = 'colors_' + colorItem
				  , $thisOption = $.make('option', { 'class' : 'colorOption'
												   , value   : colorItem
												   }).data('default', color)
													 .text($.l(colorItem));
				if (null === INNERCONTEXT.UTILITY.getLSValue(lsItemName)) {
					$.log(['Initializing localStorage for ', lsItemName, ' to ', color].join(''));
					INNERCONTEXT.UTILITY.setLSValue(lsItemName, color);
				}
				$colorOptions.push($thisOption);
			};

			colors.forEach(prepColorList);
			colorsMap.sort(sortColors).map(makeColorList);
			return $colorOptions;
		},

		$makeCreditsList : function makeCreditsList () {
			var $who		= $.make('div', { 'class': 'CAAcreditWho' })
			  , $what	   = $.make('span', { 'class': 'CAAcreditWhat' })
			  , $pre		= $.make('span').html(' [ ')
			  , $post	   = $.make('span').html(' ]')
			  , $thisWho
			  , $thisWhat
			  , $thisMB
			  , credits
			  ;

			var sortCredits = function sort_credits_list (a, b) {
				return a.what > b.what ? 1 : -1;
			};

			var makeRoleListPerCredit = function makeRoleListPerCredit (credit) {
//TODO: This function is UGLY!
				$thisWho  = $who.quickClone().text(credit.name);
				$thisWhat = $what.quickClone().text(credit.what);
				void 0 !== credit.urlN && ($thisWho = $.make('a', { href : 'http://' + credit.urlN }).append($thisWho));
				void 0 !== credit.urlW && ($thisWhat = $.make('a', { href : 'http://' + credit.urlW }).append($thisWhat));
				var $dd = $.make('dd').append($thisWho);
				$thisWhat = $.make('dt').append($thisWhat);
				if (void 0 !== credit.mb) {
					$thisMB = $.make('span', { 'class': 'caaMBCredit' })
					           .appendAll([ $pre.quickClone()
					                      , $.make('a', { href : 'http://musicbrainz.org/user/' + credit.mb })
					                         .text(credit.name.match(/\w+\s/)[0] + '@ MusicBrainz')
					                      , $post.quickClone()
					                      ])
					           .appendTo($dd);
					void 0 !== credit.what ? credits.push($thisWhat, $dd) : credits.push($dd);
				} else if (void 0 !== credit.what) {
					credits.push($thisWhat, $dd);
				} else {
					credits.push($dd);
				}
			};

			var makeCreditListPerRole = function makeCreditListPerRole (role) {
				credits = [];
				INNERCONTEXT.CONSTANTS.CREDITS[role].sort(sortCredits)
													.forEach(makeRoleListPerCredit);
				return $.make('h5').text($.l(role))
								   .after($.make('dl').appendAll(credits));
			};

			return Object.keys(INNERCONTEXT.CONSTANTS.CREDITS)
						 .map(makeCreditListPerRole);
		},

		$makeLanguagesList : function makeLanguagesList () {
			var languages = [];

			Object.keys(INNERCONTEXT.CONSTANTS.TEXT).forEach(function make_languages_list (key) {
				languages.push([key, INNERCONTEXT.CONSTANTS.TEXT[key].languageName]);
			});
			languages.sort(function sort_languages_list (a, b) {
				return a[1] === b[1] ? 0				 // a[1] == b[1] ->  0
									 : a[1] > b[1] ? 1   // a[1] >  b[1] ->  1
												   : -1; // a[1] <  b[1] -> -1
			});
			var userLang = INNERCONTEXT.UTILITY.getLSValue('language') || 'en';
			var makeLanguageOptions = function make_language_options (language) {
										  return $.make('option', { selected : (language[0] === userLang)
																 , value	: language[0]
																 }).text(language[1]);
									  };
			return languages.map(makeLanguageOptions);
		}
	};

	/** @constructor */
	INNERCONTEXT.UI.GenericElement = function GenericElement () {
		this.args = arguments[0];

		if (!(this instanceof GenericElement)) {
			return new GenericElement(arguments[0]);
		}

		for (var args = this.args, list = ['css', 'html', 'text', 'ele', 'data', 'hide'], i = list.length; 0 < i--;) {
			var current   = list[i]
			  , storedArg = args[current]
			  ;

			if (void 0 !== args[current]) {
				delete args[current];
				this[current] = storedArg;
			}
		}
		this.addedClasses = [''];
		this.prefix = "Main";
	};

	INNERCONTEXT.UI.GenericElement.prototype.counter = 0;

	INNERCONTEXT.UI.GenericElement.prototype.make = function GenericElement_prototype_make () {
		var namespace = INNERCONTEXT.CONSTANTS.NAMESPACE
		  , args	  = this.args
		  , eleName   = INNERCONTEXT.UTILITY.makeEleName(this.prefix, this.ele, args.id || Object.getPrototypeOf(this).counter++, args.type)
		  ;

		namespace = ' ' + namespace;
		args.id = eleName;
		args['class'] = $.trim( [ $.trim( args['class'] ) || '', namespace, this.addedClasses.join(namespace) ].join('') );
		this.ele = $.make(this.ele, args);
		void 0 !== this.text ? this.ele.text(this.text)
		                     : void 0 !== this.html && this.ele.html( this.html );
		this.css && Object === this.css.constructor && this.ele.css( this.css );
		this.data && Object === this.data.constructor && this.ele.data( this.data );
		!!this.hide && this.ele.hide();
		INNERCONTEXT.DOM[eleName] = this.ele;

		return this.ele;
	};

	INNERCONTEXT.UI.GenericElement.prototype.get = function GenericElement_prototype_get () {
		return void 0 === this.ele ? this.make()
								   : this.ele;
	};

	/** @constructor */
	INNERCONTEXT.UI.OptionsElement = function OptionsElement () {
		if (!(this instanceof OptionsElement)) {
			return new OptionsElement(arguments[0]);
		}

		INNERCONTEXT.UI.GenericElement.apply(this, arguments);
		this.prefix = "Options";
		this.addedClasses.push('Options');
	};
	INNERCONTEXT.UTILITY.inherit(INNERCONTEXT.UI.OptionsElement, INNERCONTEXT.UI.GenericElement);

	/** @constructor */
	INNERCONTEXT.UI.AboutElement = function AboutElement () {
		if (!(this instanceof AboutElement)) {
			return new AboutElement(arguments[0]);
		}

		INNERCONTEXT.UI.GenericElement.apply(this, arguments);
		this.prefix = "About";
		this.addedClasses.push('About');
	};
	INNERCONTEXT.UTILITY.inherit(INNERCONTEXT.UI.AboutElement, INNERCONTEXT.UI.GenericElement);

	/** @constructor */
	INNERCONTEXT.UI.PreviewElement = function PreviewElement () {
		if (!(this instanceof PreviewElement)) {
			return new PreviewElement(arguments[0]);
		}

		INNERCONTEXT.UI.GenericElement.apply(this, arguments);
		this.prefix = "Preview";
		this.addedClasses.push('Preview');
	};
	INNERCONTEXT.UTILITY.inherit(INNERCONTEXT.UI.PreviewElement, INNERCONTEXT.UI.GenericElement);

	INNERCONTEXT.TEMPLATES.image_preview =
		[ { ele: 'h1', id: 'preview', text: $.l('Preview Image') }
		, { ele: 'img', id: 'preview_image', draggable: false } // Do *not* put an alt attribute on the image!
		, { ele: 'dl', id: 'info', hide: true }
		,	[ { ele: 'dt', 'class': 'previewDT', text: $.l('(Image) Resolution') }
			, { ele: 'dd', id: 'resolution' }
			, { ele: 'dt', 'class': 'previewDT', text: $.l('File size') }
			, { ele: 'dd', id: 'filesize' }
			]
		];

	INNERCONTEXT.TEMPLATES.MENUS.about =
		[ { ele: 'fieldset', id: 'main', hide: true }
		,	[ { ele: 'legend', text: $.l('About') }
			, { ele: 'h4', text: 'Cover Art Archive Bulk Image Editor' }
			, { ele: 'span', text: ['Caabie ', $.l('Version'), ' ', INNERCONTEXT.CONSTANTS.VERSION].join(''), 'class': 'CAAversion' }
			, { ele: 'div' }
			,	INNERCONTEXT.UI.$makeCreditsList()
			]
		];

	INNERCONTEXT.TEMPLATES.MENUS.options =
		[ { ele: 'fieldset', id: 'main', hide: true}
		,	[ { ele: 'legend', text: $.l('Options') }
			, { ele: 'span', text: [$.l('Version'), ' ', INNERCONTEXT.CONSTANTS.VERSION].join(''), 'class': 'CAAversion' }
			, { ele: 'input', id: 'remove_images', title: $.l('Remove (help)'), type: 'checkbox' }
			, { ele: 'label', 'for': 'Options‿input‿checkbox‿remove_images', id: 'remove_images', title: $.l('Remove (help)'), text: ('Remove images') }
			, { ele: 'br' }
			, { ele: 'input', id: 'parse', title: $.l('Parse (help)'), type: 'checkbox' }
			, { ele: 'label', 'for': 'Options‿input‿checkbox‿parse', id: 'parse', title: $.l('Parse (help)'), text: $.l('Parse web pages') }
			, { ele: 'br' }
			, { ele: 'input', id: 'autoedit', 'class': 'autoedit', type: 'checkbox', title: $.l('Submit as autoedits'), hide: true }
			, { ele: 'label', 'for': 'Options‿input‿checkbox‿autoedit', 'class': 'autoedit', id: 'autoedit', title: $.l('Submit as autoedits'), text: $.l('Submit as autoedits'), hide: true }
			, { ele: 'br' }
			, { ele: 'input', id: 'clear_storage', title: $.l('Remove stored images nfo'), type: 'button', value: $.l('Remove stored images'), disabled: INNERCONTEXT.UTILITY.getLSValue('imageCache') === '[]' }
			, { ele: 'br' }
			, { ele: 'label', 'for': 'Options‿select‿language', id: 'language', title: $.l('Changed language note'), text: $.l('Language') + ':' }
			,	[ { ele: 'select', id: 'language', size: 3, title: $.l('Changed language note') }
				,	INNERCONTEXT.UI.$makeLanguagesList()
				]
			, { ele: 'fieldset', id: 'colors' }
			,	[ { ele: 'legend', text: $.l('Colors') }
				, { ele: 'select', id: 'colors', size: 5, title: $.l('Changed colors note') }
				,	INNERCONTEXT.UI.$makeColorsList()
				, { ele: 'input', id: 'colors', title: $.l('Changed colors note'), type: 'color', value: '66ff00', 'class': 'CAAbutton' }
				, { ele: 'input', id: 'colors', title: $.l('Changed colors note'), type: 'button', value: $.l('default'), 'class': 'CAAbutton' }
				, { ele: 'div', id: 'shadow' }
				,	[ { ele: 'label', 'for': 'Options‿input‿number‿shadow', id: 'shadow', title: $.l('How dark the bkgrnd'), text: $.l('How dark the bkgrnd') }
					,	[ { ele: 'input', id: 'shadow', type: 'number', step: 1, 'min': 0, 'max': 100, value: INNERCONTEXT.UTILITY.getLSValue('editorShadow') || INNERCONTEXT.CONSTANTS.IESHADOWLVL, title: $.l('How dark the bkgrnd') }
						]
					]
				  ]
			 , { ele: 'div', id: 'note', text: $.l('take effect next time') }
			 ]
		];

	INNERCONTEXT.TEMPLATES.image_row = function (info) {
			return [ { ele: 'tr', 'class': info.$row.prop('class') }
			        ,    [ { ele: 'td', 'class': 'imageRow', colspan: info.cols }
				         ,    [ INNERCONTEXT.UI.$makeAddDropboxButton().hide()
					          , { ele: 'img', 'class': 'throbberImage', src: INNERCONTEXT.CONSTANTS.THROBBER, hide: true }
					          , { ele: 'div', 'class': 'loadingDiv', text: $.l('loading'), hide: true }
					          , $.make('div', { 'class' : 'caaDiv' })
					          ,    [ INNERCONTEXT.UI.$makeLoadDataButton().data('entity', info.MBID)
						           ]
					          ]
				         ]
			        ];
	};
	
	INNERCONTEXT.INIT = {
		standardizeBrowser : function standardizeBrowser () {
			document.head = document.head || document.getElementsByTagName('head')[0];
			document.body = document.body || document.getElementsByTagName('body')[0];
			window.TEMPORARY = window.TEMPORARY || 0;

			// Polyfill to add FileSystem API support to Firefox.
			void 0 === (window.requestFileSystem || window.webkitRequestFileSystem) && $.addScript('idbFileSystem');
			window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

			// Firefox renders slideToggle() badly; use toggle() instead.
			$.browser.mozilla && ( $.fn.slideToggle = $.fn.toggle );
		}(),

		initializeLocalStorage : function initializelocalStorage () {
			null === INNERCONTEXT.UTILITY.getLSValue('imageCache') && INNERCONTEXT.UTILITY.setLSValue('imageCache', []);
		},

		initializePage : function initializePage () {
			$.make('base').appendTo(document.head);

			$(document.body).css({ 'background-color': '#FFF' });

			document.getElementById('sidebar').innerHTML = '';

			// Resize the sidebar
			$('#sidebar').addClass('CAAsidebar');
			$('#content').css('margin-right', (INNERCONTEXT.CONSTANTS.SIDEBARWIDTH + 20) + 'px');

			// Get rid of the existing sidebar divider
			$('#page').css('background', '#FFF');

			// Get rid of the checkboxes
			$('tr').find('th, td').filter(':first-child:has(input)').remove();
			$('tr.subh > th').each(function () {
				var colSpan = $.single( this ).attr('colspan') - 1;
				colSpan ? $.single( this ).attr('colspan', $.single( this ).attr('colspan') - 1)
						: $.single( this ).remove(); // Fixes broken colspan on http://musicbrainz.org/release-group/{mbid}
			});

			// Lock the tables' column widths
			INNERCONTEXT.UTILITY.antiSquish(true);
			$.addRule('table.tbl', '{ table-layout: fixed; }', { id : 'tblStyle1' });

			// Change the page to use border-box layout
			$.addRule('*', [ '{ -moz-box-sizing: border-box;'
						   , '  -webkit-box-sizing: border-box;'
						   , '          box-sizing: border-box;'
						   , '}'
						   ].join('')
					 );
		},

		initializeImages : function initializeImages () {
			$.imagesSmall();

			var data = INNERCONTEXT.DATA;
			
			data.sizeStatus = 2;

			// This forces INNERCONTEXT.CONSTANTS.THROBBER to be already be loaded, so that the throbber shows up faster.
			$(document.body).append($.make('img', { src: INNERCONTEXT.CONSTANTS.THROBBER }).hide());

			data.cachedImages = INNERCONTEXT.UTILITY.getLSValue('imageCache');
		},

		initializeRegexps : function initializeRegexps () {
			// This defines the regexp constants.  Because regexps get compiled, this cannot be stringified as part of OUTERCONTEXT.
			INNERCONTEXT.CONSTANTS.REGEXP = { image: /\.(?:p?j(?:pg?|peg?|f?if)|bmp|gif|j(?:2c|2k|p2|pc|pt)|jng|pcx|pict?|pn(?:g|t)|tga|tiff?|webp|ico)$/i
											, mbid: /\w{8}\-\w{4}\-\w{4}\-\w{4}-\w{12}/
											, uri: /\b(?:https?|ftp):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|]/gi
											};
		},

		initializeFileSystem : function initializeFileSystem () {
			// Create temporary local file system to use to store remote image files.
			requestFileSystem( TEMPORARY
							 , INNERCONTEXT.CONSTANTS.FILESYSTEMSIZE * 1024 * 1024
							 , function store_file_system (fsObj) {
								   $.log(['Creating local file system succeeded.', fsObj]);
								   INNERCONTEXT.DATA.localFileSystem = fsObj;
							   }
							 , function request_file_system_error (error) {
								   $.log(['Creating local file system failed.', error]);
							   }
							 );
		},

		defineMainTemplate : function defineMainTemplate () {
			/* This is separated from the other templates, as it calls INNERCONTEXT.UTILITY.assemble, and there is
			   no need to assemble those templates on page load, rather than when the script is actually being run. */

			var ui   = INNERCONTEXT.UI
			  , util = INNERCONTEXT.UTILITY
			  ;

			INNERCONTEXT.TEMPLATES.main =
				[ { ele: 'h1', id: 'imageHeader', text: $.l('Images') }
				, { ele: 'div', id: 'about_control', title: $.l('About') }
				,	ui.$makeIcon('about')
				, { ele: 'div', id: 'image_size' }
				,	[ { ele: 'div', 'class': 'imageSizeControl', id: 'imageMagnify', title: $.l('Magnify image') }
					,	ui.$makeIcon('zoomOut')
					, { ele: 'div', 'class': 'imageSizeControl', id: 'imageShrink', title: $.l('Shrink image') }
					,	ui.$makeIcon('zoomIn')
					]
				, { ele: 'div', id: 'options_control', title: $.l('Options') }
				,	ui.$makeIcon('options')
				, { ele: 'div', id: 'imageContainer' }
				,	[ { ele: 'div', id: 'imageHolder' }
					,	util.assemble('AboutElement', INNERCONTEXT.TEMPLATES.MENUS.about)
					,	util.assemble('OptionsElement', INNERCONTEXT.TEMPLATES.MENUS.options)
					, { ele: 'div', id: 'previewContainer' }
					,	util.assemble('PreviewElement', INNERCONTEXT.TEMPLATES.image_preview)
					]
				];
		},

		initializeUI : function initializeUI () {
			/* Create the UI */
			
			var util = INNERCONTEXT.UTILITY;
			
			this.defineMainTemplate();
			$('#sidebar').appendAll( util.assemble(INNERCONTEXT.TEMPLATES.main) );

			/* Adjust the height of the image area based on the height of the preview area.  */
			util.adjustContainerHeights();

			/* Autoeditor check */
			var autoeditorList = JSON.parse(INNERCONTEXT.UTILITY.getLSValue('autoeditors', 1)),
				thisEditor = $('.account > a:first').text();
			if (-1 !== $.inArray(thisEditor, autoeditorList)) {
				/* The following non-typical bool test is required here!  localStorage.getItem actually returns a Storage
				   object, even though it *looks* like it is returning a string. */
				INNERCONTEXT.DOM['Options‿input‿checkbox‿autoedit'][0].checked = (INNERCONTEXT.UTILITY.getLSValue('autoedit') === "true");
				$('.autoedit').show();
			}
			
			// Add a 'load info' button to each release row
			$( '#content' ).detach( function addImageRows () {
				$.single( this ).find( 'a' )
				                 .filter( '[resource^="[mbz:release/"]' )
				                 .each( INNERCONTEXT.UI.addImageRow );
			});

		},

		initializeSubscribers : function initializeSubscribers () {
			var $dom    = INNERCONTEXT.DOM
			  , util    = INNERCONTEXT.UTILITY
			  , change  = 'change'
			  , click   = 'click'
			  ;

			var slideToggle = function (e) {
				$dom[e.data.element].slideToggle();
			};

            // Toggle control for options menu
			$dom['Main‿div‿options_control'].on( click, { element: 'Options‿fieldset‿main' }, slideToggle );

            // Toggle control for about menu
			$dom['Main‿div‿about_control'].on( click, { element: 'About‿fieldset‿main' }, slideToggle );

			// Image size controls
			$dom['Main‿div‿imageShrink'].on( click, { change: -1 }, util.changeImageSize );
			$dom['Main‿div‿imageMagnify'].on( click, { change: 1 }, util.changeImageSize);

			// remember preference: parse webpages checkbox
			$dom['Options‿input‿checkbox‿parse'].on( change, { key: 'parse', type: 'checkbox' }, util.setLSValue );

			// remember preference: autoedit checkbox
			$dom['Options‿input‿checkbox‿autoedit'].on( change, { key: 'autoedit', type: 'checkbox' }, util.setLSValue );

			// remember preference: language selector
			$dom['Options‿select‿language'].on( change, { key: 'language', type: 'select' }, util.setLSValue );

			// remember preference: image editor shadow level
			$dom['Options‿input‿number‿shadow'].on( change, { key: 'editorShadow', type: 'text' }, util.setLSValue );

			// Clear image storage button
			$dom['Options‿input‿button‿clear_storage'].on( click, util.clearImageStore );

			// Add functionality to close buttons
			$dom.body.on( click, '.closeButton', util.closeDialogGeneric )
			         .on( click, '#CAAeditiorCancelBtn', util.closeDialogImageEditor );

			$dom['Main‿div‿imageContainer'].on( click, '.tintImage', util.removeWrappedElement )	// Remove images (in remove image mode)
			                                .on( 'mouseenter mouseleave', '.localImage', util.toggleRedTint )	// Tint images (in remove image mode)
			                                .on({ dragenter : util.addClass // Highlight field
			                                    , dragleave : util.removeClass // Unhighlight field
			                                    }, { 'class': 'over' })
			                                .on({  dragover    : util.preventDefault // Required for drag events to work
			                                    ,  drop        : util.handleDroppedResources // Handle drops into the drop area
			                                    , 'haveRemote' : // Handle remote non-image resources to be loaded
			                                        function ( e, type ) {
			                                            type ? util.getRemoteFile( e.data.uri, type ) : util.getRemotePage( e.data.uri );
			                                        }
			                                    , 'haveLocalFileList' : // Handle local images to be loaded
			                                        function (e) {
			                                            util.loadLocalFile(e.list);
			                                        }
			                                    });

			// Handle a signal that a new remote image has been retreived and is ready to use
			$dom.xhrComlink.on('dblclick', '.image', util.addRemoteImage);
			
//			$addButton.on('click', INNERCONTEXT.UI.addNewImageDropBox);
//			$loadButton.on('click', { $row : $newRow
//									, $add : $addButton
//									}, INNERCONTEXT.UTILITY.loadRowInfo);

		},

		init : function init () {
			this.initializeLocalStorage();
			this.initializePage();
			this.initializeImages();
			this.initializeRegexps();
			this.initializeFileSystem();
			this.initializeUI();
			this.initializeSubscribers();
            
			var ui        = INNERCONTEXT.UI
			  , util      = INNERCONTEXT.UTILITY
			  , templates = INNERCONTEXT.TEMPLATES
			  ;

			delete templates.main;
			delete templates.image_preview;
			delete templates.MENUS;
			delete ui.AboutElement;
			delete ui.OptionsElement;
			delete ui.PreviewElement;
			delete ui.$makeColorsList;
			delete ui.$makeCoverTypeSelect;
			delete ui.$makeCreditsList;
			delete ui.$makeLanguagesList;
			delete util.AboutElement;
			delete util.OptionsElement;
			delete util.PreviewElement;
			delete INNERCONTEXT.INIT;
		}
	};

	!function add_manual_starter_for_init() {
		$.log('Adding manual starter link.');

		var $triggerLink = $.make('a', { id: 'triggerLink' })
		                    .text($.l('Add cover art'))
		                    .wrap('<li>')
		                    .on('click', 
		                        function start_cover_art_script() {
		                            $.single( this ).remove();
		                            INNERCONTEXT.INIT.init();
		                        })
		                    .parent();
		$('ul.links').find('hr:first')
		             .before($triggerLink);
	}();
};

OUTERCONTEXT.CONTEXTS.THIRDPARTY = function THIRDPARTY ($, THIRDCONTEXT) {
	/* Despite the name, each function in thirdParty is by Brian Schweitzer unless otherwise noted. */

	/*jshint strict:false */
	jQuery.noConflict();

	if (!document.head) {
		document.head = document.getElementsByTagName('head')[0];
	}

	jQuery.browser.chrome = navigator.userAgent.toString().toLowerCase().indexOf('chrome');

	jQuery.extend({
		/* Takes a localStorage value name, and inserts the script stored there (as a string) into the DOM. */
		addScript: function jQuery_addScript  (scriptSource) {
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.textContent = localStorage.getItem(scriptSource);
			document.head.appendChild(script);
		},
		// Creates and adds a new css rule
		addRule: function jQuery_addRule (selector, rule, props) {
			var $rule = $('<style type="text/css">').text(selector + rule);
			void 0 !== props && $rule.prop(props);
			$rule.appendTo('head');
		},
		// Modified from http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
		dataURItoBlob: function jQuery_dataURItoBlob (dataURI, mime) {
			// convert base64 to raw binary data held in a string
			var byteString;
			if (dataURI.split(',')[0].indexOf('base64') >= 0) {
				byteString = atob(dataURI.split(',')[1]);
			} else {
				byteString = atob(dataURI); // The followup at stackoverflow is wrong here; this version is fixed.
			}

			// write the bytes of the string to an ArrayBuffer
			var ab = new ArrayBuffer(byteString.length),
				ia = new Uint8Array(ab);
			for (var i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}

			// write the ArrayBuffer to a blob, and you're done
			/* The deprecated BlobBuilder format is normally prefixed; we need to find the right one.  (The Blob constructor which
			   has replaced BlobBuilder is not yet implemented. */
			window.BlobBuilder = window.BlobBuilder || window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder;
			var bb = new BlobBuilder();
			bb.append(ab);
			return bb.getBlob('image/' + mime);
		},
		// A very basic version of a gettext function.
		l: function jQuery_l (str) {
			return (THIRDCONTEXT.CONSTANTS.TEXT[localStorage.getItem('Caabie_language') || 'en'][str]);
		},
		// Logs a message to the console if debug mode is on.
		log: function jQuery_log (str, verbose) {
			if (!THIRDCONTEXT.CONSTANTS.DEBUGMODE) {
				return;
			}
			void 0 === verbose && (verbose = false);
			if (!verbose || THIRDCONTEXT.CONSTANTS.DEBUG_VERBOSE) {
				str.constructor !== Array ? console.log(str)
										  : console.log.apply(console, str);
			}
			return;
		},
		/* Polyfill input[type=number], if needed. */
		polyfillInputNumber : function jQuery_polyfillInputNumber () {
			var testEle = document.createElement('input');
			testEle.setAttribute('type','number');
			if (testEle.type === 'number') {
				$.log('input[type=number] is supported, no polyfill needed.');
			} else {
				$.log('input[type=number] is not supported, loading polyfill.');
				// The above bit already tested for number support; no need to load Modernizr.
				var Modernizr = { inputtypes: { number: false }};
				/* This HAS to use eval, instead of using addScript.  If addScript is used, the DOM changes are made, but
				   because the code would exist in a different sandbox from this script, the change events would not be passed
				   to this script's handlers.  Eval keeps it in this same javascript context. */
				eval(localStorage.getItem('inputNumberPolyfill'));
			}
		}
	});

	$.addScript('jQueryAnimateEnhanced');
	$.addScript('jQueryGetHiddenDimensions');

	// By Brian Schweitzer and Naftali Lubin
	// Appends an array of jQuery objects to a jQuery object
	$.fn.appendAll = function jQuery_prototype_appendAll (arrayToAdd) {
		var $fragment = $.single(document.createDocumentFragment())
		  , i = 0
		  , len = arrayToAdd.length
		  , $fragAppend = $fragment.append
		  ;

		do {
		  $fragAppend.apply(this, arrayToAdd[i] );
		} while (i++ < len);
		return this.append($fragment);
	};

	// Modify jQuery.append to allow appending document fragments.
	$.fn.append = function jQuery_prototype_append () {
		return this.domManip(arguments, true, function (a) {
			this.nodeType % 10 === 1 && this.appendChild(a);
		});
	};

	// Sets the css visibility using a boolean value rather than a string value
	$.fn.vis = function jQuery_prototype_vis (i) {
		return this.css('visibility', i ? 'visible'
										: 'hidden');
	};

	// A faster .clone(); clones only the nodes, without regard to events.  deep = true == deep node copy.
	$.fn.quickClone = function jQuery_prototype_quickClone (deep) {
		return this.map(function quickClone_internal (elem, deep) {
			return this.cloneNode(deep || false);
		});
	};

	// Tests whether an element has a defined property value.
	$.fn.hasProp = function jQuery_prototype_hasProp (property) {
		property = this.prop(property);
		return (void 0 !== property && property.length);
	};

	/* Get the width of an element.  Faster than .width(). */
	$.fn.quickWidth = function jQuery_prototype_quickWidth (which) {
		return parseInt($.css(this[which || 0], 'width'), 10);
	};

	/* Get the height of an element.  Faster than .height(). */
	$.fn.quickHeight = function jQuery_prototype_quickHeight (which) {
		return parseInt($.css(this[which || 0], 'height'), 10);
	};

	/* jQuery.single, by James Padolsey
	   http://james.padolsey.com/javascript/76-bytes-for-faster-jquery/
	*/
	jQuery.single = (function jQuery_single (o){
		 var collection = jQuery([1]); // Fill with 1 item, to make sure length === 1
		 return function single_internal (element) {
			 // Give collection the element:
			collection[0] = element;
			 // Return the collection:
			return collection;
		 };
	}());

	/*!
	 * jQuery Detach+ - v0.1pre - 5/18/2011
	 *  https://gist.github.com/978520
	 * http://benalman.com/
	 *
	 * Copyright (c) 2011 "Cowboy" Ben Alman
	 * Dual licensed under the MIT and GPL licenses.
	 * http://benalman.com/about/license/
	 */
	 // https://gist.github.com/938767
	  var detach = $.detach = function jQuery_detach (node, async, fn) {
			  var parent = node.parentNode;
			  var next = node.nextSibling;
			  if (!parent) {
				  return;
			  }
			  parent.removeChild(node);
			  if (Boolean !== async.constructor) {
				  fn = async;
				  async = false;
			  }
			  if (fn && async) {
				  fn.call(node, reattach);
			  } else if (fn) {
				  fn.call(node);
				  reattach();
			  }

			  function reattach() {
				  parent.insertBefore(node, next);
			  }
		  };

	  $.fn.detach = function jQuery_prototype_detach (async, fn) {
		  return this.each(function detach_internal () {
			  detach(this, async, fn);
		  });
	  };

	$.make = function jQuery_make (tagName, options) {
			/* Faster element creation. */
			var domEl = [document.createElement(tagName)]
			  , jq = $
			  ;

			jq.fn.prop.call(domEl, options, true);
			return jq.merge(jq(), domEl);
	};
};

OUTERCONTEXT.CONTEXTS.CSS = function CSS ($, CSSCONTEXT) {
	'use strict';
	$.log('Adding css rules.');

	var CSSObj  = CSSCONTEXT.CONSTANTS.CSS
	  , sizes   = CSSCONTEXT.CONSTANTS.IMAGESIZES
	  , classes = []
	  , theseRules
	  , cssStr
	  ;
	
	CSSObj['.dropBoxImage'] = { cursor: $.browser.mozilla ? '-moz-zoom-in' : '-webkit-zoom-in' };

	$.make('link').attr({ rel  : 'stylesheet'
						, type : 'text/css'
						, href : localStorage.getItem('jQueryUIcssDialog')
						})
				  .appendTo('head');

	$.log('Adding css for the CAA batch script.');
	$.make('style', { type : 'text/css' }).text(Object.keys(CSSObj).map(function create_css_rules (key) {
		var prefixed =
			[ 'box-shadow'
			, 'border-radius'
			, 'margin-after'
			, 'opacity'
			, 'transform'
			];

		theseRules = Object.keys(CSSObj[key]).map(function create_css_rules_internal (rule) {
			cssStr = CSSObj[key][rule];
			if ($.inArray(rule, prefixed) === -1) {
				return [rule, ':', cssStr].join('');
			} else {
				return [
					'-khtml-', rule, ':', cssStr, ';',
					'-moz-', rule, ':', cssStr, ';',
					'-webkit-', rule, ':', cssStr, ';',
					'-o-', rule, ':', cssStr, ';',
					rule, ':', cssStr
				].join('');
			}
		}).join(';');
		return [key, '{', theseRules, ';}'].join('');
	}).join('')).appendTo('head');

	$.log('Adding image preview css classes.');
	sizes.forEach(function create_css_style_elements (size) {
		classes.push($.make('style', { id   : 'style' + size
									 }).text('.localImage { width: ' + size + 'px; }')
									   .attr('type', 'text/css'));
	});

	$('head').appendAll(classes);

	$.log('Adding image preview methods.');
	var useSheets = function use_stylesheets (tiny, small, medium, big) {
		for (var i = 3; i >= 0; i--) {
			$('#style' + sizes[i]).prop('disabled', !arguments[i]);
		}
	};
	$.extend({
			 imagesTiny   : function imagesTiny () { useSheets(1, 0, 0, 0); },
			 imagesSmall  : function imagesSmall () { useSheets(0, 1, 0, 0); },
			 imagesMedium : function imagesMedium () { useSheets(0, 0, 1, 0); },
			 imagesLarge  : function imagesLarge () { useSheets(0, 0, 0, 1); }
			 });
};

!function main_loader(i) {
	'use strict';
	var script
	  , head = document.head || document.getElementsByTagName('head')[0]
	  , requires = ['https://raw.github.com/brianfreud/greasemonkey-batchCAA/master/scripts.js']
	  , makeScript = function makeScript () {
			script = document.createElement('script');
			script.type = 'text/javascript';
		}
	  , loadLocal = function loadLocal (fn) {
			makeScript();
			script.textContent = [ 'setTimeout('
								 , '('
								 ,	 OUTERCONTEXT.CONTEXTS[fn].toString()
								 ,	 '(jQuery,'
								 ,		 '{ CONSTANTS:', JSON.stringify(OUTERCONTEXT.CONSTANTS)
								 ,		 ', UTILITY  :  { getColor :', OUTERCONTEXT.UTILITY.getColor.toString(), '.bind(undefined,', JSON.stringify(OUTERCONTEXT.CONSTANTS.COLORS), ')'
								 ,					   ', extend   :', OUTERCONTEXT.UTILITY.extend.toString()
								 ,					   '}'
								 ,		 '}'
								 ,	 ')'
								 , '), 0);'
								 ].join('');
			head.appendChild(script);
		}
	  ;

	(function script_loader (i) {
		if ( requires.length === 1 &&
			 localStorage.getItem('Caabie') !== null &&
			 localStorage.getItem('Caabie') === OUTERCONTEXT.CONSTANTS.VERSION) {
			/* Scripts are cached in localStorage; load them. */
			i++;
			requires[1] = 'jQuery';
			requires[2] = 'jQueryUI';
			requires[3] = 'jsjpegmeta';
			requires[4] = 'jscolor';
			requires[5] = 'canvasToBlob';
			requires.forEach(function add_required_scripts (requiredItem) {
				makeScript();
				script.textContent = localStorage.getItem(requiredItem);
				head.appendChild(script);
			});
			loadLocal('THIRDPARTY');
			loadLocal('CSS');
			delete OUTERCONTEXT.CONSTANTS.CSS;
			loadLocal('INNER');
		} else { /* Resource scripts are not cached in localStorage, go get them, then cache them. */
			makeScript();
			script.src = requires[0];
			script.addEventListener('load', function loader_move_to_next_script () {
				localStorage.setItem('Caabie', OUTERCONTEXT.CONSTANTS.VERSION);
				script_loader(1);
			}, true);
			head.appendChild(script);
			return;
		}
	})(i || 0);
}();

/*
	// Adjust the table layout and CAA rows after a screen resize event occurs.
	window.onresize = function adjust_table_after_window_resize () {
		$.log('Screen resize detected, adjusting layout.');
		if ((window.outerHeight - window.innerHeight) > 100) {
			$('#tblStyle1').prop('disabled',true);
			INNERCONTEXT.UTILITY.antiSquish();
			$('#tblStyle1').prop('disabled',false);
		}
		$('div.caaDiv').each(function window_resize_internal () {
			INNERCONTEXT.UTILITY.checkScroll($.single( this ));
		});
	};

//---------------------------------------------------------------------------------------------------------

	// Preview functionality
	$('body').on('click', '.localImage, .CAAdropbox:not(.newCAAimage) * .dropBoxImage', function send_image_to_preview_box () {
		if (!$('#Options‿input‿checkbox‿remove_images').prop('checked')) {
			$.log('Setting new image for preview box.');
			$('#previewImage').prop('src', $.single( this ).prop('src'))
							  .prop('title', $.l('Click to edit this image'));
			$('#previewResolution').text($.single( this ).data('resolution'));
			$('#previewFilesize').text($.single( this ).data('size') + ' ' + $.l('bytes'));
			$('#previewText').show();
		}
	});

//---------------------------------------------------------------------------------------------------------

	// Edit completeness testing for the select list in each dropbox.  This tests for completeness after a change to a select;
	   testing for completeness after an image is added is tested within that drop handler.
	$('body').on('change', '.caaSelect', function select_change_handler (e) {
		var $figure = $(e.target).parents('figure:first');
		$figure.css('background-color', INNERCONTEXT.UTILITY.getEditColor($figure));
	});

//---------------------------------------------------------------------------------------------------------

	// START: functionality to allow dragging from the Images box to a specific caa image box.
	var $draggedImage = null,
		inChild	   = false;

	// http://weblog.bocoup.com/using-datatransfer-with-jquery-events/
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
									$.single( this ).addClass('over');
								}
								return false;
							},
				dragleave : function newCAAimage_dragLeave (e) {
								$.log('loadingDiv: dragleave');
								e.preventDefault();
								if ($draggedImage !== null) {
									// https://bugs.webkit.org/show_bug.cgi?id=66547
									if (!inChild) {
										$.single( this ).removeClass('over');
									}
								}
								return false;
							},
				drop	  : function newCAAimage_drop (e) {
								$.log('newCAAimage: drop');
								e.preventDefault();
								if ($draggedImage !== null) {
									$.single( this ).find('.dropBoxImage').replaceWith($draggedImage);
									$draggedImage.toggleClass('beingDragged dropBoxImage localImage')
												 .parents('figure:first').toggleClass('newCAAimage workingCAAimage over')
																		 .css('background-color', INNERCONTEXT.UTILITY.getEditColor($.single( this )));
									$('figure').removeClass('over');
									$draggedImage = null;
								}
								return false;
				}
	}, '.newCAAimage');
	// END: functionality to allow dragging from the Images box to a specific caa image box.

//---------------------------------------------------------------------------------------------------------

		// Create the color picker.
		$.log('Creating color picker');
		var myPicker = new jscolor.color(document.getElementById('colorPicker'), {});
		myPicker.hash = true;
		myPicker.pickerFace = 5;
		myPicker.pickerInsetColor = 'black';

		// Add functionality to the color picker.
		!function add_color_select_handler () {
			$.log('Adding handler for color picker.');
			$('#colorSelect').on('change', function change_color_selection_handler (e) {
				var color = INNERCONTEXT.UTILITY.getLSValue('colors_' + $.single( this ).find(':selected').val());
				$.log('Getting localStorage for ' + 'Caabie_colors_' + $.single( this ).find(':selected').val() + '.  Result: ' + color);
				myPicker.fromString(color);
			});
			// Store new color value in localStorage.
			$('#colorPicker').change(function change_color_preference_handler (e) {
				localStorage.setItem('Caabie_colors_' + $('#colorSelect').find(':selected').val(), this.value);
				$.log('Setting localStorage for ' + 'Caabie_colors_' + $('#colorSelect').find(':selected').val() + ' to ' + this.value);
			});
			var $firstOption = $('#colorSelect').find('option:first');
			$firstOption.prop('selected', true);
			myPicker.fromString(
							   INNERCONTEXT.UTILITY.getColor( $firstOption.val() )
							   );
		}();

//---------------------------------------------------------------------------------------------------------

		// Add functionality to the default color button.
		!function add_default_color_handler () {
			$.log('Adding handler for default color button.');
			$('#ColorDefaultBtn').on('click', function default_color_button_click_handler (e) {
												  var color = $('#colorSelect').find(':selected')
																			   .data('default');
												  myPicker.fromString(color);
												  $.log('Setting localStorage for ' + 'Caabie_colors_' + $('#colorSelect').find(':selected').val() + ' to ' + color);
												  localStorage.setItem('Caabie_colors_' + $('#colorSelect').find(':selected').val(), color);
											  });
		}();

//---------------------------------------------------------------------------------------------------------

		var addImageToDropbox = function add_image_to_dropbox (file, source, uri) {
			$.log('Running addImageToDropbox');

			var dataURLreader = new FileReader()
			  , binaryReader  = new FileReader()
			  , title		 = (source === 'local') ? 'Local file: ' + (file.name)
													 : source + ' file: ' + uri
			  ;
			var $img		  = $.make('img', { 'class'   : 'localImage'
											 , alt	   : title
											 , draggable : true
											 , title	 : title
											 }).data('source', source)
											   .data('file', file);

			dataURLreader.onload = function add_attributes_to_dropped_image(event) {
				$.log('Running addImageToDropbox -> dataURLreader.onload');
				$img.prop('src', event.target.result);
				INNERCONTEXT.DOM.$imageHolder.append($img);
			};
			binaryReader.onloadend = function get_exif_for_dropped_image(event) {
				$.log('Running addImageToDropbox -> binaryReader.onloadend');
				var jpeg = new JpegMeta.JpegFile(this.result, file.name);
				$img.data({ depth	  : jpeg.general.depth.value
						  , name	   : file.name || file.fileName || uri
						  , resolution : jpeg.general.pixelWidth.value + ' x ' + jpeg.general.pixelHeight.value
						  , size	   : INNERCONTEXT.UTILITY.addCommas(file.size || file.fileSize)
						  });
				var logStr = 'Loaded new image: ' + $img.data('name') +
							 '.  Image has a resolution of ' + $img.data('resolution') + ', '
							 + $img.data('depth') + '-bit color depth, ' +
							 'and a filesize of ' + $img.data('size') + ' bytes.';
				$.log(logStr);
			};

			setTimeout(function () {
				dataURLreader.readAsDataURL(file);
				binaryReader.readAsBinaryString(file);
				}, 1);
			return;
		};

//---------------------------------------------------------------------------------------------------------

		var convertImage = function convertImage (inputImage, type, source) {
				$.log(['convertImage: received ', type, ' file: "', source, '"'].join(''));
				var canvas = document.createElement("canvas"),
					reader = new FileReader();
				var ctx = canvas.getContext("2d");

				reader.onload = function convertImage_reader_onload_handler (e) {
					var img = new Image();
					var useCanvasData = function useCanvasData () {
						$.log('Appending temporary canvas item to the body.');
						INNERCONTEXT.CONSTANTS.DEBUGMODE && $('body').append($(canvas)).prop('title', source);
						$.log('Converting image to jpg, sending new blob to addImageToDropbox().');
						addImageToDropbox(
										 $.dataURItoBlob(
														canvas.toDataURL("image/jpeg"), 'jpeg'
														),
										 'converted local ' + type, source
										 );
					};

					if (type === 'webp' && $.inArray(type, INNERCONTEXT.CONSTANTS.IMAGEFORMATS) === -1) {
						// WebP-support test
						img.onload = img.onerror = function convertImage_webp_test_handler () {
							if (img.height === 2) {
								INNERCONTEXT.CONSTANTS.IMAGEFORMATS.push('webp');
							}
						};
						img.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
					}

					// Convert image if its image format is supported via either polyfill or native
					if ($.inArray(type, INNERCONTEXT.CONSTANTS.IMAGEFORMATS) + 1) {
						img.onload = function convertImage_image_converter () {
							canvas.width = img.width;
							canvas.height = img.height;
							ctx.drawImage(img, 0, 0);
							useCanvasData();
						};

						img.src = reader.result;
					}
				};

				reader.readAsDataURL(inputImage);
				return;
			};

//---------------------------------------------------------------------------------------------------------

		var addRemoteImage = function add_remote_image (e) {
			$.log('dblclick detected on comlink; creating file and thumbnail.');
			var $comlink = $(this)
			  , imageBase64 = $comlink.text()
			  , loadStage = ''
			  , mime
			  , thisImageFilename = 'image' + Date.now() + '.jpg'
			  , imageType = e.data.imageType
			  , uri = e.data.uri
			  , handleError = function error_handler_for_getRemoteFile_XHR (e, flagged) {
								  void 0 === flagged && (flagged = false);
								  $.log('getRemoteFile\'s XMLHttpRequest had an error during ' + loadStage + '.', flagged);
								  $.log(e, flagged);
							  }
			  ;


			if (!$comlink.hasClass('image')) { // This comlink isn't being used for an image file.
				$.log('Comlink does not hold an image; quitting addRemoteImage.');
				return;
			}
			$.log('Comlink holds an image; addRemoteImage continuing.');

			switch (imageType) {
				case ('jpg'): mime = (/pjpeg$/i).test(uri) ? 'pjpeg' : 'jpeg'; break;
				case ('png'): mime = 'png'; break;
				case ('webp'): mime = 'webp'; break;
				case ('bmp'): mime = 'bmp'; break;
				case ('gif'): mime = 'gif'; break;
				case ('ico'): mime = 'vnd.microsoft.icon'; break;
				case ('jng'): mime = 'x-jng'; break;
				case ('jp2'): mime = 'jp2'; break;
				case ('ico'): mime = 'ico'; break;
				case ('pcx'): mime = 'pcx'; break;
				case ('pic'): mime = 'x-lotus-pic'; break;
				case ('pict'): mime = 'pict'; break;
				case ('pnt'): mime = 'pnt'; break;
				case ('tga'): mime = 'tga'; break;
				case ('tif'): mime = 'tiff'; break;

			}
			var imageFile = $.dataURItoBlob(imageBase64, mime);
			// Create a new file in the temp local file system.
			loadStage = 'getFile';
			INNERCONTEXT.DATA.localFileSystem.root.getFile(thisImageFilename, { create: true, exclusive: true }, function localFS_create_new_file (thisFile) {
				// Write to the new file.
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
							thisFile.file(function fileWriter_onwriteend_internal (file) {
								if (imageType !== 'jpg') {
									convertImage(file, imageType, uri);
									addImageToDropbox(file, 'converted remote ' + imageType, uri);
								} else {
									addImageToDropbox(file, 'Remote', uri);
								}
							});
						}
					};

					loadStage = 'createWriter: problem within the writer. (But ignore this error.)';
					fileWriter.onerror = handleError(e, 1);
					loadStage = 'createWriter: abort within the writer. (But ignore this error.)';
					fileWriter.onabort = handleError(e, 1);

					fileWriter.write(imageFile);
					$.log(['Remote file has been retrieved and writen.', INNERCONTEXT.DATA.localFileSystem]);
					$comlink.remove();
				}, handleError);
			}, handleError);
		};

//---------------------------------------------------------------------------------------------------------


//---------------------------------------------------------------------------------------------------------

		var getRemotePage = function getRemotePage (uri) {
			$.log('Loading ' + uri);

			$.ajax({ url: "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22" +
						  encodeURIComponent(uri) +
						  "%22%20and%20xpath%3D%22/html%22" + // Tells YQL to include the <head> as well as the <body>
						  "&format=xml&callback=?"
				   , dataType: "jsonp"
				   , context: this
				   , success: function yqlResponseHandler(data, textStatus, jqXHR) {
								  var links = []
									, processURI = function getRemotePage_processURI (uri) {
											INNERCONTEXT.CONSTANTS.REGEXP.image.test(uri) && links.push(uri);
										}
									, unique = function getRemotePage_unique (uri, index) {
											return links.indexOf(uri) === index;
										}
									, sendLinksToHandler = function getRemotePage_sendLinksToHandler (base) {
											links.length && INNERCONTEXT.UTILITY.handleURIs({ base: base
																	   , text: links.filter(unique)
																	   });
										}
									, handleBaseTag = function getRemotePage_handleBaseTag ($remotePage) {
											var base = $remotePage.filter('base').attr('href') || '';
											$('base').prop('href', base);
											return base;
										}
									, populateImageLinks = function getRemotePage_populateImageLinks ($remotePage) {
											$remotePage.find('img')
													   .each(function getRemotePage_populateImageLinks_img_handler () {
																 processURI(this.src);
															 })
													   .end()
													   .find('a')
													   .each(function getRemotePage_populateImageLinks_a_handler () {
																 processURI(this.href);
													   });
										}
									;

								  if (!data.results[0]) { // Received an empty response from YQL - means that the page blocks YQL with robots.txt.
									  $.log('Page is blocked from YQL via robots.txt, ' + uri);
									  $.log('Creating comlink to trigger other context to get the file.');
									  $.make('pre', { 'class': 'page' }).text(uri)
																	   .appendTo('#xhrComlink')
																	   .trigger('click')
												   // At this point, the event handler in the other javascript scope takes over.
												   // It will then trigger a dblclick event, which will then continue the process.
																	   .on('dblclick', function processRobotsWebpage (e) {
																		   var $comlink   = $(this)
																			 , remoteHTML = atob($comlink(this).text())
																			 , $remotePage = $(remoteHTML)
																			 ;

																		   if (!$comlink.hasClass('page')) { // This comlink isn't being used for an webpage.
																			   $.log('Comlink does not hold a webpage; quitting processRobotsWebpage.');
																			   return;
																		   }
																		   $.log('Comlink holds a webpage; processRobotsWebpage continuing.');
																		   var base = handleBaseTag($remotePage);
																		   populateImageLinks($remotePage);
																		   sendLinksToHandler(base);
																	   });
								  } else {
									  $.log('Processing ' + uri);
									  var $remotePage = $(data.results[0]);
									  var base = handleBaseTag($remotePage);
									  populateImageLinks($remotePage);
									  sendLinksToHandler(base);
								  }
							  }
				   });
		};

//---------------------------------------------------------------------------------------------------------

		!function init_storage_event_handling () {
			$.log('Attaching listener for storage events.');
			var handleStorage = function handleStorage (e) {
				$.log('Storage event detected');

				// Testing whether: 1) the key that was changed is the one we care about here, or
				//				  2) the new value of the key is different from when the script first initialized in this tab.
				//
				//  #2 is important; without it, if you have multiple tabs open, each with this script running, they would create
				// a feedback loop, each triggering a new storage event on the other when they remove the new URL from the key.
				//
				if (e.key !== 'Caabie_imageCache' || INNERCONTEXT.DATA.cachedImages === e.newValue) {
					return;
				}

				$.log('Storage event modified the image cache.');

				e.preventDefault();

				if ('undefined' !== e.oldValue && e.newValue.length < e.oldValue.length) { // Another instance modified the image cache
					INNERCONTEXT.DATA.cachedImages = localStorage.getItem([INNERCONTEXT.CONSTANTS.NAMESPACE, '_', 'imageCache'].join(''));
					return false;
				}

				var newURL = decodeURIComponent(JSON.parse(e.newValue || '[]').pop());
				INNERCONTEXT.UTILITY.setLSValue('imageCache', e.oldValue || '');

				var type = supportedImageType(newURL);
				if (type) {
					$.log('Received a new ' + type + ' URL: ' + newURL);
					getRemoteFile(newURL, type);
				}
				return false;
			};
			window.addEventListener("storage", handleStorage, false);
		}();

//---------------------------------------------------------------------------------------------------------

		!function init_add_caa_row_controls () {
			$.log('Adding CAA controls and event handlers.');

			var $thisForm	   = $('form[action*="merge_queue"]')
			  ;

			var caaResponseHandler = function caaResponseHandler (response, textStatus, jqXHR, data) {
				if ('object' !== typeof(response)) { // Firefox
					response = JSON.parse(response);
				}
				$.log('Received CAA response, parsing...');
				if ($.isEmptyObject(response)) {
					$.log('CAA response: no images in CAA for this release.');
					return;
				}

				var $newCAARow	  = data.$newCAARow
				  , $addButton	  = data.$addButton
				  , parseCAAResponse = function parseCAAResponse (i) {
					  $.log('Parsing CAA response: image #' + i);
					  if ($newCAARow.find('.newCAAimage').length < response.images.length) {
						  INNERCONTEXT.UI.addNewImageDropBox($newCAARow.find('.caaDiv'));
					  }
					  var $emptyDropBox = $newCAARow.find('.newCAAimage:first');
					  $emptyDropBox.removeClass('newCAAimage')
								   .find('input').replaceWith($.make('div').text(this.comment)).end()
								   .find('br, .closeButton').remove().end()
								   .find('select').prop('disabled', true);
					  // This next bit of code does the same thing as the lowsrc attribute.  This would have
					  // been easier, but lowsrc no longer exists in HTML5, and Chrome has dropped support for it.
					  // http://www.ssdtutorials.com/tutorials/title/html5-obsolete-features.html
					  var $img = $emptyDropBox.find('img');
					  $img[0].src = INNERCONTEXT.CONSTANTS.THROBBER;
					  $img.css('padding-top', '20px');
					  var realImg = new Image();
					  realImg.src = this.image;
					  realImg.onload = function assign_real_caa_image () {
						  $img.data('resolution', realImg.naturalWidth + ' x ' + realImg.naturalHeight);
						  var xhrReq = $.ajax({
							  url: realImg.src,
							  success: function lowsrc_workaround_success_handler (request) {
								  $img.data('size', INNERCONTEXT.UTILITY.addCommas(request.length))
									  .prop('src', realImg.src)
									  .css('padding-top', '0px');
							  }
							});
					  };
					  // End lowsrc workaround.
					  $.each(this.types, function assign_image_type (i) {
						  var value = $.inArray(this, INNERCONTEXT.CONSTANTS.COVERTYPES) + 1;
						  $emptyDropBox.find('option[value="' + value + '"]').prop('selected', true);
					  });
					  INNERCONTEXT.UTILITY.checkScroll($newCAARow.find('div.loadingDiv'));
				  };

				$.each(response.images, parseCAAResponse);
				$newCAARow.find('.loadingDiv, .caaAdd').toggle();
				$newCAARow.find('.caaDiv').slideDown('slow');
			};

			// INNERCONTEXT.UTILITY.loadRowInfo
			var loadRowInfo = function invoke_CAA_row_button_click_handler (e) {
				$.log('Add CAA images to release row button triggered.');
				var $row  = e.data.$row;

				$row.find('.loadingDiv').show();
				$row.find('.caaLoad').hide();
				$row.find('.caaDiv').slideUp();

				var $widthEle = $('.caaLoad:first').parents('td:first')
				  , $tableParent = $('.caaLoad:first').parents('table:first')
				  , caaRequest = 'http://coverartarchive.org/release/' + $.single( this ).data('entity')
				  ;

				if (!$tableParent.hasClass('tbl')) {
					$widthEle = $tableParent.parents('td:first');
				}
				for (var i = Math.max(3, ($widthEle.quickWidth(0)/132 << 0) - 5); i > 0; i--) {
					   $.single( this ).after(INNERCONTEXT.UI.$makeDropbox());
				}
				$.log('Requesting CAA info for ' + $.single( this ).data('entity'));
				$.ajax({ cache	: false
					   , context  : this
					   , url	  : caaRequest
					   , error	: function handler(jqXHR, textStatus, errorThrown, data) {
										// Reference http://tickets.musicbrainz.org/browse/CAA-24
										$.log('Ignore the XMLHttpRequest error.  CAA returned XML stating that CAA has no images for this release.');
										$row.find('div.loadingDiv, .caaAdd').toggle();
										$row.find('div.caaDiv').slideDown('slow');
									}
					   , success  : function caa_response_mediator (response, textStatus, jqXHR) {
										return caaResponseHandler(response, textStatus, jqXHR, { $row  : $row
																							   , $addButton : e.data.$addButton
																							   });
									}
					   });
			};





			// handle dynamically added release rows (e.g. http://userscripts.org/scripts/show/93894 )
			$.log('Adding release row event handler.');
			var handleInsertedReleaseRow = function handleInsertedReleaseRow () {
				$.single( this ).on('DOMNodeInserted', 'table', INNERCONTEXT.UI.addImageRow);
			};
			$thisForm.find('tbody')
					 .each(handleInsertedReleaseRow);
		}();

//---------------------------------------------------------------------------------------------------------

		!function init_add_caa_table_controls () {
			$.log('Adding CAA load all releases button.');
			var $caaAllBtn = $.make('input', { 'class' : 'caaAll'
											, title   : $.l('Load text all releases')
											, type	: 'button'
											, value   : $.l('Load CAA images for all')
											});

			$('table.tbl').before($.make('br'))
						  .before($caaAllBtn);
			$caaAllBtn.on('click', function caaAllBtn_click_handler () {
				$.log('CAA load all releases\' images button has been clicked.');
				$('.caaLoad:visible').each(function caaAllBtn_click_each_release_button () {
					$.log('Triggering a click on a CAA load images button.');
					$.single( this ).trigger('click');
				});
			});
		}();

//---------------------------------------------------------------------------------------------------------

		!function load_stored_images() {
				var image
				  , type
				  , imageArray = JSON.parse(INNERCONTEXT.UTILITY.getLSValue('imageCache'))
				  ;
				null !== imageArray && imageArray.length && imageArray.forEach(function load_stored_images_internal (url) {
					image = decodeURIComponent(url);
					(type = supportedImageType(image)) && getRemoteFile(image, type);
				});
			}();

//---------------------------------------------------------------------------------------------------------

		// Create image editor.
		!function create_image_editor_handler () {
			$.log('Adding handler for image editor.');
			$('body').on('click', '#previewImage', function image_editor_initial_handler (e) {
				var crop = { Left   : 0
						   , Top	: 0
						   , Right  : 0
						   , Bottom : 0
						   , height : 0
						   , width  : 0
						   };

				if ($('#previewImage').prop('src').length === 0) {
					return;
				}

				var $makeMask = function image_editor_create_mask (where) {
					return $.make('div', { 'class' : 'CAAmask'
										,  id	 : 'CAAmask' + where
										});
				};

				var $makeNumCtrl = function image_editor_create_crop_controls (where) {
					return $.make('label', { 'class' : 'cropLabel'
										  , id	: 'CAAeditorCropLabel' + where
										  , title : $.l(where)
										  }).text($.l(where))
											.prepend($.make('input', { 'class' : 'cropControl'
																	, id	  : 'CAAeditorCropControl' + where
																	, 'min'   : 0
																	, step	: 1
																	, title   : $.l('Crop image') + ': ' + $.l(where)
																	, type	: 'number'
																	, value   : 0
																	}));

				};
				var $makeFlipCtrl = function image_editor_create_flip_controls (direction) {
					var symbol = (direction === 'Vertical') ? '⇵' : '⇆';

					return $.make('input', { 'class' : 'flipControl'
										  , id	  : 'CAAeditorFlip' + direction
										  , title   : $.l('Flip image') + ' ' + symbol
										  , type	: 'button'
										  , value   : symbol
										  });

				};

				var $CAAimageEditor	 = $.make('div',	  { id : 'CAAimageEditor' }).hide()
				  , $ieDiv			  = $.make('div',	  { id : 'CAAeditorDiv' })
				  , $ieCanvasDiv		= $.make('div',	  { id : 'CAAeditorCanvasDiv' })
				  , $ieCanvas		   = $.make('canvas',   { id : 'CAAeditorCanvas' })
				  , $ieMenu			 = $.make('div',	  { id : 'CAAeditorMenu' })
				  , $ieRotateField	  = $.make('fieldset', { id : 'CAAeditorRotateField' })
				  , $ieRotateLegend	 = $.make('legend',   { id : 'CAAeditorRotateLegend' }).text($.l('Rotate image'))
				  , $ieRotateLabel	  = $.make('label',	{ id	: 'CAAeditorRotateLabel'
															, title : $.l('How many degrees')
															}).text(' ' + $.l('degrees'))
				  , $ieRotateControl	= $.make('input',	{ id : 'CAAeditorRotateControl'
															, 'max' : 360
															, 'min' : -360
															, step : 1
															, type : 'number'
															, value : 0
															})
				  , $ieFlipField		= $.make('fieldset', { id : 'CAAeditorFlipField' })
				  , $ieFlipLegend	   = $.make('legend',   { id : 'CAAeditorFlipLegend' }).text($.l('Flip image'))
				  , $ieCropField		= $.make('fieldset', { id : 'CAAeditorCropField' })
				  , $ieCropLegend	   = $.make('legend',   { id : 'CAAeditorCropLegend' }).text($.l('Crop image'))
				  , $applyCropButton	= $.make('input',	{ id		: 'CAAeditiorApplyCropBtn'
															, title	 : $.l('Apply')
															, type	  : 'button'
															, value	 : $.l('Apply')
															})
				  , $ieMaskColorLabel   = $.make('label',	{ 'class' : 'cropLabel'
															, id : 'CAAeditiorMaskColorLabel'
															, title : $.l('Crop mask color')
															}).text($.l('Crop mask color'))
				  , $ieMaskColorControl = $.make('input',	{ 'class' : 'cropControl'
															, id : 'CAAeditiorMaskColorControl'
															, type : 'color'
															, value : INNERCONTEXT.UTILITY.getColor('MASK')
															})
				  , $CAAoverlay		 = $.make('div',	  { id : 'CAAoverlay' }).hide()
				  , $ieButtonsField	 = $.make('fieldset', { id : 'CAAeditorBtnField' })
				  , $saveButton		 = $.make('input',	{ id		: 'CAAeditiorSaveImageBtn'
															, title	 : $.l('Save changes')
															, type	  : 'button'
															, value	 : $.l('Save')
															})
				  , $cancelButton	   = $.make('input',	{ id		: 'CAAeditiorCancelBtn'
															, title	 : $.l('Cancel')
															, type	  : 'button'
															, value	 : $.l('Cancel')
															})
				  ;

				$('body').detach(function create_image_editor_internal_detach_handler () {
					$(this).prepend(
							  $CAAimageEditor.appendAll(
											  [ INNERCONTEXT.UI.$makeCloseButton()
											  , $ieDiv.appendAll(
													   [ $ieCanvasDiv.appendAll(
																	  [ $makeMask('Left')
																	  , $makeMask('Right')
																	  , $makeMask('Top')
																	  , $makeMask('Bottom')
																	  , $ieCanvas
																	  ])
													   , $ieMenu.appendAll(
																 [ $ieRotateField.appendAll(
																				  [ $ieRotateLegend
																				  , $ieRotateLabel.prepend($ieRotateControl)
																				  ])
																 , $ieFlipField.appendAll(
																				[ $ieFlipLegend
																				, $makeFlipCtrl('Vertical')
																				, $makeFlipCtrl('Horizontal')
																				])
																 , $ieCropField.appendAll(
																				[ $ieCropLegend
																				, $makeNumCtrl('Top')
																				, $makeNumCtrl('Bottom')
																				, $makeNumCtrl('Left')
																				, $makeNumCtrl('Right')
																				, $ieMaskColorLabel.prepend($ieMaskColorControl)
																				, $applyCropButton
																				])
																 , $ieButtonsField.appendAll(
																				   [ $saveButton
																				   , $cancelButton
																				   ])
																 ])
													   ])
											  ]))
							 .prepend($CAAoverlay);
				});
				$.polyfillInputNumber();

				$.make('div', { 'class' : 'ui-state-error'
							 , id	  : 'CAAimageEditorCropError'
							 }).text($.l('Error too much cropping'))
							   .dialog({ autoOpen	  : false
									   , closeOnEscape : true
									   , title		 : $.l('Error')
									   });

				var imageRatio	 = $('#previewImage').quickWidth(0) / $('#previewImage').quickHeight(0)
					, c			= {}
				  , degreesRotated = 0
				  ;

				c.height = $('#CAAimageEditor').quickHeight(0) * 0.9 << 0;
				c.width  = c.height * imageRatio << 0;

				// If the above would lead to a canvas that would be wider than the editor window (a short but *really* wide image),
				// then figure out the height based on the editor window's width instead of the other way around.
				var editorWindowWidth = $('#CAAeditorDiv').getHiddenDimensions().width;

				if (editorWindowWidth < (c.width - 230)) {
					c.width  = editorWindowWidth - 230 << 0;
					c.height = c.width / imageRatio << 0;
				}

				$('#CAAeditorCanvasDiv').css({ height : c.height + 'px'
											 , width  : c.width + 'px'
											 });

				// Load the image into the canvas.
				var canvas = document.getElementById("CAAeditorCanvas")
				  , ctx = canvas.getContext("2d")
				  , img = new Image()
				// create a backup canvas for storing the unmodified image.
				  , backupCanvas = document.createElement("canvas")
				  , backupCtx = backupCanvas.getContext("2d")
				  ;

				img.onload = function load_image_handler () {
					// Set the canvas size attributes.  This defines the number of pixels *in* the canvas, not the size of the canvas.
					canvas.width  = crop.width  = img.width;
					canvas.height = crop.height = img.height;

					$('#CAAeditorCropControlTop, #CAAeditorCropControlBottom').prop('max', img.height);
					$('#CAAeditorCropControlLeft, #CAAeditorCropControlRight').prop('max', img.width);

					//TODO: The image is resized/cropped in image pixels, not canvas pixels.  Adjust the mask drawing function to adjust image pixels to canvas pixels.

					// Set the canvas css size.  This defines the size of the canvas, not the number of pixels *in* the canvas.
					canvas.style.height = c.height + 'px';
					canvas.style.width = c.width + 'px';

					ctx.drawImage(img, 0, 0);

					backupCanvas.width = canvas.width;
					backupCanvas.height = canvas.height;
					backupCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
				};

				img.src = $('#previewImage').prop('src');

				var prepCanvas = function prep_canvas_handler (callback) {
					var centerH		= canvas.height/2
					  , centerW		= canvas.width/2
					  ;
					// Clear the canvas
					ctx.save();
					ctx.setTransform(1, 0, 0, 1, 0, 0); // http://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
					ctx.clearRect(0, 0, canvas.width, canvas.height);
					ctx.restore();

					// Move the origin point to the center of the canvas
					ctx.translate(centerW, centerH);

					// Run the callback
					callback();

					// Move the origin point back to the top left corner of the canvas
					ctx.translate(-centerW, -centerH);

					// Draw the image into the canvas
					ctx.drawImage(backupCanvas, 0, 0);
					return;
				};

				var rotate = function rotate_handler (degrees) {
					var rotate = function rotate_internal_handler  () {
						ctx.rotate(-degreesRotated * Math.PI / 180);
						ctx.rotate(degrees * Math.PI / 180);
						degreesRotated = degrees;
					};
					prepCanvas(rotate);
					return;
				};

				var flip = function flip_handler  (h, v) {
					var flip = function flip_internal_handler () {
						ctx.scale(h ? -1 : 1, v ? -1 : 1);
					};
					prepCanvas(flip);
					return;
				};

				var cropMask = function handle_crop_mask_change (where) {
					var opposite
					  , direction
					  , $thisControl = $('#CAAeditorCropControl' + where)
					  , value = +$thisControl.val()
					  , background = '#FFF'
					  , color	  = '#000'
					  , limit = +$thisControl.prop('max')
					  , $canvas
					  , ratio
					  ;

					switch (where) {
						case 'Top'	: opposite = 'Bottom'; direction = 'height'; break;
						case 'Bottom' : opposite = 'Top';	direction = 'height'; break;
						case 'Left'   : opposite = 'Right';  direction = 'width';  break;
						case 'Right'  : opposite = 'Left';   direction = 'width';
					}

					if (0 > where) {
						value = 0;
						$thisControl.val(0);
					}

					if (limit < value) {
						value = limit;
						$thisControl.val(limit);
					}

					if (value + crop[opposite] >= limit) {
						background = 'pink';
						color	  = 'red';
						$('#CAAimageEditorCropError').dialog('open');
					}
					$thisControl.add('#CAAeditorCropControl' + opposite)
								.css({ background : background
									 , color	  : color
									 });

					crop[where] = value;
					$canvas = $('#CAAeditorCanvas');
					ratio = $canvas[direction]()/limit;
					$('#CAAmask' + where).css(direction, value * ratio << 0);
					return;
				};

				var applyCrop = function handle_apply_crop_click () {
					var canvas  = document.getElementById("CAAeditorCanvas")
					  , $canvas = $.single(canvas)
					  , copy	= document.createElement("canvas")
					  , ctx	 = canvas.getContext('2d')
					  ;

					// Create a copy of the current canvas.
					copy.height = canvas.height;
					copy.width = canvas.width;
					copy.getContext('2d').drawImage(canvas, 0, 0);

					// Clear the current canvas.
					ctx.clearRect(0, 0, canvas.width, canvas.height);

					// Calculate the width and height of the cropped area.
					crop.height = crop.height - crop.Top - crop.Bottom;
					crop.width  = crop.width - crop.Left - crop.Right;

					// Resize the current canvas (DOM).
					canvas.height = crop.height >> 0;
					canvas.width = crop.width >> 0;

					// Resize the current canvas (CSS).
					var dimensions = { base  : { // This is the max size to which the canvas can grow.
												 height : $('#CAAeditorCanvasDiv').quickHeight(0) << 0
											   , width  : $('#CAAeditorCanvasDiv').quickWidth(0) << 0
											   }
									 , css   : {}
									 , image : { // This is the current size of the cropped image.
												 height : canvas.height
											   , width  : canvas.width
											   }
									 };

					// This calculates the scaling ratio which will best fit the image.
					// http://stackoverflow.com/questions/1373035/how-do-i-scale-one-rectangle-to-the-maximum-size-possible-within-another-rectang
					dimensions.ratio = Math.min(dimensions.base.width  / dimensions.image.width,
												dimensions.base.height / dimensions.image.height);

					// This is the final calculated size for canvas.
					dimensions.css = { height : dimensions.ratio * dimensions.image.height
									 , width  : dimensions.ratio * dimensions.image.width
									 };

					// Apply the calculated size to the canvas.
					$canvas.css('height', dimensions.css.height + 'px')
						   .css('width',  dimensions.css.width  + 'px');

					// Adjust the max for the crop controls.
					$('#CAAeditorCropControlTop, #CAAeditorCropControlBottom').prop('max', dimensions.image.height);
					$('#CAAeditorCropControlLeft, #CAAeditorCropControlRight').prop('max', dimensions.image.width);

					// Draw the image from the backup canvas to the current canvas while applying the crop.
					ctx.drawImage(copy, crop.Left, crop.Top, crop.width, crop.height, 0, 0, crop.width, crop.height);
					return;
				};

				var resetCrop = function handle_apply_crop_click () {
					$('#CAAmaskTop, #CAAmaskBottom').css('height', 0);
					$('#CAAmaskLeft, #CAAmaskRight').css('width', 0);
					$('#CAAeditorCropControlTop, #CAAeditorCropControlBottom, #CAAeditorCropControlLeft, #CAAeditorCropControlRight').val(0);
					crop.Left = crop.Right = crop.Top = crop.Bottom = 0;
					crop.width = canvas.width;
					crop.height = canvas.height;
					return;
				};

				$('#CAAeditorDiv').on('click', '#CAAeditorFlipVertical', function flip_vertical_click_event_handler () {
					flip(0,1);
				});

				$('#CAAeditorDiv').on('click', '#CAAeditorFlipHorizontal', function flip_vertical_click_event_horizontal () {
					flip(1,0);
				});

				$('#CAAeditorDiv').on('change', '#CAAeditorRotateControl', function rotate_controls_change_event_handler () {
					rotate($.single( this ).val());
				});

				$('#CAAeditorDiv').on('change', '#CAAeditorCropControlTop', function crop_controls_change_event_handler_top () {
					cropMask('Top');
				});

				$('#CAAeditorDiv').on('change', '#CAAeditorCropControlBottom', function crop_controls_change_event_handler_bottom () {
					cropMask('Bottom');
				});

				$('#CAAeditorDiv').on('change', '#CAAeditorCropControlLeft', function crop_controls_change_event_handler_left () {
					cropMask('Left');
				});

				$('#CAAeditorDiv').on('change', '#CAAeditorCropControlRight', function crop_controls_change_event_handler_right () {
					cropMask('Right');
				});

				$('#CAAeditorDiv').on('click', '#CAAeditiorApplyCropBtn', function crop_controls_apply_crop_click_event_handler () {
					var canvas = document.getElementById("CAAeditorCanvas");

					applyCrop();
					resetCrop();
				});

				$('#CAAeditorDiv').on('click', '#CAAeditiorSaveImageBtn', function image_editor_save_button_click_handler () {
					var canvas = document.getElementById("CAAeditorCanvas")
					  , ctx = canvas.getContext("2d")
					  ;

					// Fill background of canvas with solid white box.  Without this, the default is a solid black background.
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.globalCompositeOperation = 'destination-over'; // Draw the new box behind the image.
					ctx.fillStyle = '#FFF';
					ctx.fillRect(0, 0, canvas.width, canvas.height);

//TODO: Apply cropping to saved images

					// Save the image.
					addImageToDropbox(
									 $.dataURItoBlob(
													canvas.toDataURL("image/jpeg"), 'jpeg'
													),
									 'edited image', ''
									 );

					// Close the image editor.
					$('#CAAeditiorCancelBtn').trigger('click');
				});

				// Create the css rule for the crop mask.
				$.make('style', { id : 'CAAeditiorMaskColorStyle' }).text('.CAAmask { background-color: ' + INNERCONTEXT.UTILITY.getColor('MASK') + '; }')
																   .attr('type', 'text/css')
																   .appendTo('head');

				// Create the color picker.
				$.log('Creating color picker for image editor');
				var iePicker = new jscolor.color(document.getElementById('CAAeditiorMaskColorControl'), {});
				iePicker.hash = true;
				iePicker.pickerFace = 5;
				iePicker.pickerInsetColor = 'black';
				iePicker.fromString(INNERCONTEXT.UTILITY.getColor('MASK'));

				// Add functionality to the color picker to change the css rule for the crop mask.
				$('#CAAeditiorMaskColorControl').on('change', function mask_controls_change_event_handler (e) {
					$('#CAAeditiorMaskColorStyle').text('.CAAmask { background-color: ' + this.value + '; }');
					iePicker.fromString(this.value);
				});

//TODO: Figure out why the image editor color picker isn't changing the color in Firefox
//TODO: Figure out why the image mask is invisible in Firefox

				$('#CAAoverlay').show();
				$('#CAAimageEditor').css('display', 'none')
									.animate({ height  : 'toggle'
											 , opacity : 'toggle'
											 }, 'slow');
			});
		}();
	};


*/
