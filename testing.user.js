// ==UserScript==
// @name        Testing 1
// @version     0.01.1317
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
/*jshint bitwise:false, forin:true, noarg:true, noempty:true, eqeqeq:true, es5:true, expr:true, strict:true, undef:true, curly:true, nonstandard:true, browser:true, jquery:true, maxerr:500, laxbreak:true, newcap:true, laxcomma:true, evil:true */

/* Installation and requirements:

Firefox: Requires a minimum of version 11.  Install as normal.  When the script is run the first time, a prompt will come up.  Make sure to click "accept"!

Chrome: Install script.  Go to settings --> extensions ( chrome://chrome/extensions/ ) and make sure that the checkbox next to
"Allow access to file URLs" for this extension is checked.  Then restart Chrome.  If you reinstall or upgrade the script, you may
need to restart the browser before the script works again.

Opera: Not compatible, sorry.

*/

//TODO: Edit submission
//TODO: Clean up the temp file system after edit submissions and when images are removed
//TODO: Add support for saving edited images
//TODO: Add support for cancelling image editor
//TODO: Add support for editing existing CAA image data
//TODO: Add support for removing existing CAA images
//TODO: Add support for positioning/repositioning CAA images
//TODO: import images from linked ARs - Discogs, ASIN, other databases, others?  What UI?
//TODO: Handle preview image dimensions when image is really wide.  Test w/ http://paulirish.com/wp-content/uploads/2011/12/mwf-ss.jpg
//TODO: Fix webp support for Firefox
//TODO: Apply rotation, if any, after a flip is done in the image editor

var height = function get_client_height (id) {
    'use strict';
    return document.getElementById(id).clientHeight;
};

var CONSTANTS = { DEBUGMODE     : true
                , VERSION       : '0.1.1317'
                , DEBUG_VERBOSE : false
                , BORDERS       : '1px dotted #808080'
                , COLORS        : { ACTIVE     : '#B0C4DE'
                                  , CAABOX     : '#F2F2FC'
                                  , CAABUTTONS : '#4B0082'
                                  , EDITOR     : '#F9F9F9'
                                  , EDITORMENU : '#D5D5FF'
                                  , INCOMPLETE : '#FFFF7A'
                                  , COMPLETE   : '#C1FFC1'
                                  , REMOVE     : '#B40000'
                                  , MASK       : '#000'
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
                , CREDITS       : { 'Developer and programmer' :
                                                   [ { name : 'Brian Schweitzer (“BrianFreud”)'
                                                     , mb   : 'brianfreud'
                                                     , urlN : 'userscripts.org/users/28107'
                                                     }
                                                   ]
                                  , Translations : [ { name : 'Calvin Walton (“kepstin”)'
                                                     , what : 'Canadian English'
                                                     , urlN : 'www.kepstin.ca'
                                                     , mb   : 'kepstin'
                                                     }]
                                  , Icons        : [ { name : '“Mapto”'
                                                     , what : 'Magnifying glass icons'
                                                     , urlN : 'commons.wikimedia.org/wiki/User:Mapto'
                                                     , urlW : 'commons.wikimedia.org/wiki/File:View-zoom-in.svg'
                                                     }
                                                   , { name : '“Inductiveload”'
                                                     , what : 'Magnifying glass icons'
                                                     , urlN : 'commons.wikimedia.org/wiki/User:Inductiveload'
                                                     , urlW : 'commons.wikimedia.org/wiki/File:View-zoom-out.svg'
                                                     }
                                                   , { name : '“ablonevn”'
                                                     , what : 'Gear icon'
                                                     , urlW : 'www.clker.com/clipart-169255.html'
                                                     }
                                                   , { name : '“El T”'
                                                     , what : 'Information icon'
                                                     , urlN : 'en.wikipedia.org/wiki/User:El_T'
                                                     , urlW : 'en.wikipedia.org/wiki/File:Information_icon.svg'
                                                     }
                                                   , { name : 'Timur Gafforov & Avraam Makhmudov'
                                                     , what : 'Throbber image'
                                                     , urlW : 'preloaders.net'
                                                     }
                                                   ]
                                  , Plugins      : [ { name : 'Ben Barnett'
                                                     , what : 'jQuery.animate-enhanced v0.91'
                                                     , urlN : 'benbarnett.net'
                                                     , urlW : 'github.com/benbarnett/jQuery-Animate-Enhanced'
                                                     }
                                                   , { name : 'Ryan Wheale & Tim Banks'
                                                     , what : 'jQuery.getHiddenDimensions'
                                                     , urlN : 'www.foliotek.com/devblog/author/timlanit'
                                                     , urlW : 'www.foliotek.com/devblog/getting-the-width-of-a-hidden-element-with-jquery-using-width'
                                                     }
                                                   , { name : 'Brian Schweitzer & Naftali Lubin'
                                                     , what : 'jQuery.appendAll'
                                                     }
                                                   , { name : 'James Padolsey'
                                                     , what : 'jQuery.single'
                                                     , urlN : 'james.padolsey.com'
                                                     , urlW : 'james.padolsey.com/javascript/76-bytes-for-faster-jquery'
                                                     }
                                                   , { name : '“Cowboy” Ben Alman'
                                                     , what : 'jQuery.detach+ v0.1pre'
                                                     , urlN : 'benalman.com'
                                                     , urlW : 'gist.github.com/978520'
                                                     }
                                                   ]
                                  , Polyfills    : [ { name : 'Eric Bidelman'
                                                     , what : 'idb.filesystem.js v0.0.1'
                                                     , urlN : 'ericbidelman.tumblr.com'
                                                     , urlW : 'github.com/ebidel/idb.filesystem.js'
                                                     }
                                                   , { name : 'Jan Odvarko'
                                                     , what : 'jscolor'
                                                     , urlW : 'jscolor.com'
                                                     }
                                                   , { name : 'Jonathan Stipe'
                                                     , what : 'number polyfill'
                                                     , urlW : 'github.com/jonstipe/number-polyfill'
                                                     }
                                                   , { name : 'Sebastian Tschan (“blueimp”)'
                                                     , what : 'javaScript canvas to blob 2.0'
                                                     , urlN : 'blueimp.net'
                                                     , urlW : 'github.com/blueimp/JavaScript-Canvas-to-Blob'
                                                     }
                                                   ]
                                  , Tools        : [ { name : 'Jeff Schiller'
                                                     , what : 'Scour'
                                                     , urlW : 'www.codedread.com/scour'
                                                     }
                                                   , { name : 'Site Project ApS'
                                                     , what : 'JavaScript string encoder'
                                                     , urlW : 'www.htmlescape.net/stringescape_tool.html'
                                                     }
                                                   ]
                                  , Libraries    : [ { name : 'Tim Smart'
                                                     , what : 'data_string function'
                                                     , urlN : 'github.com/Tim-Smart'
                                                     , urlW : 'pastebin.ca/1425789'
                                                     }
                                                   , { name : 'Tyler Akins, Bayron Guevara, Thunder.m, Kevin van Zonneveld, Pellentesque Malesuada, Rafał Kukawski & Brian Schweitzer'
                                                     , what : 'base64_encode function from PHPJS'
                                                     , urlN : 'rumkin.com'
                                                     , urlW : 'phpjs.org/functions/base64_encode'
                                                     }
                                                   , { name : 'Steven Thurlow (“Stoive”)'
                                                     , what : 'dataURItoBlob'
                                                     , urlN : 'github.com/stoive'
                                                     , urlW : 'stackoverflow.com/questions/4998908/convert-data-uri-to-file-then-append-to-formdata'
                                                     }
                                                   , { name : 'Ben Leslie'
                                                     , what : 'jsjpegmeta'
                                                     , urlN : 'benno.id.au/'
                                                     , urlW : 'code.google.com/p/jsjpegmeta/'
                                                     }
                                                   , { name : 'John Resig and the rest of the jQuery team'
                                                     , what : 'jQuery 1.7.2'
                                                     , urlW : 'jquery.com'
                                                     }
                                                   , { name : 'Brandon Aaron, Amir E. Aharoni, Khaled AlHourani, Mike Alsup, Robson Braga Araujo, Lim Chee Aun, Pierre-Henri Ausseil, Jesse Baird, Paul Bakaus, Adam Baratz, Phillip Barnes, Jorge Barreiro, Bruno Basto, Doug Blood, David Bolter, Kris Borchers, Mohamed Cherif Bouchelaghem, Ben Boyle, Milan Broum, Tobias Brunner, Brant Burnett, Alberto Fernández Capel, Sean Catchpole, Filippo Cavallarin, Douglas Cerna, Chi Cheng, Samuel Cormier-Iijima, Kevin Dalman, Gilmore Davidson, Jason Davies, Michael DellaNoce, Justin Domnitz, Alex Dovenmuehle, Thibault Duplessis, Aaron Eisenberger, Ashek Elahi, John Enters, Edward Faulkner, John Firebaugh, Ariel Flesler, Kyle Florence, Corey Frang, Tiago Freire, Martin Frost, Carl Fürstenberg, Bohdan Ganicky, Dmitri Gaskin, Guillaume Gautreau, Jamie Gegerson, Genie, Shahyar Ghobadpour, Giovanni Giacobbi, Scott González, Glenn Goodrich, Marc Grabanski, Philip Graham, William Griffiths, Florian Gutmann, Klaus Hartl, Dan Heberden, Peter Heiberg, Bertter Heide, Heiko Henning, Hans Hillen, Pavol Hluchý, Ben Hollis, Matt Hoskins, Gilles van den Hoven, Petr Hromadko, Jack Hsu, Trey Hunner, Matthew Hutton, Eric Hynds, Eneko Illarramendi, Paul Irish, Jacek Jędrzejewski, Scott Jehl, Mark Johnson, Marwan Al Jubeh, Michael P. Jung, Dylan Just, Tomy Kaira, Andrey Kapitcyn, Guntupalli Karunakar, Yehuda Katz, Kato Kazuyoshi, Chris Kelly, James Khoury, Harri Kilpiö, Karl Kirch, Lev Kitsis, Eyal Kobrigo, Ting Kuei, David Leal, Lukasz Lipinski, Jo Liss, Rob Loach, Garrison Locke, Lado Lomidze, Eduardo Lundgren, Justin MacCarthy, William Kevin Manire, George Marshall, Christopher McCulloh, Carson McDonald, Jay Merrifield, Dave Methvin, igor milla, Eddie Monge, Alberto Monteiro, Jason Moon, Gaëtan Muller, David Murdoch, Jasvir Nagra, Saji Nediyanchath, Douglas Neiner, Ryan Neufeld, Marc Neuwirth, Andrew Newcomb, Ryan Olton, Jay Oster, Jon Palmer, Todd Parker, Adam Parod, Shannon Pekary, Ivan Peters, David Petersen, Aaron Peterson, Stefan Petre, Dmitry Petrov, Joan Piedra, Tane Piper, Alex Polomoshnov, Andrew Powell, Aliaxandr Rahalevich, Stéphane Raimbault, Xavi Ramirez, Jean-Francois Remy, John Resig, Alex Rhea, Krzysztof Rosiński, Marian Rudzynski, Holger Rüprich, Simon Sattes, Sebastian Sauer, Max Schnur, Raymond Schwartz, Eike Send, Remy Sharp, Ian Simpson, Stojce Slavkovski, David De Sloovere, Micheil Smith, Martin Solli, David Soms, Adam Sontag, Marcos Sousa, Daniel Steigerwald, Benjamin Sterling, J. Ryan Stinnett, Dan Streetman, Chairat Sunthornwiphat, Kouhei Sutou, Timo Tijhof, Marcel Toele, Diego Tres, Israel Tsadok, Ca-Phun Ung, TJ VanToll, Josh Varner, Dominique Vincent, Jonathan Vingiano, Mario Visic, Maggie Costello Wachs, Rick Waldron, Wesley Walser, Michel Weimerskirch, Ralph Whitbeck, Shane Whittet, Kyle Wilkinson, Keith Wood, Richard Worth, Michael Wu, EungJun Yi, Jörn Zaefferer, & Ziling Zhao'
                                                     , what : 'jQuery UI 1.8.19'
                                                     , urlW : 'jqueryui.com'
                                                     }
                                                   ]
                                  }
                , IEDARKNESSLVL : 75
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
                                       , 'Bottom'                  : 'Bottom'
                                       , 'bytes'                   : 'bytes'
                                       , 'Changed colors note'     : 'Changes to the color settings will take effect the next time that this script is run.'
                                       , 'Changed language note'   : 'Changes to the language setting will take effect the next time that this script is run.'
                                       , 'Click to edit this image': 'Left click to edit this image'
                                       , 'Colors'                  : 'Colors'
                                       , 'Crop image'              : 'Crop'
                                       , 'default'                 : 'default'
                                       , 'degrees'                 : 'degrees'
                                       , 'File size'               : 'File size'
                                       , 'Flip image'              : 'Flip'
                                       , 'How dark the bkgrnd'     : 'Image editor darkness level'
                                       , 'How many degrees'        : 'How many degrees to rotate the image'
                                       , '(Image) Resolution'      : 'Resolution'
                                       , 'Images'                  : 'Images'
                                       , 'Language'                : 'Language'
                                       , 'Left'                    : 'Left'
                                       , 'Load CAA images for all' : 'Load image data for all releases'
                                       , 'Load CAA images'         : 'Load image data for this release'
                                       , 'loading'                 : 'Loading data from the Cover Art Archive, please wait...'
                                       , 'Load text all releases'  : 'Loads images for all displayed releases.'
                                       , 'Load text one release'   : 'Loads any images already in the Cover Art Archive for this release.'
                                       , 'Crop mask color'         : 'Mask color'
                                       , 'Magnify image'           : 'Zoom in'
                                       , 'Options'                 : 'Options'
                                       , 'Parse (help)'            : 'Check this box to enable parsing web pages whenever you drop in a link to a web page or a list of webpage URLs.'
                                       , 'Parse web pages'         : 'Parse web pages'
                                       , 'Preview Image'           : 'Preview'
                                       , 'Remove (help)'           : 'Check this box, then click on images to remove them.  Uncheck the box again to turn off remove image mode.'
                                       , 'Remove image'            : 'Click to remove this image'
                                       , 'Remove images'           : 'Remove images mode'
                                       , 'Remove stored images nfo': 'This removes any images from other websites that you have stored while this script was not running.'
                                       , 'Remove stored images'    : 'Remove stored images'
                                       , 'Right'                   : 'Right'
                                       , 'Rotate image'            : 'Rotate'
                                       , 'Shrink image'            : 'Zoom out'
                                       , 'Submit as autoedits'     : 'Submit edits as autoedits'
                                       , 'Submit edits'            : 'Submit edits'
                                       , 'take effect next time'   : 'Changes to the language and color settings will take effect the next time that this script is run.'
                                       , 'Top'                     : 'Top'
                                       , 'Version'                 : 'Version'
                                       , 'coverType:Back'          : 'Back'
                                       , 'coverType:Booklet'       : 'Booklet'
                                       , 'coverType:Front'         : 'Front'
                                       , 'coverType:Medium'        : 'Medium'
                                       , 'coverType:Obi'           : 'Obi'
                                       , 'coverType:Other'         : 'Other'
                                       , 'coverType:Spine'         : 'Spine'
                                       , 'coverType:Track'         : 'Track'
                                       , 'About'                   : 'About'
                                       , 'Developer and programmer': 'Developer and programmer'
                                       , 'Icons'                   : 'Icons'
                                       , 'Plugins'                 : 'Plugins'
                                       , 'Polyfills'               : 'Polyfills'
                                       , 'Translations'            : 'Translations'
                                       , 'Tools'                   : 'Tools'
                                       , 'Libraries'               : 'Libraries'
                                                                   /* Try to keep the text for these last few very short. */
                                       , ACTIVE                    : 'Droppable area'
                                       , CAABOX                    : 'Empty CAA box'
                                       , CAABUTTONS                : 'Load CAA buttons'
                                       , EDITOR                    : 'Image editor background'
                                       , EDITORMENU                : 'Image editor menu'
                                       , INCOMPLETE                : 'Incomplete edits'
                                       , COMPLETE                  : 'Edits ready to submit'
                                       , REMOVE                    : 'Remove image highlight'
                                       , MASK                      : 'Default crop mask color'
                                       }
                                  }
                };

