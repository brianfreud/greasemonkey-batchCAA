// ==UserScript==
// @name        Testing 1
// @version     0.01.0341
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
                , IMAGESIZES    : [100, 150, 300]
                , LANGUAGE      : 'en'
                , SIDEBARWIDTH  : (Math.max(Math.round(screen.width/400), 3) * 107) + 15
                , SIDEBARHEIGHT : (screen.height - 300)
                , TEXT          : {
                                  en : { 'Add cover art'       : 'Add cover art'
                                       , 'Images'              : 'Images'
                                       , 'Load CAA images'     : 'Load CAA images'
                                       },
                                  fr : {
                                       'Images' : 'Les Photos'
                                       }
                                  }
                };

function main ($, CONSTANTS) {
    'use strict';
    jQuery.noConflict();

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
            $.addRule('input.caaLoad', JSON.stringify({ 'background-color' : 'indigo!important;'
                                                      , 'border-radius'    : '7px;'
                                                      , 'color'            : 'white!important;'
                                                      , 'font-size'        : '90%;'
                                                      , 'margin-bottom'    : '16px;'
                                                      , 'margin-top'       : '1px!important;'
                                                      , 'opacity'          : '.35;'
                                                      , 'padding'          : '3px 8px;'
                                                      }));

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
                    $(this).css('background-color', 'lightBlue');
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
                                                  .attr({ alt   : (files[i].name)
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
                                                          .addClass('caaLoad')
              , getMBID         = function get_release_MBID (attrStr) {
                                      return attrStr.split('/')
                                                    .pop()
                                                    .replace('#_','');
                                  }
              ;

            var addCAARow = function add_new_row_for_CAA_stuff (event) {
                                $.log('Release row handler triggered.');
                                var $releaseAnchor = $(this);
                                if ('undefined' !== typeof(event) && event.hasOwnProperty('originalEvent')) {
                                    $.log('Release row handler is running due to a mutation event.');
                                    var $releaseRow = $(event.originalEvent.srcElement);
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

                                var $releaseRow = $releaseAnchor.parents('tr:first');
                                var colCount    = $releaseRow.find('td').length
                                  , thisMBID    = getMBID($releaseAnchor.attr('href'))
                                  , $imageRow   = $('<td/>').prop('colspan', colCount)
                                                            .wrap('<tr>')
                                                            .parent()
                                  ;

                                $.log('New release found, attaching a CAA row.');
                                var $thisCAABtn = $caaBtn.clone()
                                                         .data('entity', thisMBID);
                                var $newCAARow  = $imageRow.clone()
                                                           .find('td').append($thisCAABtn).end()
                                                           .prop('class', $releaseRow.prop('class'));
                                $thisForm.data(thisMBID, $newCAARow);

                                // This next is done via event to allow for script-initiated row transforms (e.g. TableSorter)
                                $.log('Attaching DOMNodeInserted event handler.');
                                $releaseRow.on('DOMNodeInserted', function node_inserted_so_try_to_add_caa_row () {
                                    $.log('DOMNodeInserted event handler triggered.');
                                    $releaseRow.after($newCAARow);
                                }).trigger('DOMNodeInserted');
                            };

            // handle pre-existing release rows
            $(releaseSelector).each(addCAARow);

            // handle dynamically added release rows (e.g. http://userscripts.org/scripts/show/93894 )
            $.log('Adding release row event handler.');
            $thisForm.find('tbody:first')
                     .on('DOMNodeInserted', 'table', addCAARow);
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
            continueLoading()
        }
    })(i || 0);
}();
