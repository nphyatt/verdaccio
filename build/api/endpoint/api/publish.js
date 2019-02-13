"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = publish;
exports.publishPackage = publishPackage;
exports.unPublishPackage = unPublishPackage;
exports.removeTarball = removeTarball;
exports.addVersion = addVersion;
exports.uploadPackageTarball = uploadPackageTarball;

var _lodash = _interopRequireDefault(require("lodash"));

var _path = _interopRequireDefault(require("path"));

var _mime = _interopRequireDefault(require("mime"));

var _constants = require("../../../lib/constants");

var _utils = require("../../../lib/utils");

var _middleware = require("../../middleware");

var _notify = require("../../../lib/notify");

var _logger = _interopRequireDefault(require("../../../lib/logger"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function publish(router, auth, storage, config) {
  const can = (0, _middleware.allow)(auth); // publishing a package

  router.put('/:package/:_rev?/:revision?', can('publish'), (0, _middleware.media)(_mime.default.getType('json')), _middleware.expectJson, publishPackage(storage, config)); // un-publishing an entire package

  router.delete('/:package/-rev/*', can('publish'), unPublishPackage(storage)); // removing a tarball

  router.delete('/:package/-/:filename/-rev/:revision', can('publish'), removeTarball(storage)); // uploading package tarball

  router.put('/:package/-/:filename/*', can('publish'), (0, _middleware.media)(_constants.HEADERS.OCTET_STREAM), uploadPackageTarball(storage)); // adding a version

  router.put('/:package/:version/-tag/:tag', can('publish'), (0, _middleware.media)(_mime.default.getType('json')), _middleware.expectJson, addVersion(storage));
}
/**
 * Publish a package
 */


function publishPackage(storage, config) {
  return function (req, res, next) {
    const packageName = req.params.package;
    /**
     * Write tarball of stream data from package clients.
     */

    const createTarball = function (filename, data, cb) {
      const stream = storage.addTarball(packageName, filename);
      stream.on('error', function (err) {
        cb(err);
      });
      stream.on('success', function () {
        cb();
      }); // this is dumb and memory-consuming, but what choices do we have?
      // flow: we need first refactor this file before decides which type use here

      stream.end(new Buffer(data.data, 'base64'));
      stream.done();
    };
    /**
     * Add new package version in storage
     */


    const createVersion = function (version, metadata, cb) {
      storage.addVersion(packageName, version, metadata, null, cb);
    };
    /**
     * Add new tags in storage
     */


    const addTags = function (tags, cb) {
      storage.mergeTags(packageName, tags, cb);
    };

    const afterChange = function (error, okMessage, metadata) {
      const metadataCopy = _objectSpread({}, metadata);

      const {
        _attachments,
        versions
      } = metadataCopy; // old npm behavior, if there is no attachments

      if (_lodash.default.isNil(_attachments)) {
        if (error) {
          return next(error);
        }

        res.status(_constants.HTTP_STATUS.CREATED);
        return next({
          ok: okMessage,
          success: true
        });
      } // npm-registry-client 0.3+ embeds tarball into the json upload
      // https://github.com/isaacs/npm-registry-client/commit/e9fbeb8b67f249394f735c74ef11fe4720d46ca0
      // issue https://github.com/rlidwka/sinopia/issues/31, dealing with it here:


      if ((0, _utils.isObject)(_attachments) === false || Object.keys(_attachments).length !== 1 || (0, _utils.isObject)(versions) === false || Object.keys(versions).length !== 1) {
        // npm is doing something strange again
        // if this happens in normal circumstances, report it as a bug
        return next(_utils.ErrorCode.getBadRequest('unsupported registry call'));
      }

      if (error && error.status !== _constants.HTTP_STATUS.CONFLICT) {
        return next(error);
      } // at this point document is either created or existed before


      const firstAttachmentKey = Object.keys(_attachments)[0];
      createTarball(_path.default.basename(firstAttachmentKey), _attachments[firstAttachmentKey], function (error) {
        if (error) {
          return next(error);
        }

        const versionToPublish = Object.keys(versions)[0];
        versions[versionToPublish].readme = _lodash.default.isNil(metadataCopy.readme) === false ? String(metadataCopy.readme) : '';
        createVersion(versionToPublish, versions[versionToPublish], function (error) {
          if (error) {
            return next(error);
          }

          addTags(metadataCopy[_constants.DIST_TAGS],
          /*#__PURE__*/
          function () {
            var _ref = _asyncToGenerator(function* (error) {
              if (error) {
                return next(error);
              }

              try {
                yield (0, _notify.notify)(metadataCopy, config, req.remote_user, `${metadataCopy.name}@${versionToPublish}`);
              } catch (error) {
                _logger.default.logger.error({
                  error
                }, 'notify batch service has failed: @{error}');
              }

              res.status(_constants.HTTP_STATUS.CREATED);
              return next({
                ok: okMessage,
                success: true
              });
            });

            return function (_x) {
              return _ref.apply(this, arguments);
            };
          }());
        });
      });
    };

    if (Object.prototype.hasOwnProperty.call(req.body, '_rev') && (0, _utils.isObject)(req.body.users)) {
      return next(_utils.ErrorCode.getNotFound('npm star| un-star calls are not implemented'));
    }

    try {
      const metadata = (0, _utils.validateMetadata)(req.body, packageName);

      if (req.params._rev) {
        storage.changePackage(packageName, metadata, req.params.revision, function (error) {
          afterChange(error, _constants.API_MESSAGE.PKG_CHANGED, metadata);
        });
      } else {
        storage.addPackage(packageName, metadata, function (error) {
          afterChange(error, _constants.API_MESSAGE.PKG_CREATED, metadata);
        });
      }
    } catch (error) {
      return next(_utils.ErrorCode.getBadData(_constants.API_ERROR.BAD_PACKAGE_DATA));
    }
  };
}
/**
 * un-publish a package
 */


function unPublishPackage(storage) {
  return function (req, res, next) {
    storage.removePackage(req.params.package, function (err) {
      if (err) {
        return next(err);
      }

      res.status(_constants.HTTP_STATUS.CREATED);
      return next({
        ok: _constants.API_MESSAGE.PKG_REMOVED
      });
    });
  };
}
/**
 * Delete tarball
 */


function removeTarball(storage) {
  return function (req, res, next) {
    storage.removeTarball(req.params.package, req.params.filename, req.params.revision, function (err) {
      if (err) {
        return next(err);
      }

      res.status(_constants.HTTP_STATUS.CREATED);
      return next({
        ok: _constants.API_MESSAGE.TARBALL_REMOVED
      });
    });
  };
}
/**
 * Adds a new version
 */


function addVersion(storage) {
  return function (req, res, next) {
    const {
      version,
      tag
    } = req.params;
    const packageName = req.params.package;
    storage.addVersion(packageName, version, req.body, tag, function (error) {
      if (error) {
        return next(error);
      }

      res.status(_constants.HTTP_STATUS.CREATED);
      return next({
        ok: _constants.API_MESSAGE.PKG_PUBLISHED
      });
    });
  };
}
/**
 * uploadPackageTarball
 */


function uploadPackageTarball(storage) {
  return function (req, res, next) {
    const packageName = req.params.package;
    const stream = storage.addTarball(packageName, req.params.filename);
    req.pipe(stream); // checking if end event came before closing

    let complete = false;
    req.on('end', function () {
      complete = true;
      stream.done();
    });
    req.on('close', function () {
      if (!complete) {
        stream.abort();
      }
    });
    stream.on('error', function (err) {
      return res.report_error(err);
    });
    stream.on('success', function () {
      res.status(_constants.HTTP_STATUS.CREATED);
      return next({
        ok: _constants.API_MESSAGE.TARBALL_UPLOADED
      });
    });
  };
}