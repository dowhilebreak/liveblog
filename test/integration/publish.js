// Currently requires liveblog plugin to be activated, and enabled on post

var utilities = require( './common/common' );
var wd = require( 'wd' );
var chai = require( 'chai' );
var chaiAsPromised = require( 'chai-as-promised' );

chai.use(chaiAsPromised);

var should = chai.should();
var asserters = wd.asserters;

describe( 'Publishing a liveblog update', function() {
	var browser;
	var id,
		klass,
		entry,
		random = String( Math.random() );

	context( "When I'm logged in as an admin", function() {
		before( function( done ) {
			browser = utilities.startAdminBrowser();
			done();
		});

		context( 'when I enter some text and press Publish', function() {

			before( function( done ) {
				browser.elementByCss( 'textarea.liveblog-form-entry' )
				.click()
				.type( random )
				.elementByCss( '.liveblog-form-entry-submit' )
				.click()
				.nodeify( done );
			});

			it( 'shows my comment', function() {
				return browser.elementByCss( '#liveblog-entries' ).text().should.eventually.include( random );
			});

			before( function( done ) {
				setTimeout( function() {
					browser.elementsByCss( '.liveblog-entry', function( err, elements ) {
						entry = elements[0];
						elements[0].getAttribute( 'id', function( err, _id ) {
							id = _id;
							elements[0].getAttribute( 'class', function( err, _klass ) {
								klass = _klass;
								done( err );
							});
						});
					});
				}, 2000 ); // need to wait as it doesn't appear immediately
			});

			it( 'highlights my comment', function() {
				klass.should.include( 'highlight' );
			});

			it( 'shows the time in a human readable form', function( done ) {
				entry.text( function( err, text ) {
					text.should.include( 'FEW SECONDS' );
					done( err );
				});
			});

			it( 'shows my name', function( done ) {
				entry.text( function( err, text ) {
					text.should.include( utilities.getAdminUser() );
					done( err );
				});
			});

			context( 'when I edit the entry', function() {
				before( function( done ) {
					browser.elementByCss( '#' + id + ' .liveblog-entry-edit' )
						.click()
						.elementByCss( '#' + id + ' textarea' )
						.type( random + 'bar' )
						.elementByCss( '#' + id + ' .liveblog-form-entry-submit' )
						.click()
						.nodeify( done );
				});

				// Wait for it to update
				before( function( done ) {
					setTimeout( done, 1000 );
				});

				it( 'shows the updated text', function( done ) {
					browser.elementByCss( '#liveblog-entries', function( err, element ) {
						element.text( function( err, text ){
							text.should.include( random + 'bar' );
							done( err );
						});
					});
				});
			});
		}); // end publish context

		context( 'when I delete an entry', function() {
			before( function( done ) {
				browser.elementByCss( '#' + id + ' .liveblog-entry-delete' )
					.click()
					.nodeify( done );
			});

			before( function( done ) {
				browser.acceptAlert( function( err ) {
					done( err );
				});
			});

			it( 'gets removed from the page', function() {
				return browser.waitForConditionInBrowser( "( jQuery( '#" + id + "' ).length === 0 )", 50 * 1000, 100 ).should.eventually.become( true );
			});
		});
	});
});
