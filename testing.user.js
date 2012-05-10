// ==UserScript==
// @name        Testing 1
// @version     0.1
// @description 
// @include     http://musicbrainz.org/artist/*
// @match       http://musicbrainz.org/artist/*
// @include     http://test.musicbrainz.org/artist/*
// @match       http://test.musicbrainz.org/artist/*

// ==/UserScript==

/* Uses:
    jQuery.filedrop v. 0.1.0 (including pull 47)
        http://www.github.com/weixiyen/jquery-filedrop
        https://github.com/weixiyen/jquery-filedrop/pull/47
*/

!function loader(i) {
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
            script.textContent = '(' + fn.toString() + ')(jQuery);';
            head.appendChild(script);
      }
      ;
    (function (i) {
        makeScript();
        script.src = requires[i];
        script.addEventListener('load', function () {
            ++i !== requires.length ? loader(i) : (loadLocal(thirdParty), loadLocal(main))
        }, true);
        head.appendChild(script);
    })(i || 0);
}();

function thirdParty($) {
    jQuery.noConflict();

    // jQuery.filedrop
    (function(j){function d(){}jQuery.event.props.push("dataTransfer");var s={fallback_id:"",url:"",refresh:1E3,paramname:"userfile",allowedfiletypes:[],maxfiles:25,maxfilesize:1,queuefiles:0,queuewait:200,data:{},headers:{},drop:d,dragEnter:d,dragOver:d,dragLeave:d,docEnter:d,docOver:d,docLeave:d,beforeEach:d,afterAll:d,rename:d,error:function(e){alert(e)},uploadStarted:d,uploadFinished:d,progressUpdated:d,speedUpdated:d},g=["BrowserNotSupported","TooManyFiles","FileTooLarge","FileTypeNotAllowed"],i,p=!1,f=0,e;j.fn.filedrop=function(d){function q(a,e,d,f){var b="";if(c.data){var g=j.param(c.data).split(/&/);j.each(g,function(){var a=this.split(/=/,2),c=decodeURI(a[0]),a=decodeURI(a[1]);b+="--";b+=f;b+="\r\n";b+='Content-Disposition: form-data; name="'+c+'"';b+="\r\n";b+="\r\n";b+=a;b+="\r\n"})}b+="--";b+=f;b+="\r\n";b+='Content-Disposition: form-data; name="'+c.paramname+'"';b+='; filename="'+a+'"';b+="\r\n";b+="Content-Type: "+d;b+="\r\n";b+="\r\n";b+=e;b+="\r\n";b+="--";b+=f;b+="--";return b+="\r\n"}function t(a){if(a.lengthComputable){var e=Math.round(100*a.loaded/a.total);if(this.currentProgress!=e){this.currentProgress=e;c.progressUpdated(this.index,this.file,this.currentProgress);var e=(new Date).getTime(),d=e-this.currentStart;d>=c.refresh&&(c.speedUpdated(this.index,this.file,(a.loaded-this.startData)/d),this.startData=a.loaded,this.currentStart=e)}}}function l(){p=!1;if(!e)return c.error(g[0]),!1;if(c.allowedfiletypes.push&&c.allowedfiletypes.length)for(var a=e.length;a--;)if(!e[a].type||0>j.inArray(e[a].type,c.allowedfiletypes))return c.error(g[3]),!1;var d=0,i=0;if(f>c.maxfiles&&0===c.queuefiles)return c.error(g[1]),!1;for(var k=[],b=[],r=[],a=0;a<f;a++)k.push(a);var m=function(){var a;if(p)return!1;if(0<c.queuefiles&&b.length>=c.queuefiles)setTimeout(m,c.queuewait);else{a=k[0];k.splice(0,1);b.push(a);try{if(!1!=c.beforeEach(e[a])){if(a===f)return;var d=new FileReader,h=1048576*c.maxfilesize;d.index=a;if(e[a].size>h)return c.error(g[2],e[a],a),b.forEach(function(c,d){c===a&&b.splice(d,1)}),i++,!0;d.onloadend=l;d.readAsBinaryString(e[a])}else i++}catch(j){return b.forEach(function(c,d){c===a&&b.splice(d,1)}),c.error(g[0]),!1}0<k.length&&m()}},l=function(a){var g=("undefined"===typeof a.srcElement?a.target:a.srcElement).index;void 0==a.target.index&&(a.target.index=u(a.total));var h=new XMLHttpRequest,n=h.upload,o=e[a.target.index],k=a.target.index,l=(new Date).getTime(),m="------multipartformboundary"+(new Date).getTime();newName=c.rename(o.name);mime=o.type;a="string"===typeof newName?q(newName,a.target.result,mime,m):q(o.name,a.target.result,mime,m);n.index=k;n.file=o;n.downloadStartTime=l;n.currentStart=l;n.currentProgress=0;n.startData=0;n.addEventListener("progress",t,!1);h.open("POST",c.url,!0);h.setRequestHeader("content-type","multipart/form-data; boundary="+m);j.each(c.headers,function(a,b){h.setRequestHeader(a,b)});h.sendAsBinary(a);c.uploadStarted(k,o,f);h.onload=function(){if(h.responseText){var a=(new Date).getTime()-l,a=c.uploadFinished(k,o,jQuery.parseJSON(h.responseText),a,h);d++;b.forEach(function(a,c){a===g&&b.splice(c,1)});r.push(g);d==f-i&&c.afterAll();a===false&&(p=true)}}};m()}function u(a){for(var c=0;c<f;c++)if(e[c].size==a)return c}var c=j.extend({},s,d);this.bind("drop",function(a){c.drop(a);e=a.dataTransfer.files;if(null===e||void 0===e)return c.error(g[0]),!1;f=e.length;l();a.preventDefault();return!1}).bind("dragenter",function(a){clearTimeout(i);a.preventDefault();c.dragEnter(a)}).bind("dragover",function(a){clearTimeout(i);a.preventDefault();c.docOver(a);c.dragOver(a)}).bind("dragleave",function(a){clearTimeout(i);c.dragLeave(a);a.stopPropagation()});j(document).bind("drop",function(a){a.preventDefault();c.docLeave(a);return!1}).bind("dragenter",function(a){clearTimeout(i);a.preventDefault();c.docEnter(a);return!1}).bind("dragover",function(a){clearTimeout(i);a.preventDefault();c.docOver(a);return!1}).bind("dragleave",function(a){i=setTimeout(function(){c.docLeave(a)},200)});j("#"+c.fallback_id).change(function(a){c.drop(a);e=a.target.files;f=e.length;l()});return this};try{XMLHttpRequest.prototype.sendAsBinary||(XMLHttpRequest.prototype.sendAsBinary=function(d){d=Array.prototype.map.call(d,function(d){return d.charCodeAt(0)&255});this.send((new Uint8Array(d)).buffer)})}catch(v){}})(jQuery);

    jQuery.extend({

    });

}

function main($) {
    jQuery.noConflict();

    var DEBUG_MODE = true;

    var $imageContainer,
        $form = $('#h2-discography ~ form:first, #h2-releases ~ form:first');

    $('#content').css('margin-right','340px');
    $('#page').css('background-size','31.5%');
    $imageContainer = $('<div id="imageContainer"/>').css({ height: (screen.height - 300) + 'px'
                                                          , width: '100%'
                                                          });
    $('#sidebar').empty()
                 .css('width','315px')
                 .append($('<h1>Images</h1><br/><br/>'))
                 .append($imageContainer);


    $imageContainer.filedrop({
                             drop: function () { alert("Dropped!") }
                             });
 



   
}
