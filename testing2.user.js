// ==UserScript==
// @name        Testing 2
// @version     0.02.0001
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
    /* NOTE: We do not want strict mode here.  It would cause the script to break if the site's code has modified object prototypes. */

    $.noConflict();

    var innerCAA = {}
      , $mbIframe = ''
      , $highlights
      , active = false
      , src = 'http://musicbrainz.org/doc/Cover_Art_Archive#'
      ;

    $.fn.enable = function (bool) {
                           return $(this).prop('disabled', !bool);
                       };

    innerCAA.iframe = { create  : function () {
                                      DEBUG && console.log('Inserting iFrame.');
                                      $mbIframe = $('<iframe id="mbIframe"/>').hide();
                                  }
                      , sendURL : function (url) {
                                      DEBUG && console.log('Passing image URL to the iFrame.');
                                      var $newIframe = $mbIframe.clone()
                                                                .prop('src', src+url);
                                      $('body').append($newIframe);
                                  }
                      };

    innerCAA.setListenerMBReturn = function () {
        document.addEventListener('message', function (e) {
                                                 DEBUG && console.log('setListenerMBReturn:', e.data);
                                             }, false);
    };

    innerCAA.addRule = function (selector, rule) {
        return $('<style>').text(selector + rule)
                           .addClass('tinterCAA')
                           .appendTo($('head'));
    };
  
    innerCAA.tintImage = function (image) {
        DEBUG && console.log('Tinting image');
        var $image = $(image);
        $image.wrap('<figure>')
              .parent()
              .addClass('tintWrapper')
              .prop('title', 'Left click to send this image to CAA Batch Image Manager.');
        return $image;
    };

    innerCAA.highlighter = {};

    innerCAA.highlighter.init = function () {
        DEBUG && console.log('Initializing the highlight css.');
        var top = '.tintWrapper'
          , img = '.tintWrapper > img'
          , both = [top,img].join()
          , addRule = function (ele, rule) {
                          return innerCAA.addRule(ele, '{' + rule + '}');
                      }
          ;

        /* CSS reset */
        addRule(top, 'margin: 0; padding: 0; outline: 0; vertical-align: baseline; display: inline-block;');
        addRule(img, 'margin: 0; padding: 0; outline: 0;');

        /* Rounded corners */
        addRule(top, 'border-radius: 6px; -moz-border-radius: 6px; -webkit-border-radius: 6px;');
        addRule(img, 'border-radius: 12px; -moz-border-radius: 12px; -webkit-border-radius: 12px;');

        /* Tinted overlay */
        addRule(top, 'background: rgba(45, 106, 210, .5);');
        addRule(img, 'margin: 5px;');
        var backlight = '0 0 22px rgba(0, 0, 200, .5);';
        addRule(top, [ '-moz-box-shadow:', backlight, '-webkit-box-shadow:', backlight, 'box-shadow:', backlight].join(''));

        /* Desaturation */
        addRule(top, 'opacity: 0.9;');
        addRule(img, 'opacity: 0.4;');
        addRule(img, '-webkit-filter: grayscale(0.6);'); // Chrome
        $('body').append('<svg xmlns="http://www.w3.org/2000/svg">' +
                             '<filter id="grayscale">' +
                                 '<feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0.3333 0.3333 0.3333 0 0 0 0 0 1 0"/>' +
                             '</filter>' +
                         '</svg>'
                        );
        addRule(img, 'filter: grayscale(#grayscale);'); // Firefox

        $highlights = $('.tinterCAA');
        $('body').on('mouseleave', 'img', function (e) {
                                                       DEBUG && console.log('Removing tinter wrap from image.');
                                                       var $e = $(e.target);
                                                       $e.parents('.tintWrapper:first').length && $e.removeClass('tintImage').unwrap();
                                                       }
                );
    };

    innerCAA.highlighter.on = function () {
        DEBUG && console.log('Enabling the highlight css.');
        $highlights.enable(true);
        $('body').on('mouseenter', 'img', function (e) {
                                                       DEBUG && console.log('Wrapping image with tinter.');
                                                       innerCAA.tintImage(e.target);
                                                       }
                );
    };

    innerCAA.highlighter.off = function () {
        DEBUG && console.log('Disabling the highlight css.');
        $highlights.enable(false);
        $('body').off('mouseenter', 'img');
    };

    innerCAA.keypress = { indicator: function (msg) {
                                         $('#CAAIndicator').text(msg)
                                                           .show()
                                                           .delay(1200)
                                                           .fadeOut(500);
                                         return;
                                     }
                        , on       : function () {
                                         DEBUG && console.log('Activation keypress event -> on');
                                         if (!$mbIframe.length) {
                                             /* Status indicator */
                                             innerCAA.addRule('#CAAIndicator', [ '{'
                                                                               , 'color: #000;'
                                                                               , 'background: white;'
                                                                               , 'border: 2px solid teal;'
                                                                               , '-webkit-border-radius: 0px 0px 0px 20px;'
                                                                               , '-moz-border-radius: 0px 0px 0px 20px;'
                                                                               , 'border-radius: 0px 0px 0px 20px;'
                                                                               , 'font-size: 40px;'
                                                                               , 'font-weight: 700;'
                                                                               , 'padding: 10px;'
                                                                               , 'position: absolute;'
                                                                               , 'right: 0;'
                                                                               , 'top: 0;'
                                                                               , '}'].join(''))
                                                     .removeClass('tinterCAA');
                                             $('body').append($('<div id="CAAIndicator"/>').hide());

                                             innerCAA.iframe.create();
                                             innerCAA.highlighter.init();
                                             DEBUG && innerCAA.setListenerMBReturn();
                                         }
                                         innerCAA.highlighter.on();
                                         innerCAA.imageClick.on();
                                         innerCAA.keypress.indicator('ON');
                                     }
                        , off      : function () {
                                         DEBUG && console.log('Activation keypress event -> off');
                                         innerCAA.imageClick.off();
                                         innerCAA.highlighter.off();
                                         innerCAA.keypress.indicator('OFF');
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

    innerCAA.imageClick = { on   : function () {
                                       DEBUG && console.log('Img click event -> on');
                                       $('body').on('click', '.tintWrapper > img', function (e) {
                                           e.preventDefault();
                                           innerCAA.iframe.sendURL($(this).prop('src'));
                                           return false;
                                       });
                                   }
                          , off  : function () {
                                       DEBUG && console.log('Img click event -> off');
                                       $('body').off('click', '.tintWrapper > img');
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
