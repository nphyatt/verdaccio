"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _constants = require("./constants");

var _pluginLoader = _interopRequireDefault(require("../lib/plugin-loader"));

var _cryptoUtils = require("./crypto-utils");

var _authUtils = require("./auth-utils");

var _utils = require("./utils");

var _configUtils = require("./config-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const LoggerApi = require('./logger');

class Auth {
  constructor(config) {
    _defineProperty(this, "config", void 0);

    _defineProperty(this, "logger", void 0);

    _defineProperty(this, "secret", void 0);

    _defineProperty(this, "plugins", void 0);

    this.config = config;
    this.logger = LoggerApi.logger.child({
      sub: 'auth'
    });
    this.secret = config.secret;
    this.plugins = this._loadPlugin(config);

    this._applyDefaultPlugins();
  }

  _loadPlugin(config) {
    const pluginOptions = {
      config,
      logger: this.logger
    };
    return (0, _pluginLoader.default)(config, config.auth, pluginOptions, plugin => {
      const {
        authenticate,
        allow_access,
        allow_publish
      } = plugin;
      return authenticate || allow_access || allow_publish;
    });
  }

  _applyDefaultPlugins() {
    this.plugins.push((0, _authUtils.getDefaultPlugins)());
  }

  changePassword(username, password, newPassword, cb) {
    const validPlugins = _lodash.default.filter(this.plugins, plugin => _lodash.default.isFunction(plugin.changePassword));

    if (_lodash.default.isEmpty(validPlugins)) {
      return cb(_utils.ErrorCode.getInternalError(_constants.SUPPORT_ERRORS.PLUGIN_MISSING_INTERFACE));
    }

    for (const plugin of validPlugins) {
      this.logger.trace({
        username
      }, 'updating password for @{username}');
      plugin.changePassword(username, password, newPassword, (err, profile) => {
        if (err) {
          this.logger.error({
            username,
            err
          }, `An error has been produced 
          updating the password for @{username}. Error: @{err.message}`);
          return cb(err);
        }

        this.logger.trace({
          username
        }, 'updated password for @{username} was successful');
        return cb(null, profile);
      });
    }
  }

  authenticate(username, password, cb) {
    const plugins = this.plugins.slice(0);
    const self = this;

    (function next() {
      const plugin = plugins.shift();

      if (_lodash.default.isFunction(plugin.authenticate) === false) {
        return next();
      }

      self.logger.trace({
        username
      }, 'authenticating @{username}');
      plugin.authenticate(username, password, function (err, groups) {
        if (err) {
          self.logger.trace({
            username,
            err
          }, 'authenticating for user @{username} failed. Error: @{err.message}');
          return cb(err);
        } // Expect: SKIP if groups is falsey and not an array
        //         with at least one item (truthy length)
        // Expect: CONTINUE otherwise (will error if groups is not
        //         an array, but this is current behavior)
        // Caveat: STRING (if valid) will pass successfully
        //         bug give unexpected results
        // Info: Cannot use `== false to check falsey values`


        if (!!groups && groups.length !== 0) {
          // TODO: create a better understanding of expectations
          if (_lodash.default.isString(groups)) {
            throw new TypeError('plugin group error: invalid type for function');
          }

          const isGroupValid = _lodash.default.isArray(groups);

          if (!isGroupValid) {
            throw new TypeError(_constants.API_ERROR.BAD_FORMAT_USER_GROUP);
          }

          self.logger.trace({
            username,
            groups
          }, 'authentication for user @{username} was successfully. Groups: @{groups}');
          return cb(err, (0, _authUtils.createRemoteUser)(username, groups));
        }

        next();
      });
    })();
  }

  add_user(user, password, cb) {
    const self = this;
    const plugins = this.plugins.slice(0);
    this.logger.trace({
      user
    }, 'add user @{user}');

    (function next() {
      const plugin = plugins.shift();
      let method = 'adduser';

      if (_lodash.default.isFunction(plugin[method]) === false) {
        method = 'add_user';
      }

      if (_lodash.default.isFunction(plugin[method]) === false) {
        next();
      } else {
        // p.add_user() execution
        plugin[method](user, password, function (err, ok) {
          if (err) {
            self.logger.trace({
              user,
              err
            }, 'the user @{user} could not being added. Error: @{err}');
            return cb(err);
          }

          if (ok) {
            self.logger.trace({
              user
            }, 'the user @{user} has been added');
            return self.authenticate(user, password, cb);
          }

          next();
        });
      }
    })();
  }
  /**
   * Allow user to access a package.
   */


  allow_access({
    packageName,
    packageVersion
  }, user, callback) {
    const plugins = this.plugins.slice(0); // $FlowFixMe

    const pkg = Object.assign({
      name: packageName,
      version: packageVersion
    }, (0, _configUtils.getMatchedPackagesSpec)(packageName, this.config.packages));
    const self = this;
    this.logger.trace({
      packageName
    }, 'allow access for @{packageName}');

    (function next() {
      const plugin = plugins.shift();

      if (_lodash.default.isFunction(plugin.allow_access) === false) {
        return next();
      }

      plugin.allow_access(user, pkg, function (err, ok) {
        if (err) {
          self.logger.trace({
            packageName,
            err
          }, 'forbidden access for @{packageName}. Error: @{err.message}');
          return callback(err);
        }

        if (ok) {
          self.logger.trace({
            packageName
          }, 'allowed access for @{packageName}');
          return callback(null, ok);
        }

        next(); // cb(null, false) causes next plugin to roll
      });
    })();
  }
  /**
   * Allow user to publish a package.
   */


  allow_publish({
    packageName,
    packageVersion
  }, user, callback) {
    const plugins = this.plugins.slice(0);
    const self = this; // $FlowFixMe

    const pkg = Object.assign({
      name: packageName,
      version: packageVersion
    }, (0, _configUtils.getMatchedPackagesSpec)(packageName, this.config.packages));
    this.logger.trace({
      packageName
    }, 'allow publish for @{packageName}');

    (function next() {
      const plugin = plugins.shift();

      if (_lodash.default.isFunction(plugin.allow_publish) === false) {
        return next();
      }

      plugin.allow_publish(user, pkg, (err, ok) => {
        if (err) {
          self.logger.trace({
            packageName
          }, 'forbidden publish for @{packageName}');
          return callback(err);
        }

        if (ok) {
          self.logger.trace({
            packageName
          }, 'allowed publish for @{packageName}');
          return callback(null, ok);
        }

        next(); // cb(null, false) causes next plugin to roll
      });
    })();
  }

  apiJWTmiddleware() {
    const plugins = this.plugins.slice(0);
    const helpers = {
      createAnonymousRemoteUser: _authUtils.createAnonymousRemoteUser,
      createRemoteUser: _authUtils.createRemoteUser
    };

    for (const plugin of plugins) {
      if (plugin.apiJWTmiddleware) {
        return plugin.apiJWTmiddleware(helpers);
      }
    }

    return (req, res, _next) => {
      req.pause();

      const next = function (err) {
        req.resume(); // uncomment this to reject users with bad auth headers
        // return _next.apply(null, arguments)
        // swallow error, user remains unauthorized
        // set remoteUserError to indicate that user was attempting authentication

        if (err) {
          req.remote_user.error = err.message;
        }

        return _next();
      };

      if (this._isRemoteUserMissing(req.remote_user)) {
        return next();
      } // in case auth header does not exist we return anonymous function


      req.remote_user = (0, _authUtils.createAnonymousRemoteUser)();
      const {
        authorization
      } = req.headers;

      if (_lodash.default.isNil(authorization)) {
        return next();
      }

      if (!(0, _authUtils.isAuthHeaderValid)(authorization)) {
        this.logger.trace('api middleware auth heather is not valid');
        return next(_utils.ErrorCode.getBadRequest(_constants.API_ERROR.BAD_AUTH_HEADER));
      }

      const security = (0, _authUtils.getSecurity)(this.config);
      const {
        secret
      } = this.config;

      if ((0, _authUtils.isAESLegacy)(security)) {
        this.logger.trace('api middleware using legacy auth token');

        this._handleAESMiddleware(req, security, secret, authorization, next);
      } else {
        this.logger.trace('api middleware using JWT auth token');

        this._handleJWTAPIMiddleware(req, security, secret, authorization, next);
      }
    };
  }

  _handleJWTAPIMiddleware(req, security, secret, authorization, next) {
    const {
      scheme,
      token
    } = (0, _authUtils.parseAuthTokenHeader)(authorization);

    if (scheme.toUpperCase() === _constants.TOKEN_BASIC.toUpperCase()) {
      // this should happen when client tries to login with an existing user
      const credentials = (0, _utils.convertPayloadToBase64)(token).toString();
      const {
        user,
        password
      } = (0, _authUtils.parseBasicPayload)(credentials);
      this.authenticate(user, password, (err, user) => {
        if (!err) {
          req.remote_user = user;
          next();
        } else {
          req.remote_user = (0, _authUtils.createAnonymousRemoteUser)();
          next(err);
        }
      });
    } else {
      // jwt handler
      const credentials = (0, _authUtils.getMiddlewareCredentials)(security, secret, authorization);

      if (credentials) {
        // if the signature is valid we rely on it
        req.remote_user = credentials;
        next();
      } else {
        // with JWT throw 401
        next(_utils.ErrorCode.getForbidden(_constants.API_ERROR.BAD_USERNAME_PASSWORD));
      }
    }
  }

  _handleAESMiddleware(req, security, secret, authorization, next) {
    const credentials = (0, _authUtils.getMiddlewareCredentials)(security, secret, authorization);

    if (credentials) {
      const {
        user,
        password
      } = credentials;
      this.authenticate(user, password, (err, user) => {
        if (!err) {
          req.remote_user = user;
          next();
        } else {
          req.remote_user = (0, _authUtils.createAnonymousRemoteUser)();
          next(err);
        }
      });
    } else {
      // we force npm client to ask again with basic authentication
      return next(_utils.ErrorCode.getBadRequest(_constants.API_ERROR.BAD_AUTH_HEADER));
    }
  }

  _isRemoteUserMissing(remote_user) {
    return _lodash.default.isUndefined(remote_user) === false && _lodash.default.isUndefined(remote_user.name) === false;
  }
  /**
   * JWT middleware for WebUI
   */


  webUIJWTmiddleware() {
    return (req, res, _next) => {
      if (this._isRemoteUserMissing(req.remote_user)) {
        return _next();
      }

      req.pause();

      const next = err => {
        req.resume();

        if (err) {
          // req.remote_user.error = err.message;
          res.status(err.statusCode).send(err.message);
        }

        return _next();
      };

      const {
        authorization
      } = req.headers;

      if (_lodash.default.isNil(authorization)) {
        return next();
      }

      if (!(0, _authUtils.isAuthHeaderValid)(authorization)) {
        return next(_utils.ErrorCode.getBadRequest(_constants.API_ERROR.BAD_AUTH_HEADER));
      }

      const token = (authorization || '').replace(`${_constants.TOKEN_BEARER} `, '');

      if (!token) {
        return next();
      }

      let credentials;

      try {
        credentials = (0, _authUtils.verifyJWTPayload)(token, this.config.secret);
      } catch (err) {// FIXME: intended behaviour, do we want it?
      }

      if (credentials) {
        const {
          name,
          groups
        } = credentials; // $FlowFixMe

        req.remote_user = (0, _authUtils.createRemoteUser)(name, groups);
      } else {
        req.remote_user = (0, _authUtils.createAnonymousRemoteUser)();
      }

      next();
    };
  }

  jwtEncrypt(user, signOptions) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const {
        real_groups
      } = user;

      const payload = _objectSpread({}, user, {
        group: real_groups && real_groups.length ? real_groups : undefined
      });

      const token = yield (0, _cryptoUtils.signPayload)(payload, _this.secret, signOptions); // $FlowFixMe

      return token;
    })();
  }
  /**
   * Encrypt a string.
   */


  aesEncrypt(buf) {
    return (0, _cryptoUtils.aesEncrypt)(buf, this.secret);
  }

}

var _default = Auth;
exports.default = _default;