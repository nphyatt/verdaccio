"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.validatePassword = validatePassword;
exports.createRemoteUser = createRemoteUser;
exports.createAnonymousRemoteUser = createAnonymousRemoteUser;
exports.allow_action = allow_action;
exports.getDefaultPlugins = getDefaultPlugins;
exports.createSessionToken = createSessionToken;
exports.getSecurity = getSecurity;
exports.getAuthenticatedMessage = getAuthenticatedMessage;
exports.buildUserBuffer = buildUserBuffer;
exports.isAESLegacy = isAESLegacy;
exports.getApiToken = getApiToken;
exports.parseAuthTokenHeader = parseAuthTokenHeader;
exports.parseBasicPayload = parseBasicPayload;
exports.parseAESCredentials = parseAESCredentials;
exports.verifyJWTPayload = verifyJWTPayload;
exports.isAuthHeaderValid = isAuthHeaderValid;
exports.getMiddlewareCredentials = getMiddlewareCredentials;
exports.expireReasons = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _utils = require("./utils");

var _constants = require("./constants");

var _cryptoUtils = require("./crypto-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function validatePassword(password, minLength = _constants.DEFAULT_MIN_LIMIT_PASSWORD) {
  return typeof password === 'string' && password.length >= minLength;
}
/**
 * Create a RemoteUser object
 * @return {Object} { name: xx, pluginGroups: [], real_groups: [] }
 */


function createRemoteUser(name, pluginGroups) {
  const isGroupValid = Array.isArray(pluginGroups);
  const groups = (isGroupValid ? pluginGroups : []).concat([_constants.ROLES.$ALL, _constants.ROLES.$AUTH, _constants.ROLES.DEPRECATED_ALL, _constants.ROLES.DEPRECATED_AUTH, _constants.ROLES.ALL]);
  return {
    name,
    groups,
    real_groups: pluginGroups
  };
}
/**
 * Builds an anonymous remote user in case none is logged in.
 * @return {Object} { name: xx, groups: [], real_groups: [] }
 */


function createAnonymousRemoteUser() {
  return {
    name: undefined,
    // groups without '$' are going to be deprecated eventually
    groups: [_constants.ROLES.$ALL, _constants.ROLES.$ANONYMOUS, _constants.ROLES.DEPRECATED_ALL, _constants.ROLES.DEPRECATED_ANONYMOUS],
    real_groups: []
  };
}

function allow_action(action) {
  return function (user, pkg, callback) {
    const {
      name,
      groups
    } = user;
    const hasPermission = pkg[action].some(group => name === group || groups.includes(group));

    if (hasPermission) {
      return callback(null, true);
    }

    if (name) {
      callback(_utils.ErrorCode.getForbidden(`user ${name} is not allowed to ${action} package ${pkg.name}`));
    } else {
      callback(_utils.ErrorCode.getUnauthorized(`authorization required to ${action} package ${pkg.name}`));
    }
  };
}

function getDefaultPlugins() {
  return {
    authenticate(user, password, cb) {
      cb(_utils.ErrorCode.getForbidden(_constants.API_ERROR.BAD_USERNAME_PASSWORD));
    },

    add_user(user, password, cb) {
      return cb(_utils.ErrorCode.getConflict(_constants.API_ERROR.BAD_USERNAME_PASSWORD));
    },

    allow_access: allow_action('access'),
    allow_publish: allow_action('publish')
  };
}

function createSessionToken() {
  const tenHoursTime = 10 * 60 * 60 * 1000;
  return {
    // npmjs.org sets 10h expire
    expires: new Date(Date.now() + tenHoursTime)
  };
}

const defaultWebTokenOptions = {
  sign: {
    expiresIn: _constants.TIME_EXPIRATION_7D
  },
  verify: {}
};
const defaultApiTokenConf = {
  legacy: true,
  sign: {}
};

function getSecurity(config) {
  const defaultSecurity = {
    web: defaultWebTokenOptions,
    api: defaultApiTokenConf
  };

  if (_lodash.default.isNil(config.security) === false) {
    return _lodash.default.merge(defaultSecurity, config.security);
  }

  return defaultSecurity;
}

