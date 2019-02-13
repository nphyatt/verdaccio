"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _lodash = _interopRequireDefault(require("lodash"));

var _path = _interopRequireDefault(require("path"));

var _logger = _interopRequireDefault(require("./logger"));

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _utils = require("./utils");

var _constants = require("./constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
const CONFIG_FILE = 'config.yaml';
const XDG = 'xdg';
const WIN = 'win';
const WIN32 = 'win32';

const pkgJSON = require('../../package.json');
/**
 * Find and get the first config file that match.
 * @return {String} the config file path
 */


function findConfigFile(configPath) {
  if (_lodash.default.isNil(configPath) === false) {
    return _path.default.resolve(configPath);
  }

  const configPaths = getConfigPaths();

  if (_lodash.default.isEmpty(configPaths)) {
    throw new Error('no configuration files can be processed');
  }

  const primaryConf = _lodash.default.find(configPaths, configLocation => (0, _utils.fileExists)(configLocation.path));

  if (_lodash.default.isNil(primaryConf) === false) {
    return primaryConf.path;
  }

  return createConfigFile(_lodash.default.head(configPaths)).path;
}

function createConfigFile(configLocation) {
  createConfigFolder(configLocation);
  const defaultConfig = updateStorageLinks(configLocation, readDefaultConfig());

  _fs.default.writeFileSync(configLocation.path, defaultConfig);

  return configLocation;
}

function readDefaultConfig() {
  return _fs.default.readFileSync(require.resolve('../../conf/default.yaml'), _constants.CHARACTER_ENCODING.UTF8);
}

function createConfigFolder(configLocation) {
  _mkdirp.default.sync(_path.default.dirname(configLocation.path));

  _logger.default.logger.info({
    file: configLocation.path
  }, 'Creating default config file in @{file}');
}

function updateStorageLinks(configLocation, defaultConfig) {
  if (configLocation.type !== XDG) {
    return defaultConfig;
  } // $XDG_DATA_HOME defines the base directory relative to which user specific data files should be stored,
  // If $XDG_DATA_HOME is either not set or empty, a default equal to $HOME/.local/share should be used.
  // $FlowFixMe


  let dataDir = process.env.XDG_DATA_HOME || _path.default.join(process.env.HOME, '.local', 'share');

  if ((0, _utils.folderExists)(dataDir)) {
    dataDir = _path.default.resolve(_path.default.join(dataDir, pkgJSON.name, 'storage'));
    return defaultConfig.replace(/^storage: .\/storage$/m, `storage: ${dataDir}`);
  } else {
    return defaultConfig;
  }
}

function getConfigPaths() {
  return [getXDGDirectory(), getWindowsDirectory(), getRelativeDefaultDirectory(), getOldDirectory()].filter(path => !!path);
}

const getXDGDirectory = () => {
  const XDGConfig = getXDGHome() || process.env.HOME && _path.default.join(process.env.HOME, '.config');

  if (XDGConfig && (0, _utils.folderExists)(XDGConfig)) {
    return {
      path: _path.default.join(XDGConfig, pkgJSON.name, CONFIG_FILE),
      type: XDG
    };
  }
};

const getXDGHome = () => process.env.XDG_CONFIG_HOME;

const getWindowsDirectory = () => {
  if (process.platform === WIN32 && process.env.APPDATA && (0, _utils.folderExists)(process.env.APPDATA)) {
    return {
      path: _path.default.resolve(_path.default.join(process.env.APPDATA, pkgJSON.name, CONFIG_FILE)),
      type: WIN
    };
  }
};

const getRelativeDefaultDirectory = () => {
  return {
    path: _path.default.resolve(_path.default.join('.', pkgJSON.name, CONFIG_FILE)),
    type: 'def'
  };
};

const getOldDirectory = () => {
  return {
    path: _path.default.resolve(_path.default.join('.', CONFIG_FILE)),
    type: 'old'
  };
};

var _default = findConfigFile;
exports.default = _default;