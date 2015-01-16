define(function(require) {
    "use strict";


    var _ = require("underscore"),
        Backbone = require("backbone-partialput");


    var A = Backbone.Model.extend({
        url: function() { return "a/" + this.id }
    });

    var a1Json = {
        "id": 1,
        "title": "a1",
        "description": "this is a1",
        "author": "me"
    };

    describe("Model", function() {

        var server;

        beforeEach(function() {
            server = sinon.fakeServer.create();
        });

        afterEach(function() {
            server.restore();
        });

        describe("#unsavedAttributes", function() {

            it("should return all attributes for a new model", function() {
                var a = new A({
                    title: "new_a",
                    description: "new_desc"
                });
                var attrs = a.unsavedAttributes();

                expect(attrs).to.have.property("title", "new_a");
                expect(attrs).to.have.property("description", "new_desc");
            });

            it("should return only attributes that have been changed since the last server sync", function() {
                var a1 = new A({id: 1});
                a1.fetch();

                server.requests[0].respond(200, { "Content-Type": "application/json" },
                    JSON.stringify(a1Json)
                );

                var changedAttrs = {
                    title: "a1_changed",
                    description: "changed_description"
                };
                a1.set(changedAttrs);
                expect(a1.unsavedAttributes()).to.deep.equal(changedAttrs);

                a1.set("title", "a1");
                expect(a1.unsavedAttributes()).to.deep.equal({ description: "changed_description" });
            });

            it("should return only those attributes that have been changed since the last, still running save request was started", function() {
                var a = new A({
                    title: "new_a",
                    description: "new_desc"
                });
                a.save();

                var attrs = a.unsavedAttributes();
                expect(attrs).to.be.empty;

                a.set("title", "new_a_changed");
                attrs = a.unsavedAttributes();
                expect(attrs).to.deep.equal({ title: "new_a_changed" });
            })

        });

        describe("#save", function() {

            it("should do a partial PUT sending only the unsaved attributes and the ID", function() {
                var a1 = new A({id: 1});
                a1.fetch();

                server.requests[0].respond(200, { "Content-Type": "application/json" },
                    JSON.stringify(a1Json)
                );
                var newAttrs = {
                    title: "a1_changed",
                    newAttr: "new_attr"
                };
                a1.set(newAttrs);

                a1.save();

                var json = JSON.parse(server.requests[1].requestBody);
                expect(json).to.deep.equal(_.extend({id: 1}, newAttrs));
            });

            it("should set only those response attributes that have a value different to the one at the moment the request was sent", function() {
                var a1 = new A({
                    id: 1,
                    title: "a1",
                    description: "this is a1"
                });

                a1.save();

                a1.set({
                    title: "a1_changed",
                    description: "changed by me"
                });

                server.requests[0].respond(200, { "Content-Type": "application/json" },
                    JSON.stringify({
                        id: 1,
                        title: "a1",
                        description: "changed by someone else",
                        author: "you"
                    })
                );

                expect(a1.get("title")).to.equal("a1_changed");                       // unchanged dirty value is preserved
                expect(a1.get("description")).to.equal("changed by someone else");    // dirty value is overwritten
                expect(a1.get("author")).to.equal("you");                             // new attribute is added
            });

            it("should do a partial PUT sending only the unsaved attributes and those that are specified in `partialAttributesCore`", function() {
                var a1 = new A({id: 1});
                a1.partialAttributesCore = [ "id", "description" ];
                a1.fetch();

                server.requests[0].respond(200, { "Content-Type": "application/json" },
                    JSON.stringify(a1Json)
                );
                var newAttrs = {
                    title: "a1_changed",
                    newAttr: "new_attr"
                };
                a1.set(newAttrs);

                a1.save();

                var json = JSON.parse(server.requests[1].requestBody);
                expect(json).to.deep.equal(_.extend({
                    id: 1,
                    description: "this is a1"
                }, newAttrs));
            });

            it("should not dispatch a request if there are no unsaved attributes", function() {
                var a1 = new A({id: 1});
                a1.fetch();

                server.requests[0].respond(200, { "Content-Type": "application/json" },
                    JSON.stringify(a1Json)
                );

                a1.set("title", "a1"); // no change
                a1.save();

                expect(server.requests).to.have.length(1); // no additional request has been dispatched
            });

            it("should not interfere with POST requests", function() {
                var a = new A();

                a.save();

                expect(server.requests).to.have.length(1);
                expect(server.requests[0].method).to.equal("POST");
            });

            it("should restore the original unsaved attributes when save fails", function() {
                var a1 = new A({id: 1});
                a1.fetch();

                server.requests[0].respond(200, { "Content-Type": "application/json" },
                    JSON.stringify(a1Json)
                );
                var newAttrs = {
                    title: "a1_changed",
                    newAttr: "new_attr"
                };
                a1.set(newAttrs);

                expect(a1.unsavedAttributes()).to.deep.equal(newAttrs);
                a1.save();
                expect(a1.unsavedAttributes()).to.be.empty;

                server.requests[1].respond(500, { "Content-Type": "application/json" },
                    JSON.stringify({ message: "Something went wrong" })
                );

                expect(a1.unsavedAttributes()).to.deep.equal(newAttrs);
            });

        });

       
        describe("#set", function() {


        // Potential extension 
        //    it("should trigger 'conflict' and 'conflict:attr' if an attribute change coming from the server overwrites a dirty attribute value", function(done) {
        //        var a1 = new A({
        //            id: 1,
        //            title: "some_title",
        //            description: "something",
        //            author: "me"
        //        });
        //        a1.fetch();
//
        //        var conflictHandler = sinon.spy(),
        //            titleConflictHandler = sinon.spy(),
        //            descriptionConflictHandler = sinon.spy(),
        //            authorConflictHandler = sinon.spy();
        //        a1.on("conflict", conflictHandler);
        //        a1.on("conflict:title", titleConflictHandler);
        //        a1.on("conflict:description", descriptionConflictHandler);
        //        a1.on("conflict:author", authorConflictHandler);
//
        //        a1.once("sync", function() {
        //            expect(conflictHandler).to.have.been.calledOnce;
        //            expect(titleConflictHandler).to.have.been.calledOnce;
        //            expect(descriptionConflictHandler).to.have.been.calledOnce;
        //            expect(authorConflictHandler).to.have.not.been.called;
        //            done();
        //        });
        //    });

        });

    });

});
