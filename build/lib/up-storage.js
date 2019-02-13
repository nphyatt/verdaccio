"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _zlib = _interopRequireDefault(require("zlib"));

var _JSONStream = _interopRequireDefault(require("JSONStream"));

var _lodash = _interopRequireDefault(require("lodash"));

var _request = _interopRequireDefault(require("request"));

var _stream = _interopRequireDefault(require("stream"));

var _url = _interopRequireDefault(require("url"));

var _utils = require("./utils");

var _streams = require("@verdaccio/streams");

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const LoggerApi = require('./logger');

const encode = function (thing) {
  return encodeURIComponent(thing).replace(/^%40/, '@');
};

const jsonContentType = _constants.HEADERS.JSON;
const contentTypeAccept = `${jsonContentType};`;
/**
 * Just a helper (`config[key] || default` doesn't work because of zeroes)
 * @param {Object} config
 * @param {Object} key
 * @param {Object} def
 * @return {Object}
 */

const setConfig = (config, key, def) => {
  return _lodash.default.isNil(config[key]) === false ? config[key] : def;
};
/**
 * Implements Storage interface
 * (same for storage.js, local-storage.js, up-storage.js)
 */


class ProxyStorage {
  /**
   * Constructor
   * @param {*} config
   * @param {*} mainConfig
   */
  constructor(config, mainConfig) {
    _defineProperty(this, "config", void 0);

    _defineProperty(this, "failed_requests", void 0);

    _defineProperty(this, "userAgent", void 0);

    _defineProperty(this, "ca", void 0);

    _defineProperty(this, "logger", void 0);

    _defineProperty(this, "server_id", void 0);

    _defineProperty(this, "url", void 0);

    _defineProperty(this, "maxage", void 0);

    _defineProperty(this, "timeout", void 0);

    _defineProperty(this, "max_fails", void 0);

    _defineProperty(this, "fail_timeout", void 0);

    _defineProperty(this, "upname", void 0);

    _defineProperty(this, "proxy", void 0);

    _defineProperty(this, "last_request_time", void 0);

    _defineProperty(this, "strict_ssl", void 0);

    this.config = config;
    this.failed_requests = 0;
    this.userAgent = mainConfig.user_agent;
    this.ca = config.ca;
    this.logger = LoggerApi.logger.child({
      sub: 'out'
    });
    this.server_id = mainConfig.server_id;
    this.url = _url.default.parse(this.config.url); // $FlowFixMe

    this._setupProxy(this.url.hostname, config, mainConfig, this.url.protocol === 'https:');

    this.config.url = this.config.url.replace(/\/$/, '');

    if (this.config.timeout && Number(this.config.timeout) >= 1000) {
      this.logger.warn(['Too big timeout value: ' + this.config.timeout, 'We changed time format to nginx-like one', '(see http://nginx.org/en/docs/syntax.html)', 'so please update your config accordingly'].join('\n'));
    } // a bunch of different configurable timers


    this.maxage = (0, _utils.parseInterval)(setConfig(this.config, 'maxage', '2m'));
    this.timeout = (0, _utils.parseInterval)(setConfig(this.config, 'timeout', '30s'));
    this.max_fails = Number(setConfig(this.config, 'max_fails', 2));
    this.fail_timeout = (0, _utils.parseInterval)(setConfig(this.config, 'fail_timeout', '5m'));
    this.strict_ssl = Boolean(setConfig(this.config, 'strict_ssl', true));
  }
  /**
   * Fetch an asset.
   * @param {*} options
   * @param {*} cb
   * @return {Request}
   */


