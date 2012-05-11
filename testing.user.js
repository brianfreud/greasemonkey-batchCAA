// ==UserScript==
// @name        Testing 1
// @version     0.1
// @description 
// @include     http://test.musicbrainz.org/artist/*
// @match       http://test.musicbrainz.org/artist/*
// ==/UserScript==

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, expr:true, bitwise:true, strict:true, undef:true, curly:true, browser:true, jquery:true, maxerr:500, laxbreak:true, newcap:true, laxcomma:true */

var CONSTANTS = { DEBUGMODE : true
                , LANGUAGE  : 'en'
                , TEXT      : {
                              en : {
                                   'Images' : 'Images'
                                   }
                              }
                };

function main($, CONSTANTS) {
    'use strict';
    jQuery.noConflict();

    var $imageContainer,
        $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    $.log('Script initializing.');
    !function init() {
        !function initResizeSidebar() {
            $('#content').css('margin-right', '340px');
            $('#page').css('background-position-x', 0);
        }();

        !function initCreateDropzone() {
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

        !function initActivateDropzone() {
            $.log('Attaching events to drop zone.');
            $imageContainer.on({
                dragenter: function dragEnter() {
                    $.log('There was a dragenter event at the drop zone.');
                    $(this).css('background-color', 'lightBlue');
                },
                dragleave: function dragLeave() {
                    $.log('There was a dragleave event at the drop zone.');
                    $(this).css('background-color', 'white');
                },
                dragover: false,
                drop: function dragDrop(e) {
                    $.log('There was a drop event at the drop zone.');
                    jQuery.each(e.originalEvent.dataTransfer.files, function (index, file) {
                    var fileReader = new FileReader();
                    fileReader.onload = (function (file) {
                        return function (e) {
                            $(this).append('<div class="dataurl"><strong>' + file.fileName + '</strong>' + e.target.result + '</div>');
                        };
                    })(file);
                    fileReader.readAsDataURL(file);
                    });
                }
            });
        }();
    }();
}

function thirdParty($, CONSTANTS) {
    /*jshint strict:false */
    jQuery.noConflict();

    var l = function l(str) {
        return CONSTANTS.TEXT[CONSTANTS.LANGUAGE][str];
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

!function loader(i) {
    'use strict';
    var script
      , requires = [ 'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js'
                   , 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.8/jquery-ui.min.js'
                   ]
      , head = document.getElementsByTagName('head')[0]
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
    (function (i) {
        makeScript();
        script.src = requires[i];
        script.addEventListener('load', function () {
            ++i !== requires.length ? loader(i) : (loadLocal(thirdParty), loadLocal(main));
        }, true);
        head.appendChild(script);
    })(i || 0);
}();
