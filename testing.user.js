// ==UserScript==
// @name        Testing 1
// @version     0.01.0523
// @description
// @include     http://musicbrainz.org/artist/*
// @match       http://musicbrainz.org/artist/*
// @include     http://test.musicbrainz.org/artist/*
// @match       http://test.musicbrainz.org/artist/*
// @include     http://musicbrainz.org/artist/*/releases
// @match       http://musicbrainz.org/artist/*/releases
// @include     http://test.musicbrainz.org/artist/*/releases
// @match       http://test.musicbrainz.org/artist/*/releases
// @include     http://musicbrainz.org/release-group/*
// @match       http://musicbrainz.org/release-group/*
// @include     http://test.musicbrainz.org/release-group/*
// @match       http://test.musicbrainz.org/release-group/*
// @include     http://musicbrainz.org/label/*
// @match       http://musicbrainz.org/label/*
// @include     http://test.musicbrainz.org/label/*
// @match       http://test.musicbrainz.org/label/*
// @match       file://*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require     https://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js
// ==/UserScript==

/*global console */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, es5:true, expr:true, bitwise:true, strict:true, undef:true, curly:true, browser:true, jquery:true, maxerr:500, laxbreak:true, newcap:true, laxcomma:true */

/* Installation and requirements:

Firefox: Install as normal.

Chrome: Install script.  Go to settings --> extensions ( chrome://chrome/extensions/ ) and make sure that the checkbox next to
"Allow access to file URLs" for this script is checked.  Then start chrome with the --allow-file-access-from-files switch.
If you reinstall or upgrade the script, you may need to restart the browser before the script works again.

Opera: Compatible?  Definitely requires minimum of version 12.

*/

