/* __________________ SUPPORTS TOUCH OR NOT  __________________*/
/*!	Detects touch support and adds appropriate classes to html and returns a JS object  |  Copyright (c) 2013 Izilla Partners Pty Ltd  | http://www.izilla.com.au / Licensed under the MIT license  |  https://coderwall.com/p/egbgdw */
var supports=(function(){var d=document.documentElement,c="ontouchstart" in window||navigator.msMaxTouchPoints;if(c){d.className+=" touch";return{touch:true}}else{d.className+=" no-touch";return{touch:false}}})();

/* __________________ FIT TEXT used on .banner h1 spans __________________*/
/*! * FitText.js 1.2  |  Copyright 2011, Dave Rupert http://daverupert.com | Released under the WTFPL license  |  http://sam.zoy.org/wtfpl/  |  Date: Thu May 05 14:23:00 2011 -0600  */
(function(a){a.fn.fitText=function(d,b){var e=d||1,c=a.extend({minFontSize:Number.NEGATIVE_INFINITY,maxFontSize:Number.POSITIVE_INFINITY},b);return this.each(function(){var f=a(this);var g=function(){f.css("font-size",Math.max(Math.min(f.width()/(e*10),parseFloat(c.maxFontSize)),parseFloat(c.minFontSize)))};g();a(window).on("resize.fittext orientationchange.fittext",g)})}})(jQuery);

/* __________________ RESPONSIVE EQUAL HEIGHTS  __________________*/
/*! jquery.matchHeight-min.js v0.5.1   |   http://brm.io/jquery-match-height/   |   License: MIT  */
(function(a){a.fn.matchHeight=function(b){if("remove"===b){var f=this;this.css("height","");a.each(a.fn.matchHeight._groups,function(g,h){h.elements=h.elements.not(f)});return this}if(1>=this.length){return this}b="undefined"!==typeof b?b:!0;a.fn.matchHeight._groups.push({elements:this,byRow:b});a.fn.matchHeight._apply(this,b);return this};a.fn.matchHeight._apply=function(b,g){var h=a(b),f=[h];g&&(h.css({display:"block","padding-top":"0","padding-bottom":"0","border-top":"0","border-bottom":"0",height:"100px"}),f=c(h),h.css({display:"","padding-top":"","padding-bottom":"","border-top":"","border-bottom":"",height:""}));a.each(f,function(i,l){var k=a(l),j=0;k.each(function(){var m=a(this);m.css({display:"block",height:""});m.outerHeight(!1)>j&&(j=m.outerHeight(!1));m.css({display:""})});k.each(function(){var m=a(this),n=0;"border-box"!==m.css("box-sizing")&&(n+=e(m.css("border-top-width"))+e(m.css("border-bottom-width")),n+=e(m.css("padding-top"))+e(m.css("padding-bottom")));m.css("height",j-n)})});return this};a.fn.matchHeight._applyDataApi=function(){var b={};a("[data-match-height], [data-mh]").each(function(){var f=a(this),g=f.attr("data-match-height");b[g]=g in b?b[g].add(f):f});a.each(b,function(){this.matchHeight(!0)})};a.fn.matchHeight._groups=[];var d=-1;a.fn.matchHeight._update=function(b){if(b&&"resize"===b.type){b=a(window).width();if(b===d){return}d=b}a.each(a.fn.matchHeight._groups,function(){a.fn.matchHeight._apply(this.elements,this.byRow)})};a(a.fn.matchHeight._applyDataApi);a(window).bind("load resize orientationchange",a.fn.matchHeight._update);var c=function(b){var f=null,g=[];a(b).each(function(){var i=a(this),k=i.offset().top-e(i.css("margin-top")),j=0<g.length?g[g.length-1]:null;null===j?g.push(i):1>=Math.floor(Math.abs(f-k))?g[g.length-1]=j.add(i):g.push(i);f=k});return g},e=function(b){return parseFloat(b)||0}})(jQuery);

