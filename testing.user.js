// ==UserScript==
// @name        Testing 1
// @version     0.01.0054
// @description 
// @include     http://musicbrainz.org/artist/*
// @match       http://musicbrainz.org/artist/*
// @include     http://test.musicbrainz.org/artist/*
// @match       http://test.musicbrainz.org/artist/*
// @match       file://*
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require     https://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js
// @require     http://flesler-plugins.googlecode.com/files/jquery.rule-1.0.2-min.js
// ==/UserScript==

/*global console */
/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, expr:true, bitwise:true, strict:true, undef:true, curly:true, browser:true, jquery:true, maxerr:500, laxbreak:true, newcap:true, laxcomma:true */

var CONSTANTS = { DEBUGMODE : true
                , LANGUAGE  : 'en'
                , TEXT      : {
                              en : {
                                   'Images' : 'Images'
                                   }
                              }
                };

function main ($, CONSTANTS) {
    'use strict';
    jQuery.noConflict();

    var $imageContainer,
        $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    $.log('Script initializing.');
    !function init () {
        !function _init_resize_sidebar () {
            $('#content').css('margin-right', '340px');
            $('#page').css('background', 'white');
        }();

        !function _init_create_dropzone () {
            $.log('Creating drop zone.');
            $imageContainer = $('<div id="imageContainer"/>').css({ height : (screen.height - 300) + 'px'
                                                                  , width  : '100%'
                                                                  });
            $('#sidebar').css({ 'border-left'  : '1px dotted grey'
                              , 'padding-left' : '8px'
                              , width          : '315px'
                              })
                         .empty()
                         .append($('<h1/>').text($.l('Images')))
                         .append($('<br/><br/>'))
                         .append($imageContainer);
        }();

        !function _init_activate_dnd_on_page () {
            $.log('Attaching events to body.');
            $('body').on('dragenter dragleave dragover drop', function bodyDrag(e) {
                    e.preventDefault();
                    $(this).css('background-color', 'green');
                    $.log('There was a drag event on the page.');
                });
        }();

        !function _init_add_css_rules () {
            $.rule('.localImage { padding: 3px, vertical-align: middle, width: 100px }').appendTo('style');
        }();

        !function _init_activate_dnd_at_dropzone () {
            $.log('Attaching events to drop zone.');
            $imageContainer.on({
                dragenter: function dragEnter(e) {
                    e.preventDefault();
                    $.log('There was a dragenter event at the drop zone.');
                    $(this).css('background-color', 'lightBlue');
                },
                dragleave: function dragLeave(e) {
                    e.preventDefault();
                    $.log('There was a dragleave event at the drop zone.');
                    $(this).css('background-color', 'white');
                },
                dragover: function dragOver(e) {
                    e.preventDefault();
                    $.log('There was a dragover event at the drop zone.');
                },
                drop: function drop(e) {
                    e.preventDefault();
                    $.log('There was a drop event at the drop zone.');
                    $(this).css('background-color', 'white');
                    e = e.originalEvent || e;

                    var files = (e.files || e.dataTransfer.files),
                        $img = $('<img/>').addClass('localImage');                                                                             
                    for (var i = 0; i < files.length; i++) {
                        !function (i) {
                            var reader = new FileReader();
                            reader.onload = function (event) {
                                var $newImg = $img.clone().attr({
                                    src: event.target.result,
                                    title: (files[i].name),
                                    alt: (files[i].name)
                                });
                                $imageContainer.append($newImg);
                            };
                            reader.readAsDataURL(files[i]);
                        }(i);
                    }
                }
            });
        }();
    }();
}

function thirdParty($, CONSTANTS) {
    /*jshint strict:false */
    jQuery.noConflict();

    var l = function l(str) {
        return CONSTANTS.TEXT[CONSTANTS.LANGUAGE][str] || CONSTANTS.TEXT['en'][str];
    };

    var log = function log(str) {
        if (CONSTANTS.DEBUGMODE) {
            console.log(str);
        }
    };

    jQuery.extend({
        l   : function gettext_handler(str) {
                return l(str);
            },
        log : function log_handler(str) {
                return log(str);
            }
    });
}

!function _main_loader(i) {
    'use strict';
    var script
      , head = document.getElementsByTagName('head')[0]
      , requires = [ 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js'
                   , 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js'
                   , 'http://flesler-plugins.googlecode.com/files/jquery.rule-1.0.2-min.js'
                   ]
      , makeScript = function () {
            script = document.createElement('script');
            script.type = 'text/javascript';
        }
      , loadLocal = function (fn) {
            makeScript();
            script.textContent = '(' + fn.toString() + ')(jQuery, ' + JSON.stringify(CONSTANTS) + ');';
            head.appendChild(script);
        }
      ;
    (function _script_loader (i) {
        var _continueLoading = function () {
            loadLocal(thirdParty);
            loadLocal(main);
        };
        makeScript();
        (typeof($) !== 'undefined' && $.browser.mozilla) ? _continueLoading() : script.src = requires[i];
        script.addEventListener('load', function () {
            ++i !== requires.length ? _script_loader(i) : _continueLoading();
        }, true);
        head.appendChild(script);
    })(i || 0);
}();
