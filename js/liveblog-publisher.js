/* global liveblog, liveblog_settings, liveblog_publisher_settings, _, jQuery, Backbone */
( function( $ ) {
	if ( typeof( liveblog ) === 'undefined' ) {
		return;
	}

	_.templateSettings = {
		interpolate : /\{\{(.+?)\}\}/g
	};

	liveblog.InsertEntryView = Backbone.View.extend({

		tagName: 'div',
		className: 'liveblog-form',
		template: _.template( $( '#liveblog-form-template' ).html() ),
		entry_tab_label: liveblog_publisher_settings.new_entry_tab_label,
		submit_label: liveblog_publisher_settings.new_entry_submit_label,
		events: {
			'click .cancel': 'cancel',
			'keydown .liveblog-form-entry': 'entry_keyhandler',
			'click .liveblog-form-entry-submit': 'submit',
			'click li.entry a': 'tab_entry',
			'click li.preview a': 'tab_preview'
		},

		render: function() {
			this.render_template();
			this.$( '.cancel' ).hide();
			this.$( '.liveblog-entry-delete' ).hide();
			$( '#liveblog-messages' ).after( this.$el );
		},

		render_template: function() {
			this.$el.html( this.template({
				content: this.get_content_for_form(),
				entry_tab_label: this.entry_tab_label,
				submit_label: this.submit_label
			}) );
			this.install_shortcuts_to_elements();
			this.preview = new liveblog.PreviewView({
				form: this,
				el: this.$( '.liveblog-preview' )
			});
		},

		install_shortcuts_to_elements: function() {
			this.$textarea      = this.$( '.liveblog-form-entry' );
			this.$submit_button = this.$( '.liveblog-form-entry-submit' );
			this.$spinner       = this.$( '.liveblog-submit-spinner' );
		},

		get_content_for_form: function() {
			return '';
		},

		submit: function( e ) {
			e.preventDefault();
			var new_entry_content = this.$textarea.val();

			if ( !new_entry_content ) {
				return;
			}

			this.disable();
			this.show_spinner();

			this.model = new liveblog.Entry();
			this.model.on( 'sync', this.success, this );
			this.model.on( 'error', this.error, this );

			this.model.save({
				content: new_entry_content
			});

		},

		entry_keyhandler: function( e ) {
			var cmd_ctrl_key = ( e.metaKey && !e.ctrlKey ) || e.ctrlKey;

			// cmd/ctrl + enter
			if( cmd_ctrl_key && ( e.keyCode === 10 || e.keyCode === 13 ) ) {
				e.preventDefault();
				this.$submit_button.click();
				return false;
			}

			// Escape Key
			if( 27 === e.keyCode  ) {
				e.preventDefault();
				this.$( '.cancel:visible' ).click();
				return false;
			}
		},

		cancel: function( e ) {
			e.preventDefault();
			this.$entry_text.show();
			this.$entry.find( '.liveblog-entry-edit' ).show();
			this.$entry.find( '.liveblog-entry-actions .liveblog-entry-delete' ).show();
			this.remove();
		},

		tab_entry: function( e ) {
			e.preventDefault();
			this.switch_to_entry();
		},

		tab_preview: function( e ) {
			e.preventDefault();
			this.switch_to_preview();
			this.preview.render( this.$textarea.val() );
		},

		disable: function() {
			this.$submit_button.attr( 'disabled', 'disabled' );
			this.$textarea.attr( 'disabled', 'disabled' );
		},

		enable: function() {
			this.$submit_button.attr( 'disabled', null);
			this.$textarea.attr( 'disabled', null);
		},

		show_spinner: function() {
			this.$spinner.spin('small');
		},

		hide_spinner: function() {
			this.$spinner.spin( false );
		},

		success: function() {
			this.enable();
			this.hide_spinner();
			this.$textarea.val( '' );
			liveblog.queue.resetTimer();
			liveblog.entries.add( this.model );
		},

		error: function( model, xhr ) {
			liveblog.fixedError.show( xhr );
			this.enable();
			this.hide_spinner();
		},

		switch_to_preview: function() {
			this.$( 'li.preview' ).addClass( 'active' );
			this.$( 'li.entry' ).removeClass( 'active' );
			this.$( '.liveblog-edit-entry' ).hide();
			this.preview.show();
		},

		switch_to_entry: function() {
			this.preview.hide();
			this.$( 'li.preview' ).removeClass( 'active' );
			this.$( 'li.entry' ).addClass( 'active' );
			this.$( '.liveblog-edit-entry' ).show();
		}
	});

	liveblog.EditEntryView = liveblog.InsertEntryView.extend({

		entry_tab_label: liveblog_publisher_settings.edit_entry_tab_label,
		submit_label: liveblog_publisher_settings.edit_entry_submit_label,

		initialize: function( options ) {
			this.$entry = options.entry;
			this.$entry_text = this.$entry.find( '.liveblog-entry-text' );
			this.model.on( 'sync', this.success, this );
			this.model.on( 'error', this.error, this );
		},

		get_content_for_form: function() {
			return this.$entry_text.data( 'original-content' );
		},

		render: function() {
			this.render_template();
			this.$entry_text.hide().after( this.$el );
			this.$( '.liveblog-form-entry' ).focus();
			return this;
		},

		submit: function( e ) {
			e.preventDefault();
			var new_entry_content = this.$textarea.val();

			if ( !new_entry_content ) {
				return;
			}

			this.disable();
			this.show_spinner();

			this.model.save({
				content: new_entry_content
			});

		},

		success: function( model ) {
			var entry = liveblog.entries.get( model.id );
			if ( entry ) {
				this.hide_spinner();
				entry.set( 'html', model.get( 'html' ) );
				entry.trigger( 'change:html' ); //TODO: why do we have to manually fire this?
				this.remove();
			}
		}
	});

	liveblog.PreviewView = Backbone.View.extend({

		initialize: function( options ) {
			this.form = options.form;
		},

		render: function( content ) {
			if ( !content ) {
				return;
			}
			this.form.disable();
			this.$el.html( liveblog_publisher_settings.loading_preview );

			this.model = new liveblog.PreviewEntry( { entry_content: content } );
			this.model.on( 'sync', this.success, this );
			this.model.on( 'error', this.error, this );
			this.model.save();
		},

		success: function( model ) {
			this.form.enable();
			this.$el.html( '<div class="liveblog-entry"><div class="liveblog-entry-text">' + model.get('html') + '</div></div>' );
			$( document.body ).trigger( 'post-load' );
		},

		error: function( model, xhr ) {
			liveblog.fixedError.show( xhr );
			this.form.enable();
			this.form.switch_to_entry();
		},

		show: function() {
			this.$el.show();
		},

		hide: function() {
			this.$el.hide();
		}
	});

	liveblog.publisher = {};

	liveblog.publisher.init = function() {
		liveblog.publisher.insert_form = new liveblog.InsertEntryView();
		liveblog.publisher.insert_form.render();
		liveblog.publisher.nonce = liveblog_settings.nonce;
	};

	Backbone.on( 'after-init', liveblog.publisher.init );
} )( jQuery );