  request(options, cb) {
    let json;

    if (this._statusCheck() === false) {
      const streamRead = new _stream.default.Readable();
      process.nextTick(function () {
        if (cb) {
          cb(_utils.ErrorCode.getInternalError(_constants.API_ERROR.UPLINK_OFFLINE));
        }

        streamRead.emit('error', _utils.ErrorCode.getInternalError(_constants.API_ERROR.UPLINK_OFFLINE));
      }); // $FlowFixMe

      streamRead._read = function () {}; // preventing 'Uncaught, unspecified "error" event'


      streamRead.on('error', function () {});
      return streamRead;
    }

    const self = this;

    const headers = this._setHeaders(options);

    this._addProxyHeaders(options.req, headers);

    this._overrideWithUplinkConfigHeaders(headers);

    const method = options.method || 'GET';
    const uri = options.uri_full || this.config.url + options.uri;
    self.logger.info({
      method: method,
      headers: headers,
      uri: uri
    }, "making request: '@{method} @{uri}'");

    if ((0, _utils.isObject)(options.json)) {
      json = JSON.stringify(options.json);
      headers['Content-Type'] = headers['Content-Type'] || _constants.HEADERS.JSON;
    }

    const requestCallback = cb ? function (err, res, body) {
      let error;
      const responseLength = err ? 0 : body.length; // $FlowFixMe

      processBody();
      logActivity(); // $FlowFixMe

      cb(err, res, body);
      /**
       * Perform a decode.
       */

      function processBody() {
        if (err) {
          error = err.message;
          return;
        }

        if (options.json && res.statusCode < 300) {
          try {
            // $FlowFixMe
            body = JSON.parse(body.toString(_constants.CHARACTER_ENCODING.UTF8));
          } catch (_err) {
            body = {};
            err = _err;
            error = err.message;
          }
        }

        if (!err && (0, _utils.isObject)(body)) {
          if (_lodash.default.isString(body.error)) {
            error = body.error;
          }
        }
      }
      /**
       * Perform a log.
       */


      function logActivity() {
        let message = "@{!status}, req: '@{request.method} @{request.url}'";
        message += error ? ', error: @{!error}' : ', bytes: @{bytes.in}/@{bytes.out}';
        self.logger.warn({
          err: err || undefined,
          // if error is null/false change this to undefined so it wont log
          request: {
            method: method,
            url: uri
          },
          level: 35,
          // http
          status: res != null ? res.statusCode : 'ERR',
          error: error,
          bytes: {
            in: json ? json.length : 0,
            out: responseLength || 0
          }
        }, message);
      }
    } : undefined;
    const req = (0, _request.default)({
      url: uri,
      method: method,
      headers: headers,
      body: json,
      ca: this.ca,
      proxy: this.proxy,
      encoding: null,
      gzip: true,
      timeout: this.timeout,
      strictSSL: this.strict_ssl
    }, requestCallback);
    let statusCalled = false;
    req.on('response', function (res) {
      if (!req._verdaccio_aborted && !statusCalled) {
        statusCalled = true;

        self._statusCheck(true);
      }

      if (_lodash.default.isNil(requestCallback) === false) {
        (function do_log() {
          const message = "@{!status}, req: '@{request.method} @{request.url}' (streaming)";
          self.logger.warn({
            request: {
              method: method,
              url: uri
            },
            level: 35,
            // http
            status: _lodash.default.isNull(res) === false ? res.statusCode : 'ERR'
          }, message);
        })();
      }
    });
    req.on('error', function (_err) {
      if (!req._verdaccio_aborted && !statusCalled) {
        statusCalled = true;

        self._statusCheck(false);
      }
    });
    return req;
  }
  /**
   * Set default headers.
   * @param {Object} options
   * @return {Object}
   * @private
   */


  _setHeaders(options) {
    const headers = options.headers || {};
    const accept = 'Accept';
    const acceptEncoding = 'Accept-Encoding';
    const userAgent = 'User-Agent';
    headers[accept] = headers[accept] || contentTypeAccept;
    headers[acceptEncoding] = headers[acceptEncoding] || 'gzip'; // registry.npmjs.org will only return search result if user-agent include string 'npm'

    headers[userAgent] = headers[userAgent] || `npm (${this.userAgent})`;
    return this._setAuth(headers);
  }
  /**
   * Validate configuration auth and assign Header authorization
   * @param {Object} headers
   * @return {Object}
   * @private
   */


