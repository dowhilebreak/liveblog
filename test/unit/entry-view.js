var should = chai.should();

var entry = null;
var model_stub = null;

describe( 'View: EntryView', function() {

	var tracked_time = null;

	before( function(){
		tracked_time = Math.round( new Date().getTime() / 1000 );
		model_stub = new Backbone.Model({
			'id': 1,
			'type': 'new',
			'html': '<div>hello world at <span class="liveblog-meta-time"><a></a></span></div>'
		});
		entry = new liveblog.EntryView( { 'model': model_stub } );
	});

	describe( 'on render', function() {
		it( 'returns the view object', function() {
			entry.render().should.equal( entry );
		});

		it( 'produces the correct HTML', function() {
			entry.$el.data( 'timestamp', tracked_time );
			entry.render();
			entry.el.outerHTML.should.equal( '<div>hello world at <span class="liveblog-meta-time"><a>' + moment.unix( tracked_time ).from( moment.unix( tracked_time ) ) + '</a></span></div>' );
		});
	});

	describe( 'on update', function() {
		it( 'produces the correct HTML', function() {
			model_stub.set( { 'html': '<div>hola mundo a <span class="liveblog-meta-time"><a></a></span><ul class="liveblog-entry-actions"><li><button class="liveblog-entry-edit button-secondary">Edit</button><button class="liveblog-entry-delete button-secondary">Delete</button></li></ul></div>' } );
			entry.update();
			entry.$el[0].outerHTML.should.equal( '<div>hola mundo a <span class="liveblog-meta-time"><a>' + moment.unix( tracked_time ).from( moment.unix( tracked_time ) ) + '</a></span><ul class="liveblog-entry-actions"><li><button class="liveblog-entry-edit button-secondary">Edit</button><button class="liveblog-entry-delete button-secondary">Delete</button></li></ul></div>' );
		});
	});

	describe( 'on updateTime', function() {
		it( 'changes the formatted time', function() {
			var modified_tracked_time = tracked_time - 60;
			entry.$el.data( 'timestamp', modified_tracked_time );
			entry.updateTime();
			entry.$el[0].outerHTML.should.equal( '<div>hola mundo a <span class="liveblog-meta-time"><a>' + moment.unix( modified_tracked_time ).from( moment.unix( tracked_time ) ) + '</a></span><ul class="liveblog-entry-actions"><li><button class="liveblog-entry-edit button-secondary">Edit</button><button class="liveblog-entry-delete button-secondary">Delete</button></li></ul></div>' );
		});
	});

	describe( 'on setModelDomRelationship', function() {
		it( "sets the model's DOM reference accordingly", function() {
			entry.setModelDomRelationship();
			model_stub.$el.should.equal( entry.$el );
		});
	});

	describe( 'on formatTimestamp', function() {
		it( "returns the correctly formatted time", function() {
			/* reset tracked_time to be now */
			tracked_time = Math.round( new Date().getTime() / 1000 );
			entry.formatTimestamp( tracked_time ).should.equal( moment.unix( tracked_time ).from( moment.unix( tracked_time ) ) );
		});
	});

	/*
		editClick(), deleteClick(), deleteError() - these all need tested via the intergration tests since they rely on element placement/manipulation in the document.
	 */
});