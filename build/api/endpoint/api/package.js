"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;

var _lodash = _interopRequireDefault(require("lodash"));

var _middleware = require("../../middleware");

var _utils = require("../../../lib/utils");

var _constants = require("../../../lib/constants");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @prettier
 * 
 */
function _default(route, auth, storage, config) {
  const can = (0, _middleware.allow)(auth); // TODO: anonymous user?

  route.get('/:package/:version?', can('access'), function (req, res, next) {
    const getPackageMetaCallback = function (err, metadata) {
      if (err) {
        return next(err);
      }

      metadata = (0, _utils.convertDistRemoteToLocalTarballUrls)(metadata, req, config.url_prefix);
      let queryVersion = req.params.version;

      if (_lodash.default.isNil(queryVersion)) {
        return next(metadata);
      }

      let version = (0, _utils.getVersion)(metadata, queryVersion);

      if (_lodash.default.isNil(version) === false) {
        return next(version);
      }

      if (_lodash.default.isNil(metadata[_constants.DIST_TAGS]) === false) {
        if (_lodash.default.isNil(metadata[_constants.DIST_TAGS][queryVersion]) === false) {
          queryVersion = metadata[_constants.DIST_TAGS][queryVersion];
          version = (0, _utils.getVersion)(metadata, queryVersion);

          if (_lodash.default.isNil(version) === false) {
            return next(version);
          }
        }
      }

      return next(_utils.ErrorCode.getNotFound(`${_constants.API_ERROR.VERSION_NOT_EXIST}: ${req.params.version}`));
    };

    storage.getPackage({
      name: req.params.package,
      uplinksLook: true,
      req,
      callback: getPackageMetaCallback
    });
  });
  route.get('/:package/-/:filename', can('access'), function (req, res) {
    const stream = storage.getTarball(req.params.package, req.params.filename);
    stream.on('content-length', function (content) {
      res.header('Content-Length', content);
    });
    stream.on('error', function (err) {
      return res.report_error(err);
    });
    res.header('Content-Type', _constants.HEADERS.OCTET_STREAM);
    stream.pipe(res);
  });
}