<script type="text/template" id="liveblog-single-entry-template">
	<div id="liveblog-entry-{{- target_entry_id }}" {{ css_classes }} data-timestamp="{{- timestamp }}">
		<header class="liveblog-meta">
			<span class="liveblog-author-avatar">{{ avatar_img }}</span>
			<span class="liveblog-author-name">{{ author_link }}</span>
			<span class="liveblog-meta-time"><a href="#liveblog-entry-{{- target_entry_id }}"><span class="date">{{ entry_date }}</span><span class="time">{{ entry_time }}</span></a></span>
		</header>
		<div class="liveblog-entry-text" data-original-content="{{- original_content }}">
			{{ content }}
		</div>
	<?php if ( $is_liveblog_editable ): ?>
		<ul class="liveblog-entry-actions">
			<li><button class="liveblog-entry-edit button-secondary"><?php _e( 'Edit', 'liveblog' ); ?></button><button class="liveblog-entry-delete button-secondary"><?php _e( 'Delete', 'liveblog' ); ?></button></li>
		</ul>
	<?php endif; ?>
	</div>
</script>
