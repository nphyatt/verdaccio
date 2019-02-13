"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getUserAgent = getUserAgent;
exports.convertPayloadToBase64 = convertPayloadToBase64;
exports.validatePackage = validatePackage;
exports.validateName = validateName;
exports.isObject = isObject;
exports.validateMetadata = validateMetadata;
exports.combineBaseUrl = combineBaseUrl;
exports.extractTarballFromUrl = extractTarballFromUrl;
exports.convertDistRemoteToLocalTarballUrls = convertDistRemoteToLocalTarballUrls;
exports.getLocalRegistryTarballUri = getLocalRegistryTarballUri;
exports.tagVersion = tagVersion;
exports.getVersion = getVersion;
exports.parseAddress = parseAddress;
exports.semverSort = semverSort;
exports.normalizeDistTags = normalizeDistTags;
exports.parseInterval = parseInterval;
exports.getWebProtocol = getWebProtocol;
exports.getLatestVersion = getLatestVersion;
exports.parseConfigFile = parseConfigFile;
exports.folderExists = folderExists;
exports.fileExists = fileExists;
exports.sortByName = sortByName;
exports.addScope = addScope;
exports.deleteProperties = deleteProperties;
exports.addGravatarSupport = addGravatarSupport;
exports.parseReadme = parseReadme;
exports.buildToken = buildToken;
exports.getVersionFromTarball = getVersionFromTarball;
exports.ErrorCode = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _fs = _interopRequireDefault(require("fs"));

var _assert = _interopRequireDefault(require("assert"));

var _semver = _interopRequireDefault(require("semver"));

var _jsYaml = _interopRequireDefault(require("js-yaml"));

var _url = _interopRequireDefault(require("url"));

var _httpErrors = _interopRequireDefault(require("http-errors"));

var _marked = _interopRequireDefault(require("marked"));

var _constants = require("./constants");

var _user = require("../utils/user");

