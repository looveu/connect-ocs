
/*!
 * Connect - Ocs
 * Copyright(c) 2015 Dom Liang <i@looveu.com>
 * MIT Licensed
 */

var default_port = 11211;
var ALY = require('aliyun-sdk');
var oneDay = 86400;
function ensureCallback(fn) {
	return function() {
		fn && fn.apply(null, arguments);
	};
}

/**
 * Return the `OcsStore` extending `connect`'s session Store.
 *
 * @param {object} session
 * @return {Function}
 * @api public
 */
module.exports = function(session) {
	var Store = session.Store;

	/**
	 * Initialize OcsStore with the given `options`.
	 *
	 * @param {Object} options
	 * @api public
	 */
	function OcsStore(options) {
		options = options || {};
		Store.call(this, options);

		this.prefix = options.prefix || '';
		if(!options.port){
			options.port = default_port;
		}
		if (!options.client) {
			if (!options.hosts) {
				new Error('options must has host key');
			}
			options.client = ALY.MEMCACHED.createClient(options.port || default_port, options.host, {
			  username: options.ocsKey,
			  password: options.ocsSecret
			});
		}

		this.client = options.client;
	}

	OcsStore.prototype.__proto__ = Store.prototype;

	/**
	 * Translates the given `sid` into a memcached key, optionally with prefix.
	 *
	 * @param {String} sid
	 * @api private
	 */
	OcsStore.prototype.getKey = function getKey(sid) {
		return this.prefix + sid;
	};

	/**
	 * Attempt to fetch session by the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} fn
	 * @api public
	 */
	OcsStore.prototype.get = function(sid, fn) {
		sid = this.getKey(sid);

		this.client.get(sid, function(err, data) {
      if (err) { return fn(err, {}); }
			try {
				if (!data) {
					return fn();
				}
				fn(null, JSON.parse(data.toString()));
			} catch (e) {
				fn(e);
			}
		});
	};

	/**
	 * Commit the given `sess` object associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Session} sess
	 * @param {Function} fn
	 * @api public
	 */
	OcsStore.prototype.set = function(sid, sess, fn) {
		sid = this.getKey(sid);

		try {
			var maxAge = sess.cookie.maxAge;
			var ttl = 'number' == typeof maxAge ? maxAge / 1000 | 0 : oneDay;
			var sess = JSON.stringify(sess);

			this.client.set(sid, sess, ttl, ensureCallback(fn));
		} catch (err) {
			fn && fn(err);
		}
	};

	/**
	 * Destroy the session associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} fn
	 * @api public
	 */
	OcsStore.prototype.destroy = function(sid, fn) {
		sid = this.getKey(sid);
		this.client.del(sid, ensureCallback(fn));
	};

	/**
	 * Fetch number of sessions.
	 *
	 * @param {Function} fn
	 * @api public
	 */
	OcsStore.prototype.length = function(fn) {
		this.client.items(ensureCallback(fn));
	};

	/**
	 * Clear all sessions.
	 *
	 * @param {Function} fn
	 * @api public
	 */
	OcsStore.prototype.clear = function(fn) {
		this.client.flush(ensureCallback(fn));
	};

	return OcsStore;
};