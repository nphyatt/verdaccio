"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setupUpLinks = setupUpLinks;
exports.updateVersionsHiddenUpLink = updateVersionsHiddenUpLink;

var _upStorage = _interopRequireDefault(require("./up-storage"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */

/**
 * Set up the Up Storage for each link.
 */
function setupUpLinks(config) {
  const uplinks = {};

  for (const uplinkName in config.uplinks) {
    if (Object.prototype.hasOwnProperty.call(config.uplinks, uplinkName)) {
      // instance for each up-link definition
      const proxy = new _upStorage.default(config.uplinks[uplinkName], config);
      proxy.upname = uplinkName;
      uplinks[uplinkName] = proxy;
    }
  }

  return uplinks;
}

function updateVersionsHiddenUpLink(versions, upLink) {
  for (const i in versions) {
    if (Object.prototype.hasOwnProperty.call(versions, i)) {
      const version = versions[i]; // holds a "hidden" value to be used by the package storage.
      // $FlowFixMe

      version[Symbol.for('__verdaccio_uplink')] = upLink.upname;
    }
  }
}