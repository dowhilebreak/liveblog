// Currently requires liveblog plugin to be activated, and enabled on post

var utilities = require( './common/common' );
var should = require( 'chai' ).should();

describe( 'Previewing an entry', function() {
	var browser;

	before( function( done ) {
		browser = utilities.startAdminBrowser();
		done();
	});

	context( 'when I enter some text and press Preview', function() {
		var id,
			klass,
			entry,
			random = String( Math.random() ),
			html = random;

		before( function( done ) {
			browser.elementByCss( 'textarea.liveblog-form-entry' )
				.click()
				.type( random )
				.elementByCss( '.preview a' )
				.click()
				.nodeify( done );
		});

		it( 'shows my comment', function() {
			return browser.elementByCss( '.liveblog-form .liveblog-preview' ).text( function( err, txt ) {
				txt.should.equal( random );
			});
		});
	});
});