  _setAuth(headers) {
    const {
      auth
    } = this.config;

    if (_lodash.default.isNil(auth) || headers['authorization']) {
      return headers;
    } // $FlowFixMe


    if (_lodash.default.isObject(auth) === false && _lodash.default.isObject(auth.token) === false) {
      this._throwErrorAuth('Auth invalid');
    } // get NPM_TOKEN http://blog.npmjs.org/post/118393368555/deploying-with-npm-private-modules
    // or get other variable export in env
    // https://github.com/verdaccio/verdaccio/releases/tag/v2.5.0


    let token;
    const tokenConf = auth;

    if (_lodash.default.isNil(tokenConf.token) === false && _lodash.default.isString(tokenConf.token)) {
      token = tokenConf.token;
    } else if (_lodash.default.isNil(tokenConf.token_env) === false) {
      if (_lodash.default.isString(tokenConf.token_env)) {
        token = process.env[tokenConf.token_env];
      } else if (_lodash.default.isBoolean(tokenConf.token_env) && tokenConf.token_env) {
        token = process.env.NPM_TOKEN;
      } else {
        this.logger.error(_constants.ERROR_CODE.token_required);

        this._throwErrorAuth(_constants.ERROR_CODE.token_required);
      }
    } else {
      token = process.env.NPM_TOKEN;
    }

    if (_lodash.default.isNil(token)) {
      this._throwErrorAuth(_constants.ERROR_CODE.token_required);
    } // define type Auth allow basic and bearer


    const type = tokenConf.type || _constants.TOKEN_BASIC;

    this._setHeaderAuthorization(headers, type, token);

    return headers;
  }
  /**
   * @param {string} message
   * @throws {Error}
   * @private
   */


  _throwErrorAuth(message) {
    this.logger.error(message);
    throw new Error(message);
  }
  /**
   * Assign Header authorization with type authentication
   * @param {Object} headers
   * @param {string} type
   * @param {string} token
   * @private
   */


  _setHeaderAuthorization(headers, type, token) {
    const _type = type.toLowerCase();

    if (_type !== _constants.TOKEN_BEARER.toLowerCase() && _type !== _constants.TOKEN_BASIC.toLowerCase()) {
      this._throwErrorAuth(`Auth type '${_type}' not allowed`);
    }

    type = _lodash.default.upperFirst(type);
    headers['authorization'] = (0, _utils.buildToken)(type, token);
  }
  /**
   * It will add or override specified headers from config file.
   *
   * Eg:
   *
   * uplinks:
   npmjs:
   url: https://registry.npmjs.org/
   headers:
   Accept: "application/vnd.npm.install-v2+json; q=1.0"
   verdaccio-staging:
   url: https://mycompany.com/npm
   headers:
   Accept: "application/json"
   authorization: "Basic YourBase64EncodedCredentials=="
    * @param {Object} headers
   * @private
   */


  _overrideWithUplinkConfigHeaders(headers) {
    if (!this.config.headers) {
      return headers;
    } // add/override headers specified in the config

    /* eslint guard-for-in: 0 */


    for (const key in this.config.headers) {
      headers[key] = this.config.headers[key];
    }
  }
  /**
   * Determine whether can fetch from the provided URL
   * @param {*} url
   * @return {Boolean}
   */


  isUplinkValid(url) {
    // $FlowFixMe
    const urlParsed = _url.default.parse(url);

    const isHTTPS = urlDomainParsed => urlDomainParsed.protocol === 'https:' && (urlParsed.port === null || urlParsed.port === '443');

    const getHost = urlDomainParsed => isHTTPS(urlDomainParsed) ? urlDomainParsed.hostname : urlDomainParsed.host;

    const isMatchProtocol = urlParsed.protocol === this.url.protocol;
    const isMatchHost = getHost(urlParsed) === getHost(this.url);
    const isMatchPath = urlParsed.path.indexOf(this.url.path) === 0;
    return isMatchProtocol && isMatchHost && isMatchPath;
  }
  /**
   * Get a remote package metadata
   * @param {*} name package name
   * @param {*} options request options, eg: eTag.
   * @param {*} callback
   */