function getAuthenticatedMessage(user) {
  return `you are authenticated as '${user}'`;
}

function buildUserBuffer(name, password) {
  return Buffer.from(`${name}:${password}`, _constants.CHARACTER_ENCODING.UTF8);
}

function isAESLegacy(security) {
  const {
    legacy,
    jwt
  } = security.api;
  return _lodash.default.isNil(legacy) === false && _lodash.default.isNil(jwt) && legacy === true;
}

function getApiToken(_x, _x2, _x3, _x4) {
  return _getApiToken.apply(this, arguments);
}

function _getApiToken() {
  _getApiToken = _asyncToGenerator(function* (auth, config, remoteUser, aesPassword) {
    const security = getSecurity(config);

    if (isAESLegacy(security)) {
      // fallback all goes to AES encryption
      return yield new Promise(resolve => {
        resolve(auth.aesEncrypt(buildUserBuffer(remoteUser.name, aesPassword)).toString('base64'));
      });
    } else {
      // i am wiling to use here _.isNil but flow does not like it yet.
      const {
        jwt
      } = security.api;

      if (jwt && jwt.sign) {
        return yield auth.jwtEncrypt(remoteUser, jwt.sign);
      } else {
        return yield new Promise(resolve => {
          resolve(auth.aesEncrypt(buildUserBuffer(remoteUser.name, aesPassword)).toString('base64'));
        });
      }
    }
  });
  return _getApiToken.apply(this, arguments);
}

function parseAuthTokenHeader(authorizationHeader) {
  const parts = authorizationHeader.split(' ');
  const [scheme, token] = parts;
  return {
    scheme,
    token
  };
}

function parseBasicPayload(credentials) {
  const index = credentials.indexOf(':');

  if (index < 0) {
    return;
  }

  const user = credentials.slice(0, index);
  const password = credentials.slice(index + 1);
  return {
    user,
    password
  };
}

function parseAESCredentials(authorizationHeader, secret) {
  const {
    scheme,
    token
  } = parseAuthTokenHeader(authorizationHeader); // basic is deprecated and should not be enforced

  if (scheme.toUpperCase() === _constants.TOKEN_BASIC.toUpperCase()) {
    const credentials = (0, _utils.convertPayloadToBase64)(token).toString();
    return credentials;
  } else if (scheme.toUpperCase() === _constants.TOKEN_BEARER.toUpperCase()) {
    const tokenAsBuffer = (0, _utils.convertPayloadToBase64)(token);
    const credentials = (0, _cryptoUtils.aesDecrypt)(tokenAsBuffer, secret).toString('utf8');
    return credentials;
  }
}

const expireReasons = ['JsonWebTokenError', 'TokenExpiredError'];
exports.expireReasons = expireReasons;

function verifyJWTPayload(token, secret) {
  try {
    const payload = (0, _cryptoUtils.verifyPayload)(token, secret);
    return payload;
  } catch (error) {
    // #168 this check should be removed as soon AES encrypt is removed.
    if (expireReasons.includes(error.name)) {
      // it might be possible the jwt configuration is enabled and
      // old tokens fails still remains in usage, thus
      // we return an anonymous user to force log in.
      return createAnonymousRemoteUser();
    } else {
      throw _utils.ErrorCode.getCode(_constants.HTTP_STATUS.UNAUTHORIZED, error.message);
    }
  }
}

function isAuthHeaderValid(authorization) {
  return authorization.split(' ').length === 2;
}

function getMiddlewareCredentials(security, secret, authorizationHeader) {
  if (isAESLegacy(security)) {
    const credentials = parseAESCredentials(authorizationHeader, secret);

    if (!credentials) {
      return;
    }

    const parsedCredentials = parseBasicPayload(credentials);

    if (!parsedCredentials) {
      return;
    }

    return parsedCredentials;
  } else {
    const {
      scheme,
      token
    } = parseAuthTokenHeader(authorizationHeader);

    if (_lodash.default.isString(token) && scheme.toUpperCase() === _constants.TOKEN_BEARER.toUpperCase()) {
      return verifyJWTPayload(token, secret);
    }
  }
}