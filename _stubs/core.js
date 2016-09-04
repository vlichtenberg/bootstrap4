(function (blueriq, ko, bqSessionId, bqConfiguration) {
	'use strict';

	if (!blueriq) {
		blueriq = {};
	}

	window.blueriq = blueriq;

	/**
	 * Contains all default viewmodel definitions.
	 *
	 * @namespace blueriq.models
	 */
	blueriq.models = {};


	/**
	 * The Application initializes the different ui components and prepares a server side subscription for the current session id.
	 *
	 * @constructor
	 * @name blueriq.Application
	 * @param {String} sessionId The session id of the application, must be defined.
	 * @param {Object} configuration The configuration data to use, must be defined.
	 * @param {boolean} isMobile is this a mobile application.
	 * @param {boolean} isOffline is this application running in offline mode.
	 * @param {Object} storage for offline actions
	 * @returns An instance of the application.
	 */
	blueriq.Application = function Application(sessionId, configuration, initCallback, isMobile, isOffline, availableStorage) {

		if (!sessionId) {
			throw new Error('sessionId is mandatory');
		}
		if (!configuration) {
			throw new Error('configuration is mandatory');
		}
		var self = this;

		/**
		 * @member {Object} blueriq.Application#configuration
		 * @property {String} baseUri URI that references to the base URL of the current application.
		 * @property {String} resourceUri URI that references to the web resources base folder.
		 * @property {String} blueriqPath URI that references to the Blueriq folder which contains all standard components (used in all themes).
		 * @property {String} themePath URI that references to the current theme folder.
		 * @property {Boolean} developmentMode Defines whether or not the application is running in development mode.
		 */
		configuration.isMobile=isMobile;
		this.configuration = configuration;
		/** @member {blueriq.LogService} blueriq.Application#log */
		this.log = new blueriq.LogService(configuration.developmentMode);
		/** @member {blueriq.ModelFactory} blueriq.Application#modelFactory */
		this.modelFactory = new blueriq.ModelFactory();
		/** @member {blueriq.MessageBus} blueriq.Application#messageBus */
		this.messageBus = new blueriq.MessageBus(self.log);
		/** @member {blueriq.EventHandler} blueriq.Application#eventHandler */
		this.eventHandler = new blueriq.EventHandler(this.messageBus);
		/** @member {blueriq.TemplateFactory} blueriq.Application#templateFactory */
		this.templateFactory = new blueriq.TemplateFactory(configuration);
		/** @member {blueriq.SessionService} blueriq.Application#sessionService */
		this.sessionService = new blueriq.SessionService(configuration.baseUri, configuration.submitLock, availableStorage);
		/** @member {blueriq.UtilityService} blueriq.Application#utilityService */
		this.utilityService = new blueriq.UtilityService(configuration.baseUri);
		/** @member {boolean} blueriq.isMobile */
		this.isMobile = isMobile;

		// Hook to execute extra initialization logic
		if (initCallback) {
			initCallback(self);
		}

		window.onerror = function onError(message) { //, url, lineNumber,error
			self.messageBus.notify('error', {
				type: 'error',
				title: 'Application Exception',
				message: message,
				blocking: false
			});
			return false;
		};

		this.context = {
			configuration: configuration,
			log: self.log,
			messageBus: self.messageBus,
			templateFactory: self.templateFactory,
			modelFactory: self.modelFactory,
			utilityService: self.utilityService,
			sessionService: self.sessionService,
			eventHandler: self.eventHandler,
			subscriptionId: sessionId
		};

		/**
		 * Internal function to inject the templates from configuration.templates
		 *
		 * @function
		 * @name blueriq.Application#_injectTemplates
		 */
		this._injectTemplates = function (callback, index) {
			if (!index) {
				index = 0;
			}
			if (!self.configuration.templates || index > self.configuration.templates.length - 1) {
				callback();
			} else {
				jQuery.get(self.configuration.templates[index], function (themeTemplates) {
					if (themeTemplates) {
						jQuery('body').append(themeTemplates);
					}
					self._injectTemplates(callback, index + 1);
				});
			}
		};

		/**
		 * Starts the application by creating a subscription for the current session id. Knockout bindings will me applied on success.
		 *
		 * @function
		 * @name blueriq.Application#start
		 */
		this.start = function start() {
			self.sessionService.createSubscription(sessionId, function () {
				self._injectTemplates(function () {
					if (self.configuration.elementId) {
						ko.applyBindings(new blueriq.models.AppModel(sessionId, self.context), document.getElementById(self.configuration.elementId));
					} else {
						ko.applyBindings(new blueriq.models.AppModel(sessionId, self.context));
					}
				});
			});
		};

		/**
		 * Starts the application in offline mode by creating a Knockout binding to the offline viewmodel.
		 *
		 * @function
		 * @name blueriq.Application#startOffline
		 */
		this.startOffline = function startOffline() {
			var model = {
				sessionId: sessionId
			};
			ko.applyBindings(new blueriq.models.bootcards.OfflineWorkListModel(model, self.context));
		}

		this.exit = function exit() {
			self.messageBus.notify('logout');
			if (self.configuration.elementId) {
				ko.cleanNode(document.getElementById('#' + self.configuration.elementId));
			} else {
				ko.cleanNode(document.body);
			}
		};

		this.stillAlive = function stillAlive() {
			var stillAlive = false;
			$.ajax({
				url: configuration.baseUri + sessionId + '/api/utility/keepAlive',
				async: false,
				success: function() {
					stillAlive = true;
				}
			});
			return stillAlive;
		};

		/**
		 * This method is responsible for deleting tasks which are @numberOfDays days old
		 * @function
		 * @name blueriq.Application#clearExpiredTasks
		 * @param {integer} numberOfDays Value in days of how old should a task be
		 */
		this.clearExpiredTasks = function clearExpiredTasks(numberOfDays) {
			var calculateDifference = function(firstDate, secondDate) {
				var day = 1000*60*60*24; // 1 day in miliseconds
				var dif = Math.ceil((firstDate - secondDate)/day); //round number upward to it's nearest integer
				return dif;
			}
			//get all items from the storage which starts with certain key
			self.sessionService.storage.getAll('mobile.offline', function(taskList){
				var currentDate = new Date();
				for (var i=0; i<taskList.length; i++) {
					var task = taskList[i];
					var creationDate = new Date(task.createdOn);
					if (calculateDifference(currentDate, creationDate) > numberOfDays) {
						var key = storage.composeKey('mobile.offline', task.caseId, task.persistencyId);
						storage.remove(key); //remove task from storage
					}
				}
			});
		}

		if (!isOffline) {
			jQuery(document).ready(function () {
				// Keep alive interval
				window.setInterval(function () {
					self.context.messageBus.notify('keepAlive');
				}, (self.context.configuration.sessionTimeout - 1) * 1000);

				// General error handling
				jQuery.ajaxPrefilter(function (options) { //,originalOptions, jqXHR
					// Accept JSON by default
					options.headers = options.headers || {};
					options.headers['Accept'] = 'application/json; charset=UTF-8';

					var callback = options.error;
					options.error = function (data) {
						if (data.responseJSON !== undefined && data.responseJSON.errorType !== undefined) {
							if (self.isMobile) {
								self.context.messageBus.notify('mobile.error');
							} else {
								// Capture JSON error messages
								self.context.messageBus.notify('error', {
									type: 'error',
									title: data.responseJSON.title,
									message: data.responseJSON.message,
									blocking: true
								});
							}
						} else {
							if (callback) {
								callback(data);
							}
						}
					};
				});

				self.start();
			});
		}
	};

	/**
	 * Represents the MessageBus. With this bus interface components can interact
	 * with each other.
	 *
	 * @constructor
	 * @name blueriq.MessageBus
	 * @param {blueriq.LogService} logService The logService, must be defined.
	 * @returns A {@link blueriq.MessageBus|MessageBus} instance.
	 */
	blueriq.MessageBus = function MessageBus(logService) {

		if (!logService) {
			throw new Error('logService is mandatory');
		}
		var listenerId = 0;
		var listeners = {};

		/**
		 * Subscribes a listener to an event, using the specified event and callback
		 * function.
		 *
		 * @function
		 * @name blueriq.MessageBus#subscribe
		 * @param {Object} event The event to subscribe to.
		 * @param {Function} callback Function to be called when the listener is notified.
		 * @returns {Object} A disposable object which can be used to unsubscribe
		 *          from the event by calling dispose().
		 */
		this.subscribe = function subscribe(event, callback) {
			var id = ++listenerId;
			listeners[id] = {
				id: id,
				event: event,
				callback: callback
			};
			return {
				dispose: function dispose() {
					// Removes the listener from the array
					delete listeners[id];
				}
			};
		};

		/**
		 * Notifies all listeners subscribed to the specified event, passing the
		 * specified data as event body.
		 *
		 * @function
		 * @name blueriq.MessageBus#notify
		 * @param {Object} event The event to publish.
		 * @param {Object} data The data to pass to the listeners.
		 */
		this.notify = function notify(event, data) {
			for (var id in listeners) {
				var listener = listeners[id];
				if (listener.event === event) {
					listener.callback(event, data);
				}
			}
		};

		/**
		 * Gets all listeners registered.
		 *
		 * @function
		 * @name blueriq.MessageBus#getListeners
		 * @returns {Array} Containing all listeners mapped by their id.
		 */
		this.getListeners = function getListeners() {
			return listeners;
		};
	};

	/**
	 * Allows logging (wraps console.log)
	 *
	 * @constructor
	 * @name blueriq.LogService
	 * @param {Boolean} debugEnabled Tells whether or not debug logging is shown.
	 * @returns A LogService instance.
	 */
	blueriq.LogService = function LogService(debugEnabled) {
		/**
		 * Logs all arguments specified to the console when debugging is enabled.
		 *
		 * @function
		 * @name blueriq.LogService#debug
		 */

		this.debug = function () {
			if (debugEnabled && window.console) {
				window.console.log(arguments);
			}
		};
		/**
		 * Logs all arguments specified to the console on default logging level.
		 *
		 * @function
		 * @name blueriq.LogService#log
		 */
		this.log = function () {
			if (window.console) {
				window.console.log(arguments);
			}
		};
		/**
		 * Logs all arguments specified to the console on info logging level.
		 *
		 * @function
		 * @name blueriq.LogService#info
		 */
		this.info = function () {
			if (window.console) {
				window.console.info(arguments);
			}
		};
		/**
		 * Logs all arguments specified to the console on error logging level.
		 *
		 * @function
		 * @name blueriq.LogService#error
		 */
		this.error = function () {
			if (window.console) {
				window.console.error(arguments);
			}
		};
	};

	/**
	 * Represents a Blueriq portal session.
	 *
	 * @constructor
	 * @name blueriq.SessionController
	 * @param {String} sessionId The session id, must be defined.
	 * @param {String} subscriptionId The subscription id, must be defined.
	 * @param {blueriq.SessionService} sessionService The sessionService, must be defined.
	 * @param {blueriq.UtilityService} utilityService The utilityService, must be defined.
	 * @param {blueriq.MessageBus} messageBus Message bus instance, must be defined.
	 * @param {blueriq.EventHandler} eventHandler Event handler, must be defined.
	 * @returns A SessionController instance.
	 */
	blueriq.SessionController = function SessionController(sessionId, subscriptionId, sessionService, utilityService, messageBus, eventHandler) {


		if (!sessionId) {
			throw new Error('sessionId is mandatory');
		}
		if (!subscriptionId) {
			throw new Error('subscriptionId is mandatory');
		}
		if (!sessionService) {
			throw new Error('sessionService is mandatory');
		}
		if (!utilityService) {
			throw new Error('utilityService is mandatory');
		}
		if (!messageBus) {
			throw new Error('messageBus is mandatory');
		}
		if (!eventHandler) {
			throw new Error('eventHandler is mandatory');
		}

		var self = this;
		var listeners = {};
		var modelListeners = {};
		var listenerId = 0;

		this.id = sessionId;
		this.csrfToken = ko.observable(null);
		this.language = {};
		this.models = {};

		/**
		 * Creates a page event object using the specified element key and
		 * parameters.
		 *
		 * @function
		 * @name blueriq.SessionController#createPageEvent
		 * @param {String} key The key of the element that initiates the page event.
		 * @param {Object} parameters (Optional) Parameters to pass with the page event.
		 * @returns {Object} A page event object containing the element key, all field elements (key/value pairs) and the parameters.
		 */
		this.createPageEvent = function createPageEvent(key, parameters) {
			// Create a page event.
			var pageEvent = {};
			pageEvent.elementKey = key;
			pageEvent.parameters = parameters;

			pageEvent.fields = [];
			for (var modelKey in self.models) {
				var model = self.models[modelKey];
				if (model.type === 'field') {
					var fieldValue = {};
					fieldValue.key = model.key;
					fieldValue.values = model.values;

					pageEvent.fields.push(fieldValue);
				}
			}
			return pageEvent;
		};

		/**
		 * Performs a modification of the model by handling the specified set of
		 * changes.
		 *
		 * @function
		 * @name blueriq.SessionController#handleEvent
		 * @param {Object}
		 *            changes Array of changes to perform on the model, must be
		 *            defined.
		 */

		var notifyListeners = function __notifyListeners(changes) {
			for (var i = 0; i < changes.changes.length; ++i) {
				var change = changes.changes[i];
				var listener;
				for (var listenerId in listeners) {
					listener = listeners[listenerId];
					listener(change.type, change.key, change.model);
				}
				if (modelListeners[change.key]) {
					for (var id in modelListeners[change.key]) {
						listener = modelListeners[change.key][id];
						listener(change.type, change.model);
					}
				}
				if (change.type === 'delete') {
					delete modelListeners[change.key];
				}
			}
		};

		this.handleChanges = function handleChanges(changes) {
			if (!changes) {
				throw new Error('changes is mandatory');
			}

			// update model
			for (var i = 0; i < changes.changes.length; ++i) {
				var change = changes.changes[i];
				if (change.type === 'update' || change.type === 'add') {
					self.models[change.key] = change.model;
				} else {
					delete self.models[change.key];
				}
			}

			// notify
			notifyListeners(changes);
		};

		/**
		 * Gets the page model.
		 *
		 * @function
		 * @name blueriq.SessionController#getPage
		 * @returns {Object} The page model or undefined if not found.
		 */
		this.getPage = function getPage() {
			for (var element in self.models) {
				var model = self.models[element];
				if (model.type === 'page') {
					return model;
				}
			}
		};

		/**
		 * Returns the model of the specified key.
		 *
		 * @function
		 * @name blueriq.SessionController#getModel
		 * @param {String} key The key of the model, must be defined.
		 * @returns {Object} The model of the key.
		 */
		this.getModel = function getModel(key) {
			if (!key) {
				throw new Error('key is mandatory');
			}
			return self.models[key];
		};

		/**
		 * Initializes the session data.
		 *
		 * @function
		 * @name blueriq.SessionController#init
		 * @param {Function}  callback (Optional) Callback triggered after initialization.
		 */
		this.init = function init(callback) {
			sessionService.subscribe(subscriptionId, sessionId, function (data) {
				self.language = data.language;
				self.csrfToken(data.csrfToken);

				for (var i = 0; i < data.elements.length; ++i) {
					var element = data.elements[i];
					self.models[element.key] = element;
				}

				if (callback) {
					callback();
				}
			});

			self.pageSubscription = messageBus.subscribe('page', function (event,
																		   data) {
				if (data.sessionId === self.id) {
					if (data.csrfToken) {
						self.csrfToken(data.csrfToken);
					}
					self.handleChanges(data.changes);
				}
			});

			self.keepAlive = true;

			self.projectSubscription = messageBus.subscribe('project', function(event, data) {
				if (data.sessionId === self.id) {
					sessionService.startNewSession(data.newSessionId, data.newTab);
				}
			});

			self.keepAliveSubscription = messageBus.subscribe('keepAlive',
				function () {
					if (self.keepAlive) {
						utilityService.keepAlive(sessionId);
					}
				});

			self.beforeSubmitSubscription = messageBus.subscribe('beforeSubmit',
				function () {
					self.keepAlive = false;
				});

			self.afterSubmitSubscription = messageBus.subscribe('afterSubmit',
				function () {
					self.keepAlive = true;
				});

			self.logoutSubscription = messageBus.subscribe('logout',
				function () {
					self.dispose();
				});
		};

		/**
		 * Subscribes to all change events.
		 *
		 * @function
		 * @name blueriq.SessionController#subscribe
		 * @param {Function} listener Callback with signature changeType, key, model. Must be defined.
		 * @returns {Object} A disposable object which can be used to unsubscribe from the event by calling dispose().
		 */
		this.subscribe = function subscribe(listener) {
			if (!listener) {
				throw new Error('listener is mandatory');
			}
			var id = ++listenerId;
			listeners[id] = listener;
			return {
				dispose: function () {
					delete listeners[id];
				}
			};
		};


		/**
		 * Subscribes to change events for models with a specific key.
		 * @function
		 * @name blueriq.SessionController#subscribe
		 * @param {String} key
		 * @param {Function} listener Callback with signature changeType, model. Must be defined.
		 * @returns {Object} A disposable object which can be used to unsubscribe from the event by calling dispose().
		 */
		this.subscribeModel = function subscribeModel(key, listener) {
			if (!key) {
				throw new Error('[subscribeModel] key is mandatory');
			}
			if (!listener) {
				throw new Error('[subscribeModel] listener is mandatory');
			}
			if (!modelListeners[key]) {
				modelListeners[key] = {};
			}
			var id = ++listenerId;
			modelListeners[key][id] = listener;
			return {
				dispose: function () {
					delete modelListeners[key][id];
				}
			};
		};

		/**
		 * Submits the current page.
		 *
		 * @function
		 * @name blueriq.SessionController#submit
		 * @param {String} [key] to reference the element that triggers the submit
		 * @param {Object} [parameters] Extra parameters
		 * @param {Function} [callback] Function to call when submit is done.
		 */
		this.submit = function submit(key, parameters, callback) {
			var pageEvent = self.createPageEvent(key, parameters);
			if(handleEventStub) {
				handleEventStub.events[0].sessionId = bqSessionId;
				console.warn('_stubs\\core.js: intercepted sessionService.submit is stubbed');
				eventHandler.handleEvents(true, handleEventStub);
			} else {
				console.warn('_stubs\\core.js: intercepted sessionService.submit');
			}
			callback(true);
			//sessionService.submit(sessionId, subscriptionId, self.csrfToken(), pageEvent, function (success, data) {
			//	eventHandler.handleEvents(success, data);
			//	if (callback) {
			//		callback(success);
			//	}
			//});
		};

		/**
		 * Recompose the current page.
		 *
		 * @function
		 * @name blueriq.SessionController#recompose
		 * @param {Function} [callback] Function to call when submit is done.
		 */
		this.recompose = function recompose(callback) {
			var pageEvent = {};
			sessionService.submit(sessionId, subscriptionId, self.csrfToken(), pageEvent, function (success, data) {
				eventHandler.handleEvents(success, data);
				if (callback) {
					callback(success);
				}
			});
		};

		/**
		 * Starts a flow with the specified name.
		 *
		 * @function
		 * @name blueriq.SessionController#startFlow
		 * @param {String} flowName Name of the flow to start, must be specified.
		 */
		this.startFlow = function startFlow(flowName) {
			if (!flowName) {
				throw new Error('flowName is mandatory');
			}
			sessionService.startFlow(sessionId, subscriptionId, self.csrfToken(), flowName,
				eventHandler.handleEvents);
		};

		/**
		 * Disposes the session by closing all subscriptions.
		 *
		 * @function
		 * @name blueriq.SessionController#dispose
		 */
		this.dispose = function sessionControllerDispose() {
			if (self.pageSubscription) {
				self.pageSubscription.dispose();
			}
			if (self.projectSubscription) {
				self.projectSubscription.dispose();
			}
			if (self.keepAliveSubscription) {
				self.keepAliveSubscription.dispose();
			}
			if (self.beforeSubmitSubscription) {
				self.beforeSubmitSubscription.dispose();
			}
			if (self.afterSubmitSubscription) {
				self.afterSubmitSubscription.dispose();
			}
			if (self.logoutSubscription) {
				self.logoutSubscription.dispose();
			}
			if (self.networkAvailabilitySubscription) {
				self.networkAvailabilitySubscription.dispose();
			}
		};

		/**
		 * Executes operations on an offline task.
		 *
		 * @function
		 * @name blueriq.SessionController#executeOfflineTaskAction
		 * @param {String} action The action which is executed
		 * @param {String} sessionId The session id of the application
		 * @param {Object} taskDetails Details regarding a task
		 */
		this.executeOfflineTaskAction = function executeOfflineTaskAction(action, sessionId, taskDetails, callback) {
			if (action == 'prepare') {
				sessionService.prepareOfflineTask(sessionId, taskDetails, callback);
			} else if (action == 'delete') {
				sessionService.deleteOfflineTask(taskDetails.caseId, taskDetails.persistencyId, callback);
			} else if (action == 'executed') {
				sessionService.deleteOfflineTask(taskDetails.caseId, taskDetails.persistencyId, callback);
			}
		};

		/**
		 * Determine the action of a button.
		 *
		 * @function
		 * @name blueriq.SessionController#getButtonAction
		 * @param {String} key The key of a task
		 * @param {Function} callback Function to call
		 */
		this.getButtonAction = function getButtonAction(key, callback) {
			return sessionService.getButtonAction(key, callback);
		};

		/**
		 * Determine the class of a button.
		 *
		 * @function
		 * @name blueriq.SessionController#getButtonClass
		 * @param {String} actionType The action type of a button
		 * @param {Function} callback Function to call
		 */
		this.getButtonClass = function getButtonClass(actionType, callback) {
			var buttonClass = '';
			if (actionType == 'prepare') {
				buttonClass = 'offline-available-button'
			} else if (actionType == 'delete') {
				buttonClass = 'offline-delete-button';
			} else if (actionType == 'executed'){
				buttonClass = 'offline-delete-executed-button';
			} else {
				buttonClass = '';
			}
			callback(buttonClass);
		};

	};

	/**
	 * Responsible for retrieving template url's for viewmodels.
	 *
	 * @constructor
	 * @name blueriq.TemplateFactory
	 * @param {Object}configuration Configuration object, must be specified.
	 * @returns An instance of the template factory.
	 */
	blueriq.TemplateFactory = function (configuration) {

		if (!configuration) {
			throw new Error('configuration is mandatory');
		}

		var self = this;

		this.modelHandlers = [];
		this.fieldValueHandlers = [];

		/**
		 * Handler for custom templates for elements.
		 *
		 * @function
		 * @name blueriq.TemplateFactory.ElementHandler
		 * @param {Object}
		 *            model The model to retrieve a template for.
		 * @returns {String} The path to the template, or undefined if not
		 *          applicable.
		 */

		/**
		 * Registers a custom handler for a viewmodel.
		 *
		 * @function
		 * @name blueriq.TemplateFactory#registerModelHandler
		 * @param {blueriq.TemplateFactory.ElementHandler} handler (Optional) The handler implementation.
		 */
		this.registerModelHandler = function registerModelHandler(handler) {
			if (typeof (handler) !== 'function') {
				throw new Error('handler must be a function');
			}
			self.modelHandlers.push(handler);
		};

		/**
		 * Returns a template url for the viewmode.
		 *
		 * @function
		 * @name blueriq.TemplateFactory#getTemplate
		 * @param {blueriq.models.BaseModel} viewModel The model to retrieve a template for, must be specified.
		 * @param {Object} bindingContext binding context is an object that holds data that you can reference from your bindings
		 * @returns {String} The url of the template.
		 */
		this.getTemplate = function getTemplate(viewModel, bindingContext) {
			if (!viewModel) {
				throw new Error('viewModel is mandatory');
			}
			for (var i = self.modelHandlers.length - 1; i >= 0; i--) {
				var template = self.modelHandlers[i](viewModel, bindingContext);
				if (template) {
					return template;
				}
			}

			throw new Error('Could not create template');
		};

		/**
		 * Registers a custom handler for a viewmodel.
		 *
		 * @function
		 * @name blueriq.TemplateFactory#registerFieldValueHandler
		 * @param {FieldHandler}  handler (Optional) The handler implementation.
		 */
		this.registerFieldValueHandler = function registerFieldValueHandler(handler) {
			if (handler) {
				self.fieldValueHandlers.push(handler);
			}
		};

		/**
		 * Returns the template url for the field value of a field viewmodel.
		 *
		 * @function
		 * @name blueriq.TemplateFactory#getFieldValueTemplate
		 * @param {blueriq.models.BaseModel} viewModel The field to retrieve a value template for, must be specified.
		 * @param {Object} bindingContext binding context is an object that holds data that you can reference from your bindings
		 * @returns {String} URL to the template for the specified field value viewmodel.
		 */
		this.getFieldValueTemplate = function getFieldValueTemplate(viewModel, bindingContext) {
			if (!viewModel) {
				throw new Error('viewModel is mandatory');
			}
			for (var i = self.fieldValueHandlers.length - 1; i >= 0; i--) {
				var template = self.fieldValueHandlers[i](viewModel, bindingContext);
				if (template) {
					return template;
				}
			}
			throw new Error('Could not create a template for field value');
		};

	};

	/**
	 * Responsible for generating a viewmodel from a datamodel.
	 *
	 * @constructor
	 * @name blueriq.ModelFactory
	 * @returns An instance of the modelFactory.
	 */
	blueriq.ModelFactory = function ModelFactory() {


		//var self = this;

		var modelHandlers = [];

		/**
		 * Registers a model handler.
		 *
		 * @function
		 * @name blueriq.ModelFactory#register
		 * @param {blueriq.ModelFactory.ModelHandler} handler (Optional) The handler implementation.
		 */
		this.register = function register(handler) {
			if (typeof (handler) !== 'function') {
				throw new Error('handler must be a function');
			}
			modelHandlers.push(handler);
		};

		/**
		 * Returns a viewmodel for a datamodel.
		 *
		 * @function
		 * @name blueriq.ModelFactory#createViewModel
		 * @param {Object} model The concerning data model, must be specified.
		 * @param {Object} context Context for the viewmodel to be created, must be specified.
		 * @returns {blueriq.models.BaseModel} The generated viewmodel.
		 */
		this.createViewModel = function createViewModel(model, context) {
			if (!model) {
				throw new Error('model is mandatory');
			}
			if (!context) {
				throw new Error('context is mandatory');
			}

			for (var i = modelHandlers.length - 1; i >= 0; i--) {
				var viewModel = modelHandlers[i](model, context);
				if (viewModel) {
					return viewModel;
				}
			}
		};
	};

	/**
	 * Responsible for handling requests to the utility service.
	 *
	 * @constructor
	 * @name blueriq.UtilityService
	 * @param {String} baseUri The base uri, must be specified.
	 * @returns An instance of the utility service.
	 */
	blueriq.UtilityService = function UtilityService(baseUri) {

		if (!baseUri) {
			throw new Error('baseUri is mandatory');
		}

		/**
		 * Heartbeat to keep the session active. Sends a request to the server and
		 * calls the specified callback function on response.
		 *
		 * @function
		 * @name blueriq.UtilityService#keepAlive
		 * @param {String} sessionId Id of the session to keep alive, must be specified.
		 * @param {Function} [callback] Function to call when the server responds.
		 */
		this.keepAlive = function keepAlive(sessionId, callback) {
			if (!sessionId) {
				throw new Error('sessionId is mandatory');
			}

			$.get(baseUri + sessionId + '/api/utility/keepAlive',
				function (response) {
					if (callback) {
						callback(response);
					}
				});
		};
	};

	/**
	 * Set or add parameters to a URL query string.
	 *
	 * @function
	 * @name blueriq.QueryStringBuilder
	 * @param {String} url starting URL, must be specified
	 */
	blueriq.QueryStringBuilder = function QueryStringBuilder(url) {
		var self = this;
		var elements = url.match(/([^\?#]+)(\?([^#]+))?(#.+)?/);

		this.head = elements[1] || '';
		this.queryString = elements[3] || ''
		this.tail = elements[4] || '';

		this.parameters = {};
		$(this.queryString.split('&')).each(function(index, value) {
			var tokens = value.split('=');
			if (tokens.length == 2) {
				self.parameters[tokens[0]] = tokens[1];
			}
		});


		this.param = function(name, value) {
			self.parameters[name] = value;
			return self;
		};

		var joinParameters = function() {
			var result = '';
			for (var name in self.parameters) {
				if (result) result += '&';
				result += name + '=' + encodeURIComponent(self.parameters[name]);
			}

			return result ? '?' + result : '';
		};

		this.toUrl = function() {
			return self.head + joinParameters() + self.tail;
		}

	};


	/**
	 * Event handler for handling page events. The specified message bus is used to
	 * notify when an event is handled successfully or when an error occurs.
	 *
	 * @constructor
	 * @name blueriq.EventHandler
	 * @param {blueriq.MessageBus} messageBus Message bus instance to use for notifications on success or failure, must be specified.
	 * @returns An EventHandler instance.
	 */
	blueriq.EventHandler = function EventHandler(messageBus) {

		if (!messageBus) {
			throw new Error('messageBus is mandatory');
		}

		/**
		 * Handles the events present on the specified data object, by notifying on
		 * the message bus for each event.
		 *
		 * @function
		 * @name blueriq.EventHandler#handleEvents
		 * @param {Boolean} success Indicator whether or not the success path should be taken.
		 * @param {Object} data (Optional) Data object containing the events to handle.
		 */
		this.handleEvents = function handleEvent(success, data) {
			if (success) {
				if (data && data.events) {
					for (var i = 0; i < data.events.length; ++i) {
						var event = data.events[i];
						if (event.type == 'project') {
							messageBus.notify('project', event);
						} else if (event.type == 'page'){
							messageBus.notify('page', event);
						} else if (event.type == 'taskFinished'){
							messageBus.notify('taskFinished', event);
						} else if (event.type == 'taskStarted'){
							messageBus.notify('taskStarted', event);
						}
					}
				}
			} else {
				messageBus.notify('error', {
					type: 'error',
					title: 'Application Exception',
					message: 'Server communication failed',
					blocking: true
				});
			}
		};
	};

	/**
	 * Queue for events that handles events sequentially.
	 */
	blueriq.EventQueue = function EventQueue() {


		this.reqs = [];
		this.requesting = false;

		this.add = function add(req) {
			this.reqs.push(req);
			this.next();
		};
		this.next = function next() {
			if (this.reqs.length === 0) {
				return;
			}
			if (this.requesting === true) {
				return;
			}

			var req = this.reqs.splice(0, 1)[0];
			var complete = req.complete;
			var self = this;

			req.complete = function () {
				if (complete) {
					complete.apply(this, arguments);
				}
				self.requesting = false;
				self.next();
			};
			this.requesting = true;
			$.ajax(req);
		};
	};

	/**
	 * Service that communicates with the server to perform session related actions,
	 * like flowing and event subscriptions.
	 *
	 * @constructor
	 * @name blueriq.SessionService
	 * @param {String} baseUri The base URL of the API, must be specified.
	 * @param {Boolean} submitLock whether only on event should be handled. If this value is true or specified, the event queue is not used, which is the same behavior as in 9.3-.
	 * @param {Object} availableStorage Storage for offline operations; if this object is undefined it will the the localstorage implementation
	 */
	blueriq.SessionService = function SessionService(baseUri, submitLock, availableStorage) {

		if (!baseUri) {
			throw new Error('baseUri is mandatory');
		}
		var self = this;
		self.eventQueue = new blueriq.EventQueue();
		self.submitLock = submitLock;
		if(availableStorage){
			self.storage = availableStorage;
		}else{
			self.storage = new blueriq.LocalStorage();
		}
		/**
		 * Submits the pageEvent to the server.
		 *
		 * @function
		 * @name blueriq.SessionService#submit
		 * @param {String}
		 *            sessionId The id of the session submit for, must be specified.
		 * @param {String}
		 *            subscriptionId The id of the subscription, must be specified.
		 * @param {String}
		 *            csrfToken the CSRF token for this request, must be specified.
		 * @param {Object}
		 *            pageEvent The event to submit, must be specified.
		 * @param {Function}
		 *            (Optional) Callback function to call when submit is
		 *            successful.
		 */
		var submitting = false;
		this.submit = function submit(sessionId, subscriptionId, csrfToken, pageEvent, callback) {
			if (self.submitLock && self.submitLock === true && submitting) {
				return;
			}

			if (!sessionId) {
				throw new Error('sessionId is mandatory');
			}
			if (!subscriptionId) {
				throw new Error('subscriptionId is mandatory');
			}
			if (!pageEvent) {
				throw new Error('pageEvent is mandatory');
			}
			if (!csrfToken) {
				throw new Error('csrfToken is mandatory');
			}
			submitting = true;
			self.eventQueue.add({
				type: 'POST',
				url: baseUri + sessionId + '/api/subscription/' + subscriptionId + '/handleEvent',
				data: JSON.stringify(pageEvent),
				contentType: 'application/json',
				headers: {
					'X-CSRF-Token': csrfToken
				},
				success: function (data) {
					if (callback) {
						callback(true, data);
					}
					submitting = false;
				},
				error: function () {
					if (callback) {
						callback(false);
					}
					submitting = false;
				}
			});
		};

		/**
		 * Starts a new flow by calling the flow service on the REST API with a
		 * specified flow name.
		 *
		 * @function
		 * @name blueriq.SessionService#startFlow
		 * @param {String} sessionId The id of the session submit for, must be specified.
		 * @param {String} subscriptionId The id of the subscription, must be specified.
		 * @param {String} csrfToken The CSRF token for this request, must be specified.
		 * @param {String} flowName Name of the flow to start.
		 * @param {Function} [callback] Callback function for handling the success response.
		 */
		this.startFlow = function startFlow(sessionId, subscriptionId, csrfToken, flowName,
											callback) {
			if (!sessionId) {
				throw new Error('sessionId is mandatory');
			}
			if (!subscriptionId) {
				throw new Error('subscriptionId is mandatory');
			}
			if (!flowName) {
				throw new Error('flowName is mandatory');
			}
			if (!csrfToken) {
				throw new Error('csrfToken is mandatory');
			}

			$.ajax({
				type: 'POST',
				url: baseUri + sessionId + '/api/subscription/' + subscriptionId + '/startFlow/' + flowName,
				contentType: 'application/json',
				headers: {
					'X-CSRF-Token': csrfToken
				},
				success: function (data) {
					if (callback) {
						callback(true, data);
					}
				},
				error: function () {
					if (callback) {
						callback(false);
					}
				}
			});
		};

		/**
		 * Creates a subscription for the specified subscription id.
		 *
		 * @function
		 * @name blueriq.SessionService#createSubscription
		 * @param {String} subscriptionId The id subscription to be created, usually the main session id, must be specified.
		 * @param {Function} [callback]The function to call when the subscription is successful.
		 */
		this.createSubscription = function createSubscription(subscriptionId,
															  callback) {
			if (!subscriptionId) {
				throw new Error('subscriptionId is mandatory');
			}
			//console.log('createSubscription', callback);
			var data = stub;
			callback(data);
			//$.ajax({
			//	type: 'POST',
			//	url: baseUri + subscriptionId + '/api/subscribe/',
			//	contentType: 'application/json',
			//	success: function () {
			//		if (callback) {
			//			callback();
			//		}
			//	}
			//});
		};

		/**
		 * Subscribes the specified session id to the specified subscription id.
		 *
		 * @function
		 * @name blueriq.SessionService#subscribe
		 * @param {String} subscriptionId The id of the subscription to subscribe to, must be specified.
		 * @param {String} sessionId The id of the session to subscribe to thesubscription, must be specified.
		 * @param {Function} [callback] Callback function to call when subscription is successful.
		 */
		this.subscribe = function subscribe(subscriptionId, sessionId, callback) {
			if (!subscriptionId) {
				throw new Error('subscriptionId is mandatory');
			}
			if (!sessionId) {
				throw new Error('sessionId is mandatory');
			}
			//console.log('subscribe');
			var data = stub;
			callback(data);
			//$.ajax({
			//	type: 'POST',
			//	url: baseUri + sessionId + '/api/subscribe/' + subscriptionId,
			//	contentType: 'application/json',
			//	success: function (data) {
			//		if (callback) {
			//			callback(data);
			//		}
			//	}
			//});
		};

		/**
		 * Opens a new session. The session must already be created server-side.
		 *
		 * @function
		 * @name blueriq.SessionService#startNewSession
		 * @param {String} newSessionId the ID of the new session that will be opened
		 * @param {boolean} newTab whether the new session should be opened in a new tab or in the same tab
		 */
		this.startNewSession = function startNewSession(newSessionId, newTab) {
			$.ajax({
				type: 'POST',
				url: baseUri + newSessionId + '/api/startnewsession/',
				contentType: 'application/json',
				success: function (data) {
					if (!data.url) {
						return;
					}
					var nextLocation = baseUri + '../' +data.url;
					if (newTab) {
						var win = window.open(nextLocation, '_blank');
						if (win) {
							win.focus();
						}
					} else {
						window.open(nextLocation, '_self');
					}
				}
			});

		};

		/**
		 * Prepares the task for offline execution.
		 *
		 * @function
		 * @name blueriq.SessionService#prepareOfflineTask
		 * @param {String} sessionId The id of the session to subscribe to thesubscription, must be specified.
		 * @param {String} taskDetails The details of a task.
		 * @param {Function} callback Callback function to call when action is successful.
		 */
		this.prepareOfflineTask = function prepareOfflineTask(sessionId, taskDetails, callback) {
			if (!sessionId) {
				throw new Error('sessionId is mandatory');
			}
			if (!taskDetails.taskId) {
				throw new Error('taskId is mandatory');
			}
			if (!taskDetails.taskName) {
				throw new Error('taskName is mandatory');
			}
			$.ajax({
				type: 'POST',
				url: baseUri + sessionId + '/api/prepare_offline/' +taskDetails.taskId,
				contentType: 'application/json',
				success: function (data) {
					var updatedTaskDetails = self.storage.composeTask(taskDetails, data);
					var key = self.storage.composeKey('mobile.offline', taskDetails.caseId, taskDetails.persistencyId);
					self.storage.insert(key, updatedTaskDetails);
					self.storage.contains(key, function(containsKey){
						if(containsKey){
							callback('offline-delete-button');
						}
					});
				},
				error: function () {
					alert('Attempt to prepare task offline was unsuccessful');
				}
			});
		};

		/**
		 * Removes an offline task from the storage.
		 *
		 * @function
		 * @name blueriq.SessionService#prepareOfflineTask
		 * @param {integer} caseId The id of the case of a task.
		 * @param {String} persistencyId The id of the persistence GUID of a task.
		 * @param {Function} callback Callback function to call when action is successful.
		 */
		this.deleteOfflineTask = function deleteOfflineTask(caseId, persistencyId, callback) {
			var key = self.storage.composeKey('mobile.offline', caseId, persistencyId);
			self.storage.remove(key);
			self.storage.contains(key, function(containsKey){
				if(callback && !containsKey){
					callback('offline-available-button');
				}
			});
		};

		this.getButtonAction = function getButtonAction(key, callback) {

			if (!key) {
				throw new Error('key is mandatory');
			}
			self.storage.get(key, function(data){
				var actionType = 'prepare';
				if (data == null) {
					actionType = 'prepare';
				} else {
					if (!data.values) {
						actionType = 'delete';
					} else {
						actionType = 'executed'
					}
				}
				callback(actionType);
			});
		};
	};
	/**
	 * Represents the local storage of the application
	 */
	blueriq.LocalStorage = function LocalStorage () {
		var storage = window.localStorage;
		this.composeTask = function composeTask(taskDetails, data) {
			if (data.elements) {
				taskDetails.elements = data.elements;
			}
			if (data.language) {
				taskDetails.language = data.language;
			}
			taskDetails.createdOn = new Date().toJSON();
			return taskDetails;
		};

		this.composeKey = function composeKey(prefix, caseId, persistencyId) {
			if (prefix == null) {
				prefix = ''; //empty prefix
			} else {
				prefix = prefix + ':';
			}
			if (caseId == null) {
				throw new Error('case id is mandatory');
			}
			if (persistencyId == null) {
				throw new Error('persistency id is mandatory');
			}
			var key =  prefix + caseId + '|' + persistencyId;
			return key;
		}

		this.insert = function insert(key, value, callback) {
			if (!key) {
				throw new Error('key is mandatory');
			}
			if(typeof value == 'object'){
				value._key = key;
			}
			storage.setItem(key, JSON.stringify(value));
		}

		this.get = function get(key, callback) {
			if (!key) {
				throw new Error('key is mandatory');
			}
			var returnValue = storage.getItem(key);
			returnValue == undefined ? undefined : JSON.parse(returnValue);

			if (callback) {
				callback(returnValue);
			}
		}

		this.remove = function remove(key, callback) {
			if (!key) {
				throw new Error('key is mandatory');
			}
			storage.removeItem(key);
			if (callback) {
				calback;
			}
		}

		this.contains = function contains(key, callback) {
			if (!key) {
				throw new Error('key is mandatory');
			}
			var value = storage.getItem(key);
			if (callback) {
				callback(!!value);
			}
		}

		this.getAll = function getAll(startsWith, callback) {
			var items = [];
			for (var key in storage) {
				var item = this.get(key);
				if (item != null) {
					if (startsWith) {
						if (!(key.substring(0, startsWith.length) === startsWith)) {
							continue;
						}
					}
					items.push(item);
				}
			}
			if (callback) {
				callback(items);
			}
		}
	};

	/**
	 * Represents the main viewmodel of the application.
	 *
	 * @constructor
	 * @name blueriq.models.AppModel
	 * @param {String} sessionId The sessionId of the application.
	 * @param {Object} context The data context.
	 * @returns An AppModel instance.
	 */
	blueriq.models.AppModel = function AppModel(sessionId, context) {


		if (!sessionId) {
			throw new Error('sessionId is mandatory');
		}
		if (!context) {
			throw new Error('context is mandatory');
		}
		this.notification = new blueriq.models.NotificationModel(context.messageBus);
		this.session = new blueriq.models.SessionModel(sessionId, context);
	};

	/**
	 * Represents the notification viewmodel.
	 *
	 * @constructor
	 * @name blueriq.models.NotificationModel
	 * @param {blueriq.MessageBus} messageBus The messageBus to monitor.
	 * @returns An NotificationModel instance.
	 */
	blueriq.models.NotificationModel = function NotificationModel(messageBus) {


		if (!messageBus) {
			throw new Error('messageBus is mandatory');
		}

		var self = this;
		var queue = [];

		this.type = ko.observable(null);
		this.title = ko.observable(null);
		this.message = ko.observable(null);
		this.blocking = ko.observable(null);

		function setData(data) {
			if (data) {
				self.type(data.type);
				self.title(data.title);
				self.message(data.message);
				self.blocking(data.blocking);
			} else {
				self.type(null);
				self.title(null);
				self.message(null);
				self.blocking(null);
			}
		}

		/**
		 * Sets the state of this {@link blueriq.models.NotificationModel|NotificationModel} as handled and moves to the next {@link blueriq.models.NotificationModel} if possible.
		 *
		 * @function
		 * @name blueriq.models.NotificationModel#handled
		 */
		this.handled = function () {
			var next = queue.shift();
			if (next) {
				setData(next);
			} else {
				setData();
			}
		};

		messageBus.subscribe('error', function (event, data) {
			if (self.message()) {
				queue.push(data);
			} else {
				setData(data);
			}
		});
	};

	/**
	 * Represents a Blueriq Session Model
	 *
	 * @constructor
	 * @name blueriq.models.SessionModel
	 * @param {String} sessionId The session id, must be defined.
	 * @param {Object} context The data context, must be defined.
	 * @returns An instance of the session model.
	 */
	blueriq.models.SessionModel = function SessionModel(sessionId, context) {

		if (!sessionId) {
			throw new Error('sessionId is mandatory');
		}
		if (!context) {
			throw new Error('context is mandatory');
		}

		var self = this;
		this.context = {};

		this.page = ko.observable(null);
		ko.utils.extend(this.context, context);

		this.context.session = new blueriq.SessionController(sessionId, context.subscriptionId, context.sessionService, context.utilityService, context.messageBus, context.eventHandler);

		var changeSubscription = this.context.session.subscribe(function sessionChangeListener(type, key, model) {
			// update will be handled by the page viewmodel, delete without add should never occur..
			if (type === 'add' && model.type === 'page') {
				self.page(self.context.modelFactory.createViewModel(model, self.context));
			}
		});

		this.context.session.init(function () {
			var pageModel = self.context.session.getPage();
			self.page(self.context.modelFactory.createViewModel(pageModel, self.context));
			if (pageModel.properties && pageModel.properties.caseid && pageModel.properties.persistencyid) {
				self.context.messageBus.notify('taskStarted', pageModel);
			}
		});

		/**
		 * Disposes this {@link blueriq.models.SessionModel|SessionModel} and all its subscriptions.
		 *
		 * @function
		 * @name blueriq.models.SessionModel#dispose
		 */
		this.dispose = function sessionModelDispose() {
			this.context.session.dispose();

			if (changeSubscription) {
				changeSubscription.dispose();
			}
		};
	};



	/* create the application */
	if ((typeof bqSessionId !== 'undefined') && (typeof bqConfiguration !== 'undefined')) {
		window.bqApp = new blueriq.Application(bqSessionId, bqConfiguration);
	}

}(window.blueriq, window.ko, window.bqSessionId, window.bqConfiguration));