/* __________________ Cookie __________________*/
/*!jQuery Cookie Plugin v1.3.1 / https://github.com/carhartl/jquery-cookie  |  Copyright 2013 Klaus Hartl / Released under the MIT license */
(function(a){if(typeof define==="function"&&define.amd){define(["jquery"],a)}else{a(jQuery)}}(function(c){var a=/\+/g;function d(f){if(b.raw){return f}try{return decodeURIComponent(f.replace(a," "))}catch(g){}}function e(f){if(f.indexOf('"')===0){f=f.slice(1,-1).replace(/\\"/g,'"').replace(/\\\\/g,"\\")}f=d(f);try{return b.json?JSON.parse(f):f}catch(g){}}var b=c.cookie=function(n,m,r){if(m!==undefined){r=c.extend({},b.defaults,r);if(typeof r.expires==="number"){var o=r.expires,q=r.expires=new Date();q.setDate(q.getDate()+o)}m=b.json?JSON.stringify(m):String(m);return(document.cookie=[b.raw?n:encodeURIComponent(n),"=",b.raw?m:encodeURIComponent(m),r.expires?"; expires="+r.expires.toUTCString():"",r.path?"; path="+r.path:"",r.domain?"; domain="+r.domain:"",r.secure?"; secure":""].join(""))}var s=n?undefined:{};var p=document.cookie?document.cookie.split("; "):[];for(var k=0,h=p.length;k<h;k++){var j=p[k].split("=");var f=d(j.shift());var g=j.join("=");if(n&&n===f){s=e(g);break}if(!n&&(g=e(g))!==undefined){s[f]=g}}return s};b.defaults={};c.removeCookie=function(g,f){if(c.cookie(g)!==undefined){c.cookie(g,"",c.extend({},f,{expires:-1}));return true}return false}}));

/* __________________ MAIN MENU (uses cookie) __________________*/
/*! DC jQuery Vertical Accordion Menu - jQuery vertical accordion menu plugin  |  Copyright (c) 2011 Design Chemical
    Dual licensed under the MIT and GPL licenses: http://www.opensource.org/licenses/mit-license.php  | http://www.gnu.org/licenses/gpl.html */
(function(a){a.fn.dcAccordion=function(c){var e={classParent:"dcjq-parent",classActive:"active",classArrow:"dcjq-icon",classCount:"dcjq-count",classExpand:"dcjq-current-parent",eventType:"click",hoverDelay:300,menuClose:true,autoClose:true,autoExpand:false,speed:"slow",saveState:true,disableLink:true,showCount:false,cookie:"dcjq-accordion"};var c=a.extend(e,c);this.each(function(p){var h=this;l();if(e.saveState==true){d(e.cookie,h)}if(e.autoExpand==true){a("li."+e.classExpand+" > a").addClass(e.classActive)}j();if(e.eventType=="hover"){var g={sensitivity:2,interval:e.hoverDelay,over:o,timeout:e.hoverDelay,out:n};a("li a",h).hoverIntent(g);var f={sensitivity:2,interval:1000,over:m,timeout:1000,out:i};a(h).hoverIntent(f);if(e.disableLink==true){a("li a",h).click(function(q){if(a(this).siblings("ul").length>0){q.preventDefault()}})}}else{a("li a",h).click(function(q){$activeLi=a(this).parent("li");$parentsLi=$activeLi.parents("li");$parentsUl=$activeLi.parents("ul");if(e.disableLink==true){if(a(this).siblings("ul").length>0){q.preventDefault()}}if(e.autoClose==true){k($parentsLi,$parentsUl)}if(a("> ul",$activeLi).is(":visible")){a("ul",$activeLi).slideUp(e.speed);a("a",$activeLi).removeClass(e.classActive)}else{a(this).siblings("ul").slideToggle(e.speed);a("> a",$activeLi).addClass(e.classActive)}if(e.saveState==true){b(e.cookie,h)}})}function l(){$arrow='<span class="'+e.classArrow+'"></span>';var q=e.classParent+"-li";a("> ul",h).show();a("li",h).each(function(){if(a("> ul",this).length>0){a(this).addClass(q);a("> a",this).addClass(e.classParent).append($arrow)}});a("> ul",h).hide();if(e.showCount==true){a("li."+q,h).each(function(){if(e.disableLink==true){var r=parseInt(a("ul a:not(."+e.classParent+")",this).length)}else{var r=parseInt(a("ul a",this).length)}a("> a",this).append(' <span class="'+e.classCount+'">('+r+")</span>")})}}function o(){$activeLi=a(this).parent("li");$parentsLi=$activeLi.parents("li");$parentsUl=$activeLi.parents("ul");if(e.autoClose==true){k($parentsLi,$parentsUl)}if(a("> ul",$activeLi).is(":visible")){a("ul",$activeLi).slideUp(e.speed);a("a",$activeLi).removeClass(e.classActive)}else{a(this).siblings("ul").slideToggle(e.speed);a("> a",$activeLi).addClass(e.classActive)}if(e.saveState==true){b(e.cookie,h)}}function n(){}function m(){}function i(){if(e.menuClose==true){a("ul",h).slideUp(e.speed);a("a",h).removeClass(e.classActive);b(e.cookie,h)}}function k(q,r){a("ul",h).not(r).slideUp(e.speed);a("a",h).removeClass(e.classActive);a("> a",q).addClass(e.classActive)}function j(){a("ul",h).hide();$allActiveLi=a("a."+e.classActive,h);$allActiveLi.siblings("ul").show()}});function d(g,i){var f=a.cookie(g);if(f!=null){var h=f.split(",");a.each(h,function(k,m){var j=a("li:eq("+m+")",i);a("> a",j).addClass(e.classActive);var l=j.parents("li");a("> a",l).addClass(e.classActive)})}}function b(g,h){var f=[];a("li a."+e.classActive,h).each(function(j){var l=a(this).parent("li");var k=a("li",h).index(l);f.push(k)});a.cookie(g,f,{path:"/"})}}})(jQuery);


/* __________________ INITIALIZATIONS  __________________*/

$(document).ready(function () {

    /* ----------  equal height columns only on footer-content-1   -------- */
    $('.footer [class*="footer-content-"]').matchHeight();

    /* ----  tooltips and popover (bootstrap.min.js)  -------- */
    if ($('html').hasClass('no-touch')) { // hover doesn't work on touch, so don't use

    /* ----  hover tooltip -------- */
        $('.tooltip-hover').tooltip({trigger: 'hover',container: 'body'});

    /* ----  hover popover -------- */
        $('.popover-hover').popover({ trigger: 'hover'});
    } // end if html has class no-touch

    /* ----  click tooltip -------- */
    $('.tooltip-click').tooltip({trigger: 'click',container: 'body'});

    /* ----  click popover -------- */
    $('.popover-click').popover({trigger: 'click'});

    /* ----------  fitText   -------- */
    $(".banner .line-1").fitText(.6);
    $(".banner .line-2").fitText(1.2);
    $(".banner .line-3").fitText(1.7);

    /* ----------  .title inner wrapper -------- */
    $('.title').wrapInner("<span></span>");

    /* ----------  .primary-nav   -------- */
    $('.primary-nav').dcAccordion({
        saveState: true,
        autoClose: true,
        disableLink: true,
        speed: "fast",
        showCount: false,
        autoExpand: false
    });

    /* ----------   toggle-menu   -------- */
    $('.toggle-menu').click(function () {
        $('html').toggleClass('menu-open');
        $('html').removeClass('search-open');

    });

    /* ----------  toggle-search   -------- */
    $('.toggle-search').click(function () {
        $('html').toggleClass('search-open');
        $('html').removeClass('menu-open');
    });

}); // end document ready


/* __________________ CLOSE SEARCH WHEN CLICKED OUTSIDE __________________*/

    $(document).click(function (a) {
        if ($(a.target).parents().index($(".search-wrapper")) == -1) {
            $('html').removeClass('search-open');
        }
    });

    $(document).on("touchstart", function (a) {
        if ($(a.target).parents().index($(".search-wrapper")) == -1) {
            $('html').removeClass('search-open');
        }
    });


/* __________________ SCROLL TO TOP __________________*/

if ($("html").hasClass("ie8")) { // avoid IE8 bug

    $('#go-to-top').hide();
}

if ($("html").hasClass("boxshadow")) { // avoid IE8 bug

    $(document).ready(function () {

        $('#go-to-top').hide();

        //Check to see if the window is top if not then display button
        $(window).scroll(function () {
            if ($(this).scrollTop() > 100) {
                $('#go-to-top').fadeIn();
            } else {
                $('#go-to-top').fadeOut();
            }
        });

        //Click event to scroll to top
        $('#go-to-top').click(function () {
            $('html, body').animate({
                scrollTop: 0
            }, 800);
            return false;
        });

    });

} // end if html has class boxshadow

/* __________________ PLACEHOLDER __________________*/
$(document).ready(function(){if(!Modernizr.input.placeholder){$("input").each(function(){var a=$(this);if(a.val()==""&&a.attr("placeholder")!=""){a.val(a.attr("placeholder"));a.focus(function(){if(a.val()==a.attr("placeholder")){a.val("")}});a.blur(function(){if(a.val()==""){a.val(a.attr("placeholder"))}});$(a).closest("form").submit(function(){var b=$(this);if(!b.hasClass("placeholderPending")){$("input",this).each(function(){var c=$(this);if(c.val()==c.attr("placeholder")){c.val("")}});b.addClass("placeholderPending")}})}})}});
