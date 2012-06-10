// ==UserScript==
// @name        Testing 1
// @version     0.01.1128
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
// @exclude     http://musicbrainz.org/label/*/*
// @include     http://beta.musicbrainz.org/label/*
// @include     http://test.musicbrainz.org/label/*
// ==/UserScript==

// Translations handled at https://www.transifex.net/projects/p/CAABatch/

/*global console JpegMeta Blob BlobBuilder GM_xmlhttpRequest jscolor */
// See https://github.com/jshint/jshint/issues/541
/*jshint bitwise:false, forin:true, noarg:true, noempty:true, eqeqeq:true, es5:true, expr:true, strict:true, undef:true, curly:true, nonstandard:true, browser:true, jquery:true, maxerr:500, laxbreak:true, newcap:true, laxcomma:true */

/* Installation and requirements:

Firefox: Requires a minimum of version 11.  Install as normal.  When the script is run the first time, a prompt will come up.  Make sure to click "accept"!

Chrome: Install script.  Go to settings --> extensions ( chrome://chrome/extensions/ ) and make sure that the checkbox next to
"Allow access to file URLs" for this script is checked.  Then restart Chrome.  If you reinstall or upgrade the script, you may
need to restart the browser before the script works again.

Opera: Not compatible, sorry.

*/

//TODO: Image rotation
//TODO: Image clipping
//TODO: "About"
//TODO: Edit submission
//TODO: Eliminate the 2nd image load for remote images
//TODO: Clean up the temp file system after edit submissions and when images are removed
//TODO: Add support for editing existing CAA image data
//TODO: Add support for removing existing CAA images
//TODO: Load images which were cached while script was not running

var height = function (id) {
    'use strict';
    return document.getElementById(id).clientHeight;
};

var CONSTANTS = { DEBUGMODE     : true
                , VERSION       : '0.1.1128'
                , DEBUG_VERBOSE : false
                , BORDERS       : '1px dotted #808080'
                , COLORS        : { ACTIVE     : '#B0C4DE'
                                  , CAABOX     : '#F2F2FC'
                                  , CAABUTTONS : '#4B0082'
                                  , EDITOR     : '#F9F9F9'
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
                , SIDEBARWIDTH  : (Math.max(Math.round(window.innerWidth/500), 3) * 107) + 15
                , SIDEBARHEIGHT : window.innerHeight - height('header') - height('footer') - 25
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
                                       , 'How dark the bkgrnd'     : 'Image editor darkness level'
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
                                       , 'Remove stored images'    : 'Remove stored images'
                                       , 'Remove stored images nfo': 'This removes any images from other websites that you have stored while this script was not running.'
                                       , 'Shrink image'            : 'Zoom out'
                                       , 'Submit edits'            : 'Submit edits'
                                       , 'Submit as autoedits'     : 'Submit edits as autoedits'
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
                                       , EDITOR                    : 'Image editor background'
                                       , INCOMPLETE                : 'Incomplete edits'
                                       , COMPLETE                  : 'Edits ready to submit'
                                       , REMOVE                    : 'Remove image highlight'
                                       }
                                  }
                };

/* Special case Canadian English. */
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
                          , 'Submit as autoedits'     : '··--- --··· ·--· ···-'
                          , 'Remove stored images'    : '-·· -··- -···· ·--· ···-'
                          , 'Remove stored images nfo': '-···· ·--· ···--·· -··- -···· ·--· ···-'
                          , 'How dark the bkgrnd'     : '··-- -- - -··- -·-- --·-··'
                          , EDITOR                    : '--- - -··- -·-- --··'
                          };
}

// Gets a color value stored in localStorage.
var getColor = function getColor (color) {
    'use strict';
    return localStorage.getItem('caaBatch_colors_' + color);
};

// Converts a hex color string into an rgba color string
var hexToRGBA = function hexToRGBA (hex, opacity) {
    'use strict';
    hex = ('#' === hex.charAt(0) ? hex.substring(1, 7) : hex);
    var R = parseInt(hex.substring(0, 2), 16)
      , G = parseInt(hex.substring(2, 4), 16)
      , B = parseInt(hex.substring(4, 6), 16)
      ;
    return 'rgba(' + [R, G, B, opacity].join(',') + ')';
};

var shrink = ['scale', '(', CONSTANTS.BEINGDRAGGED.SHRINK, ')'].join('');

/* Initialize the image editor's background opacity store, if needed. */
if (localStorage.getItem('CAAeditor000') === null) {
    localStorage.setItem('CAAeditor000', 75);
}

