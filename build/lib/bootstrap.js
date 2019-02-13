"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startVerdaccio = startVerdaccio;
exports.listenDefaultCallback = listenDefaultCallback;

var _lodash = require("lodash");

var _url = _interopRequireDefault(require("url"));

var _fs = _interopRequireDefault(require("fs"));

var _http = _interopRequireDefault(require("http"));

var _https = _interopRequireDefault(require("https"));

var _constants = _interopRequireDefault(require("constants"));

var _index = _interopRequireDefault(require("../api/index"));

var _utils = require("./cli/utils");

var _constants2 = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
// $FlowFixMe
const logger = require('./logger');
/**
 * Trigger the server after configuration has been loaded.
 * @param {Object} config
 * @param {Object} cliArguments
 * @param {String} configPath
 * @param {String} pkgVersion
 * @param {String} pkgName
 */


function startVerdaccio(config, cliListen, configPath, pkgVersion, pkgName, callback) {
  if ((0, _lodash.isObject)(config) === false) {
    throw new Error(_constants2.API_ERROR.CONFIG_BAD_FORMAT);
  }

  (0, _index.default)(config).then(app => {
    const addresses = (0, _utils.getListListenAddresses)(cliListen, config.listen);
    addresses.forEach(function (addr) {
      let webServer;

      if (addr.proto === 'https') {
        // https  must either have key cert and ca  or a pfx and (optionally) a passphrase
        if (!config.https || !(config.https.key && config.https.cert && config.https.ca || config.https.pfx)) {
          logHTTPSWarning(configPath);
        }

        webServer = handleHTTPS(app, configPath, config);
      } else {
        // http
        webServer = _http.default.createServer(app);
      }

      if (config.server && config.server.keepAliveTimeout) {
        // $FlowFixMe library definition for node is not up to date (doesn't contain recent 8.0 changes)
        webServer.keepAliveTimeout = config.server.keepAliveTimeout * 1000;
      }

      unlinkAddressPath(addr);
      callback(webServer, addr, pkgName, pkgVersion);
    });
  });
}

function unlinkAddressPath(addr) {
  if (addr.path && _fs.default.existsSync(addr.path)) {
    _fs.default.unlinkSync(addr.path);
  }
}

function logHTTPSWarning(storageLocation) {
  logger.logger.fatal(['You have enabled HTTPS and need to specify either ', '    "https.key", "https.cert" and "https.ca" or ', '    "https.pfx" and optionally "https.passphrase" ', 'to run https server', '', // commands are borrowed from node.js docs
  'To quickly create self-signed certificate, use:', ' $ openssl genrsa -out ' + (0, _utils.resolveConfigPath)(storageLocation, _constants2.keyPem) + ' 2048', ' $ openssl req -new -sha256 -key ' + (0, _utils.resolveConfigPath)(storageLocation, _constants2.keyPem) + ' -out ' + (0, _utils.resolveConfigPath)(storageLocation, _constants2.csrPem), ' $ openssl x509 -req -in ' + (0, _utils.resolveConfigPath)(storageLocation, _constants2.csrPem) + ' -signkey ' + (0, _utils.resolveConfigPath)(storageLocation, _constants2.keyPem) + ' -out ' + (0, _utils.resolveConfigPath)(storageLocation, _constants2.certPem), '', 'And then add to config file (' + storageLocation + '):', '  https:', `    key: ${(0, _utils.resolveConfigPath)(storageLocation, _constants2.keyPem)}`, `    cert: ${(0, _utils.resolveConfigPath)(storageLocation, _constants2.certPem)}`, `    ca: ${(0, _utils.resolveConfigPath)(storageLocation, _constants2.csrPem)}`].join('\n'));
  process.exit(2);
}

function handleHTTPS(app, configPath, config) {
  try {
    let httpsOptions = {
      secureOptions: _constants.default.SSL_OP_NO_SSLv2 | _constants.default.SSL_OP_NO_SSLv3 // disable insecure SSLv2 and SSLv3

    };

    if (config.https.pfx) {
      httpsOptions = (0, _lodash.assign)(httpsOptions, {
        pfx: _fs.default.readFileSync(config.https.pfx),
        passphrase: config.https.passphrase || ''
      });
    } else {
      httpsOptions = (0, _lodash.assign)(httpsOptions, {
        key: _fs.default.readFileSync(config.https.key),
        cert: _fs.default.readFileSync(config.https.cert),
        ca: _fs.default.readFileSync(config.https.ca)
      });
    }

    return _https.default.createServer(httpsOptions, app);
  } catch (err) {
    // catch errors related to certificate loading
    logger.logger.fatal({
      err: err
    }, 'cannot create server: @{err.message}');
    process.exit(2);
  }
}

function listenDefaultCallback(webServer, addr, pkgName, pkgVersion) {
  webServer.listen(addr.port || addr.path, addr.host, () => {
    // send a message for tests
    if ((0, _lodash.isFunction)(process.send)) {
      process.send({
        verdaccio_started: true
      });
    }
  }) // $FlowFixMe
  .on('error', function (err) {
    logger.logger.fatal({
      err: err
    }, 'cannot create server: @{err.message}');
    process.exit(2);
  });
  logger.logger.warn({
    addr: addr.path ? _url.default.format({
      protocol: 'unix',
      pathname: addr.path
    }) : _url.default.format({
      protocol: addr.proto,
      hostname: addr.host,
      port: addr.port,
      pathname: '/'
    }),
    version: pkgName + '/' + pkgVersion
  }, 'http address - @{addr} - @{version}');
}