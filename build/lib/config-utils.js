"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalizeUserList = normalizeUserList;
exports.uplinkSanityCheck = uplinkSanityCheck;
exports.sanityCheckNames = sanityCheckNames;
exports.sanityCheckUplinksProps = sanityCheckUplinksProps;
exports.hasProxyTo = hasProxyTo;
exports.getMatchedPackagesSpec = getMatchedPackagesSpec;
exports.normalisePackageAccess = normalisePackageAccess;

var _lodash = _interopRequireDefault(require("lodash"));

var _assert = _interopRequireDefault(require("assert"));

var _minimatch = _interopRequireDefault(require("minimatch"));

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const BLACKLIST = {
  all: true,
  anonymous: true,
  undefined: true,
  owner: true,
  none: true
};
/**
 * Normalize user list.
 * @return {Array}
 */

function normalizeUserList(oldFormat, newFormat) {
  const result = [];
  /* eslint prefer-rest-params: "off" */

  for (let i = 0; i < arguments.length; i++) {
    if (arguments[i] == null) {
      continue;
    } // if it's a string, split it to array


    if (_lodash.default.isString(arguments[i])) {
      result.push(arguments[i].split(/\s+/));
    } else if (Array.isArray(arguments[i])) {
      result.push(arguments[i]);
    } else {
      throw _utils.ErrorCode.getInternalError('CONFIG: bad package acl (array or string expected): ' + JSON.stringify(arguments[i]));
    }
  }

  return _lodash.default.flatten(result);
}

function uplinkSanityCheck(uplinks, users = BLACKLIST) {
  const newUplinks = _lodash.default.clone(uplinks);

  let newUsers = _lodash.default.clone(users);

  for (const uplink in newUplinks) {
    if (Object.prototype.hasOwnProperty.call(newUplinks, uplink)) {
      if (_lodash.default.isNil(newUplinks[uplink].cache)) {
        newUplinks[uplink].cache = true;
      }

      newUsers = sanityCheckNames(uplink, newUsers);
    }
  }

  return newUplinks;
}

function sanityCheckNames(item, users) {
  (0, _assert.default)(item !== 'all' && item !== 'owner' && item !== 'anonymous' && item !== 'undefined' && item !== 'none', 'CONFIG: reserved uplink name: ' + item);
  (0, _assert.default)(!item.match(/\s/), 'CONFIG: invalid uplink name: ' + item);
  (0, _assert.default)(_lodash.default.isNil(users[item]), 'CONFIG: duplicate uplink name: ' + item);
  users[item] = true;
  return users;
}

function sanityCheckUplinksProps(configUpLinks) {
  const uplinks = _lodash.default.clone(configUpLinks);

  for (const uplink in uplinks) {
    if (Object.prototype.hasOwnProperty.call(uplinks, uplink)) {
      (0, _assert.default)(uplinks[uplink].url, 'CONFIG: no url for uplink: ' + uplink);
      (0, _assert.default)(_lodash.default.isString(uplinks[uplink].url), 'CONFIG: wrong url format for uplink: ' + uplink);
      uplinks[uplink].url = uplinks[uplink].url.replace(/\/$/, '');
    }
  }

  return uplinks;
}
/**
 * Check whether an uplink can proxy
 */


function hasProxyTo(pkg, upLink, packages) {
  const matchedPkg = getMatchedPackagesSpec(pkg, packages);
  const proxyList = typeof matchedPkg !== 'undefined' ? matchedPkg.proxy : [];

  if (proxyList) {
    return proxyList.some(curr => upLink === curr);
  }

  return false;
}

function getMatchedPackagesSpec(pkgName, packages) {
  for (const i in packages) {
    // $FlowFixMe
    if (_minimatch.default.makeRe(i).exec(pkgName)) {
      return packages[i];
    }
  }

  return;
}

function normalisePackageAccess(packages) {
  const normalizedPkgs = _objectSpread({}, packages); // add a default rule for all packages to make writing plugins easier


  if (_lodash.default.isNil(normalizedPkgs['**'])) {
    normalizedPkgs['**'] = {
      access: [],
      publish: [],
      proxy: []
    };
  }

  for (const pkg in packages) {
    if (Object.prototype.hasOwnProperty.call(packages, pkg)) {
      (0, _assert.default)(_lodash.default.isObject(packages[pkg]) && _lodash.default.isArray(packages[pkg]) === false, `CONFIG: bad "'${pkg}'" package description (object expected)`);
      normalizedPkgs[pkg].access = normalizeUserList(packages[pkg].allow_access, packages[pkg].access);
      delete normalizedPkgs[pkg].allow_access;
      normalizedPkgs[pkg].publish = normalizeUserList(packages[pkg].allow_publish, packages[pkg].publish);
      delete normalizedPkgs[pkg].allow_publish;
      normalizedPkgs[pkg].proxy = normalizeUserList(packages[pkg].proxy_access, packages[pkg].proxy);
      delete normalizedPkgs[pkg].proxy_access;
    }
  }

  return normalizedPkgs;
}