/* Special case Canadian English. */
CONSTANTS.TEXT['en-ca']                          = JSON.parse(JSON.stringify(CONSTANTS.TEXT.en));
CONSTANTS.TEXT['en-ca'].languageName             += ' (Canadian)';
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
                          , EDITORMENU                : '· --·- ····- ·· ·-· -·· ···· ····· · -·- -·-· ·'
                          , 'Click to edit this image': '-·· ·--- -··- -- ··- ·· -'
                          , 'degrees'                 : '···- ·· ·-· -··'
                          , 'Rotate image'            : '···· ····· ·'
                          , 'Flip image'              : '·-· -··-··'
                          , 'Crop image'              : '-- --··· ·--'
                          , 'Top'                     : '·- ···· -·-· ····- -'
                          , 'Bottom'                  : '--·-'
                          , 'Left'                    : '····- ·· ·-· -·'
                          , 'Right'                   : '···· ····· · -·-'
                          , 'Crop mask color'         : '··· -·-· ···'
                          , MASK                      : '·-· -- -·'
                          , 'About'                   : '···· ··-·-'
                          , 'Developer and programmer': '--- - -··- -·-- --··'
                          , 'Icons'                   : '--- - -··- -·-- --··'
                          , 'Plugins'                 : '--- - -··- -·-- --··'
                          , 'Polyfills'               : '--- - -··- -·-- --··'
                          , 'Translations'            : '--- - -··- -·-- --··'
                          , 'Tools'                   : '--- - -··- -·-- --··'
                          , 'Libraries'               : '--- - -··- -·-- --··'
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
if (localStorage.getItem('caaBatch_editorDarkness') === null) {
    localStorage.setItem('caaBatch_editorDarkness', 75);
}

