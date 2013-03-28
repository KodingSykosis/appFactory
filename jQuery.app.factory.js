(function ($) {
	$.extend({
		cls: function(proto, _super) {
			var prototype = $.inherit(proto, !_super ? undefined : _super.prototype);
			
			var fn = function() {
				function app () {
					var store = {},
						args = arguments;
						
					this.data = function(key, val) {
						if (typeof key == 'object') {
							return store = key;
						} else if (val) {
							store[key] = val;
						}
						
						return store[key];
					};
					
					if (this.main) {
						this.main.apply(this, args);
					}
				};
				
				app.prototype = prototype;
				
				return app;
			};
			
			return fn();
		},
		inherit: function(subtype, _super) {
			var _subtype = $.extend({ _super: $.noop }, subtype);
			
			for(var name in _super) {
				if (typeof subtype[name] == 'function' && typeof _super[name] == 'function') {
					_subtype[name] = $.overload(subtype[name], _super[name]);
				} else if (typeof subtype[name] == 'object' && typeof _super[name] == 'object') {
					_subtype[name] = $.inherit(subtype[name], _super[name]);
				} else if (!_subtype[name]) {
					_subtype[name] = _super[name];
				}
			}
			
			return _subtype;
		},
		overload: function(sub, _super) {
			return function() {
				var tmp = this._super;
				this._super = _super || $.noop;
				
				sub.apply(this, arguments);
				
				this._super = tmp;
			}
		},
		newClass: function(o) {
			var app = function() {
				var store = {};
				this.data = function(key, val) {
					if (typeof key == 'object') {
						return store = key;
					} else if (val) {
						store[key] = val;
					}
					
					return store[key];
				};

			};
			
			app.prototype = o;
			app = new app()
			
			return app;
		},
		appFactory: (function() {
			var shell,
			    apps = {},
			    defaultCls = {
					main: $.noop
				},
				appPids = {},
				newPid = 0;
			
			function storeApp(name, app) {
				var loc = walkAppNS(name);
				
				loc.ns[loc.name] = app;
				return retrieveApp(name);
			}
			
			function retrieveApp(name) {
				var loc = walkAppNS(name);
				
				return loc.ns[loc.name];
			}
			
			function appNameToPid(appName) {
				var appPid = [];
				
				$.each(appPids, function(pid, app) {
					if (appName.toLowerCase() == app.__appname__.toLowerCase()) {
						appPid.push(parseInt(pid));
					} else {
						var i = app.__appname__.length - appName.length - 1,
							s = app.__appname__.substr(i).toLowerCase();
							
						if (s == '.' + appName.toLowerCase()) {
							appPid.push(parseInt(pid));
						}
					}
				});
				
				return appPid;
			}
			
			function findApp(name, ns) {
				ns = ns || apps;
				
				for (var key in ns) {
					if (key == name) {
						return ns[key];
					} else if (typeof ns[key] == 'object' && !ns[key].main) {
						var obj = findApp(name, ns[key]);
						if (typeof obj != 'undefined') {
							return obj;
						}
					}
				}
			}
			
			function walkAppNS(name) {
				var parts = name.split('.');
				var ns = apps, 
					last = parts.length-1;	//This was done so we don't use the last part
				
				for (var i = 0; i < last; i++) {
					if (!ns[parts[i]]) ns[parts[i]] = {};
					ns = ns[parts[i]];
				}
				
				return {
					ns: ns,
					name: parts[last]
				};
			}
			
			function eachApp(fn, ns) {
				ns = ns || apps;
				
				for (var key in ns) {
					if (!ns[key]) continue;
					
					if (ns[key].__appname__) {
						ns[key] = fn.call(this, ns[key]) || ns[key];
					} else {
						eachApp(fn, ns[key]);
					}
				}
			}
			
			function execute() {
				var proto = arguments[0],
					app = $.newClass(proto);
				
				app.__loaded__ = true;
				app.__pid__ = ++newPid;
				appPids[app.__pid__] = app;
				
				
				if (app.main) {
					app.main.apply(app, Array.prototype.splice.call(arguments, 1));
				}
				
				return app;
			}
			
/*
			function initSingletons(ns) {
				ns = ns || apps;
				
				for (var key in ns) {
					if (ns[key] && ns[key].singleton && !ns[key].__loaded__) {
						execute(ns[key]);
						ns[key] = $.newClass(ns[key], []);
						ns[key].__loaded__ = true;
					} else if (typeof ns[key] == 'object') {
						initSingletons(ns[key]);
					}
				}
			}
*/
			
			function initSingleton(app) {
				if (app.singleton && !app.__loaded__) {
					return execute(app);
/*
					app = $.newClass(app, []);
					app.__loaded__ = true;
					return app;
*/
				}
			}
			
			function initMenuItem(app) {
				if (app.menuItems && app.__appname__ != 'nddjs.Shell') {
					shell.addItem.call(shell, app.menuItems);
				}
			}
			
			function onReady() {
				//Init the shell first.
				shell = retrieveApp('nddjs.Shell');
				shell = execute(shell);
				apps.nddjs.Shell = shell;
				
				eachApp(initSingleton);
				eachApp(initMenuItem);
			}
			
			$($.proxy(onReady, this));
			return function(name, parent, cls) {
				var app;
				
				if (!name) {
					$.error('App name must be provided.');
				}
				
				//get an app by it's pid
				if ($.isNumeric(name)) {
					return appPids[name];
				}
				
				//convert app name to PID
				if (name.substr(0,1) == '!') {
					return appNameToPid(name.substr(1));
				}
				
				//we're asking for a new instance
				if (name && (!parent || $.isArray(parent)) && !cls) {
					app = retrieveApp(name);
					if (!app) app = findApp(name);
					if (!app) return;
					if (app.singleton) {
						return app;
					} else {
						return execute(app, parent);
/* 						return $.newClass(app, parent); */
					}
				}
				
				if (!cls) {
					cls = parent;
					parent = defaultCls;
				}
				
				if (!parent || parent == null) {
					parent = defaultCls;
				} else if (typeof parent == 'string') {
					parent = retrieveApp(parent);
				}
				
				app = $.inherit(cls, parent);
				app.__appname__ = name;
				
				return storeApp(name, app);
			};
		})(),
		
		app: function() {
			var appName = arguments[0],
				method = arguments[1],
				app = $.appFactory(appName);
				
			return app[method].apply(app, Array.prototype.splice.call(arguments, 2));
		},
		
		sendMessage: function(pid, message, callback) {
			var app = $.appFactory(pid);
			
			if (!app || !app._messageReceived || !message) return;
			
			$.fork($.proxy(app._messageReceived, app), message, callback || $.noob);
		}
	});
}(jQuery));

