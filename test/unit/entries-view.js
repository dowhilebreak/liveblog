var should = chai.should();

var entries = null;
var model_stub = null;

describe( 'View: EntriesView', function() {

	var tracked_time = null;

	before( function(){
		tracked_time = Math.round( new Date().getTime() / 1000 );
		model_stub = new Backbone.Model({
			'id': 1,
			'type': 'new',
			'html': '<div>hello world at <span class="liveblog-meta-time"><a></a></span></div>'
		});
		jQuery( '<div data-timestamp="1385004616" class="liveblog byuser comment-author-admin bypostauthor even thread-even depth-1 liveblog-entry" id="liveblog-entry-619">' +
					'<header class="liveblog-meta">' +
						'<span class="liveblog-author-avatar"><img width="30" height="30" class="avatar avatar-30 photo" src="#" alt=""></span>' +
						'<span class="liveblog-author-name">admin</span>' +
						'<span class="liveblog-meta-time"><a href="#liveblog-entry-619">a day ago</a></span>' +
					'</header>' +
					'<div data-original-content="Suspendisse tempus ultrices nisi" class="liveblog-entry-text">' +
						'<p>Suspendisse tempus ultrices nisi</p>' +
					'</div>' +
				'</div>' ).prependTo( 'body' );
		liveblog.$entry_container = jQuery( '<div id="liveblog-entries"></div>' );
	    liveblog.queue = new liveblog.EntriesQueue( model_stub );
	    liveblog.entries = new liveblog.EntriesCollection;
	    entries = new liveblog.EntriesView();
	});

	describe( 'on init', function() {
		it( 'triggers attachEntries() and adds the entries on the page to liveblog.entries', function() {
			chai.expect( liveblog.entries.get( 619 ) ).not.be.undefined;
		});
	});

	describe( 'on render', function() {
		it( 'returns the view object', function() {
			entries.render().should.equal( entries );
		});
	});

	describe( 'on addEntry', function() {
		it( 'adds the correct rendered output to the $entry_container', function() {
			entries.addEntry( model_stub );
			liveblog.$entry_container.html().should.contain( '<div class="highlight">hello world at <span class="liveblog-meta-time"><a>' );
		});
	});

	describe( 'on attachEntries', function() {
		before( function() {
			jQuery( '<div data-timestamp="1385004700" class="liveblog byuser comment-author-admin bypostauthor even thread-even depth-1 liveblog-entry" id="liveblog-entry-620">' +
					'<header class="liveblog-meta">' +
						'<span class="liveblog-author-avatar"><img width="30" height="30" class="avatar avatar-30 photo" src="#" alt=""></span>' +
						'<span class="liveblog-author-name">admin</span>' +
						'<span class="liveblog-meta-time"><a href="#liveblog-entry-620">a day ago</a></span>' +
					'</header>' +
					'<div data-original-content="Ut eu diam sed velit commodo" class="liveblog-entry-text">' +
						'<p>Ut eu diam sed velit commodo</p>' +
					'</div>' +
				'</div>' ).prependTo( 'body' );
		});

		it( 'finds any new entries on the page and adds them to liveblog.entries', function() {
			entries.attachEntries();
			chai.expect( liveblog.entries.get( 620 ) ).not.be.undefined;
		});
	});

	/*
		isAtTheTop(), scrollToTop(), flushQueueWhenOnTop() - these all need tested via the intergration tests since they rely on element placement/manipulation in the document.
	 */
});