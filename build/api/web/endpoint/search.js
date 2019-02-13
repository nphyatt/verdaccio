"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _search = _interopRequireDefault(require("../../../lib/search"));

var _constants = require("../../../lib/constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
function addSearchWebApi(route, storage, auth) {
  // Search package
  route.get('/search/:anything', function (req, res, next) {
    const results = _search.default.query(req.params.anything);

    const packages = [];

    const getPackageInfo = function (i) {
      storage.getPackage({
        name: results[i].ref,
        uplinksLook: false,
        callback: (err, entry) => {
          if (!err && entry) {
            auth.allow_access({
              packageName: entry.name
            }, req.remote_user, function (err, allowed) {
              if (err || !allowed) {
                return;
              }

              packages.push(entry.versions[entry[_constants.DIST_TAGS].latest]);
            });
          }

          if (i >= results.length - 1) {
            next(packages);
          } else {
            getPackageInfo(i + 1);
          }
        }
      });
    };

    if (results.length) {
      getPackageInfo(0);
    } else {
      next([]);
    }
  });
}

var _default = addSearchWebApi;
exports.default = _default;