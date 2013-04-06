/***
 *      Author: KodingSykosis
 *        Date: 04/04/2013
 *     Version: 1.0
 * Description: This plugin is designed to simplify 
 *              an application or script factory
 *              with support for aJax script loading
 *
 *        Name: jQuery.oop.factory.js
 *
 *    Requires: jQuery.oop.class.js
 *              jQuery.oop.overrides.js
 *              jQuery.oop.inheritance.js
 ***/

(function ($) {
    if (!$.scriptRepository) {
        $.scriptRepository = '/scripts.json';
    }

    var cache = function(overwriteException) {
        var store = {};
        
        return $.cls({
            add: function (key, value) {
                if (typeof store[key] != 'undefined' && overwriteException) {
                    $.error('Object already exists in cache.')
                }

                return store[key] = value;
            },
            
            remove: function(key) {
                delete store[key];
            },
            
            value: function(key) {
                return store[key] || this.find(key);
            },
            
            find: function (key) {
                var re = new RegExp(key + '$');
                for (var prop in store) {
                    if (re.test(prop)) {
                        return store[prop];
                    }
                }

                return null;
            },
            
            exist: function(key) {
                return key in store;
            },
            
            each: function(callback) {
                for (var key in store) {
                    if (callback.call(store[key], key, store[key]) === false) {
                        return;
                    }
                }
            }
        })();
    };
    
    var factory = function () {
        var __pid__ = 0;
        var newPid = function () { return ++__pid__; };
        
        var privFact = $.cls({
            main: function () {
                var self = this;
                $.extend(this, {
                    scriptCache: new cache(),
                    appCache: new cache(),
                    repository: {}
                });

                $.getJson($.scriptRepository)
                 .done(function(data) {
                     self.repository = data;
                 });
            },
            
            load: function (scriptName, args) {
                /// <summary>Loads a class or a reference to the specified instance</summary>
                /// <param name="scriptName" type="Object">The name of the class or a PID to an instantiated instance</param>
                /// <param name="args" type="Array">Arguments to pass to the contructor.</param>

                //If it's a number, it's a pid.
                if (typeof scriptName == 'number') {
                    return this.appCache.value(scriptName);
                }

                //Make sure we know what we are asking for here
                if (!(scriptName in this.scriptRepository) &&
                    this.scriptCache.exist(scriptName)) {
                        $.error(scriptName + ' Script not found');
                }

                //Setup our deffered object and vars to contain the magic.
                var deferred = $.Deferred(),
                    create = function() {
                        var cls = self.scriptCache.value(scriptName);
                        var instance = self.createInstance(cls, args);
                        return deferred.done(instance);
                    };
                
                //We already have it so call the trigger the done
                if (this.scriptCache.exist(scriptName)) {
                    return create();
                }

                $.getScript(
                    this.getScriptUrl(scriptName)
                ).done(
                    function(script) {
                        self.scriptCache
                            .add(scriptName, script);

                        return create();
                    }
                ).fail(
                    function(jqxhr, settings, exception) {
                        return deferred.fail(jqxhr, settings, exception);
                    }
                );

                return deferred;
            },
            
            store: function (scriptName, parent, prototype) {
                /// <summary>Caches a script by it's name</summary>
                /// <param name="scriptName" type="String">Unique script name</param>
                /// <param name="parent" type="String">Super Class to inherit from</param>
                /// <param name="prototype" type="Object">Prototype of class to be stored</param>

                var cls = $.inherit(prototype, parent);
                
                //If the class is a singleton, create a new instance and store
                if (cls.singleton === true) {
                    var self = this;
                    $(function() {
                        self.createInstance(cls);
                    });

                    return null;
                }

                return this
                    .scriptCache
                    .add(scriptName, cls);
            },
            
            createInstance: function (cls, args) {
                /// <summary>Creates a new instance of the provided class.  Class is stored with PID.</summary>
                /// <param name="cls" type="Object">Class to instantiated</param>
                /// <param name="args" type="Array">An array of arguments for the constructor.</param>
                
                var instance = cls.constructor.apply(null, args);
                instance.__pid__ = newPid();
                
                return this.appCache.add(instance.__pid__, instance);
            },
            
            getScriptUrl: function(scriptName) {
                return this.repository[scriptName];
            }
        })();

        return $.cls({
            main: function (scriptName, parent, prototype) {
                //Allowed values are string names and PIDs
                if (typeof scriptName != 'string' && typeof scriptName != 'number') {
                    $.error('Script name must be provided');
                }
                
                //Insure a PID is an Int
                if ($.isNumeric(scriptName)) {
                    scriptName = parseInt(scriptName);
                }
                
                if ((typeof parent == 'undefined' || typeof parent.splice == 'function')
                    && typeof prototype == 'undefined') {
                    //We are asking for a new instance of [scriptName]
                    //Parent could be arguments for the new instance's constructor
                        return privFact.load(scriptName, parent);
                }

                //If no prototype is provided assume the parent
                //is the prototype
                if (typeof prototype == 'undefined') {
                    prototype = parent;
                    parent = null;
                }

                //We are creating a new script to store.
                return privFact.store(scriptName, parent, prototype);
            }
        });
    };
    
    //Create as singleton class
    $.extend({ factory: new factory() });
})(jQuery);