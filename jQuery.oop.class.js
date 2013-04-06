/***
 *      Author: KodingSykosis
 *        Date: 04/04/2013
 *     Version: 1.0
 * Description: This plugin is designed to simplify 
 *              object oriented programing in javascript
 *
 *        Name: jQuery.oop.class.js
 *
 *    Requires: jQuery.oop.overrides.js
 *              jQuery.oop.inheritance.js
 ***/

(function ($) {
    $.extend({
        cls: function (proto, _super) {
            var prototype =
            $.inherit(
                proto,
                typeof _super == 'undefined'
                    ? undefined
                    : _super.prototype
            );

            var fn = function () {
                function app() {
                    var args = arguments;
                    if (this.main) {
                        this.main.apply(this, args);
                    }
                };

                app.prototype = prototype;

                return app;
            };

            return fn();
        }
    });
})(jQuery);