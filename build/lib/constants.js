"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.STORAGE = exports.UPDATE_BANNER = exports.PACKAGE_ACCESS = exports.WEB_TITLE = exports.MODULE_NOT_FOUND = exports.DEFAULT_NO_README = exports.APP_ERROR = exports.API_ERROR = exports.SUPPORT_ERRORS = exports.API_MESSAGE = exports.HTTP_STATUS = exports.ROLES = exports.DEFAULT_UPLINK = exports.DEFAULT_REGISTRY = exports.TOKEN_BEARER = exports.TOKEN_BASIC = exports.ERROR_CODE = exports.HEADER_TYPE = exports.CHARACTER_ENCODING = exports.HEADERS = exports.csrPem = exports.certPem = exports.keyPem = exports.DEFAULT_MIN_LIMIT_PASSWORD = exports.DIST_TAGS = exports.TIME_EXPIRATION_7D = exports.TIME_EXPIRATION_24H = exports.DEFAULT_DOMAIN = exports.DEFAULT_PROTOCOL = exports.DEFAULT_PORT = void 0;

/**
 * @prettier
 */
const DEFAULT_PORT = '4873';
exports.DEFAULT_PORT = DEFAULT_PORT;
const DEFAULT_PROTOCOL = 'http';
exports.DEFAULT_PROTOCOL = DEFAULT_PROTOCOL;
const DEFAULT_DOMAIN = 'localhost';
exports.DEFAULT_DOMAIN = DEFAULT_DOMAIN;
const TIME_EXPIRATION_24H = '24h';
exports.TIME_EXPIRATION_24H = TIME_EXPIRATION_24H;
const TIME_EXPIRATION_7D = '7d';
exports.TIME_EXPIRATION_7D = TIME_EXPIRATION_7D;
const DIST_TAGS = 'dist-tags';
exports.DIST_TAGS = DIST_TAGS;
const DEFAULT_MIN_LIMIT_PASSWORD = 3;
exports.DEFAULT_MIN_LIMIT_PASSWORD = DEFAULT_MIN_LIMIT_PASSWORD;
const keyPem = 'verdaccio-key.pem';
exports.keyPem = keyPem;
const certPem = 'verdaccio-cert.pem';
exports.certPem = certPem;
const csrPem = 'verdaccio-csr.pem';
exports.csrPem = csrPem;
const HEADERS = {
  JSON: 'application/json',
  CONTENT_TYPE: 'Content-type',
  TEXT_PLAIN: 'text/plain',
  FORWARDED_PROTO: 'X-Forwarded-Proto',
  ETAG: 'ETag',
  JSON_CHARSET: 'application/json; charset=utf-8',
  OCTET_STREAM: 'application/octet-stream; charset=utf-8',
  TEXT_CHARSET: 'text/plain; charset=utf-8',
  WWW_AUTH: 'WWW-Authenticate',
  GZIP: 'gzip'
};
exports.HEADERS = HEADERS;
const CHARACTER_ENCODING = {
  UTF8: 'utf8'
};
exports.CHARACTER_ENCODING = CHARACTER_ENCODING;
const HEADER_TYPE = {
  CONTENT_ENCODING: 'content-encoding',
  CONTENT_TYPE: 'content-type',
  CONTENT_LENGTH: 'content-length',
  ACCEPT_ENCODING: 'accept-encoding'
};
exports.HEADER_TYPE = HEADER_TYPE;
const ERROR_CODE = {
  token_required: 'token is required'
};
exports.ERROR_CODE = ERROR_CODE;
const TOKEN_BASIC = 'Basic';
exports.TOKEN_BASIC = TOKEN_BASIC;
const TOKEN_BEARER = 'Bearer';
exports.TOKEN_BEARER = TOKEN_BEARER;
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
exports.DEFAULT_REGISTRY = DEFAULT_REGISTRY;
const DEFAULT_UPLINK = 'npmjs';
exports.DEFAULT_UPLINK = DEFAULT_UPLINK;
const ROLES = {
  $ALL: '$all',
  ALL: 'all',
  $AUTH: '$authenticated',
  $ANONYMOUS: '$anonymous',
  DEPRECATED_ALL: '@all',
  DEPRECATED_AUTH: '@authenticated',
  DEPRECATED_ANONYMOUS: '@anonymous'
};
exports.ROLES = ROLES;
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  MULTIPLE_CHOICES: 300,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNSUPPORTED_MEDIA: 415,
  BAD_DATA: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  LOOP_DETECTED: 508
};
exports.HTTP_STATUS = HTTP_STATUS;
const API_MESSAGE = {
  PKG_CREATED: 'created new package',
  PKG_CHANGED: 'package changed',
  PKG_REMOVED: 'package removed',
  PKG_PUBLISHED: 'package published',
  TARBALL_UPLOADED: 'tarball uploaded successfully',
  TARBALL_REMOVED: 'tarball removed',
  TAG_UPDATED: 'tags updated',
  TAG_REMOVED: 'tag removed',
  TAG_ADDED: 'package tagged',
  LOGGED_OUT: 'Logged out'
};
exports.API_MESSAGE = API_MESSAGE;
const SUPPORT_ERRORS = {
  PLUGIN_MISSING_INTERFACE: 'the plugin does not provide implementation of the requested feature',
  TFA_DISABLED: 'the two-factor authentication is not yet supported'
};
exports.SUPPORT_ERRORS = SUPPORT_ERRORS;
const API_ERROR = {
  PASSWORD_SHORT: (passLength = DEFAULT_MIN_LIMIT_PASSWORD) => `The provided password is too short. Please pick a password longer than ${passLength} characters.`,
  MUST_BE_LOGGED: 'You must be logged in to publish packages.',
  PLUGIN_ERROR: 'bug in the auth plugin system',
  CONFIG_BAD_FORMAT: 'config file must be an object',
  BAD_USERNAME_PASSWORD: 'bad username/password, access denied',
  NO_PACKAGE: 'no such package available',
  PACKAGE_CANNOT_BE_ADDED: 'this package cannot be added',
  BAD_DATA: 'bad data',
  NOT_ALLOWED: 'not allowed to access package',
  NOT_ALLOWED_PUBLISH: 'not allowed to publish package',
  INTERNAL_SERVER_ERROR: 'internal server error',
  UNKNOWN_ERROR: 'unknown error',
  NOT_PACKAGE_UPLINK: 'package does not exist on uplink',
  UPLINK_OFFLINE_PUBLISH: 'one of the uplinks is down, refuse to publish',
  UPLINK_OFFLINE: 'uplink is offline',
  CONTENT_MISMATCH: 'content length mismatch',
  NOT_FILE_UPLINK: "file doesn't exist on uplink",
  MAX_USERS_REACHED: 'maximum amount of users reached',
  VERSION_NOT_EXIST: "this version doesn't exist",
  FILE_NOT_FOUND: 'File not found',
  BAD_STATUS_CODE: 'bad status code',
  PACKAGE_EXIST: 'this package is already present',
  BAD_AUTH_HEADER: 'bad authorization header',
  WEB_DISABLED: 'Web interface is disabled in the config file',
  DEPRECATED_BASIC_HEADER: 'basic authentication is deprecated, please use JWT instead',
  BAD_FORMAT_USER_GROUP: 'user groups is different than an array',
  RESOURCE_UNAVAILABLE: 'resource unavailable',
  BAD_PACKAGE_DATA: 'bad incoming package data',
  USERNAME_PASSWORD_REQUIRED: 'username and password is required',
  USERNAME_ALREADY_REGISTERED: 'username is already registered'
};
exports.API_ERROR = API_ERROR;
const APP_ERROR = {
  CONFIG_NOT_VALID: 'CONFIG: it does not look like a valid config file',
  PROFILE_ERROR: 'profile unexpected error',
  PASSWORD_VALIDATION: 'not valid password'
};
exports.APP_ERROR = APP_ERROR;
const DEFAULT_NO_README = 'ERROR: No README data found!';
exports.DEFAULT_NO_README = DEFAULT_NO_README;
const MODULE_NOT_FOUND = 'MODULE_NOT_FOUND';
exports.MODULE_NOT_FOUND = MODULE_NOT_FOUND;
const WEB_TITLE = 'Verdaccio';
exports.WEB_TITLE = WEB_TITLE;
const PACKAGE_ACCESS = {
  SCOPE: '@*/*',
  ALL: '**'
};
exports.PACKAGE_ACCESS = PACKAGE_ACCESS;
const UPDATE_BANNER = {
  CHANGELOG_URL: 'https://github.com/verdaccio/verdaccio/releases/tag/'
};
exports.UPDATE_BANNER = UPDATE_BANNER;
const STORAGE = {
  PACKAGE_FILE_NAME: 'package.json',
  FILE_EXIST_ERROR: 'EEXISTS',
  NO_SUCH_FILE_ERROR: 'ENOENT',
  DEFAULT_REVISION: '0-0000000000000000'
};
exports.STORAGE = STORAGE;