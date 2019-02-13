"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _utils = require("../../../lib/utils");

var _middleware = require("../../middleware");

var _constants = require("../../../lib/constants");

var _logger = _interopRequireDefault(require("../../../lib/logger"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function addPackageWebApi(route, storage, auth, config) {
  const can = (0, _middleware.allow)(auth);

  const checkAllow = (name, remoteUser) => new Promise((resolve, reject) => {
    try {
      auth.allow_access({
        packageName: name
      }, remoteUser, (err, allowed) => {
        if (err) {
          resolve(false);
        } else {
          resolve(allowed);
        }
      });
    } catch (err) {
      reject(err);
    }
  }); // Get list of all visible package


  route.get('/packages', function (req, res, next) {
    storage.getLocalDatabase(
    /*#__PURE__*/
    function () {
      var _ref = _asyncToGenerator(function* (err, packages) {
        if (err) {
          throw err;
        }

        function processPermissionsPackages(_x3) {
          return _processPermissionsPackages.apply(this, arguments);
        }

        function _processPermissionsPackages() {
          _processPermissionsPackages = _asyncToGenerator(function* (packages) {
            const permissions = [];

            for (const pkg of packages) {
              try {
                if (yield checkAllow(pkg.name, req.remote_user)) {
                  permissions.push(pkg);
                }
              } catch (err) {
                _logger.default.logger.error({
                  name: pkg.name,
                  error: err
                }, 'permission process for @{name} has failed: @{error}');

                throw err;
              }
            }

            return permissions;
          });
          return _processPermissionsPackages.apply(this, arguments);
        }

        next((0, _utils.sortByName)((yield processPermissionsPackages(packages))));
      });

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }());
  }); // Get package readme

  route.get('/package/readme/(@:scope/)?:package/:version?', can('access'), function (req, res, next) {
    const packageName = req.params.scope ? (0, _utils.addScope)(req.params.scope, req.params.package) : req.params.package;
    storage.getPackage({
      name: packageName,
      uplinksLook: true,
      req,
      callback: function (err, info) {
        if (err) {
          return next(err);
        }

        res.set(_constants.HEADER_TYPE.CONTENT_TYPE, _constants.HEADERS.TEXT_PLAIN);
        next((0, _utils.parseReadme)(info.name, info.readme));
      }
    });
  });
  route.get('/sidebar/(@:scope/)?:package', function (req, res, next) {
    const packageName = req.params.scope ? (0, _utils.addScope)(req.params.scope, req.params.package) : req.params.package;
    storage.getPackage({
      name: packageName,
      uplinksLook: true,
      keepUpLinkData: true,
      req,
      callback: function (err, info) {
        if (_lodash.default.isNil(err)) {
          let sideBarInfo = _lodash.default.clone(info);

          sideBarInfo.latest = info.versions[info[_constants.DIST_TAGS].latest];
          sideBarInfo = (0, _utils.deleteProperties)(['readme', '_attachments', '_rev', 'name'], sideBarInfo);

          if (config.web) {
            sideBarInfo = (0, _utils.addGravatarSupport)(sideBarInfo, config.web.gravatar);
          } else {
            sideBarInfo = (0, _utils.addGravatarSupport)(sideBarInfo);
          }

          next(sideBarInfo);
        } else {
          res.status(_constants.HTTP_STATUS.NOT_FOUND);
          res.end();
        }
      }
    });
  });
}

var _default = addPackageWebApi;
exports.default = _default;