/***
 *      Author: KodingSykosis
 *        Date: 04/04/2013
 *     Version: 1.0
 * Description: This plugin is designed to simplify 
 *              object oriented programing in javascript
 *
 *        Name: jQuery.oop.overrides.js
 *
 *    Requires: none
 ***/

(function($) {
    $.extend({
        override: function (sub, _super) {
            return function() {
                var tmp = this._super;
                this._super = _super || $.noop;

                var ret = sub.apply(this, arguments);

                this._super = tmp;
                return ret;
            };
        }
    })
})(jQuery);