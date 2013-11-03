<div class="wrap">
	<div class="liveblog-settings-page">
		<div id="messages"></div>
		<div class="icon32" id="icon-options-general"><br></div>
		<h2><?php _e( 'Liveblog Options', 'liveblog' ); ?></h2>
		<form method="post" action="options-general.php?page=plugin_liveblog_settings" name="plugin-liveblog-settings-form">
			<p><?php _e( '', 'liveblog' ); ?></p>
			<h3><?php _e( 'Simperium', 'liveblog' ); ?></h3>
			<p><?php _e( 'By default, Liveblog checks for updates every few seconds to get the latests posts to display. Simperium provides a better user experience by automatically updating users as new content is posted. You will need a <a href="http://simperium.com/pricing/" target="_blank">Simperium plan</a> to utilize this feature.', 'liveblog' ); ?></p>
			<div class="row"></div>
			<table class="form-table">
				<tbody>
					<tr valign="top">
						<th colspan="2"><input type="checkbox" id="plugin-liveblog-settings-form-enable-simperium" name="enable_simperium" value="true" <?php echo $simperium_enabled === true ? 'checked="checked" ' : ''; ?>/> <label for="plugin-liveblog-settings-form-enable-simperium"><?php _e( 'Enable Simperium Support', 'liveblog' ) ?></label></th>
					</tr>
					<tr valign="top">
						<th scope="row"><label for="plugin-liveblog-settings-form-simperium-appid"><?php _e( 'Application ID', 'liveblog' ); ?></label></th>
						<td>
							<input type="text" class="regular-text" value="<?php echo esc_attr( $simperium_application_id ); ?>" id="plugin-liveblog-settings-form-simperium-appid" name="simperium-appid">
							<p class="description"><?php _e( 'Your Simperium Application ID - shown under the "Summary" tab.', 'liveblog' ); ?></p>
						</td>
					</tr>
					<tr valign="top">
						<th scope="row"><label for="plugin-liveblog-settings-form-simperium-admin-apikey"><?php _e( 'Administrator API Key', 'liveblog' ); ?></label></th>
						<td>
							<input type="text" class="regular-text" value="<?php echo esc_attr( $simperium_admin_api_key ); ?>" id="plugin-liveblog-settings-form-simperium-admin-apikey" name="simperium-admin-apikey">
							<p class="description"><?php _e( 'The API key of an application administrator - will be used to send updates.', 'liveblog' ); ?></p>
						</td>
					</tr>
					<tr valign="top">
						<th scope="row"><label for="plugin-liveblog-settings-form-simperium-observer-apikey"><?php _e( 'Read-Only API Key', 'liveblog' ); ?></label></th>
						<td>
							<input type="text" class="regular-text" value="<?php echo esc_attr( $simperium_observer_api_key ); ?>" id="plugin-liveblog-settings-form-simperium-observer-apikey" name="simperium-observer-apikey">
							<p class="description"><?php _e( 'This API key gives anonymous users the ability to view your updates - it should be read-only so users can only observe and not interact with your updates.', 'liveblog' ); ?></p>
						</td>
					</tr>
				</tbody>
			</table>

			<p class="submit"><input type="submit" value="Save Changes" class="button button-primary" id="submit" name="submit"></p>
		</form>
	</div>
</div>
