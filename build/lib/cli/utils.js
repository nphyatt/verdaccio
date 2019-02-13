"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getListListenAddresses = getListListenAddresses;
exports.resolveConfigPath = void 0;

var _path = _interopRequireDefault(require("path"));

var _utils = require("../utils");

var _constants = require("../constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
const logger = require('../logger');

const resolveConfigPath = function (storageLocation, file) {
  return _path.default.resolve(_path.default.dirname(storageLocation), file);
};
/**
 * Retrieve all addresses defined in the config file.
 * Verdaccio is able to listen multiple ports
 * @param {String} argListen
 * @param {String} configListen
 * eg:
 *  listen:
 - localhost:5555
 - localhost:5557
 @return {Array}
 */


exports.resolveConfigPath = resolveConfigPath;

function getListListenAddresses(argListen, configListen) {
  // command line || config file || default
  let addresses;

  if (argListen) {
    addresses = [argListen];
  } else if (Array.isArray(configListen)) {
    addresses = configListen;
  } else if (configListen) {
    addresses = [configListen];
  } else {
    addresses = [_constants.DEFAULT_PORT];
  }

  addresses = addresses.map(function (addr) {
    const parsedAddr = (0, _utils.parseAddress)(addr);

    if (!parsedAddr) {
      logger.logger.warn({
        addr: addr
      }, 'invalid address - @{addr}, we expect a port (e.g. "4873"),' + ' host:port (e.g. "localhost:4873") or full url' + ' (e.g. "http://localhost:4873/")');
    }

    return parsedAddr;
  }).filter(Boolean);
  return addresses;
}