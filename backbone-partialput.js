(function(root, factory) {
    if(typeof define === 'function' && define.amd) {
        // AMD

        define(['underscore', 'backbone', 'exports'], function(_, Backbone, exports) {
            // Export global even in AMD case in case this script is loaded with
            // others that may still expect a global Backbone.
            root.Backbone = factory(root, exports, _, Backbone);
        });

    } else if(typeof exports !== 'undefined') {
        // for Node.js or CommonJS

        var _ = require('underscore'),
            Backbone = require('backbone');

        factory(root, exports, _, Backbone);
    } else {
        // as a browser global

        root.Backbone = factory(root, {}, root._, root.Backbone);
    }

}(this, function(root, exports, _, BackboneBase) {

    var Backbone = _.extend({}, BackboneBase);

    // Helper function calculating an object containing only those attributes from newAttrs
    // that have different values compared to originalAttrs
    var getChangedAttrs = function(originalAttrs, newAttrs) {
        var result = {};
        for(var key in newAttrs) {
            if(!_.isEqual(originalAttrs[key], newAttrs[key])) {
                result[key] = newAttrs[key];
            }
        }
        return result;
    };

    Backbone.Model = BackboneBase.Model.extend({

        // Attributes listed in this array will always be included in the
        // model's partial JSON representation, also if they have not been
        // changed since the latest sync
        partialAttributesCore: [ 'id' ],

        // Symmetric to Backbone's `model.changedAttributes()`,
        // except that this returns a hash of the attributes that have
        // changed since the last sync, or `false` if there are none.
        // Like `changedAttributes`, an external attributes hash can be
        // passed in, returning the attributes in that hash which differ
        // from the model's attributes at the time of the last sync.
        unsavedAttributes: function(attrs) {
            attrs = attrs || this.attributes;
            if(!this._syncedAttributes) return attrs;

            return getChangedAttrs(this._syncedAttributes, attrs);
        },

        // Has the model changes, that have not been synced to the server?
        hasUnsavedChanges: function() {
            return !_.isEmpty(this.unsavedAttributes());
        },

        // Override #save to make sure that only the partial JSON representation is submitted
        // and that the server response to POST and PUT requests is always parsed to contain
        // only attributes that have been changed on the server
        save: function(key, val, options) {
            var model = this;
            var attrs;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if(key === null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options || (options = {});

            // If there are no unsaved changes, do not dispatch a request,
            // but immediately call the `success` callback
            if(!this.isNew() && !this.hasUnsavedChanges(options)) {
                if(options.success) options.success({});
                return;
            }

            if(options.partial === void 0) options.partial = true;
            if(options.partial) options.partialBaseline = _.clone(this.attributes);

            // This callback will be executed after the attributes from the response
            // have been set to the model, before `sync` is triggered
            var success = options.success;
            options.success = function(resp) {
                // Reset synced attributes again, so that changes coming from the server are
                // considered to be saved.
                model._resetSyncedAttributes();
                if(success) {
                    success(resp);
                }
            };

            // In case of error set the synced attributes back to the values before the object
            // was pro-actively reset when the save request was dispatched.
            var error = options.error;
            options.error = function(resp) {
                // Only restore original value if no other concurrent save requests
                // have reset the synced attributes in the meantime.
                if(_.isEqual(model._syncedAttributes, options.partialBaseline)) {
                    model._syncedAttributes = previousSyncedAttributes;
                }
                if(error) {
                    error(resp);
                }
            };

            var result = BackboneBase.Model.prototype.save.call(this, attrs, options);

            // Pro-actively reset _syncedAttributes so that concurrent saves will only go through
            // if attributes have actually been changed
            var previousSyncedAttributes = this._syncedAttributes;
            this._resetSyncedAttributes();

            return result;
        },

        // Override #fetch to set the `partial` flag in the options
        fetch: function(options) {
            var model = this;

            options || (options = {});
            //if(options.partial === void 0) options.partial = !options.reset;

            // This callback will be executed after the attributes from the response
            // have been set to the model, before `sync` is triggered
            var success = options.success;
            options.success = function(resp) {

                model._resetSyncedAttributes();

                if(success) {
                    success(resp);
                }

            };

            return BackboneBase.Model.prototype.fetch.call(this, options);
        },

        // Override #set to add support for `clear` option. If `clear` is set to true,
        // the current attributes hash will be cleared before the new attributes passed
        // in the arguments are set.
        set: function(key, val, options) {
            var keyDiff, i, l, result;

            if(key === null) return this;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if(typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options || (options = {});

            // If `clear` is set, we first set all attrs to be cleared to undefined,
            // thus letting Backbone's native #set trigger all appropriate attr change events.
            if(options.clear) {
                keyDiff = _.difference(_.keys(this.attributes), _.keys(attrs));
                for(i=0, l=keyDiff.length; i<l; ++i) {
                    attrs[keyDiff[i]] = void 0;
                }
            }

            result = BackboneBase.Model.prototype.set.apply(this, [attrs, options]);

            // Make sure to properly delete the attributes
            if(result && options.clear) {
                for(i=0, l=keyDiff.length; i<l; ++i) {
                    delete this.attributes[keyDiff[i]];
                }
            }

            return result;
        },

        // If a snapshot of the attributes hash is passed in option `partialBaseline`,
        // this will return only those attributes from the parsed response, which have
        // changed in comparison to the snapshop baseline
        parse: function(resp, options) {
            var result = BackboneBase.Model.prototype.parse.apply(this, arguments);

            options || (options = {});
            if(options.partial && options.partialBaseline) {
                result = getChangedAttrs(
                    options.partialBaseline,
                    result
                );

                // important: remove the partial baseline after the first parse,
                // otherwise nested constructor calls, might use a wrong baseline in their
                // parse() invocations
                delete options.partialBaseline;
            }

            return result;
        },

        // Override to add support for the `partial` option:
        // When partial is set to true, the JSON will contain only the unsaved
        // attributes in addition to the ID attribute
        toJSON: function(options) {
            var attributes, result, id;

            options || (options = {});
            if(options.partial) {
                id = this.get(this.idAttribute || "id");
                attributes = this.attributes;

                // Calculate the partial JSON representation
                // and make sure the core attributes are included
                this.attributes = _.extend(
                    this.unsavedAttributes(),
                    _.pick(attributes, this.partialAttributesCore)
                );
                // Addtionally ensure the id attribute is included
                this.attributes[this.idAttribute || "id"] = id;
                result = BackboneBase.Model.prototype.toJSON.apply(this, arguments);

                // Restore attributes
                this.attributes = attributes;
            } else {
                result = BackboneBase.Model.prototype.toJSON.apply(this, arguments);
            }
            return result;
        },

        // Internal method that is called directly after attributes have been set from a server response
        _resetSyncedAttributes: function() {
            this._syncedAttributes = _.clone(this.attributes);
        }


    });

    _.extend(exports, Backbone);
    return Backbone;

}));