  getRemoteMetadata(name, options, callback) {
    const headers = {};

    if (_lodash.default.isNil(options.etag) === false) {
      headers['If-None-Match'] = options.etag;
      headers['Accept'] = contentTypeAccept;
    }

    this.request({
      uri: `/${encode(name)}`,
      json: true,
      headers: headers,
      req: options.req
    }, (err, res, body) => {
      if (err) {
        return callback(err);
      }

      if (res.statusCode === _constants.HTTP_STATUS.NOT_FOUND) {
        return callback(_utils.ErrorCode.getNotFound(_constants.API_ERROR.NOT_PACKAGE_UPLINK));
      }

      if (!(res.statusCode >= _constants.HTTP_STATUS.OK && res.statusCode < _constants.HTTP_STATUS.MULTIPLE_CHOICES)) {
        const error = _utils.ErrorCode.getInternalError(`${_constants.API_ERROR.BAD_STATUS_CODE}: ${res.statusCode}`); // $FlowFixMe


        error.remoteStatus = res.statusCode;
        return callback(error);
      }

      callback(null, body, res.headers.etag);
    });
  }
  /**
   * Fetch a tarball from the uplink.
   * @param {String} url
   * @return {Stream}
   */


  fetchTarball(url) {
    const stream = new _streams.ReadTarball({});
    let current_length = 0;
    let expected_length;

    stream.abort = () => {};

    const readStream = this.request({
      uri_full: url,
      encoding: null,
      headers: {
        Accept: contentTypeAccept
      }
    });
    readStream.on('response', function (res) {
      if (res.statusCode === _constants.HTTP_STATUS.NOT_FOUND) {
        return stream.emit('error', _utils.ErrorCode.getNotFound(_constants.API_ERROR.NOT_FILE_UPLINK));
      }

      if (!(res.statusCode >= _constants.HTTP_STATUS.OK && res.statusCode < _constants.HTTP_STATUS.MULTIPLE_CHOICES)) {
        return stream.emit('error', _utils.ErrorCode.getInternalError(`bad uplink status code: ${res.statusCode}`));
      }

      if (res.headers[_constants.HEADER_TYPE.CONTENT_LENGTH]) {
        expected_length = res.headers[_constants.HEADER_TYPE.CONTENT_LENGTH];
        stream.emit(_constants.HEADER_TYPE.CONTENT_LENGTH, res.headers[_constants.HEADER_TYPE.CONTENT_LENGTH]);
      }

      readStream.pipe(stream);
    });
    readStream.on('error', function (err) {
      stream.emit('error', err);
    });
    readStream.on('data', function (data) {
      current_length += data.length;
    });
    readStream.on('end', function (data) {
      if (data) {
        current_length += data.length;
      }

      if (expected_length && current_length != expected_length) {
        stream.emit('error', _utils.ErrorCode.getInternalError(_constants.API_ERROR.CONTENT_MISMATCH));
      }
    });
    return stream;
  }
  /**
   * Perform a stream search.
   * @param {*} options request options
   * @return {Stream}
   */


  search(options) {
    const transformStream = new _stream.default.PassThrough({
      objectMode: true
    });
    const requestStream = this.request({
      uri: options.req.url,
      req: options.req,
      headers: {
        referer: options.req.headers.referer
      }
    });

    const parsePackage = pkg => {
      if ((0, _utils.isObject)(pkg)) {
        transformStream.emit('data', pkg);
      }
    };

    requestStream.on('response', res => {
      if (!String(res.statusCode).match(/^2\d\d$/)) {
        return transformStream.emit('error', _utils.ErrorCode.getInternalError(`bad status code ${res.statusCode} from uplink`));
      } // See https://github.com/request/request#requestoptions-callback
      // Request library will not decode gzip stream.


      let jsonStream;

      if (res.headers[_constants.HEADER_TYPE.CONTENT_ENCODING] === _constants.HEADERS.GZIP) {
        jsonStream = res.pipe(_zlib.default.createUnzip());
      } else {
        jsonStream = res;
      }

      jsonStream.pipe(_JSONStream.default.parse('*')).on('data', parsePackage);
      jsonStream.on('end', () => {
        transformStream.emit('end');
      });
    });
    requestStream.on('error', err => {
      transformStream.emit('error', err);
    });

    transformStream.abort = () => {
      // FIXME: this is clearly a potential issue
      // $FlowFixMe
      requestStream.abort();
      transformStream.emit('end');
    };

    return transformStream;
  }
  /**
   * Add proxy headers.
   * @param {*} req the http request
   * @param {*} headers the request headers
   */


