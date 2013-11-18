// Currently requires liveblog plugin to be activated, and enabled on post

var utilities = require( './common/common' );
var wd = require( 'wd' );
var chai = require( 'chai' );
var chaiAsPromised = require( 'chai-as-promised' );

chai.use(chaiAsPromised);

var should = chai.should();
var asserters = wd.asserters;
var sending_browser,
	receiving_browser;

var scroll_page_script = "jQuery( window ).scrollTop( jQuery( '#liveblog-container' ).offset().top + ( jQuery( '#liveblog-container' ).height() / 2 ) );";

describe( 'Actions between browsers', function() {
	var id,
		klass,
		entry,
		random = String( Math.random() );

	before( function( done ) {
		sending_browser = utilities.startAdminBrowser();
		done();
	});

	before( function( done ) {
		receiving_browser = utilities.startAnonymousBrowser();
		done();
	});

	context( '(sending browser) when I enter some text and press Publish', function() {

		before( function( done ) {
			sending_browser.elementByCss( 'textarea.liveblog-form-entry' )
				.click()
				.type( random )
				.elementByCss( '.liveblog-form-entry-submit' )
				.click()
				.nodeify( done );
		});

		before(function( done ) {
			receiving_browser.eval( scroll_page_script );
			done();
		});

		it( 'shows a nag view in the receiving browser', function( done ) {
			receiving_browser.waitForElementByCss( '#liveblog-fixed-nag', asserters.isVisible, 50 * 1000, 100, function( err, element ) {
				done( err );
			});
		});

		context( 'when I click the nag bar in the receving browser', function( done ) {
			before( function() {
				receiving_browser.elementByCssSelector( '#liveblog-fixed-nag a' )
					.click()
					.nodeify( done );
			});

			it( 'shows my comment', function( done ) {
				receiving_browser.elementByCss( '#liveblog-entries', function( err, element ) {
					element.text( function( err, text ) {
						text.should.include( random );
						return done( err );
					});
				});
			});
		});
	});

	context( 'when I edit the entry in the sending browser', function() {

		before( function( done ) {
			sending_browser.eval( "jQuery( '#liveblog-entries > .liveblog-entry' ).first().attr('id');", function( err, value ) {
				id = value;

				receiving_browser.eval( scroll_page_script, function( err, value ) {
					sending_browser.elementByCss( '#' + id + ' .liveblog-entry-edit' )
						.click()
						.elementByCss( '#' + id + ' textarea' )
						.type( random + 'bar' )
						.elementByCss( '#' + id + ' .liveblog-form-entry-submit' )
						.click()
						.nodeify( done );
				});
			});
		});

		it( 'shows a nag view in the receiving browser', function( done ) {
			receiving_browser.waitForElementByCss( '#liveblog-fixed-nag', asserters.isVisible, 50 * 1000, 100, function( err, element ) {
				done( err );
			});
		});

		context( 'when I click the nag bar in the receving browser', function( done ) {

			before( function() {
				receiving_browser.elementByCssSelector( '#liveblog-fixed-nag a' )
					.click()
					.nodeify( done );
			});

			it( 'shows the updated text', function( done ) {
				receiving_browser.elementByCss( '#liveblog-entries', function( err, element ) {
					element.text( function( err, text ) {
						text.should.include( random + 'bar' );
						done( err );
					});
				});
			});
		});
	});


	context( 'when I delete the entry in the sending browser', function() {

		before(function( done ) {
			sending_browser.elementByCss( '#' + id + ' .liveblog-entry-delete' )
				.click()
				.nodeify( done );
		});

		before(function( done ) {
			sending_browser.acceptAlert( function( err ) {
				done( err );
			});
		});

		it( 'gets removed from the page', function() {
			return receiving_browser.waitForConditionInBrowser( "( jQuery( '#" + id + "' ).length === 0 )", 50 * 1000, 100 ).should.become( true );
		});
	});
});
