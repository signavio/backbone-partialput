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

}(this, function(root, exports, _, Backbone) {

    var BackboneOriginal = {
        set: Backbone.Model.prototype.set,
        sync: Backbone.Model.prototype.sync
    };

    Backbone.Model = Backbone.Model.extend({

        set: function(key, val, options) {
            var attrs, result;
            if(key === null) return this;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if(typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options || (options = {});

            // Delegate to Backbone's original set.
            result = BackboneOriginal.set.apply(this, arguments);

            if(!options.silent) {
                for(key in attrs) {
                    val = attrs[key];

                }
            }

            return result;
        },


        // Override #sync to make sure the server response is always filtered to contain only
        // attributes that have been changed on the server
        sync: function(method, obj, options) {
            var attrsSnapshot = _.clone(this.attributes);

            if(options.filterRespn)
            options = _.wrap(options.success, function(originalSuccess, data, textStatus, jqXHR) {
                var serverAttrs = model.parse(resp, options);
            });
            var result = BackboneOriginal.sync.apply(this, arguments);

            return result;
        },

        save: function(key, val, options) {
            var attributes = this.attributes;
            this.attributes = this.unsavedAttributes();

            options = _.wrap(options.success, function(originalSuccess, data, textStatus, jqXHR) {
                var respAttrs = model.parse(resp, options);
            });
            var result = BackboneOriginal.save.apply(this, arguments);

            this.attributes = attributes;
            return result;
        },

        _resetUnsavedAttributes: function() {
            this._syncedAttributes = _.clone(this.attributes);
            this._unsavedAttributes = {};
        },

        // Symmetric to Backbone's `model.changedAttributes()`,
        // except that this returns a hash of the model's attributes that
        // have changed since the last sync, or `false` if there are none.
        // Like `changedAttributes`, an external attributes hash can be
        // passed in, returning the attributes in that hash which differ
        // from the model.
        unsavedAttributes: function(attrs) {
            if (!attrs) return _.isEmpty(this._unsavedChanges) ? false : _.clone(this._unsavedChanges);
            var val, changed = false, old = this._unsavedChanges;
            for (var attr in attrs) {
                if (_.isEqual(old[attr], (val = attrs[attr]))) continue;
                (changed || (changed = {}))[attr] = val;
            }
            return changed;
        },

    });

    _.extend(exports, Backbone);
    return Backbone;

}));