  _addProxyHeaders(req, headers) {
    if (req) {
      // Only submit X-Forwarded-For field if we don't have a proxy selected
      // in the config file.
      //
      // Otherwise misconfigured proxy could return 407:
      // https://github.com/rlidwka/sinopia/issues/254
      //
      if (this.proxy === false) {
        headers['X-Forwarded-For'] = (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'] + ', ' : '') + req.connection.remoteAddress;
      }
    } // always attach Via header to avoid loops, even if we're not proxying


    headers['Via'] = req && req.headers['via'] ? req.headers['via'] + ', ' : '';
    headers['Via'] += '1.1 ' + this.server_id + ' (Verdaccio)';
  }
  /**
   * Check whether the remote host is available.
   * @param {*} alive
   * @return {Boolean}
   */


  _statusCheck(alive) {
    if (arguments.length === 0) {
      return this._ifRequestFailure() === false;
    } else {
      if (alive) {
        if (this.failed_requests >= this.max_fails) {
          this.logger.warn({
            host: this.url.host
          }, 'host @{host} is back online');
        }

        this.failed_requests = 0;
      } else {
        this.failed_requests++;

        if (this.failed_requests === this.max_fails) {
          this.logger.warn({
            host: this.url.host
          }, 'host @{host} is now offline');
        }
      }

      this.last_request_time = Date.now();
    }
  }
  /**
   * If the request failure.
   * @return {boolean}
   * @private
   */


  _ifRequestFailure() {
    return this.failed_requests >= this.max_fails && Math.abs(Date.now() - this.last_request_time) < this.fail_timeout;
  }
  /**
   * Set up a proxy.
   * @param {*} hostname
   * @param {*} config
   * @param {*} mainconfig
   * @param {*} isHTTPS
   */


  _setupProxy(hostname, config, mainconfig, isHTTPS) {
    let noProxyList;
    const proxy_key = isHTTPS ? 'https_proxy' : 'http_proxy'; // get http_proxy and no_proxy configs

    if (proxy_key in config) {
      this.proxy = config[proxy_key];
    } else if (proxy_key in mainconfig) {
      this.proxy = mainconfig[proxy_key];
    }

    if ('no_proxy' in config) {
      // $FlowFixMe
      noProxyList = config.no_proxy;
    } else if ('no_proxy' in mainconfig) {
      noProxyList = mainconfig.no_proxy;
    } // use wget-like algorithm to determine if proxy shouldn't be used


    if (hostname[0] !== '.') {
      hostname = '.' + hostname;
    } // $FlowFixMe


    if (_lodash.default.isString(noProxyList) && noProxyList.length) {
      // $FlowFixMe
      noProxyList = noProxyList.split(',');
    }

    if (_lodash.default.isArray(noProxyList)) {
      // $FlowFixMe
      for (let i = 0; i < noProxyList.length; i++) {
        // $FlowFixMe
        let noProxyItem = noProxyList[i];
        if (noProxyItem[0] !== '.') noProxyItem = '.' + noProxyItem;

        if (hostname.lastIndexOf(noProxyItem) === hostname.length - noProxyItem.length) {
          if (this.proxy) {
            this.logger.debug({
              url: this.url.href,
              rule: noProxyItem
            }, 'not using proxy for @{url}, excluded by @{rule} rule'); // $FlowFixMe

            this.proxy = false;
          }

          break;
        }
      }
    } // if it's non-string (i.e. "false"), don't use it


    if (_lodash.default.isString(this.proxy) === false) {
      delete this.proxy;
    } else {
      this.logger.debug({
        url: this.url.href,
        proxy: this.proxy
      }, 'using proxy @{proxy} for @{url}');
    }
  }

}

var _default = ProxyStorage;
exports.default = _default;