var _storageUtils = require("./storage-utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const Logger = require('./logger');

const pkginfo = require('pkginfo')(module); // eslint-disable-line no-unused-vars


const pkgVersion = module.exports.version;
const pkgName = module.exports.name;

function getUserAgent() {
  (0, _assert.default)(_lodash.default.isString(pkgName));
  (0, _assert.default)(_lodash.default.isString(pkgVersion));
  return `${pkgName}/${pkgVersion}`;
}

function convertPayloadToBase64(payload) {
  return new Buffer(payload, 'base64');
}
/**
 * Validate a package.
 * @return {Boolean} whether the package is valid or not
 */


function validatePackage(name) {
  const nameList = name.split('/', 2);

  if (nameList.length === 1) {
    // normal package
    return validateName(nameList[0]);
  } else {
    // scoped package
    return nameList[0][0] === '@' && validateName(nameList[0].slice(1)) && validateName(nameList[1]);
  }
}
/**
 * From normalize-package-data/lib/fixer.js
 * @param {*} name  the package name
 * @return {Boolean} whether is valid or not
 */


function validateName(name) {
  if (_lodash.default.isString(name) === false) {
    return false;
  }

  const normalizedName = name.toLowerCase(); // all URL-safe characters and "@" for issue #75

  return !(!normalizedName.match(/^[-a-zA-Z0-9_.!~*'()@]+$/) || normalizedName.charAt(0) === '.' || // ".bin", etc.
  normalizedName.charAt(0) === '-' || // "-" is reserved by couchdb
  normalizedName === 'node_modules' || normalizedName === '__proto__' || normalizedName === 'favicon.ico');
}
/**
 * Check whether an element is an Object
 * @param {*} obj the element
 * @return {Boolean}
 */


function isObject(obj) {
  return _lodash.default.isObject(obj) && _lodash.default.isNull(obj) === false && _lodash.default.isArray(obj) === false;
}
/**
 * Validate the package metadata, add additional properties whether are missing within
 * the metadata properties.
 * @param {*} object
 * @param {*} name
 * @return {Object} the object with additional properties as dist-tags ad versions
 */


function validateMetadata(object, name) {
  (0, _assert.default)(isObject(object), 'not a json object');

  _assert.default.strictEqual(object.name, name);

  if (!isObject(object[_constants.DIST_TAGS])) {
    object[_constants.DIST_TAGS] = {};
  }

  if (!isObject(object['versions'])) {
    object['versions'] = {};
  }

  if (!isObject(object['time'])) {
    object['time'] = {};
  }

  return object;
}
/**
 * Create base url for registry.
 * @return {String} base registry url
 */


function combineBaseUrl(protocol, host, prefix) {
  let result = `${protocol}://${host}`;

  if (prefix) {
    prefix = prefix.replace(/\/$/, '');
    result = prefix.indexOf('/') === 0 ? `${result}${prefix}` : prefix;
  }

  return result;
}

function extractTarballFromUrl(url) {
  // $FlowFixMe
  return _url.default.parse(url).pathname.replace(/^.*\//, '');
}
/**
 * Iterate a packages's versions and filter each original tarball url.
 * @param {*} pkg
 * @param {*} req
 * @param {*} config
 * @return {String} a filtered package
 */


function convertDistRemoteToLocalTarballUrls(pkg, req, urlPrefix) {
  for (const ver in pkg.versions) {
    if (Object.prototype.hasOwnProperty.call(pkg.versions, ver)) {
      const distName = pkg.versions[ver].dist;

      if (_lodash.default.isNull(distName) === false && _lodash.default.isNull(distName.tarball) === false) {
        distName.tarball = getLocalRegistryTarballUri(distName.tarball, pkg.name, req, urlPrefix);
      }
    }
  }

  return pkg;
}
/**
 * Filter a tarball url.
 * @param {*} uri
 * @return {String} a parsed url
 */


function getLocalRegistryTarballUri(uri, pkgName, req, urlPrefix) {
  const currentHost = req.headers.host;

  if (!currentHost) {
    return uri;
  }

  const tarballName = extractTarballFromUrl(uri);
  const domainRegistry = combineBaseUrl(getWebProtocol(req.get(_constants.HEADERS.FORWARDED_PROTO), req.protocol), req.headers.host, urlPrefix);
  return `${domainRegistry}/${pkgName.replace(/\//g, '%2f')}/-/${tarballName}`;
}
/**
 * Create a tag for a package
 * @param {*} data
 * @param {*} version
 * @param {*} tag
 * @return {Boolean} whether a package has been tagged
 */


function tagVersion(data, version, tag) {
  if (tag && data[_constants.DIST_TAGS][tag] !== version && _semver.default.parse(version, true)) {
    // valid version - store
    data[_constants.DIST_TAGS][tag] = version;
    return true;
  }

  return false;
}
/**
 * Gets version from a package object taking into account semver weirdness.
 * @return {String} return the semantic version of a package
 */


function getVersion(pkg, version) {
  // this condition must allow cast
  if (_lodash.default.isNil(pkg.versions[version]) === false) {
    return pkg.versions[version];
  }

  try {
    version = _semver.default.parse(version, true);

    for (const versionItem in pkg.versions) {
      // $FlowFixMe
      if (version.compare(_semver.default.parse(versionItem, true)) === 0) {
        return pkg.versions[versionItem];
      }
    }
  } catch (err) {
    return undefined;
  }
}
/**
 * Parse an internet address
 * Allow:
 - https:localhost:1234        - protocol + host + port
 - localhost:1234              - host + port
 - 1234                        - port
 - http::1234                  - protocol + port
 - https://localhost:443/      - full url + https
 - http://[::1]:443/           - ipv6
 - unix:/tmp/http.sock         - unix sockets
 - https://unix:/tmp/http.sock - unix sockets (https)
 * @param {*} urlAddress the internet address definition
 * @return {Object|Null} literal object that represent the address parsed
 */


function parseAddress(urlAddress) {
  //
  // TODO: refactor it to something more reasonable?
  //
  //        protocol :  //      (  host  )|(    ipv6     ):  port  /
  let urlPattern = /^((https?):(\/\/)?)?((([^\/:]*)|\[([^\[\]]+)\]):)?(\d+)\/?$/.exec(urlAddress);

  if (urlPattern) {
    return {
      proto: urlPattern[2] || _constants.DEFAULT_PROTOCOL,
      host: urlPattern[6] || urlPattern[7] || _constants.DEFAULT_DOMAIN,
      port: urlPattern[8] || _constants.DEFAULT_PORT
    };
  }

  urlPattern = /^((https?):(\/\/)?)?unix:(.*)$/.exec(urlAddress);

  if (urlPattern) {
    return {
      proto: urlPattern[2] || _constants.DEFAULT_PROTOCOL,
      path: urlPattern[4]
    };
  }

  return null;
}
/**
 * Function filters out bad semver versions and sorts the array.
 * @return {Array} sorted Array
 */


function semverSort(listVersions) {
  return listVersions.filter(function (x) {
    if (!_semver.default.parse(x, true)) {
      Logger.logger.warn({
        ver: x
      }, 'ignoring bad version @{ver}');
      return false;
    }

    return true;
  }).sort(_semver.default.compareLoose).map(String);
}
/**
 * Flatten arrays of tags.
 * @param {*} data
 */


function normalizeDistTags(pkg) {
  let sorted;

  if (!pkg[_constants.DIST_TAGS].latest) {
    // overwrite latest with highest known version based on semver sort
    sorted = semverSort(Object.keys(pkg.versions));

    if (sorted && sorted.length) {
      pkg[_constants.DIST_TAGS].latest = sorted.pop();
    }
  }

  for (const tag in pkg[_constants.DIST_TAGS]) {
    if (_lodash.default.isArray(pkg[_constants.DIST_TAGS][tag])) {
      if (pkg[_constants.DIST_TAGS][tag].length) {
        // sort array
        // $FlowFixMe
        sorted = semverSort(pkg[_constants.DIST_TAGS][tag]);

        if (sorted.length) {
          // use highest version based on semver sort
          pkg[_constants.DIST_TAGS][tag] = sorted.pop();
        }
      } else {
        delete pkg[_constants.DIST_TAGS][tag];
      }
    } else if (_lodash.default.isString(pkg[_constants.DIST_TAGS][tag])) {
      if (!_semver.default.parse(pkg[_constants.DIST_TAGS][tag], true)) {
        // if the version is invalid, delete the dist-tag entry
        delete pkg[_constants.DIST_TAGS][tag];
      }
    }
  }
}

const parseIntervalTable = {
  '': 1000,
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 86400000,
  w: 7 * 86400000,
  M: 30 * 86400000,
  y: 365 * 86400000
};
/**
 * Parse an internal string to number
 * @param {*} interval
 * @return {Number}
 */

function parseInterval(interval) {
  if (typeof interval === 'number') {
    return interval * 1000;
  }

  let result = 0;
  let last_suffix = Infinity;
  interval.split(/\s+/).forEach(function (x) {
    if (!x) return;
    const m = x.match(/^((0|[1-9][0-9]*)(\.[0-9]+)?)(ms|s|m|h|d|w|M|y|)$/);

    if (!m || parseIntervalTable[m[4]] >= last_suffix || m[4] === '' && last_suffix !== Infinity) {
      throw Error('invalid interval: ' + interval);
    }

    last_suffix = parseIntervalTable[m[4]];
    result += Number(m[1]) * parseIntervalTable[m[4]];
  });
  return result;
}
/**
 * Detect running protocol (http or https)
 */


function getWebProtocol(headerProtocol, protocol) {
  if (typeof headerProtocol === 'string' && headerProtocol !== '') {
    const commaIndex = headerProtocol.indexOf(',');
    return commaIndex > 0 ? headerProtocol.substr(0, commaIndex) : headerProtocol;
  }

  return protocol;
}

function getLatestVersion(pkgInfo) {
  return pkgInfo[_constants.DIST_TAGS].latest;
}

const ErrorCode = {
  getConflict: (message = _constants.API_ERROR.PACKAGE_EXIST) => {
    return (0, _httpErrors.default)(_constants.HTTP_STATUS.CONFLICT, message);
  },
  getBadData: customMessage => {
    return (0, _httpErrors.default)(_constants.HTTP_STATUS.BAD_DATA, customMessage || _constants.API_ERROR.BAD_DATA);
  },
  getBadRequest: customMessage => {
    return (0, _httpErrors.default)(_constants.HTTP_STATUS.BAD_REQUEST, customMessage);
  },
  getInternalError: customMessage => {
    return customMessage ? (0, _httpErrors.default)(_constants.HTTP_STATUS.INTERNAL_ERROR, customMessage) : (0, _httpErrors.default)(_constants.HTTP_STATUS.INTERNAL_ERROR);
  },
  getUnauthorized: (message = 'no credentials provided') => {
    return (0, _httpErrors.default)(_constants.HTTP_STATUS.UNAUTHORIZED, message);
  },
  getForbidden: (message = "can't use this filename") => {
    return (0, _httpErrors.default)(_constants.HTTP_STATUS.FORBIDDEN, message);
  },
  getServiceUnavailable: (message = _constants.API_ERROR.RESOURCE_UNAVAILABLE) => {
    return (0, _httpErrors.default)(_constants.HTTP_STATUS.SERVICE_UNAVAILABLE, message);
  },
  getNotFound: customMessage => {
    return (0, _httpErrors.default)(_constants.HTTP_STATUS.NOT_FOUND, customMessage || _constants.API_ERROR.NO_PACKAGE);
  },
  getCode: (statusCode, customMessage) => {
    return (0, _httpErrors.default)(statusCode, customMessage);
  }
};
exports.ErrorCode = ErrorCode;

function parseConfigFile(configPath) {
  return _jsYaml.default.safeLoad(_fs.default.readFileSync(configPath, _constants.CHARACTER_ENCODING.UTF8));
}
/**
 * Check whether the path already exist.
 * @param {String} path
 * @return {Boolean}
 */


function folderExists(path) {
  try {
    const stat = _fs.default.statSync(path);

    return stat.isDirectory();
  } catch (_) {
    return false;
  }
}
/**
 * Check whether the file already exist.
 * @param {String} path
 * @return {Boolean}
 */


function fileExists(path) {
  try {
    const stat = _fs.default.statSync(path);

    return stat.isFile();
  } catch (_) {
    return false;
  }
}

function sortByName(packages) {
  return packages.sort(function (a, b) {
    if (a.name < b.name) {
      return -1;
    } else {
      return 1;
    }
  });
}

function addScope(scope, packageName) {
  return `@${scope}/${packageName}`;
}

function deleteProperties(propertiesToDelete, objectItem) {
  _lodash.default.forEach(propertiesToDelete, property => {
    delete objectItem[property];
  });

  return objectItem;
}

function addGravatarSupport(pkgInfo, online = true) {
  const pkgInfoCopy = _objectSpread({}, pkgInfo);

  const author = _lodash.default.get(pkgInfo, 'latest.author', null);

  const contributors = (0, _storageUtils.normalizeContributors)(_lodash.default.get(pkgInfo, 'latest.contributors', []));

  const maintainers = _lodash.default.get(pkgInfo, 'latest.maintainers', []); // for author.


  if (author && _lodash.default.isObject(author)) {
    pkgInfoCopy.latest.author.avatar = (0, _user.generateGravatarUrl)(author.email, online);
  }

  if (author && _lodash.default.isString(author)) {
    pkgInfoCopy.latest.author = {
      avatar: _user.GENERIC_AVATAR,
      email: '',
      author
    };
  } // for contributors


  if (_lodash.default.isEmpty(contributors) === false) {
    pkgInfoCopy.latest.contributors = contributors.map(contributor => {
      if (isObject(contributor)) {
        // $FlowFixMe
        contributor.avatar = (0, _user.generateGravatarUrl)(contributor.email, online);
      } else if (_lodash.default.isString(contributor)) {
        contributor = {
          avatar: _user.GENERIC_AVATAR,
          email: contributor,
          name: contributor
        };
      }

      return contributor;
    });
  } // for maintainers


  if (_lodash.default.isEmpty(maintainers) === false) {
    pkgInfoCopy.latest.maintainers = maintainers.map(maintainer => {
      maintainer.avatar = (0, _user.generateGravatarUrl)(maintainer.email, online);
      return maintainer;
    });
  }

  return pkgInfoCopy;
}
/**
 * parse package readme - markdown/ascii
 * @param {String} packageName name of package
 * @param {String} readme package readme
 * @return {String} converted html template
 */


function parseReadme(packageName, readme) {
  if (readme) {
    return (0, _marked.default)(readme);
  } // logs readme not found error


  Logger.logger.error({
    packageName
  }, '@{packageName}: No readme found');
  return (0, _marked.default)('ERROR: No README data found!');
}

function buildToken(type, token) {
  return `${_lodash.default.capitalize(type)} ${token}`;
}
/**
 * return package version from tarball name
 * @param {String} name
 * @returns {String}
 */


function getVersionFromTarball(name) {
  // $FlowFixMe
  return /.+-(\d.+)\.tgz/.test(name) ? name.match(/.+-(\d.+)\.tgz/)[1] : undefined;
}