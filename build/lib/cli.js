#!/usr/bin/env node

/* eslint no-sync:0 */

/* eslint no-empty:0 */

/**
 * @prettier
 */
"use strict";

var _path = _interopRequireDefault(require("path"));

var _semver = _interopRequireDefault(require("semver"));

var _chalk = _interopRequireDefault(require("chalk"));

var _bootstrap = require("./bootstrap");

var _configPath = _interopRequireDefault(require("./config-path"));

var _updateBanner = require("./update-banner");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

if (process.getuid && process.getuid() === 0) {
  global.console.warn(_chalk.default.bgYellow('Verdaccio doesn\'t need superuser privileges. Don\'t run it under root.'));
}

const MIN_NODE_VERSION = '6.9.0';

if (_semver.default.satisfies(process.version, `>=${MIN_NODE_VERSION}`) === false) {
  global.console.error(_chalk.default.bgRed(`Verdaccio requires at least Node.js ${MIN_NODE_VERSION} or higher, please upgrade your Node.js distribution`));
  process.exit(1);
}

process.title = 'verdaccio';

const logger = require('./logger');

logger.setup(); // default setup

const commander = require('commander');

const pkginfo = require('pkginfo')(module); // eslint-disable-line no-unused-vars


const pkgVersion = module.exports.version;
const pkgName = module.exports.name;
/**
 * Checking verdaccio version on NPM
 */

(0, _updateBanner.verdaccioUpdateBanner)(pkgVersion);
commander.option('-l, --listen <[host:]port>', 'host:port number to listen on (default: localhost:4873)').option('-c, --config <config.yaml>', 'use this configuration file (default: ./config.yaml)').version(pkgVersion).parse(process.argv);

if (commander.args.length == 1 && !commander.config) {
  // handling "verdaccio [config]" case if "-c" is missing in command line
  commander.config = commander.args.pop();
}

if (commander.args.length !== 0) {
  commander.help();
}

let verdaccioConfiguration;
let configPathLocation;
const cliListener = commander.listen;

try {
  configPathLocation = (0, _configPath.default)(commander.config);
  verdaccioConfiguration = (0, _utils.parseConfigFile)(configPathLocation);
  process.title = verdaccioConfiguration.web && verdaccioConfiguration.web.title || 'verdaccio';

  if (!verdaccioConfiguration.self_path) {
    verdaccioConfiguration.self_path = _path.default.resolve(configPathLocation);
  }

  if (!verdaccioConfiguration.https) {
    verdaccioConfiguration.https = {
      enable: false
    };
  }

  logger.logger.warn({
    file: configPathLocation
  }, 'config file  - @{file}');
  (0, _bootstrap.startVerdaccio)(verdaccioConfiguration, cliListener, configPathLocation, pkgVersion, pkgName, _bootstrap.listenDefaultCallback);
} catch (err) {
  logger.logger.fatal({
    file: configPathLocation,
    err: err
  }, 'cannot open config file @{file}: @{!err.message}');
  process.exit(1);
}

process.on('uncaughtException', function (err) {
  logger.logger.fatal({
    err: err
  }, 'uncaught exception, please report this\n@{err.stack}');
  process.exit(255);
});