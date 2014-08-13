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
        for(key in newAttrs) {
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
            attrs = attrs || this.attributes;
            if(!this._syncedAttributes) return attrs;

            return getChangedAttrs(this._syncedAttributes, attrs);
        },

        // Override #save to make sure that only the partial JSON representation is submitted
        // and that the server response to POST and PUT requests is always parsed to contain
        // only attributes that have been changed on the server
        save: function(key, val, options) {
            var model = this;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if(key == null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options || (options = {});

            if(options.partial === void 0) options.partial = true;
            if(options.partial) options.partialBaseline = _.clone(this.attributes);

            // This callback will be executed after the attributes from the response
            // have been set to the model, before `sync` is triggered
            options.success = function(resp) {
                model._resetSyncedAttributes();
            };

            var result = BackboneBase.Model.prototype.save.call(this, attrs, options);

            return result;
        },

        // Override #fetch to set the `partial` flag in the options
        fetch: function(options) {
            var model = this;

            options || (options = {});
            if(options.partial === void 0) options.partial = !options.reset;

            // This callback will be executed after the attributes from the response
            // have been set to the model, before `sync` is triggered
            options.success = function(resp) {
                model._resetSyncedAttributes();
            };

            return BackboneBase.Model.prototype.fetch.call(this, options);
        },

        // If a snapshot of the attributes hash is passed in option `partialBaseline`,
        // this will return only those attributes from the parsed response, which have
        // changed in comparison to the snapshop baseline
        parse: function(resp, options) {
            var result = BackboneBase.Model.prototype.parse.apply(this, arguments);

            options || (options = {});
            if(options.partial && options.partialBaseline) {
                return getChangedAttrs(
                    options.partialBaseline,
                    result
                );
            } else {
                return result;
            }
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