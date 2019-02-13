"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _assert = _interopRequireDefault(require("assert"));

var _cryptoUtils = require("./crypto-utils");

var _configUtils = require("./config-utils");

var _utils = require("./utils");

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const LoggerApi = require('./logger');

const strategicConfigProps = ['uplinks', 'packages'];
const allowedEnvConfig = ['http_proxy', 'https_proxy', 'no_proxy'];
/**
 * Coordinates the application configuration
 */

class Config {
  constructor(config) {
    _defineProperty(this, "logger", void 0);

    _defineProperty(this, "user_agent", void 0);

    _defineProperty(this, "secret", void 0);

    _defineProperty(this, "uplinks", void 0);

    _defineProperty(this, "packages", void 0);

    _defineProperty(this, "users", void 0);

    _defineProperty(this, "server_id", void 0);

    _defineProperty(this, "self_path", void 0);

    _defineProperty(this, "storage", void 0);

    _defineProperty(this, "plugins", void 0);

    _defineProperty(this, "security", void 0);

    _defineProperty(this, "$key", void 0);

    _defineProperty(this, "$value", void 0);

    const self = this;
    this.logger = LoggerApi.logger;
    this.self_path = config.self_path;
    this.storage = config.storage;
    this.plugins = config.plugins;

    for (const configProp in config) {
      if (self[configProp] == null) {
        self[configProp] = config[configProp];
      }
    }

    if (_lodash.default.isNil(this.user_agent)) {
      this.user_agent = (0, _utils.getUserAgent)();
    } // some weird shell scripts are valid yaml files parsed as string


    (0, _assert.default)(_lodash.default.isObject(config), _constants.APP_ERROR.CONFIG_NOT_VALID); // sanity check for strategic config properties

    strategicConfigProps.forEach(function (x) {
      if (self[x] == null) {
        self[x] = {};
      }

      (0, _assert.default)((0, _utils.isObject)(self[x]), `CONFIG: bad "${x}" value (object expected)`);
    });
    this.uplinks = (0, _configUtils.sanityCheckUplinksProps)((0, _configUtils.uplinkSanityCheck)(this.uplinks));

    if (_lodash.default.isNil(this.users) === false) {
      this.logger.warn(`[users]: property on configuration file
      is not longer supported, property being ignored`);
    }

    this.packages = (0, _configUtils.normalisePackageAccess)(self.packages); // loading these from ENV if aren't in config

    allowedEnvConfig.forEach(envConf => {
      if (!(envConf in self)) {
        self[envConf] = process.env[envConf] || process.env[envConf.toUpperCase()];
      }
    }); // unique identifier of self server (or a cluster), used to avoid loops

    if (!this.server_id) {
      this.server_id = (0, _cryptoUtils.generateRandomHexString)(6);
    }
  }
  /**
   * Check for package spec
   */


  getMatchedPackagesSpec(pkgName) {
    return (0, _configUtils.getMatchedPackagesSpec)(pkgName, this.packages);
  }
  /**
   * Store or create whether receive a secret key
   */


  checkSecretKey(secret) {
    if (_lodash.default.isString(secret) && _lodash.default.isEmpty(secret) === false) {
      this.secret = secret;
      return secret;
    } // it generates a secret key
    // FUTURE: this might be an external secret key, perhaps within config file?


    this.secret = (0, _cryptoUtils.generateRandomHexString)(32);
    return this.secret;
  }

}

var _default = Config;
exports.default = _default;