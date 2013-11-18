var wd = require( 'wd' );

var BASE_URL = process.env.BASE_URL || 'http://local.wordpress.dev',
	WP_ADMIN_USER = process.env.WP_USER || 'admin',
	WP_ADMIN_PASS = process.env.WP_PASS || 'password',
	WP_POST_ID = process.env.WP_POST_ID || '1';

exports.getBaseUrl = function() {
	return BASE_URL;
};

exports.getAdminUser = function() {
	return WP_ADMIN_USER;
};

exports.getAdminPassword = function() {
	return WP_ADMIN_PASSWORD;
};

exports.getPostId = function() {
	return WP_POST_ID;
};

exports.startAdminBrowser = function() {
	/* Using wd.eval() and setting the value by JS is significantly less error prone that using wd.type() which seems to break on a whim. */
	var browser = wd.promiseChainRemote();
	return browser.init( { browserName: 'chrome' } )
		.get( BASE_URL + '/wp-login.php' )
		.elementById( 'user_login' )
		.eval( "document.getElementById( 'user_login' ).value = '" + WP_ADMIN_USER + "'" )
		.eval( "document.getElementById('user_pass').value = '" + WP_ADMIN_PASS + "'" )
		.elementById( 'wp-submit' )
		.click()
		.get( BASE_URL + '/?p=' + WP_POST_ID );
};

exports.startAnonymousBrowser = function() {
	var browser = wd.promiseChainRemote();
	return browser.init( { browserName: 'chrome' } )
		.get( BASE_URL + '/?p=' + WP_POST_ID );

};