var CONSTANTS = { DEBUGMODE     : true
                , COVERTYPES    : [ 'Front'
                                  , 'Back'
                                  , 'Booklet'
                                  , 'Medium'
                                  , 'Obi'
                                  , 'Spine'
                                  , 'Track'
                                  , 'Other'
                                  ]
                , IMAGESIZES    : [100, 150, 300]
                , LANGUAGE      : 'en'
                , SIDEBARWIDTH  : (Math.max(Math.round(screen.width/400), 3) * 107) + 15
                , SIDEBARHEIGHT : (screen.height - 300)
                , THROBBER      : localStorage.getItem('throbber')
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

function main ($, CONSTANTS) {
    'use strict';
    jQuery.noConflict();

    /* This just forces CONSTANTS.THROBBER to be already be loaded, so that the throbber shows up faster. */
    $('body').append($('<img>').prop('src', CONSTANTS.THROBBER).hide());

    var $imageContainer
      , $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    $.log('Script initializing.');
    var init = function init () {
        !function init_resize_sidebar () {
            $('#content').css('margin-right', (CONSTANTS.SIDEBARWIDTH + 20) + 'px');
            $('#page').css('background', 'white');
        }();

        !function init_create_dropzone () {
            $.log('Creating drop zone.');
            $imageContainer = $('<div id="imageContainer"/>').css({ height       : CONSTANTS.SIDEBARHEIGHT + 'px'
                                                                  , 'max-height' : CONSTANTS.SIDEBARHEIGHT + 'px'
                                                                  , 'overflow-y' : 'auto'
                                                                  , width        : '100%'
                                                                  });


            $('#sidebar').css({ 'border-left'  : '1px dotted grey'
                              , 'padding-left' : '8px'
                              , position       : 'fixed'
                              , right          : '20px'
                              , width          : CONSTANTS.SIDEBARWIDTH + 'px'
                              })
                         .empty()
                         .append($('<h1 id="imageHeader"/>').text($.l('Images')))
                         .append($('<br/><br/>'))
                         .append($imageContainer);
        }();

        !function init_activate_dnd_on_page () {
            $.log('Attaching events to body.');
            $('body').on('dragenter dragleave dragover drop', function bodyDrag(e) {
                    e.preventDefault();
                    $.debug() && $(this).css('background-color', 'blue');
                    $.log('There was a drag event on the page.');
                });
        }();

        !function init_add_css () {
            $.log('Adding css rules');
            $.addRule('.localImage', '{ padding: 3px; vertical-align: middle; }');
            $.addRule('.existingCAAimage', '{ background-color: #FFF; border: 0px none; }');
            $.addRule('.newCAAimage', '{ background-color: #F2F2FC; border: 1px #AAA dotted; }');
            $.addRule('.CAAdropbox', JSON.stringify({ 'border-radius'    : '6px;'
                                                    , 'float'            : 'left;'
                                                    , 'margin'           : '6px;'
                                                    , 'min-height'       : '126px;'
                                                    , 'padding'          : '3px;'
                                                    , 'vertical-align'   : 'middle;'
                                                    , 'width'            : '126px;'
                                                    }));
            $.addRule('.CAAdropbox > figcaption', '{ text-align: center; position: relative; height: 14em; }');
            $.addRule('.CAAdropbox > figcaption > input, .CAAdropbox > figcaption > div', '{ font-size: 80%; clear: both; }');
            $.addRule('.newCAAimage > div', '{ border: 1px dotted grey; background-color: #E0E0FF; margin-bottom: 6px!important; }');
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
            $.addRule('input.caaLoad, input.caaAll', JSON.stringify({ 'background-color' : 'indigo!important;'
                                                                    , 'border'           : '1px outset #FAFAFA!important;'
                                                                    , 'border-radius'    : '7px;'
                                                                    , 'color'            : 'white!important;'
                                                                    , 'font-size'        : '90%;'
                                                                    , 'margin-bottom'    : '16px;'
                                                                    , 'margin-top'       : '1px!important;'
                                                                    , 'opacity'          : '.35;'
                                                                    , 'padding'          : '3px 8px;'
                                                                    }));
            $.addRule('input.caaAdd', JSON.stringify({ 'background-color' : 'green!important;'
                                                     , 'border'           : '1px outset #FAFAFA!important;'
                                                     , 'border-radius'    : '16px;'
                                                     , 'color'            : 'white!important;'
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
           $.addRule('input.caaAdd:hover, input.caaAll:hover, input.caaLoad:hover', '{ opacity: .9; color: lightgrey; }');
           $.addRule('input.caaAdd:active, input.caaAll:active, input.caaLoad:active', '{ opacity: 1; color: white; border-style: inset!important; }');
           $.addRule('div.loadingDiv > img', '{ height: 30px; width: 30px; padding-right: 10px; }');

            /* MB's css sets this to 2em, but the column is actually 6em wide.  This needs to be fixed, or else it will break
               when table-layout: fixed is set. */
            $.addRule('table.tbl .count', '{ width: 6em!important; }');
            /* Explicitly set the width on the title field. */
            $('th:eq(2)').css('width', $('th:eq(2)').width() + 'px')
            $.addRule('table.tbl', '{ table-layout: fixed; }');
            $.addRule('table.tbl * table', '{ width: 100%; }');
            $.addRule('.imageRow', '{ overflow-x: auto; padding-bottom: 1em!important; }');

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

        !function init_activate_dnd_at_dropzone () {
            $.log('Attaching events to drop zone.');
            var dragfunc = function dragfunc (e, ltext) {
                e.preventDefault();
                $.log('There was a ' + ltext + ' event at the drop zone.');
            };
            $imageContainer.on({
                dragenter: function dragEnter(e) {
                    dragfunc(e, 'dragenter');
                    $(this).css('background-color', 'lightblue;');
                },
                dragleave: function dragLeave(e) {
                    dragfunc(e, 'dragleave');
                    $(this).css('background-color', 'white');
                },
                dragover: function dragOver(e) {
                    dragfunc(e, 'dragover');
                },
                drop: function drop(e) {
                    dragfunc(e, 'drop');
                    $(this).css('background-color', 'white');
                    e = e.originalEvent || e;

                    var files = (e.files || e.dataTransfer.files)
                      , $img = $('<img/>').addClass('localImage')
                                          .data('source', 'local');
                    for (var i = 0; i < files.length; i++) {
                        if (!files[i].type.match(/image\/p?jpeg/)) {
                            continue;
                        }
                        !function add_dropped_image (i) {
                            var reader = new FileReader();
                            reader.onload = function add_attributes_to_dropped_image(event) {
                                var $newImg = $img.clone()
                                                  .prop({ alt   : (files[i].name)
                                                        , title : (files[i].name)
                                                        , src   : event.target.result
                                                        });
                                $imageContainer.append($newImg);
                            };
                            reader.readAsDataURL(files[i]);
                        }(i);
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
                                            .prepend($('<img>').prop('src', CONSTANTS.THROBBER))
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
                                                              .append($('<img>').wrap('<div>').parent())
                                                              .append($('<figcaption>').append($('<input type="text"/></br>'))
                                                                                       .append($types));
                                  return $dropbox;
                             };

            var $dropBox = makeDropbox();

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
                                    $imageDiv.append($dropBox.clone());
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
                                           $(this).after($dropBox.clone());
                                    }
                                    $.log('Requesting CAA info for ' + $(this).data('entity'));
                                    $.ajax({ cache    : false
                                           , context  : this
                                           , url      : caaRequest
                                           , error    : function handler(jqXHR, textStatus, errorThrown) {
                                                            /* Reference http://tickets.musicbrainz.org/browse/CAA-24 */
                                                            $.log('Ignore the XMLHttpRequest error.  CAA returned XML stating that CAA has no images for this release.');
                                                            $newCAARow.find('div.loadingDiv, input.caaAdd').toggle();
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
                                                                                 .find('br').remove().end()
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
                                                                });
                                                            }
                                                        $newCAARow.find('div.loadingDiv, input.caaAdd').toggle();
                                                        $newCAARow.find('div.caaDiv').slideDown('slow');
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

    var log = function log (str) {
        debug() && console.log(str);
    };

    jQuery.extend({
        addRule   : function addrule_handler (selector, rule) {
                        return addRule(selector, rule);
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
        }
        if (i === 0) { /* Scripts are not cached in localStorage, go get them and cache them. */
            makeScript();
            script.src = requires[0];
            script.addEventListener('load', function loader_move_to_next_script () {
                script_loader(1);
            }, true);
            head.appendChild(script);
        } else { /* Scripts are cached in localStorage; load them. */
            for (var j = 0; j < i; j++) {
                makeScript();
                script.textContent = localStorage.getItem(requires[i]);
                head.appendChild(script);
            }
            continueLoading();
        }
    })(i || 0);
}();
