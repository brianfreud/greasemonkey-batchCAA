// ==UserScript==
// @name        Testing 2
// @version     0.01.0003
// @description 
// @include     http://*
// ==/UserScript==

/*global console */
/*jshint expr:true, forin:true, noarg:true, noempty:true, eqeqeq:true, undef:true, curly:true, browser:true, jquery:true, laxcomma:true */

var outerCAA = { DEBUG : true
               , ctrl  : false
               , key   : 120
               };

outerCAA.storeURL = function () {
    'use strict';
    var imageArray = JSON.parse(localStorage.getItem('caaBatch_imageCache') || '[]'),
        newURL = window.location.hash.slice(1);
    newURL.length && imageArray.push(encodeURIComponent(newURL));
    localStorage.setItem('caaBatch_imageCache', JSON.stringify(imageArray));
    outerCAA.DEBUG && console.log('Stored image url: ' + newURL);
    return true;
};

outerCAA.sendMessage = function () {
    'use strict';
    var mbIframe = document.getElementById('mbIframe').contentWindow;
    mbIframe.postMessage('MBstoredURL', '*');
    console.log('Sent message from iframe to parent that an image has been stored.');
    return;
};

outerCAA.MusicBrainz = function () {
    'use strict';
    document.location.pathname === '/doc/Cover_Art_Archive' && outerCAA.storeURL() && outerCAA.DEBUG && outerCAA.sendMessage();
    return;
};

outerCAA.nonMB = function ($, DEBUG, ctrl, key) {
    'use strict';

    jQuery.noConflict();

    var innerCAA = {}
      , $mbIframe = ''
      , $highlights
      , active = false
      , src = 'http://musicbrainz.org/doc/Cover_Art_Archive#'
      ;

    $.enable = function (bool) {
                   return $(this).prop('disabled', !bool);
               };

    innerCAA.iframe = { create  : function () {
                                      DEBUG && console.log('Inserting iFrame.');
                                      $mbIframe = $('<iframe id="mbIframe"/>').hide();
                                      $('body').append($mbIframe);
                                  }
                      , sendURL : function (url) {
                                      DEBUG && console.log('Passing image URL to the iFrame.');
// TODO: build in support for user clicking 2nd image before 1st url has had time to finish its thing in the iframe.
                                      $mbIframe.prop('src', src+url);
                                  }
                      };


    innerCAA.sendImageURL = function (url) {
        $mbIframe.prop('src', url);
    };

    innerCAA.setListenerMBReturn = function () {
        document.addEventListener('message', function(e){
                                                 console.log(e.data);
                                             }, false);
    };

    innerCAA.highlighter = { init : function () {
                                      DEBUG && console.log('Initializing the highlight css.');
// TODO                                 $highlights = $('<style/>').text('img:hover { SOMETHING }');
                                    }
                           , on   : function () {
                                      DEBUG && console.log('Enabling the highlight css.');
                                        $highlights.enable(true);
                                    }
                           , off  : function () {
                                      DEBUG && console.log('Disabling the highlight css.');
                                        $highlights.enable(false);
                                    }
                           };

    innerCAA.keypress = { on       : function () {
                                         DEBUG && console.log('Activation keypress event -> on');
                                         if (!$mbIframe.length) {
                                             innerCAA.iframe.create();
                                             innerCAA.highlighter.init();
                                             innerCAA.click.init();
                                             DEBUG && innerCAA.setListenerMBReturn();
                                         }
                                         innerCAA.imageClick.on();
                                         innerCAA.highlighter.on();
                                     }
                        , off      : function () {
                                         DEBUG && console.log('Activation keypress event -> off');
                                         innerCAA.imageClick.off();
                                         innerCAA.highlighter.off();
                                     }
                        , toggle   : function () {
                                         DEBUG && console.log('Activation keypress event detected.');
                                         innerCAA.keypress[(active = !active) ? 'on' : 'off']();
                                         return;
                                     }
                        , init     : function () {
                                         DEBUG && console.log('Initializing the activation keypress event.');
                                         $(document).keydown(function (e) {
                                             if (e.keyCode === key && (ctrl ? e.ctrlKey : true)) {
                                                 innerCAA.keypress.toggle();
                                             }
                                         });
                                     }
                        };

    innerCAA.imageClick = { init : function () {
                                       DEBUG && console.log('Initialize event listener for a click on an img (or anchor linking to an img).');
// TODO     add event listener for click on images
                                   }
                          , on   : function () {
                                      DEBUG && console.log('Img click event -> on');
// TODO     innerCAA.iframe.sendURL( image url )
                                   }
                          , off  : function () {
                                      DEBUG && console.log('Img click event -> off');
// TODO     stop listening
                                   }
                          };

    innerCAA.activateEventListeners = function () {
        innerCAA.keypress.init();
    };

    !function init () {
        innerCAA.activateEventListeners();
    }();

    return;
};

outerCAA.loader = function (i) {
    'use strict';
    var script
      , requires = ['http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js']
      , head = document.getElementsByTagName('head')[0]
      ;
    function makeScript() {
        script = document.createElement('script');
        script.type = 'text/javascript';
    }
    (function (x) {
        makeScript();
        script.src = requires[x];
        script.addEventListener('load', function () {
            if (++x !== requires.length) {
                outerCAA.loader (x);
            } else {
                makeScript();
                script.textContent = [ '(' , outerCAA.nonMB , ')(jQuery, ' , 
                                                                 outerCAA.DEBUG , ',' ,
                                                                 outerCAA.ctrl , ',' ,
                                                                 outerCAA.key , ');' 
                                     ].join('');
                head.appendChild(script);
            }
        }, !0);
        head.appendChild(script);
    })(i || 0);
    return;
};

!function init () {
    'use strict';
    outerCAA.DEBUG && console.log('Initializing CAA image linker script.');

    if (document.location.host === 'musicbrainz.org') {
        outerCAA.MusicBrainz();
    } else {
        outerCAA.loader(0);
    }
}();