CONSTANTS.CSS = { '#ColorDefaultBtn':
                      { 'background-color'      : '#D3D3D3'
                      },
                  '#caaVersion':
                      { 'float'                 : 'right'
                      , 'font-size'             : '75%'
                      , 'margin-top'            : '-15px'
                      },
                  '#colorPicker':
                      {  border                 : '1px outset #D3D3D3'
                      ,  padding                : '10px' // This makes the default box around the color disappear on Chrome
                      },
                  '#colorSelect':
                      { 'float'                 : 'left'
                      ,  padding                : '5px'
                      ,  width                  : '202px'
                      },
                  '#CAAeditorDarknessControl':
                      { 'margin-left'           : '5px'
                      ,  width                  : '3.5em'
                      },
                  '#editor000Container':
                      {  display                : 'inline-block'
                      },
                  '#imageContainer':
                      {  height                 : (CONSTANTS.SIDEBARHEIGHT - CONSTANTS.PREVIEWSIZE - 145) + 'px'
                      , 'max-height'            : (CONSTANTS.SIDEBARHEIGHT - CONSTANTS.PREVIEWSIZE - 145) + 'px'
                      , 'overflow-y'            : 'auto'
                      },
                  '#imageHeader':
                      { 'float'                 : 'left'
                      ,  width                  : '30%'
                      },
                  '#imageSizeControlsMenu':
                      { 'float'                 : 'right'
                      , 'height'                : '24px'
                      ,  width                  : '25%'
                      },
                  '#languageSelect':
                      {  height                 : '5em'
                      ,  margin                 : '10px 10px -27px 6px'
                      ,  padding                : '6px'
                      },
                  '#optionsHeader':
                      {  display                : 'inline-block'
                      , 'float'                 : 'right'
                      , 'margin-right'          : '-24px'
                      , 'margin-top'            : '-3px'
                      ,  filter                 : 'alpha(opacity=30)'
                      , '-moz-opacity'          : '0.3'
                      ,  opacity                : '0.3'
                      ,  width                  : '40%'
                      },
                  '#optionsMenu':
                      {  border                 : '1px solid #D3D3D3'
                      ,    '-moz-border-radius' : '8px'
                      , '-webkit-border-radius' : '8px'
                      ,         'border-radius' : '8px'
                      , 'line-height'           : 2
                      ,  margin                 : '10px 3px'
                      ,  padding                : '8px'
                      },
                  '#optionsMenu * select':
                      { 'font-size'             : '105%'
                      },
                  '#optionsMenu > label > select':
                      {  padding                : '3px'
                      },
                  '#optionsMenu > label, #optionsMenu > label > select':
                      { 'margin-left'           : '5px'
                      , 'margin-top'            : '5px'
                      },
                  '#optionsMenu > summary':
                      { 'line-height'           : 2
                      },
                  '#optionsNote':
                      { 'font-size'             : '85%'
                      , 'font-style'            : 'oblique'
                      },
                  '#page':
                      { 'min-height'            : (CONSTANTS.SIDEBARHEIGHT - 50) + 'px'
                      },
                  '#previewText':
                      { 'line-height'           : '140%'
                      ,  margin                 : '0 auto'
                      , 'padding-top'           : '10px'
                      ,  width                  : '60%'
                      },
                  '#previewText > dd':
                      { 'float'                 : 'right'
                      },
                  '#xhrComlink':
                      {  display                : 'none'
                      },
                  '#CAAoverlay':
                      {  background             : 'black'
                      ,  bottom                 : 0
                      ,  filter                 : 'alpha(opacity=' + localStorage.getItem('CAAeditor000') + ')'
                      ,  left                   : 0
                      , '-moz-opacity'          : localStorage.getItem('CAAeditor000') / 100
                      ,       opacity           : localStorage.getItem('CAAeditor000') / 100
                      ,  position               : 'fixed'
                      ,  top                    : 0
                      ,  width                  : '100%'
                      ,  'z-index'              : 1000
                      },
                  '#CAAimageEditor':
                      { 'background-color'      : getColor('EDITOR')
                      ,    '-moz-box-shadow'    : 'inset 0 0 10px #FFF, 2px 2px 8px 3px #111'
                      , '-webkit-box-shadow'    : 'inset 0 0 10px #FFF, 2px 2px 8px 3px #111'
                      ,         'box-shadow'    : 'inset 0 0 10px #FFF, 2px 2px 8px 3px #111'
                      ,  border                 : '1px outset grey'
                      , 'border-radius'         : '20px'
                      ,  height                 : '86%'
                      ,  left                   : '50%'
                      ,  margin                 : '0 auto'
                      , 'margin-left'           : '-43%'
                      , 'margin-top'            : '-43%'
                      ,  padding                : '2%'
                      ,  position               : 'fixed'
                      ,  top                    : '50%'
                      ,  width                  : '86%'
                      , 'z-index'               : 2000
                      },
                  '#CAAeditorDiv':
                      {  height                 : '96%'
                      ,  margin                 : '2%'
                      ,  width                  : '96%'
                      },
                  '*':
                      {    '-moz-box-sizing'    : 'border-box'
                      , '-webkit-box-sizing'    : 'border-box'
                      ,         'box-sizing'    : 'border-box'
                      },
                  '.beingDragged':
                      {  filter                 : 'alpha(opacity=' + (100 * CONSTANTS.BEINGDRAGGED.OPACITY) + ')'
                      , '-moz-opacity'          : CONSTANTS.BEINGDRAGGED.OPACITY
                      ,  opacity                : CONSTANTS.BEINGDRAGGED.OPACITY
                      ,    '-moz-transform'     : shrink
                      , '-webkit-transform'     : shrink
                      ,      '-o-transform'     : shrink
                      ,          transform      : shrink
                      },
                  '.CAAdropbox':
                      {    '-moz-border-radius' : '6px'
                      , '-webkit-border-radius' : '6px'
                      ,         'border-radius' : '6px'
                      , 'float'                 : 'left'
                      ,  margin                 : '6px'
                      , 'min-height'            : '126px'
                      ,  padding                : '3px'
                      , 'vertical-align'        : 'middle'
                      ,  width                  : '126px'
                      },
                  '.CAAdropbox > div':
                      {  display                : 'block'
                      ,  height                 : '120px'
                      ,  margin                 : '3px auto'
                      },
                  '.CAAdropbox > div > img':
                      { display                 : 'block'
                      , 'image-rendering'       : 'optimizeQuality'
                      ,  margin                 : '0 auto'
                      , 'max-height'            : '120px'
                      , 'max-width'             : '120px'
                      },
                  '.CAAdropbox > figcaption':
                      {  height                 : '14em'
                      ,  position               : 'relative'
                      , 'text-align'            : 'center'
                      },
                  '.CAAdropbox > figcaption > div':
                      { 'font-size'             : '80%'
                      ,  height                 : '2.5em'
                      },
                  '.CAAdropbox > figcaption > input':
                      { 'font-size'             : '12px'
                      ,  width                  : '90%'
                      },
                  '.CAAdropbox > figcaption > input, .CAAdropbox > figcaption > div':
                      {  clear                  : 'both'
                      },
                  '.CAAdropbox > figcaption > select':
                      { 'background-color'      : 'transparent'
                      ,  clear                  : 'both'
                      ,  clip                   : 'rect(2px, 49px, 145px, 2px)'
                      ,  color                  : '#555'
                      , 'font-size'             : 'inherit'
                      ,  left                   : '36px'
                      , 'padding-bottom'        : '20px'
                      , 'padding-right'         : '20px'
                      , 'padding-top'           : '8px'
                      ,  position               : 'absolute'
                      , 'text-align'            : 'center'
                      },
                  '.caaAdd':
                      { 'background-color'      : 'green!important'
                      ,  border                 : '0 none #FAFAFA!important'
                      ,    '-moz-border-radius' : '7px'
                      , '-webkit-border-radius' : '7px'
                      ,         'border-radius' : '7px'
                      ,  color                  : '#FFF!important'
                      , 'float'                 : 'left'
                      , 'font-size'             : '175%'
                      , 'font-weight'           : '900!important'
                      ,  left                   : '2em'
                      , 'margin-left'           : '-1.2em'
                      ,  filter                 : 'alpha(opacity=30)'
                      , '-moz-opacity'          : '0.3'
                      ,  opacity                : '0.3'
                      , 'padding-bottom'        : 0
                      , 'padding-top'           : 0
                      ,  position               : 'absolute'
                      },
                  '.caaAdd:active, .caaAll:active, .caaLoad:active':
                      { 'border-style'          : 'inset!important'
                      ,  color                  : '#FFF'
                      ,  filter                 : 'alpha(opacity=100)'
                      , '-moz-opacity'          : '1'
                      ,  opacity                : 1
                      },
                  '.caaAdd:hover, .caaAll:hover, .caaLoad:hover':
                      {  color                  : '#D3D3D3'
                      ,  filter                 : 'alpha(opacity=90)'
                      , '-moz-opacity'          : '0.9'
                      ,  opacity                : '.9'
                      },
                  '.caaDiv':
                      { 'padding-left'          : '25px'
                      },
                  '.caaLoad, .caaAll':
                      { 'background-color'      : getColor('CAABUTTONS') + '!important'
                      ,  border                 : '1px outset #FAFAFA!important'
                      , 'border-radius'         : '7px'
                      ,  color                  : '#FFF!important'
                      , 'font-size'             : '90%'
                      , 'margin-bottom'         : '16px'
                      , 'margin-top'            : '1px!important'
                      ,  filter                 : 'alpha(opacity=35)'
                      , '-moz-opacity'          : '0.35'
                      ,  opacity                : '.35'
                      ,  padding                : '3px 8px'
                      },
                  '.newCAAimage':
                      { 'background-color'      : getColor('CAABOX')
                      },
                  '.newCAAimage > div':
                      { 'background-color'      : '#E0E0FF'
                      ,  border                 : CONSTANTS.BORDERS
                      , 'margin-bottom'         : '6px!important'
                      },
                  '.tintWrapper':
                      { 'background-color'      : hexToRGBA(getColor('REMOVE'), '0.8')
                      , 'border-radius'         : '5px'
                      ,  display                : 'inline-block'
                      ,  margin                 : 0
                      ,  filter                 : 'alpha(opacity=80)'
                      , '-moz-opacity'          : '0.8'
                      ,  opacity                : '0.8'
                      ,  outline                : 0
                      ,  padding                : 0
                      , 'vertical-align'        : 'baseline'
                      },
                  '#previewContainer':
                      { height                  : (CONSTANTS.PREVIEWSIZE + 37) + 'px'
                      , 'max-height'            : (CONSTANTS.PREVIEWSIZE + 37) + 'px'
                      },
                  '#previewImage':
                      {  display                : 'block'
                      ,  height                 : (CONSTANTS.PREVIEWSIZE + 15) + 'px'
                      ,  margin                 : '0 auto'
                      , 'max-height'            : (CONSTANTS.PREVIEWSIZE + 15) + 'px'
                      ,  padding                : '15px 0 0 0'
                      },
                  '#sidebar':
                      { 'border-left'           : CONSTANTS.BORDERS
                      , 'padding-left'          : '8px'
                      ,  position               : 'fixed'
                      ,  right                  : '20px'
                      ,  width                  : CONSTANTS.SIDEBARWIDTH + 'px'
                      },
                  '.closeButton':
                      { 'background-color'      : '#FFD0DB'
                      ,  border                 : '1px solid #EEC9C8'
                      ,    '-moz-border-radius' : '8px'
                      , '-webkit-border-radius' : '8px'
                      ,         'border-radius' : '8px'
                      ,  cursor                 : 'pointer'
                      , 'float'                 : 'right'
                      , 'line-height'           : '.8em'
                      , 'margin-right'          : '-1em'
                      , 'margin-top'            : '-.95em'
                      ,  filter                 : 'alpha(opacity=90)'
                      , '-moz-opacity'          : '0.9'
                      ,  opacity                : '0.9'
                      ,  padding                : '2px 4px 5px'
                      },
                  '.closeButton:hover':
                      { 'background-color'      : '#FF82AB'
                      , 'font-weight'           : '900'
                      ,  filter                 : 'alpha(opacity=100)'
                      , '-moz-opacity'          : '1.0'
                      ,  opacity                : '1.0'
                      },
                  '.existingCAAimage':
                      { 'background-color'      : '#FFF'
                      ,  border                 : '0 none'
                      },
                  '.existingCAAimage > div > img':
                      {  border                 : '0 none'
                      , 'image-rendering'       : 'optimizeQuality'
                      },
                  '.imageRow':
                      { 'overflow-x'            : 'auto'
                      , 'padding-bottom'        : '1em!important'
                      },
                  '.imageSizeControl, #optionsHeader':
                      {  cursor                 : 'pointer'
                      , 'float'                 : 'right'
                      ,  height                 : '26px'
                      ,  width                  : '26px'
                      },
                  '.imageSizeControl:hover, #optionsHeader:hover':
                      {  filter                 : 'alpha(opacity=100)'
                      , '-moz-opacity'          : '1'
                      ,  opacity                : 1
                      },
                  '.localImage':
                      {  padding                : '3px'
                      , 'vertical-align'        : 'top'
                      },
                  '.newCAAimage > div > img':
                      { 'min-height'            : '120px'
                      , 'image-rendering'       : 'optimizeQuality'
                      },
                  '.over':
                      { 'background-color'      : getColor('ACTIVE')
                      },
                  '.previewDT':
                      {  clear                  : 'left'
                      , 'float'                 : 'left'
                      , 'font-weight'           : '700'
                      },
                  '.previewDT::after':
                      {  content                : '"\003A "'
                      },
                  '.tintImage, .imageSizeControl':
                      {  filter                 : 'alpha(opacity=40)'
                      , '-moz-opacity'          : '0.4'
                      ,  opacity                : '0.4'
                      },
                  '.workingCAAimage':
                      { 'padding-left'          : '1px'
                      , 'padding-right'         : '1px'
                      },
                  '.workingCAAimage > div':
                      { 'margin-bottom'         : '8px!important'
                      },
                  'div.loadingDiv > img':
                      {  height                 : '30px'
                      , 'image-rendering'       : 'optimizeQuality'
                      , 'padding-right'         : '10px'
                      ,  width                  : '30px'
                      },
                  'fieldset':
                      {  border                 : '1px solid #D3D3D3'
                      ,    '-moz-border-radius' : '8px'
                      , '-webkit-border-radius' : '8px'
                      ,         'border-radius' : '8px'
                      ,  margin                 : '30px -4px 7px'
                      ,  padding                : '6px'
                      },
                  'figure':
                      {  border                 : CONSTANTS.BORDERS
                      },
                  'input[type="color"], #ColorDefaultBtn, #ClearStorageBtn':
                      {  border                 : '1px outset #D3D3D3'
                      ,    '-moz-border-radius' : '6px'
                      , '-webkit-border-radius' : '6px'
                      ,         'border-radius' : '6px'
                      ,  cursor                 : 'pointer'
                      , 'font-family'           : 'Bitstream Vera Sans, Verdana, Arial, sans-serif'
                      , 'font-size'             : '100%'
                      , 'margin-right'          : '0'
                      , 'outline'               : 'none'
                      ,  padding                : '3px'
                      , 'text-align'            : 'center'
                      },
                  '#ClearStorageBtn':
                      { 'background-color'      : 'red'
                      ,  color                  : '#FFF'
                      , 'font-weight'           : 700
                      ,  filter                 : 'alpha(opacity=70)'
                      , '-moz-opacity'          : '0.7'
                      ,  opacity                : '.7'
                      ,  width                  : '190px'
                      },
                  '#ClearStorageBtn:disabled':
                      { 'background-color'      : 'grey'
                      ,  color                  : '#000'
                      , 'text-decoration'       : 'line-through'
                      },
                  '#colorPicker, #ColorDefaultBtn':
                      { 'float'                 : 'right'
                      ,  width                  : '79px'
                      },
                  '#colorPicker:active, #ColorDefaultBtn:active, #ClearStorageBtn:active':
                      {  border                 : '1px inset #D3D3D3'
                      ,  filter                 : 'alpha(opacity=100)'
                      , '-moz-opacity'          : '1'
                      ,  opacity                : '1'
                      },
                  'legend':
                      {  color                  : '#000!important'
                      , 'font-size'             : '108%!important'
                      },
                  'table.tbl * table, #imageContainer, #previewContainer':
                      {  width                  : '100%'
                      },
                  'table.tbl .count':
                      {  width                  : '6em!important'
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
        for (var binary_string = '', i = 0, len = data.length; i < len; i++) {
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

    var supportedImageFormats = ['bmp', 'gif', 'jpg', 'png']
      , cachedImages = localStorage.getItem('caaBatch_imageCache')
      ;

    /* Faster element creation. (3 to 4 times faster vs $('<type/>') )  */
    var $make = function (type) {
        return $(document.createElement(type));
    };

    /* Creates a generic close button.  */
    var $makeCloseButton = function () {
        return $make('header').text('x')
                              .addClass('closeButton');
    };

    /* This forces CONSTANTS.THROBBER to be already be loaded, so that the throbber shows up faster. */
    $('body').append($make('img').prop('src', CONSTANTS.THROBBER).hide());

    var $imageContainer
      , $previewContainer
      , sizeStatus
      , $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    /* This function does a little magic.  It makes sure that the horizontal scrollbar on CAA rows only shows when it needs to. */
    var checkScroll = function checkScroll ($caaDiv) {
        $.log('Adjusting negative right margin.', 1);
        if ('undefined' === typeof $caaDiv.data('width')) {
            $caaDiv.data('width', $caaDiv.width());
        }
        var $dropboxes = $caaDiv.find('.CAAdropbox');
        var $dropbox   = $dropboxes.filter(':first')
          , dbCount    = $dropboxes.length;
        var dbWidth    = $dropbox.outerWidth(true);
        var divWidth   = $('.CAAdropbox').length * dbWidth;
        $.log('Calculated width: ' + ($caaDiv.data('width') - divWidth), 1);
        $caaDiv.css('margin-right', Math.min(0, $caaDiv.data('width') - divWidth - 115) + 'px');
    };

    /* Converts a number into a comma-separated number. */
    var addCommas = function addCommas (numberString) {
        var x  = ('' + numberString).split('.')
          , x1 = x[0]
          , x2 = x.length > 1 ? '.' + x[1] : ''
          , separatorRegexp = /(\d+)(\d{3})/
          ;

        while (separatorRegexp.test(x1)) {
            x1 = x1.replace(separatorRegexp, '$1' + ',' + '$2');
        }
        return x1 + x2;
    };

    /* Checks that an editbox has both an image and a cover type.  Returns the associated color for the current editbox' status. */
    var getEditColor = function get_edit_color_by_completeness ($ele) {
        $.log('Testing edit status to determine background color for dropbox.');
        var state = ($ele.find('option:selected').length && $ele.find('img').hasProp('src'));
        return $.getColor(state ? 'COMPLETE' : 'INCOMPLETE');
    };

    var tintImageRed = function tint_image_Red (image) {
        $.log('Tinting image');
        var $image = $(image);
        return $image.wrap($make('figure').addClass('tintWrapper')
                                          .css({ height : ($image.height() + 6) + 'px'
                                               , width  : ($image.width() + 6) + 'px'
                                               }))
                     .data('oldtitle', $image.prop('title'))
                     .prop('title', $.l('Remove image'))
                     .addClass('tintImage');
    };


    /* Polyfill to add FileSystem API support to Firefox. */
    if ('undefined' === typeof (window.requestFileSystem || window.webkitRequestFileSystem)) {
        $.addScript('idbFileSystem');
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

            $imageContainer      = $make('div').prop('id', 'imageContainer');
            $previewContainer    = $make('div').prop('id', 'previewContainer');
            var colorOptions     = []
              , optionsImage     = localStorage.getItem('iconSettings')
              , baseImage        = localStorage.getItem('magnifyingGlassBase')
              , minusImage       = baseImage + localStorage.getItem('magnifyingGlassMinus')
              , plusImage        = baseImage + localStorage.getItem('magnifyingGlassPlus')
              , $autoeditControl = $make('input'   ).prop('id', 'caaAutoedit')
                                                    .prop('type', 'checkbox')
                                                    .prop('title', $.l('Submit as autoedits'))
              , $autoeditLabel   = $make('label'   ).prop('for', 'caaAutoedit')
                                                    .prop('id', 'caaAutoeditLabel')
                                                    .prop('title', $.l('Submit as autoedits'))
                                                    .text($.l('Submit as autoedits'))
              , $colorDefault    = $make('input'   ).prop('id', 'ColorDefaultBtn')
                                                    .prop('title', $.l('Changed colors note'))
                                                    .prop('type', 'button')
                                                    .prop('value', $.l('default'))
              , $colorField      = $make('fieldset').prop('id', 'colorField')
              , $colorLegend     = $make('legend'  ).prop('id', 'colorLegend')
                                                    .text($.l('Colors'))
              , $colorPicker     = $make('input'   ).prop('id', 'colorPicker')
                                                    .prop('title', $.l('Changed colors note'))
                                                    .prop('type', 'color')
                                                    .prop('value', '66ff00')
              , $colorSelect     = $make('select'  ).prop('id', 'colorSelect')
                                                    .prop('title', $.l('Changed colors note'))
                                                    .prop('size', 5)
              , $ddFilesize      = $make('dd'      ).prop('id', 'previewFilesize')
              , $ddResolution    = $make('dd'      ).prop('id', 'previewResolution')
              , $dtFilesize      = $make('dt'      ).addClass('previewDT')
                                                    .prop('id', 'dtFilesize')
                                                    .text($.l('File size'))
              , $dtResolution    = $make('dt'      ).addClass('previewDT')
                                                    .prop('id', 'dtResolution')
                                                    .text($.l('(Image) Resolution'))
              , $editor000Contnr = $make('div'     ).prop('id', 'editor000Container')
              , $editor000Ctrl   = $make('input'   ).prop('id', 'CAAeditorDarknessControl')
                                                    .prop('type', 'number')
                                                    .prop('step', 1)
                                                    .prop('min', 0)
                                                    .prop('max', 100)
                                                    .prop('value', 75)  // TODO: Don't hardcode this
              , $editor000Label  = $make('label'   ).prop('for', 'CAAeditorDarknessControl')
                                                    .prop('id', 'CAAeditorDarknessLabel')
                                                    .prop('title', $.l('How dark the bkgrnd'))
                                                    .text($.l('How dark the bkgrnd'))
              , $imageMagnify    = $make('div'     ).addClass('imageSizeControl')
                                                    .prop('id', 'imageMagnify')
                                                    .prop('title', $.l('Magnify image'))
              , $imageShrink     = $make('div'     ).addClass('imageSizeControl')
                                                    .prop('id', 'imageShrink')
                                                    .prop('title', $.l('Shrink image'))
              , $langLabel       = $make('label'   ).prop('for', 'languageSelect')
                                                    .prop('id', 'languageSelectLabel')
                                                    .prop('title', $.l('Changed language note'))
                                                    .text($.l('Language') + ':')
              , $langList        = $make('select'  ).prop('id', 'languageSelect')
                                                    .prop('size', 3)
                                                    .prop('title', $.l('Changed language note'))
              , $optionsControl  = $make('div'     ).prop('id', 'optionsHeader')
                                                    .prop('title', $.l('Options'))
              , $optionsLegend   = $make('legend'  ).text($.l('Options'))
                                                    .prop('id', 'optionsLegend')
              , $optionsMenu     = $make('fieldset').prop('id', 'optionsMenu')
                                                    .hide()
              , $optionsNote     = $make('div'     ).prop('id', 'optionsNote')
                                                    .text($.l('take effect next time'))
              , $parseControl    = $make('input'   ).prop('id', 'caaOptionParse')
                                                    .prop('title', $.l('Parse (help)'))
                                                    .prop('type', 'checkbox')
              , $parseLabel      = $make('label'   ).prop('for', 'caaOptionParse')
                                                    .prop('id', 'caaOptionParseLabel')
                                                    .prop('title', $.l('Parse (help)'))
                                                    .text($.l('Parse web pages'))
              , $previewImage    = $make('img'     ).prop('id', 'previewImage')
                                                    .prop('draggable', false)
              , $previewInfo     = $make('dl'      ).prop('id', 'previewText')
                                                    .hide()
              , $storageBtn      = $make('input'   ).prop('id', 'ClearStorageBtn')
                                                    .prop('title', $.l('Remove stored images nfo'))
                                                    .prop('type', 'button')
                                                    .prop('value', $.l('Remove stored images'))
                                                    .prop('disabled', localStorage.getItem('caaBatch_imageCache') === null)
              , $removeControl   = $make('input'   ).prop('id', 'caaOptionRemove')
                                                    .prop('title', $.l('Remove (help)'))
                                                    .prop('type', 'checkbox')
              , $removeLabel     = $make('label'   ).prop('for', 'caaOptionRemove')
                                                    .prop('id', 'caaOptionRemoveLabel')
                                                    .prop('title', $.l('Remove (help)'))
                                                    .text($.l('Remove images'))
              , $sizeContainer   = $make('div'     ).prop('id', 'imageSizeControlsMenu')
              , $version         = $make('span'    ).prop('id', 'caaVersion')
                                                    .text([$.l('Version'), ' ', CONSTANTS.VERSION].join(''))
              ;

            /* Populate the colors list */
            Object.keys(CONSTANTS.COLORS).map(function (colorItem) {
                var color       = CONSTANTS.COLORS[colorItem]
                  ;
                var $thisOption = $make('option').addClass('colorOption')
                                                 .prop('value', colorItem)
                                                 .data('default', color)
                                                 .text($.l(colorItem));
                if (localStorage.getItem('caaBatch_colors_' + colorItem) === null) {
                    $.log('Initializing localStorage for ' + 'caaBatch_colors_' + colorItem + ' to ' + color);
                    localStorage.setItem('caaBatch_colors_' + colorItem, color);
                }
                colorOptions.push($thisOption);
            })

            /* Populate the languages list */
            var languages = [];

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
                                              return $make('option').prop('selected', (language[0] === userLang))
                                                                    .prop('value', language[0])
                                                                    .text(language[1]);
                                          });

            /* Populate the DOM */
            $('#sidebar').empty()
                         .appendAll([ $make('h1').prop('id', 'imageHeader')
                                                 .text($.l('Images'))
                                    , $sizeContainer.appendAll([ $imageMagnify.append(plusImage)
                                                               , $imageShrink.append(minusImage)
                                                               ])
                                    , $optionsControl.append(optionsImage)
                                    , $imageContainer.append($optionsMenu.appendAll([ $optionsLegend
                                                                                    , $version
                                                                                    , $removeControl
                                                                                    , $removeLabel
                                                                                    , $make('br')
                                                                                    , $parseControl
                                                                                    , $parseLabel
                                                                                    , $make('br')
                                                                                    , $storageBtn
                                                                                    , $make('br')
                                                                                    , $langLabel.append($langList.appendAll($ARRlangs))
                                                                                    , $colorField.appendAll([ $colorLegend
                                                                                                            , $colorSelect.appendAll(colorOptions)
                                                                                                            , $colorPicker
                                                                                                            , $colorDefault
                                                                                                            , $editor000Contnr.append($editor000Label.append($editor000Ctrl))
                                                                                                            ])
                                                                                    , $optionsNote
                                                                                    ]))
                                    , $make('hr').css('border-top', CONSTANTS.BORDERS)
                                    , $make('h1').prop('id', 'previewHeader')
                                                 .text($.l('Preview Image'))
                                    , $previewContainer.appendAll([ $previewImage
                                                                  , $previewInfo.appendAll([ $dtResolution
                                                                                           , $ddResolution
                                                                                           , $dtFilesize
                                                                                           , $ddFilesize
                                                                                           ])
                                                                  ])
                                    ]);

            /* Autoeditor check */
            var autoeditorList = JSON.parse(localStorage.getItem('autoeditors')),
                thisEditor = $('.account > a:first').text();
            if (-1 !== $.inArray(thisEditor, autoeditorList)) {
                $.log('The stored autoeditor preference is set to: ' + localStorage.getItem('caaBatch_autoeditPref'));
                /* The following non-typical bool test is required here!  localStorage.getItem actually returns a Storage
                   object, even though it *looks* like it is returning a string. */
                var autoeditPref = (localStorage.getItem('caaBatch_autoeditPref') === "true");
                $autoeditControl[0].checked = autoeditPref;
                $autoeditControl.add($autoeditLabel)
                                .add($make('br'))
                                .insertBefore($parseControl);
            }

            // Firefox renders slideToggle() incorrectly here; just use toggle() instead in Firefox.
            $optionsControl.click(function optionsControl_click_handler() {
                $.browser.mozilla ? $optionsMenu.toggle() : $optionsMenu.slideToggle();
            });
        }();

        /* Add remember preferences capability to the autoedit checkbox. */
        !function autoedit_checkbox_handler () {
            $.log('Adding handler for remembering preferences of the autoedit checkbox.');
            $('#caaAutoedit').on('click', function (e) {
                $.log('Autoeditor pref now set to: ' + $(this).is(':checked'));
                localStorage.setItem('caaBatch_autoeditPref', $(this).is(':checked'));
            });
        }();

        /* Add functionality to the language selector. */
        !function add_color_select_handler () {
            $.log('Adding handler for language selector.');
            $('#languageSelect').on('change', function (e) {
                localStorage.setItem('caaBatch_language', $(this).find(':selected').val());
                $('#languageSelect').prop('disabled', true);
            });
        }();

        /* Add functionality to the clear image storage button. */
        !function add_clear_image_storage_handler () {
            $.log('Adding handler for the clear image storage button.');
            $('#ClearStorageBtn').on('click', function (e) {
                localStorage.removeItem('caaBatch_imageCache');
                $('#ClearStorageBtn').prop('disabled', true);
                cachedImages = [];
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
                               $.getColor([ $firstOption.val() ])
                               );
        }();

        /* Add functionality to the default color button. */
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

        /* Add functionality to close buttons. */
        !function add_close_button_handler () {
            $.log('Adding handlers for close buttons.');
            $('body').on('click', '.closeButton', function close_button_click_handler (e) {
                $.log('Removing drop box/image editor');
                $(this).parent().find('.dropBoxImage') /* Any image in the drop box */
                                .appendTo($('#imageContainer'))
                                .addClass('localImage')
                                .removeClass('dropBoxImage');
                $('#CAAimageEditor').animate({ height  : 'toggle'
                                             , opacity : 'toggle'
                                             }, 'slow');
                $('#CAAoverlay').fadeOut('fast');
                $(this).parent() // -> drop boxes
                       .add('#CAAimageEditor, #CAAoverlay') // -> image editor
//                       .remove();
            });
        }();

        /* Add functionality for remove image mode. */
        !function add_remove_image_handlers () {
            $.log('Adding handlers for remove image mode.');
            $('#imageContainer').on('mouseenter', '.localImage', function localImage_hover_in_handler (e) {
                                    $('#caaOptionRemove').prop('checked') && tintImageRed(e.target);
                                })
                                .on('mouseleave', '.localImage', function localImage_hover_out_handler (e) {
                                    var $e = $(e.target);
                                    $e.parents('.tintWrapper:first').length && $e.removeClass('tintImage')
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

            var CSS   = CONSTANTS.CSS
              , sizes = CONSTANTS.IMAGESIZES
              , theseRules
              , classes = []
              ;

            $.log('Adding css for the CAA batch script.');
            $make('style').prop('type', 'text/css').text(Object.keys(CSS).map(function (key) {
                theseRules = Object.keys(CSS[key]).map(function (rule) {
                    return '\n    ' +  rule + ' : ' + CSS[key][rule];
                }).join(';');
                return key + ' { ' + theseRules + ';\n}';
            }).join('\n')).appendTo('head');

            $.log('Adding image preview css classes.');
            sizes.forEach(function (size) {
                classes.push($make('style').prop('id', 'style' + size)
                                           .prop('type', 'text/css')
                                           .text('.localImage { width: ' + size + 'px; }'));
            });

            /* http://musicbrainz.org/artist/{mbid} does not set a width for the Title column.  Without the next line,
               that column gets squished when the table-layout is set to fixed layout. */
            $('th:eq(2)').css('width', $('th:eq(2)').width() + 'px');

            classes.push($make('style').prop('id', 'tblStyle1')
                                       .text('table.tbl { table-layout: fixed; }'));

            $('head').appendAll(classes);

            $.log('Adding image preview methods.');
            var useSheets = function use_stylesheets (tiny, small, medium, big) {
                for (var i = 0; 4 > i; i++) {
                    $('#style' + sizes[i]).prop('disabled', !arguments[i]);
                }
            };
            $.extend({
                     imagesTiny   : function () { useSheets(1, 0, 0, 0); },
                     imagesSmall  : function () { useSheets(0, 1, 0, 0); },
                     imagesMedium : function () { useSheets(0, 0, 1, 0); },
                     imagesLarge  : function () { useSheets(0, 0, 0, 1); }
                     });

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
            var $img          = $make('img').addClass('localImage')
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

        var supportedImageType = function supportedImageType (uri) {
            var re = /\.(?:p?j(?:pg?|peg?|f?if)|bmp|gif|j(?:2c|2k|p2|pc|pt)|jng|pcx|pict?|pn(?:g|t)|tga|tiff?|webp)$/i
              , matches = re.exec(uri)
              ;
            if (matches === null) {
                return false;
            }
            var matched = matches[0];
            $.log('Testing file with extension "' + matched + '" to see if it is a supported extension.');
            switch (matched) {
                /* JPEG */
                case matches[$.inArray(matched, ['.jpg', '.jpeg', '.jpe', '.jfif', '.jif'])]: return 'jpg';
                /* Progressive JPEG */
                case matches[$.inArray(matched, ['.pjp', '.pjpeg'])]: return 'jpg';
                /* Portable Network Graphics */
                case '.png'  : return 'png';
                /* GIF */
                case '.gif'  : return 'gif';
                /* Bitmap */
                case '.bmp'  : return 'bmp';
                /* Google WebP */
                case '.webp' : return 'webp';
                /* JPEG Network Graphics */
                case '.jng'  : return 'jng';
                /* JPEG2000 */
                case matches[$.inArray(matched, ['.j2c', '.j2k', '.jp2', '.jpc', '.jpt'])]: return 'jp2';
                /* ZSoft IBM PC Paintbrush */
                case '.pcx'  : return 'pcx';
                /* Lotus Picture */
                case '.pic'  : return 'pic';
                /* Macintosh */
                case '.pict'  : return 'pict';
                /* MacPaint file format */
                case '.pnt'  : return 'pnt';
                /* Targa file format */
                case '.tga'  : return 'tga';
                /* Aldus Tagged Image File Format */
                case matches[$.inArray(matched, ['.tif', '.tiff'])]: return 'tiff';
                default     : return false;
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
            pic
            pict
            pnt
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
            pic
            pict
            pnt
            tga
            tif - compressed, tif - Deflate, tif - LZW, tif - no compression, tif - Pack Bits
            webp
        Pass:
            bmp - 16bit 1, bmp - 16bit 2, bmp - 16bit 3, bmp - 24bit, bmp - 32bit 1
            gif
            png - interlaced, png - non-interlaced
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
                            if (img.height === 2) {
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
                    } /* else {
                        //TODO: More image conversions...
                        // Unsupported currently, but potentially converted here: j2k, jng, jp2, jpc, pcx, pic, pict, pnt, tga, tif, webp (Firefox)
                    } */
                };

                reader.readAsDataURL(inputImage);
                return;
            };

         var loadLocalFile = function load_local_file (e) {
            var debugMsg = ''
              , file
              , name
              , type
              , files = (e.files || e.dataTransfer.files || e.file_list);
            for (var i = 0, len = files.length; i < len; i++) {
                file = files[i];
                name = file.name;
                type = supportedImageType(name);
                if (CONSTANTS.DEBUGMODE) {
                    debugMsg = ['loadLocalFile: for file "', name, '", file ', (i+1), ' of ', len].join('');
                }
                if (!type) {
                    $.log(debugMsg + ', unusable file type detected');
                    continue;
                }
                $.log([debugMsg, ', usable file type "', type, '" detected'].join(''));
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
            var handleError = function error_handler_for_loadRemoteFile_XHR (e, flagged) {
                                  'undefined' === typeof flagged && (flagged = false);
                                  $.log('loadRemoteFile\'s XMLHttpRequest had an error during ' + loadStage + '.', flagged);
                                  $.log(e, flagged);
                                };

            $.log('Creating comlink to trigger other context to get the image.');
            $make('pre').text(uri)            
                        .appendTo($xhrComlink)
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
                                                                 case ('pic'): mime = 'x-lotus-pic'; break;
                                                                 case ('pict'): mime = 'pict'; break;
                                                                 case ('png'): mime = 'png'; break;
                                                                 case ('pnt'): mime = 'pnt'; break;
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
                                                                     fileWriter.onerror = handleError(e, 1);
                                                                     loadStage = 'createWriter: abort within the writer. (But ignore this error.)';
                                                                     fileWriter.onabort = handleError(e, 1);

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

        !function init_storage_event_handling () {
            $.log('Attaching listener for storage events.');
            var handleStorage = function handleStorage (e) {
                /* Testing whether: 1) the key that was changed is the one we care about here, or
                                    2) the new value of the key is different from when the script first initialized in this tab.

                   #2 is important; without it, if you have multiple tabs open, each with this script running, they would create
                   a feedback loop, each triggering a new storage event on the other when they remove the new URL from the key.
                */
                if (e.key !== 'caaBatch_imageCache' || cachedImages === e.newValue) {
                    return;
                }

                e.preventDefault();

                if (e.newValue.length < e.oldValue.length) { // Another instance modified the image cache
                    cachedImages = localStorage.getItem('caaBatch_imageCache');
                    return false;
                }

                var newURL = decodeURIComponent(JSON.parse(e.newValue || '[]').pop());
                localStorage.setItem('caaBatch_imageCache', e.oldValue);

                var type = supportedImageType(newURL);
                if (type) {
                    $.log('Received a new ' + type + ' URL: ' + newURL);
                    loadRemoteFile(newURL, type);
                }
                return false;                
            };
            window.addEventListener("storage", handleStorage, false);
        }();

        !function init_add_caa_row_controls () {
            $.log('Adding CAA controls and event handlers.');

            /* The second selector here allows for the release links added by http://userscripts.org/scripts/show/93894 */
            var releaseSelector = 'a[resource^="[mbz:release/"], a[href^="/release/"]'
              , $thisForm       = $('form[action*="merge_queue"]')
              , $caaBtn         = $make('input').prop('type', 'button').prop('value', $.l('Load CAA images'))
                                               .prop('title', $.l('Load text one release'))
                                               .addClass('caaLoad')
              , $addBtn         = $make('input').prop('type', 'button').prop('value', '+')
                                               .prop('title', $.l('Add image one release'))
                                               .addClass('caaAdd')
                                               .hide()
              , $loadingDiv     = $make('div').text($.l('loading'))
                                             .prepend($make('img').prop('src', CONSTANTS.THROBBER)
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
                                      var types     = CONSTANTS.COVERTYPES
                                        , $typeList = $make('select').prop('multiple', 'multiple')
                                                                     .prop('size', types.length)
                                                                     .addClass('caaSelect')
                                        ;

                                      return $typeList.appendAll(types.map(function (type, i) {
                                          return $make('option').prop('value', i+1)
                                                                .text($.l('coverType:' + type));
                                      }));
                                  };

            var makeDropbox = function makeDropbox () {
                                  $.log('Creating dropbox.');
                                  var $types = makeCAATypeList();
                                  var $dropbox = $make('figure').addClass('CAAdropbox newCAAimage')
                                                                .appendAll([ $makeCloseButton()
                                                                           , $make('img').addClass('dropBoxImage')
                                                                                         .prop('draggable', false)
                                                                                         .wrap('<div>')
                                                                                         .parent()
                                                                           , $make('figcaption').appendAll([ $make('input').prop('type', 'text')
                                                                                                                           .prop('placeholder', 'image comment')
                                                                                                           , $make('br')
                                                                                                           , $types
                                                                                                           ])
                                                                           ])
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
                                  , $imageRow   = $make('td').prop('colspan', colCount)
                                                             .addClass('imageRow')
                                                             .wrap('<tr>')
                                                             .parent()
                                  ;

                                $.log('New release found, attaching a CAA row.', 1);
                                var $thisAddBtn = $addBtn.clone()
                                                         .data('entity', thisMBID);
                                var $thisCAABtn = $caaBtn.clone()
                                                         .data('entity', thisMBID);
                                var $thisLoadingDiv = $loadingDiv.clone();
                                var $newCAARow  = $imageRow.clone()
                                                           .find('td').append($make('div').addClass('caaDiv')
                                                                                          .before($thisAddBtn)
                                                                                          .before($thisLoadingDiv)
                                                                                          .append($thisCAABtn)).end()
                                                           .prop('class', $releaseRow.prop('class'));
                                $thisForm.data(thisMBID, $newCAARow);

                                // This next is done via event to allow for script-initiated row transforms (e.g. TableSorter)
                                $.log('Attaching DOMNodeInserted event handler.', 1);
                                $releaseRow.on('DOMNodeInserted', function node_inserted_so_try_to_add_caa_row () {
                                    $.log('DOMNodeInserted event handler triggered.', 1);
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
                                                            if ('object' !== typeof(data)) { // Firefox
                                                                data = JSON.parse(data);
                                                            }
                                                            $.log('Received CAA data, parsing...');
                                                            if ($.isEmptyObject(data)) {
                                                                $.log('CAA response: no images in CAA for this release.');
                                                            } else {
                                                                $.each(data.images, function parseCAAResponse (i) {
                                                                    $.log('Parsing CAA response: image #' + i);
                                                                    if ($newCAARow.find('.newCAAimage').length === 0) {
                                                                        $thisAddBtn.trigger('click');
                                                                    }
                                                                    var $emptyDropBox = $newCAARow.find('.newCAAimage:first');
                                                                    $emptyDropBox.find('input').replaceWith($make('div').text(this.comment)).end()
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
            var $caaAllBtn = $make('input').prop('type', 'button')
                                          .prop('value', $.l('Load CAA images for all'))
                                          .prop('title', $.l('Load text all releases'))
                                          .addClass('caaAll');
            $('table.tbl').before($make('br'))
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

    /* Create image editor. */
    !function create_image_editor_handler () {
        $.log('Adding handler for image editor.');
        $('body').on('click', '#previewImage', function (e) {
        $('body').prepend($make('div').prop('id', 'CAAimageEditor')
                                      .hide()
                                      .appendAll([ $makeCloseButton
                                                 , $make('div').prop('id', 'CAAeditorDiv')
                                                 ]))
                 .prepend($make('div').prop('id', 'CAAoverlay')
                                      .hide());
            $('#CAAoverlay').show();
            $('#CAAimageEditor').css('display', 'none')
                                .animate({ height  : 'toggle'
                                         , opacity : 'toggle'
                                         }, 'slow');


//TODO FINISH



        });
    }();



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
        var $triggerLink = $make('a').text($.l('Add cover art'))
                                     .css('cursor', 'pointer')
                                     .wrap('<li>')
                                     .on('click', function start_cover_art_script () { init(); })
                                     .parent();
        $('ul.links').find('hr:first').before($triggerLink);
    }();
}

function thirdParty($, CONSTANTS, getColor) {
    /* Despite the name, each function in thirdParty is by Brian Schweitzer unless otherwise noted. */

    /*jshint strict:false */
    jQuery.noConflict();

    jQuery.extend({
        /* Takes a localStorage value name, and inserts the script stored there (as a string) into the DOM. */
        addScript: function addScript (scriptSource) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = localStorage.getItem(scriptSource);
            document.getElementsByTagName('head')[0].appendChild(script);
        },
        // Creates and adds a new css rule
        addRule: function addRule(selector, rule) {
            $('<style>').prop('type', 'text/css').text(selector + rule).appendTo($('head'));
        },
        // Modified from http://stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata
        dataURItoBlob: function dataURItoBlob(dataURI, mime) {
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
            /* The deprecated BlobBuilder format is normally prefixed;
           we need to find the right one.  (The Blob constructor which
           has replaced BlobBuilder is not yet implemented. */
            var Builder = window.MozBlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder || window.BlobBuilder;
            var bb = new Builder();
            bb.append(ab);
            return bb.getBlob('image/' + mime);
        },
        getColor: function getColor_handler(colorConstantName) {
            return getColor(colorConstantName);
        },
        // A very basic version of a gettext function.
        l: function l(str) {
            return (CONSTANTS.TEXT[localStorage.getItem('caaBatch_language') || 'en'][str]);
        },
        // Logs a message to the console if debug mode is on.
        log: function log(str, verbose) {
            'undefined' === typeof verbose && (verbose = false);
            (!verbose || CONSTANTS.DEBUG_VERBOSE) && CONSTANTS.DEBUGMODE && console.log(str);
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
        property = this.prop(property);
        return ('undefined' !== typeof property && property.length);
    };

    $.browser.chrome = navigator.userAgent.toString().toLowerCase().indexOf('chrome');

    $.addScript('jQueryAnimateEnhanced');
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
            script.textContent = '(' + fn.toString() + ')(jQuery, ' + JSON.stringify(CONSTANTS) + ',' + getColor.toString() + ');';
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
        requires.forEach(function (requiredItem) {
            makeScript();
            script.textContent = localStorage.getItem(requiredItem);
            head.appendChild(script);
        });
        continueLoading();
    })(i || 0);
}();
