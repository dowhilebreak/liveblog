/* global liveblog, liveblog_settings, _, confirm, jQuery, moment, momentLang, Backbone */
window.liveblog = window.liveblog || {};

( function( $ ) {
	Backbone.emulateHTTP = true;

	liveblog.EntryView = Backbone.View.extend({

		events: {
			'click .liveblog-entry-edit': 'editClick',
			'click .liveblog-entry-delete': 'deleteClick'
		},

		initialize: function() {
			_.bindAll( this, 'update', 'render', 'destroy', 'deleteClick', 'editClick' );
			this.model.on( 'destroy', this.destroy, this );
			this.model.on( 'change:html', this.update, this );
			this.model.on( 'updateTime', this.updateTime, this );
			this.model.on( 'updateDomRelationship', this.setModelDomRelationship, this );
		},

		render: function() {
			var $entry = $( this.model.get( 'html' ) );
			this.setElement( $entry );
			this.updateTime();

			return this;
		},

		update: function() {
			var $entry = $( this.model.get( 'html' ) );
			this.$el.replaceWith( $entry );
			this.setElement( $entry );
			this.updateTime();
		},

		destroy: function() {
			this.remove();
		},

		editClick: function() {
			var form = new liveblog.EditEntryView({
				model: this.model,
				entry: this.$el
			});
			form.render();
			this.$el.find( '.liveblog-entry-edit' ).hide();
			this.$el.find( '.liveblog-entry-actions .liveblog-entry-delete' ).hide();
		},

		deleteClick: function( event ) {
			event.preventDefault();
			if ( !confirm( liveblog_settings.delete_confirmation ) ) {
				return;
			}
			this.model.set( 'type', 'delete' );
			this.model.destroy({
				wait: true,
				error: this.deleteError
			});
		},

		deleteError: function( model, response ) {
			liveblog.fixedError.show( response );
		},

		updateTime: function() {
			var timestamp = this.$el.data( 'timestamp' ),
					human = this.formatTimestamp( timestamp );
				$( '.liveblog-meta-time a', this.$el ).text( human );
		},

		formatTimestamp: function( timestamp ) {
			return moment.unix( timestamp ).fromNow();
		},

		setModelDomRelationship: function() {
			this.model.$el = this.$el;
		}
	});

	liveblog.EntriesView = Backbone.View.extend({

		el: '#liveblog-container',

		initialize: function() {
			_.bindAll( this, 'flushQueueWhenOnTop' );
			this.attachEntries();

			liveblog.entries.on( 'add', this.addEntry, this );
			liveblog.queue.on( 'fetched', function() {
				liveblog.hide_spinner();
				// TODO: are 3rd parties dependent on this? Or can we fire it on the Backbone event bus?
				$( document.body ).trigger( 'post-load' );
			}, this);
			$( window ).scroll( _.throttle( this.flushQueueWhenOnTop, 250 ) );

			liveblog.queue.on( 'stoppedPolling', function() {
				liveblog.fixedError.show( liveblog_settings.stopped_polling_error_message, true );
			});

		},

		attachEntries: function() {
			var $entries = $( '.liveblog-entry' );
			_.each( $entries, function( entry ) {
				var $entry = $( entry ),
					id = $entry.attr( 'id' ).replace( 'liveblog-entry-', '' ),
					model = new liveblog.Entry({
						id: id,
						html: $entry.html()
					});

				new liveblog.EntryView({
					model: model,
					el: $entry
				});
				liveblog.entries.add( model, { silent: true } );
			}, this);
		},

		addEntry: function( entry ) {
			var animationDuration = ( liveblog.queue.length + 1 ) * 1000 * liveblog_settings.fade_out_duration,
				view = new liveblog.EntryView( { model: entry } ),
				$entry = view.render().$el;

			$entry.prependTo( liveblog.$entry_container )
				.addClass( 'highlight' )
				.animate( { backgroundColor: 'white' }, { duration: animationDuration } );
		},

		scrollToTop: function() {
			var new_postion = this.$el.offset().top - ( null !== jQuery( '#wpadminbar' ) ? jQuery( '#wpadminbar' ).outerHeight( true ) : 0 );
			jQuery( 'html, body' ).animate( { scrollTop: new_postion }, 1000, 'swing', function() { /* nothing yet */ } );
		},

		flushQueueWhenOnTop: function() {
			if ( this.isAtTheTop() ) {
				liveblog.queue.fetch();
			}
		},

		startHumanDiffTimer: function() {
			var tick = function(){
				liveblog.entries.each( function( entry ) {
					entry.trigger( 'updateTime' );
				});
			};
			tick();
			setInterval( tick, 60 * 1000 );
		},

		isAtTheTop: function() {
			return $( document ).scrollTop()  < this.$el.offset().top;
		}
	});

	liveblog.PreviewEntry = Backbone.Model.extend({

		url: liveblog_settings.endpoint_url + 'preview',

		sync: function( method, model, options ) {
			model.attributes[ liveblog_settings.nonce_key ] = liveblog_settings.nonce;
			options.data = $.param( model.attributes );

			return Backbone.sync.apply( this, [ method, model, options ] );
		}
	});

	liveblog.EntriesCollection = Backbone.Collection.extend({

		model: liveblog.Entry,

		initialize: function() {
			var queue = liveblog.queue;
			queue.on( 'fetched', function() {
				this.processQueue( 'passive' );
			}, this );
		},

		/**
		 * @param  string mode [ One of 'passive' or 'manual' - manual forces the queue to process regardless of the user's position on the page. ]
		 */
		processQueue: function( mode ) {
			if ( 'undefined' === typeof mode || null === mode ) {
				mode = 'passive';
			}

			/* New entries are automatically populated if the user is at the top of the page - otherwise we show the nag to not disturb their reading. */
			var queue = liveblog.queue;
			queue.inserted().each( function( entry ) {
				if ( 'manual' === mode || ( 'passive' === mode && liveblog.entriesContainer.isAtTheTop() ) ) {
					this.add( entry );
					queue.remove( entry );
				}
			}, this );

			/* On update we have a complicated use case...
			 * 	If the user is sitting at the top of the page, then we assume they are just waiting for new content and process the update.
			 * 	If the updated entry is below the viewport then we process it.
			 *	If the user is scrolled down the page and the updated entry is above the bottom of the viewport then we don't want to disturb them so we show the nag bar.
			 * 	If the main text of the entry has not changed then we process the update silently (no nag). This happens on the admin's screen after making the update.
			 */
			queue.updated().each( function( entry ) {
				var existingEntry = this.get( entry.id );
				/* TODO: Ideally, the model would receive the JSON data for the entry instead of the final HTML so we can do a straight comparison and not deal with jQuery. */
				var update_text = jQuery('.liveblog-entry-text', entry.get('html')).text();
				var current_text = jQuery('.liveblog-entry-text', existingEntry.get('html')).text();

				if ( existingEntry && ( 'manual' === mode || ( 'passive' === mode && ( liveblog.entriesContainer.isAtTheTop() || existingEntry.isViewBelowFold() ) ) || update_text === current_text ) ) {
					existingEntry.set( 'html', entry.get( 'html' ) );
					existingEntry.trigger( 'change:html' );
					queue.remove( entry );
				}
			}, this );

			/* If an editor wants to delete something we assume it needs to dissapear immediately and that the nag bar shouldn't be invoked. */
			queue.deleted().each( function( entry ) {
				var model = this.get( entry.id );
				if ( model ) {
					model.trigger( 'destroy' );
					this.remove( model );
				}
				queue.remove( entry );
			}, this );
		}
	});

	liveblog.Entry = Backbone.Model.extend({

		url: liveblog_settings.endpoint_url + 'crud',

		sync: function( method, model, options ) {
		  	var methodMap = {
				'create': 'insert',
				'update': 'update',
				'delete': 'delete'
			};
			var	data = _.extend( model.attributes, {
				'crud_action': methodMap[ method ],
				'post_id': liveblog_settings.post_id,
				'entry_id': model.id
			} );

			if ( 'delete' === method ) {
				delete data.html;
			}

			data[ liveblog_settings.nonce_key ] = liveblog_settings.nonce;
			options.data = $.param( data );

			return Backbone.sync.apply( this, [ method, model, options ] );
		},

		parse: function( response ) {
			var parsed;

			if ( response.entries ) {
				parsed = _.extend( this.attributes, response.entries[0] );
			} else {
				parsed = response;
			}

			return parsed;
		},

		setDomRelationship: function( element ) {
			this.$el = element;
		},

		isViewInViewport: function() {
			this.trigger( 'updateDomRelationship' );
			var viewport_height = jQuery( window ).height();
			var document_scroll = jQuery( document ).scrollTop();
			var el_offset = this.$el.offset();

			if ( document_scroll < el_offset.top && document_scroll + viewport_height > el_offset.top ) {
				return true;
			}

			return false;
		},

		isViewBelowFold: function() {
			this.trigger( 'updateDomRelationship' );
			var viewport_height = jQuery( window ).height();
			var document_scroll = jQuery( document ).scrollTop();
			var el_offset = this.$el.offset();

			if ( document_scroll + viewport_height < el_offset.top ) {
				return true;
			}

			return false;
		}
	});

	liveblog.EntriesQueue = Backbone.Collection.extend({

		model: liveblog.Entry,
		consecutiveFailuresCount: 0,

		initialize: function() {
			_.bindAll( this, 'fetch', 'onFetchSuccess', 'onFetchError', 'resetTimer' );

			this.setInitialTimestamps();
			this.resetTimer();
			this.on( 'fetched', function() {
				this.consecutiveFailuresCount = 0;
				this.undelayTimer();
				this.resetTimer();
			}, this );
		},

		url: function() {
			var url        = liveblog_settings.endpoint_url,
				from       = Number( liveblog.latest_entry_timestamp ) + 1,
				local_diff = this.currentTimestamp() - liveblog.latest_response_local_timestamp,
				to         = liveblog.latest_response_server_timestamp + local_diff;

			url += from + '/' + to + '/';

			return url;
		},

		parse: function( response, options ) {
			var i,
				entry,
				entryType,
				isThere,
				xhr = options.xhr || options,
				response_timestamp = ( Date.parse( xhr.getResponseHeader( 'Date' ) )  / 1000 );

			/* In the event that a response does not supply a date (specifically IE returning a 304) we default to the previous known timestamp */
			if ( _.isNaN( response_timestamp ) ) {
				response_timestamp = liveblog.latest_response_server_timestamp;
			}

			liveblog.latest_response_server_timestamp = Math.floor( response_timestamp );
			liveblog.latest_response_local_timestamp  = this.currentTimestamp();

			if ( response && response.latest_timestamp ) {
				liveblog.latest_entry_timestamp = response.latest_timestamp;
			}

			for ( i = 0; i < response.entries.length; i++ )
			{
				entry = response.entries[ i ];
				entryType = entry.type;
				isThere = liveblog.entries.get( entry );

				if ( 'new' === entryType && isThere )
				{
					response.entries.splice( i, 1 );
				}
			}

			return response.entries;
		},

		updated: function() {
			var filtered = this.filter( function( entry ) {
				return 'update' === entry.get( 'type' );
			} );

			return new Backbone.Collection( filtered );
		},

		modified: function() {
			var filtered = this.filter( function( entry ) {
				return 'update' === entry.get( 'type' ) || 'new' === entry.get( 'type' );
			} );

			return new Backbone.Collection( filtered );
		},

		deleted: function() {
			var filtered = this.filter( function( entry ) {
				return 'delete' === entry.get( 'type' );
			} );

			return new Backbone.Collection( filtered );
		},

		inserted: function() {
			var filtered = this.filter( function( entry ) {
				return 'new' === entry.get( 'type' );
			} );

			return new Backbone.Collection( filtered );
		},

		flush: function() {
			if ( this.isEmpty() ) {
				return;
			}

			this.reset( [] );
		},

		fetch: function( opts ) {
			var options = opts || {};

			liveblog.show_spinner();
			options = _.defaults( options, {
				merge: true,
				update: true,
				remove: false,
				add: true,
				error: this.onFetchError,
				success: this.onFetchSuccess
			} );
			liveblog.EntriesQueue.__super__.fetch.call( this, options );
		},

		onFetchSuccess: function() {
			// Trigger our own event, since Backbone 0.9.2 and Backbone 1.0.0 sync and reset behaviour is so different
			this.trigger( 'fetched' );
		},

		onFetchError: function() {
			liveblog.hide_spinner();

			// Have a max number of checks, which causes the auto-update to shut off or slow down the auto-update
			this.consecutiveFailuresCount++;

			if ( 0 === this.consecutiveFailuresCount % liveblog_settings.delay_threshold ) {
				this.delayTimer();
			}

			if ( this.consecutiveFailuresCount >= liveblog_settings.max_consecutive_retries ) {
				this.killTimer();
				this.trigger( 'stoppedPolling' );
				return;
			}

			liveblog.queue.resetTimer();
		},

		setInitialTimestamps: function() {
			var now = this.currentTimestamp();
			liveblog.latest_entry_timestamp           = liveblog_settings.latest_entry_timestamp || 0;
			liveblog.latest_response_local_timestamp  = now;
			liveblog.latest_response_server_timestamp = now;
		},

		killTimer:  function() {
			clearTimeout( liveblog.refresh_timeout );
		},

		resetTimer: function() {
			this.killTimer();
			liveblog.refresh_timeout = setTimeout( this.fetch, ( liveblog_settings.refresh_interval * 1000 ) );
		},

		undelayTimer: function() {
			if ( liveblog_settings.original_refresh_interval ) {
				liveblog_settings.refresh_interval = liveblog_settings.original_refresh_interval;
			}
		},

		delayTimer: function() {
			if ( !liveblog_settings.original_refresh_interval ) {
				liveblog_settings.original_refresh_interval = liveblog_settings.refresh_interval;
			}

			liveblog_settings.refresh_interval *= liveblog_settings.delay_multiplier;
		},

		currentTimestamp: function() {
			return Math.floor( new Date().getTime() / 1000 );
		}
	});

	liveblog.FixedNagView = Backbone.View.extend({

		el: '#liveblog-fixed-nag',
		events: {
			'click a': 'flush'
		},

		initialize: function() {
			liveblog.queue.on( 'fetched', this.render, this );
		},

		render: function() {
			var entries_in_queue = liveblog.queue.modified().length;

			/* By this point any entries left in the queue require the nag bar. */
			if ( entries_in_queue ) {
				this.show();
				this.updateNumber( entries_in_queue );
			} else {
				this.hide();
			}
		},

		show: function() {
			this.$el.show();
			this._moveBelowAdminBar();
		},

		hide: function() {
			this.$el.hide();
		},

		flush: function( e ) {
			e.preventDefault();
			var has_new_entries = ( liveblog.queue.inserted().length > 0 );
			liveblog.entries.processQueue( 'manual' );
			liveblog.queue.flush();
			if ( has_new_entries ) {
				liveblog.entriesContainer.scrollToTop();
			}
			this.render();
		},

		updateNumber: function( number ) {
			var template = ( number === 1 ? liveblog_settings.new_update : liveblog_settings.new_updates ),
				html     = template.replace( '{number}', '<span class="num">' + number + '</span>' );

			this.$( 'a' ).html( html );
		},

		_moveBelowAdminBar: function() {
			var $adminbar = $( '#wpadminbar' );
			if ( $adminbar.length ) {
				this.$el.css( 'top', $adminbar.height() );
			}
		}
	});

	liveblog.TitleBarCountView = Backbone.View.extend({

		initialize: function() {
			liveblog.queue.on( 'fetched', this.render, this );
			this.originalTitle = document.title;
		},

		render: function() {
			var entries_in_queue = liveblog.queue.modified().length,
				count_string     = entries_in_queue ? '(' + entries_in_queue + ') ' : '';

			document.title = count_string + this.originalTitle;
		}
	});

	liveblog.FixedErrorView = Backbone.View.extend({

		el: '#liveblog-fixed-error',

		show: function( error, sticky ) {
			var message;
			if ( 'object' === typeof error ) {
				message = this._getErrorFromResponse( error );
		  	} else {
				message = error;
			}

			this.$el.html( message );
			this._moveBelowAdminBar();
			this.$el.show();

		  	if ( !sticky ) {
				this.$el.delay( 5000 ).fadeOut();
			}
		},

		_getErrorFromResponse: function( response ) {
			var message;
			if ( response.status && response.status > 200 ) {
				message = liveblog_settings.error_message_template.replace( '{error-code}', response.status ).replace( '{error-message}', response.statusText );
			} else {
				message = liveblog_settings.short_error_message_template.replace( '{error-message}', response.status );
			}
			return message;
		},

		//TODO: factor out
		_moveBelowAdminBar: function() {
			var $adminbar = $( '#wpadminbar' );
			if ( $adminbar.length ) {
				this.$el.css( 'top', $adminbar.height() );
			}
		}
	});

	// Global event bus
	_.extend(Backbone, Backbone.Events);

	liveblog.init = function() {
		liveblog.$entry_container = $( '#liveblog-entries'        );
		liveblog.$spinner         = $( '#liveblog-update-spinner' );

		liveblog.queue            = new liveblog.EntriesQueue();
		liveblog.entries          = new liveblog.EntriesCollection();
		liveblog.fixedNag         = new liveblog.FixedNagView();
		liveblog.fixedError       = new liveblog.FixedErrorView();
		liveblog.entriesContainer = new liveblog.EntriesView();
		liveblog.titleBarCount    = new liveblog.TitleBarCountView();
		Backbone.trigger( 'after-views-init' );

		liveblog.init_moment_js();

		liveblog.cast_settings_numbers();

		liveblog.entriesContainer.startHumanDiffTimer();
		Backbone.trigger( 'after-init' );
	};

	liveblog.init_moment_js = function() {
		momentLang.relativeTime = _.extend( moment().lang().relativeTime, momentLang.relativeTime );
		moment.lang( momentLang.locale, momentLang );
	};


	// wp_localize_scripts makes all integers into strings, and in JS
	// we need them to be real integers, so that we can use them in
	// arithmetic operations
	liveblog.cast_settings_numbers = function() {
		liveblog_settings.refresh_interval        = parseInt( liveblog_settings.refresh_interval, 10 );
		liveblog_settings.max_consecutive_retries = parseInt( liveblog_settings.max_consecutive_retries, 10 );
		liveblog_settings.delay_threshold         = parseInt( liveblog_settings.delay_threshold, 10 );
		liveblog_settings.delay_multiplier        = parseFloat( liveblog_settings.delay_multiplier, 10 );
		liveblog_settings.latest_entry_timestamp  = parseInt( liveblog_settings.latest_entry_timestamp, 10 );
		liveblog_settings.fade_out_duration       = parseInt( liveblog_settings.fade_out_duration, 10 );
	};

	liveblog.show_spinner = function() {
		liveblog.$spinner.spin( 'small' );
	};

	liveblog.hide_spinner = function() {
		liveblog.$spinner.spin( false );
	};

	// If we're using Backbone 0.9.2, we need to patch collection add to support
	// merging of models.
	if ( '0.9.2' === Backbone.VERSION ) {
		Backbone.Collection.prototype.add = function( models, options ) {
			var i,
				index,
				length,
				model,
				cid,
				id,
				cids = {},
				ids = {},
				dups = [];

			options || ( options = {} );
			models = _.isArray( models ) ? models.slice() : [ models ];

			// Begin by turning bare objects into model references, and preventing
			// invalid models or duplicate models from being added.
			for ( i = 0, length = models.length; i < length; i++ ) {
				if ( !( model = models[ i ] = this._prepareModel( models[ i ], options ) ) ) {
					throw new Error( "Can't add an invalid model to a collection" );
				}
				cid = model.cid;
				id = model.id;
				if ( cids[ cid ] || this._byCid[ cid ] || ( ( id != null ) && ( ids[ id ] || this._byId[ id ] ) ) ) {
					dups.push( i );
					continue;
				}
				cids[ cid ] = ids[ id ] = model;
			}

			i = dups.length;
			while ( i-- ) {
				dups[ i ] = models.splice( dups[ i ], 1 )[ 0 ];
			}

			// Listen to added models' events, and index models for lookup by
			// `id` and by `cid`.
			for ( i = 0, length = models.length; i < length; i++ ) {
				( model = models[ i ] ).on( 'all', this._onModelEvent, this );
				this._byCid[ model.cid ] = model;
				if ( model.id != null ) {
					this._byId[ model.id ] = model;
				}
			}

			// Insert models into the collection, re-sorting if needed, and triggering
			// `add` events unless silenced.
			this.length += length;
			index = options.at != null ? options.at : this.models.length;
			Array.prototype.splice.apply( this.models, [ index, 0 ].concat( models ) );
			if ( this.comparator ) {
				this.sort( { silent: true } );
			}
			if ( options.silent ) {
				return this;
			}
			for ( i = 0, length = this.models.length; i < length; i++ ) {
				if ( !cids[ ( model = this.models[ i ] ).cid ] ) {
					continue;
				}
				options.index = i;
				model.trigger( 'add', model, this, options );
			}

			if ( options.merge ) {
				for ( i = 0, length = dups.length; i < length; i++ ) {
					model = this._byId[ dups[ i ].id ] || this._byCid[ dups[ i ].cid ];
					model.set( dups[i], options );
				}
			}
			return this;
		}
	}

	// Initialize everything!
	if ( 'archive' !== liveblog_settings.state ) {
		$( document ).ready( liveblog.init );
	}

} )( jQuery );