CONSTANTS.CSS = { '#ColorDefaultBtn':
                      { 'background-color'      : '#D3D3D3'
                      },
                  '#caaVersion':
                      { 'float'                 : 'right'
                      , 'font-size'             : '75%'
                      , 'margin-top'            : '-15px'
                      },
                  '#colorPicker, #CAAeditiorMaskColorControl':
                      {  border                 : '1px outset #D3D3D3'
                      ,  padding                : '15px' // This makes the default box around the color disappear on Chrome
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
                  '#CAAeditorCanvas':
                      { 'background-color'      : '#FFF'
                      },
                  '#CAAeditorRotateControl':
                      { 'margin-right'          : '2px'
                      ,  width                  : '4em'
                      },
                  '#CAAeditorMenu':
                      { 'background-color'      : getColor('EDITORMENU')
                      , 'border-radius'         : '20px'
                      ,  border                 : '1px dotted navy'
                      ,  height                 : '60%'
                      ,  padding                : '16px'
                      ,  position               : 'absolute'
                      ,  right                  : '40px'
                      ,  top                    : '20%'
                      },
                  '#CAAeditorCanvasDiv':
                      {  position               : 'relative'
                      },
                  '.CAAmask':
                      {  position               : 'absolute'
                      ,  height                 : '0'
                      ,  width                  : '0'
                      },
                  '#CAAmaskLeft, #CAAmaskRight':
                      {  height                 : '100%'
                      },
                  '#CAAmaskTop, #CAAmaskBottom':
                      {  width                  : '100%'
                      },
                  '#CAAmaskLeft':
                      { 'z-index'               : 3000
                      ,  left                   : 0
                      ,  top                    : 0
                      },
                  '#CAAmaskRight':
                      { 'z-index'               : 3001
                      ,  right                  : 0
                      ,  top                    : 0
                      },
                  '#CAAmaskTop':
                      { 'z-index'               : 3002
                      ,  left                   : 0
                      ,  top                    : 0
                      },
                  '#CAAmaskBottom':
                      { 'z-index'               : 3003
                      ,  left                   : 0
                      ,  bottom                 : 0
                      },
                  '.cropLabel':
                      {  clear                  : 'both'
                      ,  display                : 'block'
                      , 'margin-bottom'         : '4px'
                      },
                  '.cropControl':
                      {  height                 : '24px'
                      ,  margin                 : '0 4px 2px 0!important'
                      , 'vertical-align'        : 'middle'
                      , width                   : '45px'
                      },
                  '.flipControl':
                      { 'border-radius'         : '21px'
                      , 'border-width'          : '1px'
                      , 'font-size'             : '130%'
                      , 'font-weight'           : '600'
                      ,  padding                : '0px 15px'
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
                  '#optionsHeader, #aboutControl':
                      {  display                : 'inline-block'
                      , 'float'                 : 'right'
                      ,  filter                 : 'alpha(opacity=40)'
                      , '-moz-opacity'          : '0.4'
                      ,  opacity                : '0.4'
                      ,  width                  : '40%'
                      },
                  '#optionsHeader':
                      { 'margin-right'          : '-24px'
                      , 'margin-top'            : '-3px'
                      },
                  '#aboutControl':
                      {  height                 : '23px'
                      , 'margin-top'            : '-1px'
                      ,  width                  : '23px'
                      },
                  '#optionsMenu, #aboutMenu':
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
                      ,  filter                 : 'alpha(opacity=' + localStorage.getItem('caaBatch_editorDarkness') + ')'
                      ,  left                   : 0
                      , '-moz-opacity'          : localStorage.getItem('caaBatch_editorDarkness') / 100
                      ,       opacity           : localStorage.getItem('caaBatch_editorDarkness') / 100
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
                      , 'margin-top'            : '5%'
                      ,  padding                : '2%'
                      ,  position               : 'fixed'
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
                  '.caaMBCredit':
                      { 'font-size'             : '85%'
                      , 'white-space'           : 'nowrap'
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
                      {  cursor                 : 'pointer'
                      ,  display                : 'block'
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
                  '.CAAcreditWho':
                      { 'text-indent'           : '-2em'
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
                  '.imageSizeControl, #optionsHeader, #aboutControl':
                      {  cursor                 : 'pointer'
                      , 'float'                 : 'right'
                      },
                  '.imageSizeControl, #optionsHeader':
                      {  height                 : '26px'
                      ,  width                  : '26px'
                      },
                  '.imageSizeControl:hover, #optionsHeader:hover, #aboutControl:hover':
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
                  '.previewDT::after, #aboutMenu * dt::after':
                      {  color                  : '#000' 
                      ,  content                : '": "'
                      },
                  '#aboutMenu * dt::before':
                      {  color                  : '#000' 
                      ,  content                : '" • "'
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
                  '#CAAeditorMenu > fieldset':
                      {  border                 : 'none'
                      ,  margin                 : '16px -4px 7px'
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
                  '#colorPicker:active, #ColorDefaultBtn:active, #ClearStorageBtn:active, #CAAeditiorMaskColorControl:active':
                      {  border                 : '1px inset #D3D3D3'
                      ,  filter                 : 'alpha(opacity=100)'
                      , '-moz-opacity'          : '1'
                      ,  opacity                : '1'
                      },
                  'legend':
                      {  color                  : '#000!important'
                      , 'font-size'             : '110%!important'
                      , 'font-variant'          : 'small-caps'
                      },
                  'table.tbl * table, #imageContainer, #previewContainer':
                      {  width                  : '100%'
                      },
                  'table.tbl .count':
                      {  width                  : '6em!important'
                      },
                  'h4':
                      { 'font-size'             : '115%'
                      },
                  '#aboutMenu * h5':
                      { 'font-size'             : '100%'
                      },
                  '#aboutMenu * dd':
                      { 'padding-bottom'        : '5px'
                      },
                  '#aboutHeader':
                      { 'margin-top'            : '0'
                      },
                  /* css for the number polyfill */
                  'div.number-spin-btn-container':
                      {  display                : 'inline-block'
                      ,  margin                 : '0'
                      ,  padding                : '0'
                      ,  position               : 'relative'
                      , 'vertical-align'        : 'bottom'
                      },
                  'div.number-spin-btn':
                      { 'background-color'      : '#CCCCCC'
                      ,  border                 : '2px outset #CCCCCC'
                      ,  height                 : '11.5px!important'
                      ,  width                  : '1.2em'
                      },
                  'div.number-spin-btn-up':
                      {  'border-bottom-width'  : '1px'
                      ,  '-webkit-border-radius': '3px 3px 0px 0px'
                      ,          'border-radius': '3px 3px 0px 0px'
                      },
                  'div.number-spin-btn-up:before':
                      {  content                : '""'
                      , 'border-color'          : 'transparent transparent black transparent'
                      , 'border-style'          : 'solid'
                      , 'border-width'          : '0 0.3em 0.3em 0.3em'
                      ,  height                 : '0'
                      ,  left                   : '50%'
                      ,  margin                 : '-0.15em 0 0 -0.3em'
                      ,  padding                : '0'
                      ,  position               : 'absolute'
                      ,  top                    : '25%'
                      ,  width                  : '0'
                      },
                  'div.number-spin-btn-down':
                      { '-webkit-border-radius' : '0px 0px 3px 3px'
                      ,         'border-radius' : '0px 0px 3px 3px'
                      , 'border-top-width'      : '1px'
                      },
                  'div.number-spin-btn-down:before':
                      {  content                : '""'
                      ,  width                  : '0'
                      ,  height                 : '0'
                      , 'border-width'          : '0.3em 0.3em 0 0.3em'
                      , 'border-style'          : 'solid'
                      , 'border-color'          : 'black transparent transparent transparent'
                      ,  position               : 'absolute'
                      ,  top                    : '75%'
                      ,  left                   : '50%'
                      ,  margin                 : '-0.15em 0 0 -0.3em'
                      ,  padding                : '0'
                      },
                  'div.number-spin-btn:hover':
                      {  cursor                 : 'pointer'
                      },
                  'div.number-spin-btn:active':
                      { 'background-color'      : '#999999'
                      ,  border                 : '2px inset #999999'
                      },
                  'div.number-spin-btn-up:active:before':
                      { 'border-color'          : 'transparent transparent white transparent'
                      ,  left                   : '51%'
                      ,  top                    : '26%'
                      },
                  'div.number-spin-btn-down:active:before':
                      { 'border-color'          : 'white transparent transparent transparent'
                      ,  left                   : '51%'
                      ,  top                    : '76%'
                      }
};

/* START remote file accessor functions.  This *has* to happen before main_loader() starts the rest of the script, so that the
   event handler already exists when the other javascript context is created.  It cannot happen as part of main() itself, as that
   new context loses the special permissions granted to userscripts, and thus does not have access to GM_xmlhttpRequest. */

/* Create a hidden div which will be used to pass messages between javascript security contexts. */
var body       = document.getElementsByTagName('body')[0]
  , messageDiv = document.createElement('div')
  ;

messageDiv.id = 'xhrComlink';
body.appendChild(messageDiv);

/* When a click event alerts the code that a new link is in the communications div, read that link's uri out of the linked span.
   Then convert the binary file into a base64 string, and replace the contents of the linked span with the base64 string.  Finally,
   trigger a doubleclick event to let the other halves of this code, in the other javascript context, know that the file data has
   been retrieved. */
var getUri = function getURI (e) {
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
        // +   improved by: Brian Schweitzer
        // *     example 1: base64_encode('Kevin van Zonneveld');
        // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
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
        thisComlink.appendChild(
                               document.createTextNode(
                                                      bin2base64(response.responseText)
                                                      )
                               );

        evt.initMouseEvent("dblclick", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        thisComlink.dispatchEvent(evt);
    };

    var gmXHR = GM_xmlhttpRequest; // Workaround to jshint, since GM_xmlhttpRequest is not a constructor but looks like one to jshint.
    var gmXOptions = { method           : 'GET'
                     , overrideMimeType : 'text/plain; charset=x-user-defined'
                     , onload           : storeRetrievedFile
                     , url              : e.target.innerHTML
                     };
    gmXHR(gmXOptions);
};

var getUriWorkaround = function getUriWorkaround (e) { // Works around http://wiki.greasespot.net/0.7.20080121.0_compatibility in Firefox
    'use strict';
    setTimeout(function getUriWorkaround_internal () {
        getUri(e);
    }, 0);
};

/* Create an event listener, in the priviledged userscript context, which will listen for new uri additions to the xhrComlink div.
   This cannot use custom events, as they would only exist in one of the two javascript contexts. */
messageDiv.addEventListener('click', getUriWorkaround, true);

/* END remote file accessor functions. */

var main = function main ($, CONSTANTS) {
    'use strict';
    jQuery.noConflict();

    $.log('Script initializing.');

    $('head').append('<base href="">');

    var supportedImageFormats = ['bmp', 'gif', 'jpg', 'png']
      , cachedImages = localStorage.getItem('caaBatch_imageCache')
      , re = { image : /\.(?:p?j(?:pg?|peg?|f?if)|bmp|gif|j(?:2c|2k|p2|pc|pt)|jng|pcx|pict?|pn(?:g|t)|tga|tiff?|webp|ico)$/i
             , mbid  : /\w{8}\-\w{4}\-\w{4}\-\w{4}-\w{12}/
             , uri   : /\b(?:https?|ftp):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|]/gi
             }
      ;

    /* Faster element creation. */
    var $make = function $make (tagName, options) {
            var domEl = [document.createElement(tagName)]
              , jq = $
              ;

            jq.fn.prop.call(domEl, options, true);
            return jq.merge(jq(), domEl);
        };

    /* Creates a generic close button.  */
    var $makeCloseButton = function $makeCloseButton () {
        return $make('header', { 'class': 'closeButton' }).text('x');
    };

    /* This forces CONSTANTS.THROBBER to be already be loaded, so that the throbber shows up faster. */
    $('body').append($make('img', { src: CONSTANTS.THROBBER }).hide());

    var $imageContainer
      , $previewContainer
      , sizeStatus
      , $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    /* This function does a little magic.  It makes sure that the horizontal scrollbar on CAA rows only shows when it needs to. */
    var checkScroll = function checkScroll ($caaDiv) {
        $.log('Adjusting negative right margin.', 1);
        if ('undefined' === typeof $caaDiv.data('width')) {
            $caaDiv.data('width', $caaDiv.quickWidth(0));
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
        var state = ($ele.find(':selected').length && $ele.find('img').hasProp('src'));
        return $.getColor(state ? 'COMPLETE' : 'INCOMPLETE');
    };

    var tintImageRed = function tint_image_Red (image) {
        $.log('Tinting image');
        var $image = $(image);
        return $image.wrap($make('figure', { 'class': 'tintWrapper' }).css({ height : ($image.quickHeight(0) + 6) + 'px'
                                                                           , width  : ($image.quickWidth(0) + 6) + 'px'
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
        window.requestFileSystem(window.TEMPORARY, CONSTANTS.FILESYSTEMSIZE * 1024 * 1024, storeFS, function requestFileSystem_error_handler (e) {
            $.log('Requesting a temporary local file system failed.  Error message is:');
            $.log(e);
        });
        /* End temporary local file system code. */

        !function init_resize_sidebar () {
            $('#content').css('margin-right', (CONSTANTS.SIDEBARWIDTH + 20) + 'px');
            $('#page').css('background', '#FFF');
        }();


        !function init_create_mainUI () {
            $.log('Creating main UI and the options menu.');

            $imageContainer      = $make('div', { id: 'imageContainer' });
            $previewContainer    = $make('div', { id: 'previewContainer' });
            var colorOptions     = []
              , optionsImage     = localStorage.getItem('iconSettings')
              , baseImage        = localStorage.getItem('magnifyingGlassBase')
              , minusImage       = baseImage + localStorage.getItem('magnifyingGlassMinus')
              , plusImage        = baseImage + localStorage.getItem('magnifyingGlassPlus')
              , aboutImage       = localStorage.getItem('infoIcon')
              , $autoeditControl = $make('input',    { id        : 'caaAutoedit'
                                                     , type      : 'checkbox'
                                                     , title     : $.l('Submit as autoedits')
                                                     })
              , $autoeditLabel   = $make('label',    { 'for'     : 'caaAutoedit'
                                                     , id        : 'caaAutoeditLabel'
                                                     , title     : $.l('Submit as autoedits')
                                                     })
                                                     .text($.l('Submit as autoedits'))
              , $colorDefault    = $make('input',    { id        : 'ColorDefaultBtn'
                                                     , title     : $.l('Changed colors note')
                                                     , type      : 'button'
                                                     , value     : $.l('default')
                                                     })
              , $colorField      = $make('fieldset', { id        : 'colorField' })
              , $colorLegend     = $make('legend',   { id        :'colorLegend'  })
                                                     .text($.l('Colors'))
              , $colorPicker     = $make('input',    { id        : 'colorPicker'
                                                     , title     : $.l('Changed colors note')
                                                     , type      : 'color'
                                                     , value     : '66ff00'
                                                     })
              , $colorSelect     = $make('select',   { id        : 'colorSelect'
                                                     , size      : 5
                                                     , title     : $.l('Changed colors note')
                                                     })
              , $ddFilesize      = $make('dd',       { id        : 'previewFilesize' })
              , $ddResolution    = $make('dd',       { id        : 'previewResolution' })
              , $dtFilesize      = $make('dt',       { 'class'   : 'previewDT'
                                                     , id        : 'dtFilesize'
                                                     })
                                                     .text($.l('File size'))
              , $dtResolution    = $make('dt',       { 'class'   : 'previewDT'
                                                     , id        : 'dtResolution'
                                                     })
                                                    .text($.l('(Image) Resolution'))
              , $editor000Contnr = $make('div',      { id        : 'editor000Container'
                                                     })
              , $editor000Ctrl   = $make('input',    { id        : 'CAAeditorDarknessControl'
                                                     , type      : 'number'
                                                     , step      : 1
                                                     , 'min'     : 0
                                                     , 'max'     : 100
                                                     , value     : localStorage.getItem('caaBatch_editorDarkness') || CONSTANTS.IEDARKNESSLVL
                                                     , title     : $.l('How dark the bkgrnd')
                                                     })
              , $editor000Label  = $make('label',    { 'for'     : 'CAAeditorDarknessControl'
                                                     , id        : 'CAAeditorDarknessLabel'
                                                     , title     : $.l('How dark the bkgrnd')
                                                     })
                                                    .text($.l('How dark the bkgrnd'))
              , $imageMagnify    = $make('div',      { 'class'   : 'imageSizeControl'
                                                     , id        : 'imageMagnify'
                                                     , title     : $.l('Magnify image')
                                                     })
              , $imageShrink     = $make('div',      { 'class'   : 'imageSizeControl'
                                                     , id        : 'imageShrink'
                                                     , title     : $.l('Shrink image')
                                                     })
              , $langLabel       = $make('label',    { 'for'     : 'languageSelect'
                                                     , id        : 'languageSelectLabel'
                                                     , title     : $.l('Changed language note')
                                                     })
                                                    .text($.l('Language') + ':')
              , $langList        = $make('select',   { id        : 'languageSelect'
                                                     , size      : 3
                                                     , title     : $.l('Changed language note')
                                                     })
              , $aboutControl    = $make('div',      { id        : 'aboutControl'
                                                     , title     : $.l('About')
                                                     })
              , $aboutLegend     = $make('legend',   { id        : 'aboutLegend' })
                                                     .text($.l('About'))
              , $aboutHeader     = $make('h4',       { id        : 'aboutHeader' })
                                                     .text('Cover Art Archive Bulk Image Editor')
              , $aboutMenu       = $make('fieldset', { id        : 'aboutMenu' })
                                                     .hide()
              , $optionsControl  = $make('div',      { id        : 'optionsHeader'
                                                     , title     : $.l('Options')
                                                     })
              , $optionsLegend   = $make('legend',   { id        : 'optionsLegend' })
                                                     .text($.l('Options'))
              , $optionsMenu     = $make('fieldset', { id        : 'optionsMenu' })
                                                     .hide()
              , $optionsNote     = $make('div',      { id        : 'optionsNote' })
                                                     .text($.l('take effect next time'))
              , $parseControl    = $make('input',    { id        : 'caaOptionParse'
                                                     , title     : $.l('Parse (help)')
                                                     , type      : 'checkbox'
                                                     })
              , $parseLabel      = $make('label',    { 'for'     : 'caaOptionParse'
                                                     , id        : 'caaOptionParseLabel'
                                                     , title     : $.l('Parse (help)')
                                                     })
                                                     .text($.l('Parse web pages'))
              , $previewImage    = $make('img',      { id        : 'previewImage'
                                                     , draggable : false
                                                     })
              , $previewInfo     = $make('dl',       { id        : 'previewText' })
                                                     .hide()
              , $storageBtn      = $make('input',    { id        : 'ClearStorageBtn'
                                                     , title     : $.l('Remove stored images nfo')
                                                     , type      : 'button'
                                                     , value     : $.l('Remove stored images')
                                                     , disabled  : localStorage.getItem('caaBatch_imageCache') === '[]'
                                                     })
              , $removeControl   = $make('input',    { id        : 'caaOptionRemove'
                                                     , title     : $.l('Remove (help)')
                                                     , type      : 'checkbox'
                                                     })
              , $removeLabel     = $make('label',    { 'for'     : 'caaOptionRemove'
                                                     , id        : 'caaOptionRemoveLabel'
                                                     , title     : $.l('Remove (help)')
                                                     })
                                                    .text($.l('Remove images'))
              , $sizeContainer   = $make('div',      { id        : 'imageSizeControlsMenu' })
              , $version         = $make('span',     { id        : 'caaVersion' })
                                                    .text([$.l('Version'), ' ', CONSTANTS.VERSION].join(''))
              , $creditList      = $make('div')
              ;

            /* Populate the colors list */
            var colors        = Object.keys(CONSTANTS.COLORS)
              , colorsMap     = []
              ;

            var prepColorList = function prep_color_list_for_sorting (color, i) {
                colorsMap.push({ index: i
                               , value: $.l(color).toLowerCase()
                               });
            };

            var sortColors = function sort_color_list (a, b) {
                return a.value > b.value ? 1 : -1;
            };

            var populateColorList = function populate_colors_list (map) {
                var colorItem   = colors[map.index]
                  , color       = CONSTANTS.COLORS[colorItem]
                  , lsItemName  = 'caaBatch_colors_' + colorItem
                  , $thisOption = $make('option', { 'class' : 'colorOption'
                                                  , value   : colorItem
                                                  }).data('default', color)
                                                    .text($.l(colorItem));
                if (null === localStorage.getItem(lsItemName)) {
                    $.log(['Initializing localStorage for ', lsItemName, ' to ', color].join(''));
                    localStorage.setItem(lsItemName, color);
                }
                colorOptions.push($thisOption);
            };

            colors.forEach(prepColorList);

            colorsMap.sort(sortColors).map(populateColorList);

            /* Populate the credits list */
            !function populateCreditsList () {
                var role
                  , $who        = $make('div', { 'class': 'CAAcreditWho' })
                  , $what       = $make('dt')
                  , $pre        = $make('span').html(' [ ')
                  , $post       = $make('span').html(' ]')
                  , $thisWho
                  , $thisWhat
                  , $thisMB
                  , credits
                  ;

                var sortCredits = function sort_credits_list (a, b) {
                    return a.what > b.what ? 1 : -1;
                };
    
                var populateRoleListPerCredit = function populate_role_list_per_credit (credit) {
                    $thisWho  = $who.quickClone().text(credit.name);
                    $thisWhat = $what.quickClone().text(credit.what);
                    void 0 !== credit.urlN && ($thisWho = $make('a', { href : 'http://' + credit.urlN }).append($thisWho));
                    void 0 !== credit.urlW && ($thisWhat = $make('a', { href : 'http://' + credit.urlW }).append($thisWhat));
                    var $dd = $make('dd').append($thisWho);
                    if (void 0 !== credit.mb) {
                        $thisMB = $make('a', { href : 'http://musicbrainz.org/user/' + credit.mb }).text('MusicBrainz');
                        $thisMB = $make('span', { 'class': 'caaMBCredit' }).appendAll([ $pre.quickClone()
                                                                                      , $thisMB
                                                                                      , $post.quickClone()
                                                                                      ]);
                        $dd.append($thisMB);
                        void 0 !== credit.what ? credits.push($thisWhat, $dd) : credits.push($dd);
                    } else if (void 0 !== credit.what) {
                        credits.push($thisWhat, $dd);
                    } else {
                        credits.push($dd);
                    }
                };
    
                var populateCreditListPerRole = function populate_credits_list_per_role (role) {
                    credits = [];
                    CONSTANTS.CREDITS[role].sort(sortCredits).forEach(populateRoleListPerCredit);
                    $creditList.appendAll([ $make('h5').text($.l(role))
                                          , $make('dl').appendAll(credits)
                                          ]);
                };

                Object.keys(CONSTANTS.CREDITS)
                      .forEach(populateCreditListPerRole);
            }();

            /* Populate the languages list */
            var languages = [];

            Object.keys(CONSTANTS.TEXT).forEach(function populate_languages_list (key) {
                languages.push([key, CONSTANTS.TEXT[key].languageName]);
            });
            languages.sort(function sort_languages_list (a, b) {
                return a[1] === b[1] ? 0                 // a[1] == b[1] ->  0
                                     : a[1] > b[1] ? 1   // a[1] >  b[1] ->  1
                                                   : -1; // a[1] <  b[1] -> -1
            });
            var userLang  = localStorage.getItem('caaBatch_language') || 'en';
            var $ARRlangs = languages.map(function make_language_options (language) {
                                              return $make('option', { selected : (language[0] === userLang)
                                                                     , value    : language[0]
                                                                     }).text(language[1]);
                                          });

            /* Populate the DOM */
            document.getElementById('sidebar').innerHTML = '';
            $('#sidebar').detach(function sidebar_internal_detach_handler () {
                $(this).appendAll(
                        [ $make('h1', { id : 'imageHeader' }).text($.l('Images'))
                        , $aboutControl.append(
                                        aboutImage)
                        , $sizeContainer.appendAll(
                                         [ $imageMagnify.append(plusImage)
                                         , $imageShrink.append(minusImage)
                                         ])
                        , $optionsControl.append(
                                          optionsImage)
                        , $imageContainer.appendAll(
                                          [ $aboutMenu.appendAll(
                                                       [ $aboutLegend
                                                       , $aboutHeader
                                                       , $version.quickClone().prepend('Caabie ')
                                                       , $creditList
                                                       ])
                                          , $optionsMenu.appendAll(
                                                         [ $optionsLegend
                                                         , $version
                                                         , $removeControl
                                                         , $removeLabel
                                                         , $make('br')
                                                         , $parseControl
                                                         , $parseLabel
                                                         , $make('br')
                                                         , $storageBtn
                                                         , $make('br')
                                                         , $langLabel.append($langList.appendAll(
                                                                                       $ARRlangs))
                                                         , $colorField.appendAll(
                                                                       [ $colorLegend
                                                                       , $colorSelect.appendAll(colorOptions)
                                                                       , $colorPicker
                                                                       , $colorDefault
                                                                       , $editor000Contnr.append($editor000Label.append($editor000Ctrl))
                                                                       ])
                                                         , $optionsNote
                                                         ])
                                          ])
                        , $make('hr').css('border-top', CONSTANTS.BORDERS)
                        , $make('h1', { id : 'previewHeader' }).text($.l('Preview Image'))
                        , $previewContainer.appendAll(
                                            [ $previewImage
                                            , $previewInfo.appendAll(
                                                           [ $dtResolution
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
            });

            // Firefox renders slideToggle() incorrectly here; just use toggle() instead in Firefox.
            $optionsControl.click(function optionsControl_click_handler() {
                $.browser.mozilla ? $optionsMenu.toggle() : $optionsMenu.slideToggle();
            });
            $aboutControl.click(function aboutControl_click_handler() {
                $.browser.mozilla ? $aboutMenu.toggle() : $aboutMenu.slideToggle();
            });
        }();

        /* Add remember preferences capability to the autoedit checkbox. */
        !function autoedit_checkbox_handler () {
            $.log('Adding handler for remembering preferences of the autoedit checkbox.');
            $('#caaAutoedit').on('click', function change_autoeditor_preference_handler (e) {
                $.log('Autoeditor pref now set to: ' + $.single(this).is(':checked'));
                localStorage.setItem('caaBatch_autoeditPref', $.single(this).is(':checked'));
            });
        }();

        /* Add functionality to the language selector. */
        !function add_color_select_handler () {
            $.log('Adding handler for language selector.');
            $('#languageSelect').on('change', function change_language_preference_handler (e) {
                localStorage.setItem('caaBatch_language', $.single(this).find(':selected').val());
            });
        }();

        /* Add functionality to the clear image storage button. */
        !function add_clear_image_storage_handler () {
            $.log('Adding handler for the clear image storage button.');
            $('#ClearStorageBtn').on('click', function clear_storage_handler (e) {
                localStorage.setItem('caaBatch_imageCache', '[]');
                $.single(this).prop('disabled', true);
                cachedImages = [];
            });
        }();

        /* Add functionality to the image editor darkness control. */
        !function add_image_editor_darkness_control_handler () {
            $.log('Adding handler for the image editor darkness control.');
            $('#CAAeditorDarknessControl').on('click', function image_editor_darkness_control_handler (e) {
                localStorage.setItem('caaBatch_editorDarkness', $.single(this).val());
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
            $('#colorSelect').on('change', function change_color_selection_handler (e) {
                var color = localStorage.getItem('caaBatch_colors_' + $.single(this).find(':selected').val());
                $.log('Getting localStorage for ' + 'caaBatch_colors_' + $.single(this).find(':selected').val() + '.  Result: ' + color);
                myPicker.fromString(color);
            });
            /* Store new color value in localStorage. */
            $('#colorPicker').change(function change_color_preference_handler (e) {
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
                $.single(this).parent()
                              .find('.dropBoxImage') /* Any image in the drop box */
                              .appendTo($('#imageContainer'))
                              .addClass('localImage')
                              .removeClass('dropBoxImage');
                $('#CAAimageEditor').animate({ height  : 'toggle'
                                             , opacity : 'toggle'
                                             }, 'slow');
                $('#CAAoverlay').fadeOut('fast');
                $.single(this).parent() // -> drop boxes
                              .add('#CAAimageEditor, #CAAoverlay') // -> image editor
                              .remove();
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

            CONSTANTS.CSS['.dropBoxImage'] = { cursor: $.browser.mozilla ? '-moz-zoom-in' : '-webkit-zoom-in' };

            $.log('Adding css for the CAA batch script.');
            $make('style', { type : 'text/css' }).text(Object.keys(CSS).map(function create_css_rules (key) {
                theseRules = Object.keys(CSS[key]).map(function create_css_rules_internal (rule) {
                    return [rule, ':', CSS[key][rule]].join('');
                }).join(';');
                return [key, '{', theseRules, ';}'].join('');
            }).join('')).appendTo('head');

            $.log('Adding image preview css classes.');
            sizes.forEach(function create_css_style_elements (size) {
                classes.push($make('style', { id   : 'style' + size
                                            , type : 'text/css'
                                            }).text('.localImage { width: ' + size + 'px; }'));
            });

            /* http://musicbrainz.org/artist/{mbid} does not set a width for the title or checkbox columns.  This next bit
               prevents those columns getting squished when the table-layout is set to fixed layout. */
            var $th = $(document.getElementsByTagName('th'));
            for (var i = 0; i < 3; i = i + 2) {
                $.addRule(['thead > tr > th:nth-child(', (i + 1), ')'].join(''),
                          ['{width:', ($th.quickWidth(i) + 10), 'px!important;}'].join(''));
            }

            classes.push($make('style', { id : 'tblStyle1' }).text('table.tbl { table-layout: fixed; }'));

            $('head').appendAll(classes);

            $.log('Adding image preview methods.');
            var useSheets = function use_stylesheets (tiny, small, medium, big) {
                for (var i = 0; 4 > i; i++) {
                    $('#style' + sizes[i]).prop('disabled', !arguments[i]);
                }
            };
            $.extend({
                     imagesTiny   : function imagesTiny () { useSheets(1, 0, 0, 0); },
                     imagesSmall  : function imagesSmall () { useSheets(0, 1, 0, 0); },
                     imagesMedium : function imagesMedium () { useSheets(0, 0, 1, 0); },
                     imagesLarge  : function imagesLarge () { useSheets(0, 0, 0, 1); }
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

        $('#imageShrink').on('click', function imageShrink_click_handler () {
            imageSize(-1);
        });
        $('#imageMagnify').on('click', function imageMagnify_click_handler () {
            imageSize(1);
        });

        var addImageToDropbox = function add_image_to_dropbox (file, source, uri) {
            $.log('Running addImageToDropbox');

            var dataURLreader = new FileReader()
              , binaryReader  = new FileReader()
              , title         = (source === 'local') ? 'Local file: ' + (file.name)
                                                     : source + ' file: ' + uri
              ;
            var $img          = $make('img', { 'class'   : 'localImage'
                                             , alt       : title
                                             , draggable : true
                                             , title     : title
                                             }).data('source', source)
                                               .data('file', file);

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
            return;
        };

        var supportedImageType = function supportedImageType (uri) {
            var matches = re.image.exec(uri)
              ;
            if (matches === null) {
                return false;
            }
            var matched = matches[0];
            $.log('Testing file with extension "' + matched + '" to see if it is a supported extension.');
            switch (matched) {
                /* JPEG */
                case '.jpg'   : /* falls through */
                case '.jpeg'  : /* falls through */
                case '.jpe'   : /* falls through */
                case '.jfif'  : /* falls through */
                case '.jif'   : return 'jpg';
                /* Progressive JPEG */
                case '.pjp'   : /* falls through */
                case '.pjpeg' : return 'jpg';
                /* Portable Network Graphics */
                case '.png'   : return 'png';
                /* GIF */
                case '.gif'   : return 'gif';
                /* Bitmap */
                case '.bmp'   : return 'bmp';
                /* Google WebP */
                case '.webp'  : return 'webp';
                /* Icon */
                case '.ico'   : return 'ico';
                /* JPEG Network Graphics */
                case '.jng'   : return 'jng';
                /* JPEG2000 */
                case '.j2c'   : /* falls through */
                case '.j2k'   : /* falls through */
                case '.jp2'   : /* falls through */
                case '.jpc'   : /* falls through */
                case '.jpt'   : return 'jp2';
                /* ZSoft IBM PC Paintbrush */
                case '.pcx'   : return 'pcx';
                /* Lotus Picture */
                case '.pic'   : return 'pic';
                /* Macintosh */
                case '.pict'   : return 'pict';
                /* MacPaint file format */
                case '.pnt'   : return 'pnt';
                /* Targa file format */
                case '.tga'   : return 'tga';
                /* Aldus Tagged Image File Format */
                case '.tif'   : /* falls through */
                case '.tiff'  : return 'tiff';
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

                reader.onload = function convertImage_reader_onload_handler (e) {
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
                        img.onload = img.onerror = function convertImage_webp_test_handler () {
                            if (img.height === 2) {
                                supportedImageFormats.push('webp');
                            }
                        };
                        img.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
                    }

                    // Convert image if its image format is supported via either polyfill or native
                    if ($.inArray(type, supportedImageFormats) + 1) {
                        img.onload = function convertImage_image_converter () {
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

        var addRemoteImage = function add_remote_image (e) {
            $.log('dblclick detected on comlink; creating file and thumbnail.');
            var $comlink = $(this)
              , imageBase64 = $comlink.text()
              , loadStage = ''
              , mime
              , thisImageFilename = 'image' + Date.now() + '.jpg'
              , imageType = e.data.imageType
              , uri = e.data.uri
              , handleError = function error_handler_for_loadRemoteFile_XHR (e, flagged) {
                                  'undefined' === typeof flagged && (flagged = false);
                                  $.log('loadRemoteFile\'s XMLHttpRequest had an error during ' + loadStage + '.', flagged);
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
            /* Create a new file in the temp local file system. */
            loadStage = 'getFile';
            localFS.root.getFile(thisImageFilename, { create: true, exclusive: true }, function localFS_create_new_file (thisFile) {
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
                            thisFile.file(function fileWriter_onwriteend_internal (file) {
                                if (imageType !== 'jpg') {
                                    file = convertImage(file, imageType, uri);
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
                    $.log('Remote file has been retrieved and writen.');
                    $.log(localFS);
                    $comlink.remove();
                }, handleError);
            }, handleError);
        };

        var loadRemoteFile = function load_remote_file (uri, imageType) {
            'undefined' === typeof imageType && (imageType = 'jpg');

            $.log('Creating comlink to trigger other context to get the image.');
            $make('pre', { 'class': 'image' }).text(uri)
                                              .appendTo('#xhrComlink')
                                              .trigger('click')
            /* At this point, the event handler in the other javascript scope takes over.  It will then trigger a dblclick
               event, which will then continue the import. */
                                              .on('dblclick', { imageType: imageType, uri: uri }, addRemoteImage);
            return;
        };

        var getRemotePage = function getRemotePage (uri) {
            $.log('Loading ' + uri);
            var imageTest = re.image;

            $.ajax({ url: "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22" +
                          encodeURIComponent(uri) +
                          "%22%20and%20xpath%3D%22/html%22" + // Tells YQL to include the <head> as well as the <body>
                          "&format=xml&callback=?"
                   , dataType: "jsonp"
                   , context: this
                   , success: function yqlResponseHandler(data, textStatus, jqXHR) {
                                  var links = []
                                    , processURI = function getRemotePage_processURI (uri) {
                                            imageTest.test(uri) && links.push(uri);
                                        }
                                    , unique = function getRemotePage_unique (uri, index) {
                                            return links.indexOf(uri) === index;
                                        }
                                    , sendLinksToHandler = function getRemotePage_sendLinksToHandler (base) {
                                            links.length && handleURIs({ base: base
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
                                      $make('pre', { 'class': 'page' }).text(uri)
                                                                       .appendTo('#xhrComlink')
                                                                       .trigger('click')
                                                   /* At this point, the event handler in the other javascript scope takes over.
                                                      It will then trigger a dblclick event, which will then continue the process. */
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

        var handleURIs = function handleURIs (uris) {
            switch (!0) {
                case (void 0 !== uris.file_list && !!uris.file_list.length): // local file(s)
                    $.log('imageContainer: drop ==> local file');
                    loadLocalFile(uris.e);
                    break;
                case (void 0 !== uris.uri && !!uris.uri.length): // remote image drag/dropped
                    $.log('imageContainer: drop ==> uri');
                    uris.text = [uris.uri];
                    /* falls through */
                case (void 0 !== uris.text && !!uris.text.length): // plaintext list of urls drag/dropped
                    $.log('imageContainer: drop ==> list of uris');
                    var type;

                    uris.text.forEach(function handleURIs_walkArray (uri) {
                        type = supportedImageType(uri);
                        $.log('imageContainer: ' + type + ' detected at ' + uri);
                        if (type) {
                            loadRemoteFile(uri, type);
                        } else {
                            $.log(uri + ' does not appear to be an image; trying it as webpage.');
                            getRemotePage(uri);
                        }
                    });
                    break;
                default:
                    $.log('This is not something which can provide a usable image.');
            }
        };

        !function init_activate_dnd_at_dropzone () {
            $.log('Attaching events to drop zone.');
            $imageContainer.on({
                dragenter: function dragEnter (e) {
                    $.log('imageContainer: dragenter.');
                    $.single(this).addClass('over');
                },
                dragleave: function dragLeave (e) {
                    $.log('imageContainer: dragleave.');
                    $.single(this).removeClass('over');
                },
                dragover: function dragOver (e) {
                    $.log('imageContainer: dragover.', 1);
                    e.preventDefault();
                },
                drop: function drop (e) {
                    $.log('imageContainer: drop.');
                    $.single(this).removeClass('over');
                    e.preventDefault();
                    e = e.originalEvent || e;

                    var dropped = { file_list : e.dataTransfer.files
                                  , base      : $(e.dataTransfer.getData('Text')).find('base').attr('href') || ''
                                  , text      : e.dataTransfer.getData('Text').match(re.uri) || ''
                                  , uri       : e.dataTransfer.getData('text/uri-list')
                                  , e         : e
                                  };

                    $.log(dropped);
                    handleURIs(dropped);
                }
            });
        }();

        !function init_storage_event_handling () {
            $.log('Attaching listener for storage events.');
            var handleStorage = function handleStorage (e) {
                $.log('Storage event detected');

                /* Testing whether: 1) the key that was changed is the one we care about here, or
                                    2) the new value of the key is different from when the script first initialized in this tab.

                   #2 is important; without it, if you have multiple tabs open, each with this script running, they would create
                   a feedback loop, each triggering a new storage event on the other when they remove the new URL from the key.
                */
                if (e.key !== 'caaBatch_imageCache' || cachedImages === e.newValue) {
                    return;
                }

                $.log('Storage event modified the image cache.');

                e.preventDefault();

                if ('undefined' !== e.oldValue && e.newValue.length < e.oldValue.length) { // Another instance modified the image cache
                    cachedImages = localStorage.getItem('caaBatch_imageCache');
                    return false;
                }

                var newURL = decodeURIComponent(JSON.parse(e.newValue || '[]').pop());
                localStorage.setItem('caaBatch_imageCache', e.oldValue || '');

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

            var columnCount     = 0
              , tableLocation
              , $thisForm       = $('form[action*="merge_queue"]')
              , $caaBtn         = $make('input', { 'class' : 'caaLoad'
                                                 , title   : $.l('Load text one release')
                                                 , type    : 'button'
                                                 , value   : $.l('Load CAA images')
                                                 })
              , $addBtn         = $make('input', { 'class' : 'caaAdd'
                                                 , title   : $.l('Add image one release')
                                                 , type    : 'button'
                                                 , value   : '+'
                                                 }).hide()
              , $loadingDiv     = $make('div', { 'class' : 'loadingDiv' }).text($.l('loading'))
                                                                          .prepend($make('img', { 'class' : 'throbberImage'
                                                                                                , src     : CONSTANTS.THROBBER
                                                                                                })).hide()
              ;

            var makeCAATypeList = function makeCAATypeList () {
                                      $.log('Creating CAA type select.');
                                      var types     = CONSTANTS.COVERTYPES
                                        , $typeList = $make('select', { 'class'  : 'caaSelect'
                                                                      , multiple : 'multiple'
                                                                      , size     : types.length
                                                                      })
                                        ;

                                      return $typeList.appendAll(types.map(function makeCAATypeList_internal (type, i) {
                                          return $make('option', { value : i+1 }).text($.l('coverType:' + type));
                                      }));
                                  };

            var makeDropbox = function makeDropbox () {
                                  $.log('Creating dropbox.');
                                  var $types = makeCAATypeList();
                                  var $dropbox = $make('figure', { 'class' : 'CAAdropbox newCAAimage' });
                                  $dropbox.appendAll([ $makeCloseButton()
                                                     , $make('img', { 'class'   : 'dropBoxImage'
                                                                    , draggable : false
                                                                    }).wrap('<div>')
                                                                      .parent()
                                                     , $make('figcaption').appendAll([ $make('input', { type        : 'text'
                                                                                                      , placeholder : 'image comment'
                                                                                                      })
                                                                                     , $make('br')
                                                                                     , $types
                                                                                     ])
                                                     ]);
                                  return $dropbox;
                             };

            var $dropBox = makeDropbox();

            var caaResponseHandler = function caaResponseHandler (response, textStatus, jqXHR, data) {
                if ('object' !== typeof(response)) { // Firefox
                    response = JSON.parse(response);
                }
                $.log('Received CAA response, parsing...');
                if ($.isEmptyObject(response)) {
                    $.log('CAA response: no images in CAA for this release.');
                    return;
                }

                var $newCAARow       = data.$newCAARow
                  , $thisAddBtn      = data.$thisAddBtn
                  , parseCAAResponse = function parseCAAResponse (i) {
                      $.log('Parsing CAA response: image #' + i);
                      if ($newCAARow.find('.newCAAimage').length < response.images.length) {
                          caaAddNewImageBox($newCAARow.find('.caaDiv'));
                      }
                      var $emptyDropBox = $newCAARow.find('.newCAAimage:first');
                      $emptyDropBox.removeClass('newCAAimage')
                                   .find('input').replaceWith($make('div').text(this.comment)).end()
                                   .find('br, .closeButton').remove().end()
                                   .find('select').prop('disabled', true);
                      /* This next bit of code does the same thing as the lowsrc attribute.  This would have
                         been easier, but lowsrc no longer exists in HTML5, and Chrome has dropped support for it.
                         http://www.ssdtutorials.com/tutorials/title/html5-obsolete-features.html */
                      var $img = $emptyDropBox.find('img');
                      $img[0].src = CONSTANTS.THROBBER;
                      $img.css('padding-top', '20px');
                      var realImg = new Image();
                      realImg.src = this.image;
                      realImg.onload = function assign_real_caa_image () {
                          $img.data('resolution', realImg.naturalWidth + ' x ' + realImg.naturalHeight);
                          var xhrReq = $.ajax({
                              url: realImg.src,
                              success: function lowsrc_workaround_success_handler (request) {
                                  $img.data('size', addCommas(request.length))
                                      .prop('src', realImg.src)
                                      .css('padding-top', '0px');
                              }
                            });
                      };
                      /* End lowsrc workaround. */
                      $.each(this.types, function assign_image_type (i) {
                          var value = $.inArray(this, CONSTANTS.COVERTYPES) + 1;
                          $emptyDropBox.find('option[value="' + value + '"]').prop('selected', true);
                      });
                      checkScroll($newCAARow.find('div.loadingDiv'));
                  };

                $.each(response.images, parseCAAResponse);
                $newCAARow.find('.loadingDiv, .caaAdd').toggle();
                $newCAARow.find('.caaDiv').slideDown('slow');
            };

            var caaRowLoadHandler = function invoke_CAA_row_button_click_handler (e) {
                $.log('Add CAA images to release row button triggered.');
                var $newCAARow  = e.data.$newCAARow;

                $newCAARow.find('.loadingDiv').show();
                $newCAARow.find('.caaLoad').hide();
                $newCAARow.find('.caaDiv').slideUp();

                var $widthEle = $('.caaLoad:first').parents('td:first')
                  , $tableParent = $('.caaLoad:first').parents('table:first')
                  , caaRequest = 'http://coverartarchive.org/release/' + $.single(this).data('entity')
                  ;

                if (!$tableParent.hasClass('tbl')) {
                    $widthEle = $tableParent.parents('td:first');
                }
                for (var i = 0, repeats = Math.max(3, Math.round($widthEle.quickWidth(0)/132) - 5); i < repeats; i++) {
                       $.single(this).after($dropBox.clone(true));
                }
                $.log('Requesting CAA info for ' + $.single(this).data('entity'));
                $.ajax({ cache    : false
                       , context  : this
                       , url      : caaRequest
                       , error    : function handler(jqXHR, textStatus, errorThrown, data) {
                                        /* Reference http://tickets.musicbrainz.org/browse/CAA-24 */
                                        $.log('Ignore the XMLHttpRequest error.  CAA returned XML stating that CAA has no images for this release.');
                                        $newCAARow.find('div.loadingDiv, .caaAdd').toggle();
                                        $newCAARow.find('div.caaDiv').slideDown('slow');
                                    }
                       , success  : function caa_response_mediator (response, textStatus, jqXHR) {
                                        return caaResponseHandler(response, textStatus, jqXHR, { $newCAARow  : $newCAARow
                                                                                               , $thisAddBtn : e.data.$thisAddBtn
                                                                                               });
                                    }
                       });
            };

            var caaAddNewImageBox = function invoke_Add_image_space_button_click_handler ($div) {
                $.log('Add new CAA image space button triggered.');
                $div = $div.append ? $div : $(this).nextAll('.caaDiv');
                $div.append($dropBox.clone(true));
                checkScroll($div);
            };

            var addCAARow = function add_new_row_for_CAA_stuff (event) {
                var $releaseAnchor = $.single(this);

                if ($releaseAnchor[0].nodeName === 'TABLE') { // Detect bitmap's script's expandos.
                    /* DOMNodeInserted is triggered for each new element added to the table by bitmap's script.
                       This looks for the editing tr he adds at the end, since that is the last DOMNodeInserted which is
                       triggered when a RG is expanded.  He does not add that row for expanded releases, so this only
                       kicks in when a RG is expanded, and only when that entire expando has been inserted. */
                    var $editRow = $releaseAnchor.find('a[href^="/release/add?release-group"]').parent();
                    if ($editRow.length) {
                        $editRow.remove();
                        $releaseAnchor.find('a')
                                      .filter('[href^="/release/"]')
                                      .each(addCAARow);
                    }
                    return;
                }

                var tableLocation = tableLocation
                  , $releaseRow   = $releaseAnchor.parents('tr:first')
                  , thisMBID      = re.mbid.exec($releaseAnchor.attr('href'))
                  ;

                0 === columnCount && (columnCount = $releaseRow[0].getElementsByTagName('td').length);

                $.log('New release found, attaching a CAA row.', 1);
                var $thisAddBtn     = $addBtn.quickClone()
                  , $thisCAABtn     = $caaBtn.quickClone().data('entity', thisMBID)
                  , $thisLoadingDiv = $loadingDiv.quickClone(true)
                  , $newCAARow      = $make('td', { 'class' : 'imageRow'
                                                  , colspan : columnCount
                                                  }).appendAll([ $thisAddBtn
                                                               , $thisLoadingDiv
                                                               , $make('div', { 'class' : 'caaDiv' }).append($thisCAABtn)
                                                               ])
                                                    .wrap($make('tr', { 'class': $releaseRow.prop('class') }));

                $thisAddBtn.on('click', caaAddNewImageBox);
                $thisCAABtn.on('click', { $newCAARow  : $newCAARow
                                        , $thisAddBtn : $thisAddBtn
                                        }, caaRowLoadHandler);
                $releaseRow.after($newCAARow);
                return;
            };

            // handle pre-existing release rows
            var addLoadButtons = function add_load_images_button_to_existing_release_rows () {
                $(this).find('a')
                       .filter('[resource^="[mbz:release/"]')
                       .each(addCAARow);
            };
            $('#content').detach(addLoadButtons);

            // handle dynamically added release rows (e.g. http://userscripts.org/scripts/show/93894 )
            $.log('Adding release row event handler.');
            var handleInsertedReleaseRow = function handleInsertedReleaseRow () {
                $.single(this).on('DOMNodeInserted', 'table', addCAARow);
            };
            $thisForm.find('tbody')
                     .each(handleInsertedReleaseRow);
        }();

        !function init_add_caa_table_controls () {
            $.log('Adding CAA load all releases button.');
            var $caaAllBtn = $make('input', { 'class' : 'caaAll'
                                            , title   : $.l('Load text all releases')
                                            , type    : 'button'
                                            , value   : $.l('Load CAA images for all')
                                            });
            $('table.tbl').before($make('br'))
                          .before($caaAllBtn);
            $caaAllBtn.on('click', function caaAllBtn_click_handler () {
                $.log('CAA load all releases\' images button has been clicked.');
                $('.caaLoad:visible').each(function caaAllBtn_click_each_release_button () {
                    $.log('Triggering a click on a CAA load images button.');
                    $.single(this).trigger('click');
                });
            });
        }();

        !function load_stored_images() {
                var image
                  , type
                  , imageArray = JSON.parse(localStorage.getItem('caaBatch_imageCache'))
                  ;
                null !== imageArray && imageArray.length && imageArray.forEach(function load_stored_images_internal (url) {
                    image = decodeURIComponent(url);
                    (type = supportedImageType(image)) && loadRemoteFile(image, type);
                });
            }();

        /* Create image editor. */
        !function create_image_editor_handler () {
            $.log('Adding handler for image editor.');
            $('body').on('click', '#previewImage', function image_editor_initial_handler (e) {
                if ($('#previewImage').prop('src').length === 0) {
                    return;
                }

                var $makeMask = function image_editor_create_mask (where) {
                    return $make('div', { 'class' : 'CAAmask'
                                        ,  id     : 'CAAmask' + where
                                        });
                };

                var $makeNumCtrl = function image_editor_create_crop_controls (where) {
                    return $make('label', { 'class' : 'cropLabel'
                                          , id    : 'CAAeditorCropLabel' + where
                                          , title : $.l(where)
                                          }).text($.l(where))
                                            .prepend($make('input', { 'class' : 'cropControl'
                                                                    , id      : 'CAAeditorCropControl' + where
                                                                    , 'min'   : 0
                                                                    , step    : 1
                                                                    , title   : $.l('Crop image') + ': ' + $.l(where)
                                                                    , type    : 'number'
                                                                    , value   : 0
                                                                    }));

                };
                var $makeFlipCtrl = function image_editor_create_flip_controls (direction) {
                    var symbol = (direction === 'Vertical') ? '⇵' : '⇆';

                    return $make('input', { 'class' : 'flipControl'
                                          , id      : 'CAAeditorFlip' + direction
                                          , title   : $.l('Flip image') + ' ' + symbol
                                          , type    : 'button'
                                          , value   : symbol
                                          });

                };

                var $CAAimageEditor     = $make('div',      { id : 'CAAimageEditor' }).hide()
                  , $ieDiv              = $make('div',      { id : 'CAAeditorDiv' })
                  , $ieCanvasDiv        = $make('div',      { id : 'CAAeditorCanvasDiv' })
                  , $ieCanvas           = $make('canvas',   { id : 'CAAeditorCanvas' })
                  , $ieMenu             = $make('div',      { id : 'CAAeditorMenu' })
                  , $ieRotateField      = $make('fieldset', { id : 'CAAeditorRotateField' })
                  , $ieRotateLegend     = $make('legend',   { id : 'CAAeditorRotateLegend' }).text($.l('Rotate image'))
                  , $ieRotateLabel      = $make('label',    { id    : 'CAAeditorRotateLabel'
                                                            , title : $.l('How many degrees')
                                                            }).text(' ' + $.l('degrees'))
                  , $ieRotateControl    = $make('input',    { id : 'CAAeditorRotateControl'
                                                            , 'max' : 360
                                                            , 'min' : -360
                                                            , step : 1
                                                            , type : 'number'
                                                            , value : 0
                                                            })
                  , $ieFlipField        = $make('fieldset', { id : 'CAAeditorFlipField' })
                  , $ieFlipLegend       = $make('legend',   { id : 'CAAeditorFlipLegend' }).text($.l('Flip image'))
                  , $ieCropField        = $make('fieldset', { id : 'CAAeditorCropField' })
                  , $ieCropLegend       = $make('legend',   { id : 'CAAeditorCropLegend' }).text($.l('Crop image'))
                  , $ieMaskColorLabel   = $make('label',    { 'class' : 'cropLabel'
                                                            , id : 'CAAeditiorMaskColorLabel'
                                                            , title : $.l('Crop mask color')
                                                            }).text($.l('Crop mask color'))
                  , $ieMaskColorControl = $make('input',    { 'class' : 'cropControl'
                                                            , id : 'CAAeditiorMaskColorControl'
                                                            , type : 'color'
                                                            , value : $.getColor('MASK')
                                                            })
                  , $CAAoverlay         = $make('div',      { id : 'CAAoverlay' }).hide()
                  ;

                $('body').detach(function create_image_editor_internal_detach_handler () {
                    $(this).prepend(
                              $CAAimageEditor.appendAll(
                                              [ $makeCloseButton
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
                                                                                ])
                                                                 ])
                                                       ])
                                              ]))
                             .prepend($CAAoverlay);
                });
                $.polyfillInputNumber();

                var imageRatio     = $('#previewImage').quickWidth(0) / $('#previewImage').quickHeight(0)
                  , canvasHeight   = Math.round($('#CAAimageEditor').quickHeight(0) * 0.9)
                  , canvasWidth    = Math.round(canvasHeight * imageRatio)
                  , degreesRotated = 0
                  ;

                /* If the above would lead to a canvas that would be wider than the editor window (a short but *really* wide image),
                   then figure out the height based on the editor window's width instead of the other way around. */
                var editorWindowWidth = $('#CAAeditorDiv').getHiddenDimensions().width;

                if (editorWindowWidth < (canvasWidth - 230)) {
                    canvasWidth  = Math.round(editorWindowWidth - 230);
                    canvasHeight = Math.round(canvasWidth / imageRatio);
                }

                $('#CAAeditorCanvasDiv').css({ height : canvasHeight + 'px'
                                             , width  : canvasWidth + 'px'
                                             });

                /* Load the image into the canvas. */
                var canvas = document.getElementById("CAAeditorCanvas")
                  , ctx = canvas.getContext("2d")
                  , img = new Image()
                /* create a backup canvas for storing the unmodified image. */
                  , backupCanvas = document.createElement("canvas")
                  , backupCtx = backupCanvas.getContext("2d")
                  ;

                img.onload = function load_image_handler () {
                    /* Set the canvas size attributes.  This defines the number of pixels *in* the canvas, not the size of the canvas. */
                    canvas.width = img.width;
                    canvas.height = img.height;

                    /* Set the canvas css size.  This defines the size of the canvas, not the number of pixels *in* the canvas. */
                    canvas.style.height = canvasHeight + 'px';
                    canvas.style.width = canvasWidth + 'px';

                    ctx.drawImage(img, 0, 0);

                    backupCanvas.width = canvas.width;
                    backupCanvas.height = canvas.height;
                    backupCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
                };

                img.src = $('#previewImage').prop('src');

                var prepCanvas = function prep_canvas_handler (callback) {
                    var centerH        = canvas.height/2
                      , centerW        = canvas.width/2
                      ;
                    /* Clear the canvas */
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0); // http://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.restore();

                    /* Move the origin point to the center of the canvas */
                    ctx.translate(centerW, centerH);

                    /* Run the callback */
                    callback();

                    /* Move the origin point back to the top left corner of the canvas */
                    ctx.translate(-centerW, -centerH);

                    /* Draw the image into the canvas */
                    ctx.drawImage(backupCanvas, 0, 0);
                };

                var rotate = function rotate_handler (degrees) {
                    var rotate = function rotate_internal_handler  () {
                        ctx.rotate(-degreesRotated * Math.PI / 180);
                        ctx.rotate(degrees * Math.PI / 180);
                        degreesRotated = degrees;
                    };
                    prepCanvas(rotate);
                };

                var flip = function flip_handler  (h, v) {
                    var flip = function flip_internal_handler () {
                        ctx.scale(h ? -1 : 1, v ? -1 : 1);
                    };
                    prepCanvas(flip);
                };

                $('#CAAeditorFlipVertical').on('click', function flip_vertical_click_event_handler () {
                    flip(0,1);
                });

                $('#CAAeditorFlipHorizontal').on('click', function flip_vertical_click_event_horizontal () {
                    flip(1,0);
                });

                $('#CAAeditorRotateControl').on('change', function rotate_controls_change_event_handler () {
                    rotate($.single(this).val());
                });

                $('#CAAeditorCropControlTop').on('change', function crop_controls_change_event_handler_top () {
                    $('#CAAmaskTop').css('height', $.single(this).val());
                });

                $('#CAAeditorCropControlBottom').on('change', function crop_controls_change_event_handler_bottom () {
                    $('#CAAmaskBottom').css('height', $.single(this).val());
                });

                $('#CAAeditorCropControlLeft').on('change', function crop_controls_change_event_handler_left () {
                    $('#CAAmaskLeft').css('width', $.single(this).val());
                });

                $('#CAAeditorCropControlRight').on('change', function crop_controls_change_event_handler_right () {
                    $('#CAAmaskRight').css('width', $.single(this).val());
                });

                $('#CAAeditorCropControlTop, #CAAeditorCropControlBottom').prop('max', canvasHeight);
                $('#CAAeditorCropControlLeft, #CAAeditorCropControlRight').prop('max', canvasWidth);

                /* Create the css rule for the crop mask. */
                $make('style', { id : 'CAAeditiorMaskColorStyle' }).text('.CAAmask { background-color: ' + $.getColor('MASK') + '; }')
                                                                   .appendTo('head');

                /* Create the color picker. */
                $.log('Creating color picker for image editor');
                var iePicker = new jscolor.color(document.getElementById('CAAeditiorMaskColorControl'), {});
                iePicker.hash = true;
                iePicker.pickerFace = 5;
                iePicker.pickerInsetColor = 'black';
                iePicker.fromString($.getColor('MASK'));

                /* Add functionality to the color picker to change the css rule for the crop mask. */
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

    /* Preview functionality */
    $('body').on('click', '.localImage, .CAAdropbox:not(.newCAAimage) * .dropBoxImage', function send_image_to_preview_box () {
        if (!$('#caaOptionRemove').prop('checked')) {
            $.log('Setting new image for preview box.');
            $('#previewImage').prop('src', $.single(this).prop('src'))
                              .prop('title', $.l('Click to edit this image'));
            $('#previewResolution').text($.single(this).data('resolution'));
            $('#previewFilesize').text($.single(this).data('size') + ' ' + $.l('bytes'));
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
                                    $.single(this).addClass('over');
                                }
                                return false;
                            },
                dragleave : function newCAAimage_dragLeave (e) {
                                $.log('loadingDiv: dragleave');
                                e.preventDefault();
                                if ($draggedImage !== null) {
                                    /* https://bugs.webkit.org/show_bug.cgi?id=66547 */
                                    if (!inChild) {
                                        $.single(this).removeClass('over');
                                    }
                                }
                                return false;
                            },
                drop      : function newCAAimage_drop (e) {
                                $.log('newCAAimage: drop');
                                e.preventDefault();
                                if ($draggedImage !== null) {
                                    $.single(this).find('.dropBoxImage').replaceWith($draggedImage);
                                    $draggedImage.toggleClass('beingDragged dropBoxImage localImage')
                                                 .parents('figure:first').toggleClass('newCAAimage workingCAAimage over')
                                                                         .css('background-color', getEditColor($.single(this)));
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
            $('th:eq(2)').css('width', $('th:eq(2)').quickWidth(0) + 'px');
            $('#tblStyle1').prop('disabled',false);
        }
        $('div.caaDiv').each(function window_resize_internal () {
            checkScroll($.single(this));
        });
    };

    !function add_manual_starter_for_init () {
        $.log('Adding manual starter link.');
        $.addRule('#triggerLink', '{ cursor: pointer }');
        var $triggerLink = $make('a', { id : 'triggerLink' }).text($.l('Add cover art'))
                                                             .wrap('<li>')
                                                             .on('click', function start_cover_art_script () { init(); })
                                                             .parent();
        $('ul.links').find('hr:first').before($triggerLink);
    }();
};

function thirdParty($, CONSTANTS, getColor) {
    /* Despite the name, each function in thirdParty is by Brian Schweitzer unless otherwise noted. */

    /*jshint strict:false */
    jQuery.noConflict();

    if (!document.head) {
        document.head = document.getElementsByTagName('head')[0];
    }

    $.browser.chrome = navigator.userAgent.toString().toLowerCase().indexOf('chrome');

    jQuery.extend({
        /* Takes a localStorage value name, and inserts the script stored there (as a string) into the DOM. */
        addScript: function addScript (scriptSource) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.textContent = localStorage.getItem(scriptSource);
            document.head.appendChild(script);
        },
        // Creates and adds a new css rule
        addRule: function addRule(selector, rule) {
            $('<style type="text/css">').text(selector + rule).appendTo('head');
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
            if (!CONSTANTS.DEBUGMODE) {
                return;
            }
            'undefined' === typeof verbose && (verbose = false);
            (!verbose || CONSTANTS.DEBUG_VERBOSE) && console.log(str);
            return;
        },
        /* Polyfill input[type=number], if needed. */
        polyfillInputNumber : function polyfillInputNumber () {
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
    $.fn.appendAll = function jQuery_appendAll (arrayToAdd) {
        return this.append.apply(this, arrayToAdd);
    };

    // Sets the css visibility using a boolean value rather than a string value
    $.fn.vis = function jQuery_vis (i) {
        return this.css('visibility', i ? 'visible'
                                        : 'hidden');
    };

    // A faster .clone(); clones only the nodes, without regard to events.  deep = true == deep node copy.
    $.fn.quickClone = function jQuery_vis (deep) {
        return this.map(function jQuery_quickClone (elem, deep) {
            return this.cloneNode(deep || false);
        });
    };

    // Tests whether an element has a defined property value.
    $.fn.hasProp = function jQuery_hasProp (property) {
        property = this.prop(property);
        return ('undefined' !== typeof property && property.length);
    };

    /* Get the width of an element.  Faster than .width(). */
    $.fn.quickWidth = function jQuery_quickWidth (which) {
        return parseFloat($.css(this[which || 0], 'width'));
    };

    /* Get the height of an element.  Faster than .height(). */
    $.fn.quickHeight = function jQuery_quickHeight (which) {
        return parseFloat($.css(this[which || 0], 'height'));
    };

    /* jQuery.single, by James Padolsey
       http://james.padolsey.com/javascript/76-bytes-for-faster-jquery/
    */
    jQuery.single = (function jQuery_single (o){
         var collection = jQuery([1]); // Fill with 1 item, to make sure length === 1
         return function jQuery_single_internal (element) {
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
              if (typeof async !== 'boolean') {
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
          return this.each(function jQuery_detach () {
              detach(this, async, fn);
          });
      };
}

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
        requires.forEach(function add_required_scripts (requiredItem) {
            makeScript();
            script.textContent = localStorage.getItem(requiredItem);
            head.appendChild(script);
        });
        continueLoading();
    })(i || 0);
}();
