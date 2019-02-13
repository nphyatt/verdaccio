"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _assert = _interopRequireDefault(require("assert"));

var _url = _interopRequireDefault(require("url"));

var _lodash = _interopRequireDefault(require("lodash"));

var _utils = require("./utils");

var _storageUtils = require("./storage-utils");

var _constants = require("./constants");

var _cryptoUtils = require("./crypto-utils");

var _pluginLoader = _interopRequireDefault(require("../lib/plugin-loader"));

var _localStorage = _interopRequireDefault(require("@verdaccio/local-storage"));

var _streams = require("@verdaccio/streams");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Implements Storage interface (same for storage.js, local-storage.js, up-storage.js).
 */
class LocalStorage {
  constructor(config, logger) {
    _defineProperty(this, "config", void 0);

    _defineProperty(this, "localData", void 0);

    _defineProperty(this, "logger", void 0);

    this.logger = logger.child({
      sub: 'fs'
    });
    this.config = config;
    this.localData = this._loadStorage(config, logger);
  }

  addPackage(name, pkg, callback) {
    const storage = this._getLocalStorage(name);

    if (_lodash.default.isNil(storage)) {
      return callback(_utils.ErrorCode.getNotFound('this package cannot be added'));
    }

    storage.createPackage(name, (0, _storageUtils.generatePackageTemplate)(name), err => {
      if (_lodash.default.isNull(err) === false && err.code === _constants.STORAGE.FILE_EXIST_ERROR) {
        return callback(_utils.ErrorCode.getConflict());
      }

      const latest = (0, _utils.getLatestVersion)(pkg);

      if (_lodash.default.isNil(latest) === false && pkg.versions[latest]) {
        return callback(null, pkg.versions[latest]);
      }

      return callback();
    });
  }
  /**
   * Remove package.
   * @param {*} name
   * @param {*} callback
   * @return {Function}
   */


  removePackage(name, callback) {
    const storage = this._getLocalStorage(name);

    if (_lodash.default.isNil(storage)) {
      return callback(_utils.ErrorCode.getNotFound());
    }

    storage.readPackage(name, (err, data) => {
      if (_lodash.default.isNil(err) === false) {
        if (err.code === _constants.STORAGE.NO_SUCH_FILE_ERROR) {
          return callback(_utils.ErrorCode.getNotFound());
        } else {
          return callback(err);
        }
      }

      data = (0, _storageUtils.normalizePackage)(data);
      this.localData.remove(name, removeFailed => {
        if (removeFailed) {
          // This will happen when database is locked
          return callback(_utils.ErrorCode.getBadData(removeFailed.message));
        }

        storage.deletePackage(_constants.STORAGE.PACKAGE_FILE_NAME, err => {
          if (err) {
            return callback(err);
          }

          const attachments = Object.keys(data._attachments);

          this._deleteAttachments(storage, attachments, callback);
        });
      });
    });
  }
  /**
   * Synchronize remote package info with the local one
   * @param {*} name
   * @param {*} packageInfo
   * @param {*} callback
   */


  updateVersions(name, packageInfo, callback) {
    this._readCreatePackage(name, (err, packageLocalJson) => {
      if (err) {
        return callback(err);
      }

      let change = false; // updating readme

      packageLocalJson.readme = (0, _storageUtils.getLatestReadme)(packageInfo);

      if (packageInfo.readme !== packageLocalJson.readme) {
        change = true;
      }

      for (const versionId in packageInfo.versions) {
        if (_lodash.default.isNil(packageLocalJson.versions[versionId])) {
          let version = packageInfo.versions[versionId]; // we don't keep readme for package versions,
          // only one readme per package

          version = (0, _storageUtils.cleanUpReadme)(version);
          version.contributors = (0, _storageUtils.normalizeContributors)(version.contributors);
          change = true;
          packageLocalJson.versions[versionId] = version;

          if (version.dist && version.dist.tarball) {
            const urlObject = _url.default.parse(version.dist.tarball);

            const filename = urlObject.pathname.replace(/^.*\//, ''); // we do NOT overwrite any existing records

            if (_lodash.default.isNil(packageLocalJson._distfiles[filename])) {
              const hash = packageLocalJson._distfiles[filename] = {
                url: version.dist.tarball,
                sha: version.dist.shasum
              };
              /* eslint spaced-comment: 0 */
              // $FlowFixMe

              const upLink = version[Symbol.for('__verdaccio_uplink')];

              if (_lodash.default.isNil(upLink) === false) {
                this._updateUplinkToRemoteProtocol(hash, upLink);
              }
            }
          }
        }
      }

      for (const tag in packageInfo[_constants.DIST_TAGS]) {
        if (!packageLocalJson[_constants.DIST_TAGS][tag] || packageLocalJson[_constants.DIST_TAGS][tag] !== packageInfo[_constants.DIST_TAGS][tag]) {
          change = true;
          packageLocalJson[_constants.DIST_TAGS][tag] = packageInfo[_constants.DIST_TAGS][tag];
        }
      }

      for (const up in packageInfo._uplinks) {
        if (Object.prototype.hasOwnProperty.call(packageInfo._uplinks, up)) {
          const need_change = !(0, _utils.isObject)(packageLocalJson._uplinks[up]) || packageInfo._uplinks[up].etag !== packageLocalJson._uplinks[up].etag || packageInfo._uplinks[up].fetched !== packageLocalJson._uplinks[up].fetched;

          if (need_change) {
            change = true;
            packageLocalJson._uplinks[up] = packageInfo._uplinks[up];
          }
        }
      }

      if ('time' in packageInfo && !_lodash.default.isEqual(packageLocalJson.time, packageInfo.time)) {
        packageLocalJson.time = packageInfo.time;
        change = true;
      }

      if (change) {
        this.logger.debug({
          name
        }, 'updating package @{name} info');

        this._writePackage(name, packageLocalJson, function (err) {
          callback(err, packageLocalJson);
        });
      } else {
        callback(null, packageLocalJson);
      }
    });
  }
  /**
   * Add a new version to a previous local package.
   * @param {*} name
   * @param {*} version
   * @param {*} metadata
   * @param {*} tag
   * @param {*} callback
   */


  addVersion(name, version, metadata, tag, callback) {
    this._updatePackage(name, (data, cb) => {
      // keep only one readme per package
      data.readme = metadata.readme; // TODO: lodash remove

      metadata = (0, _storageUtils.cleanUpReadme)(metadata);
      metadata.contributors = (0, _storageUtils.normalizeContributors)(metadata.contributors);

      if (data.versions[version] != null) {
        return cb(_utils.ErrorCode.getConflict());
      } // if uploaded tarball has a different shasum, it's very likely that we have some kind of error


      if ((0, _utils.isObject)(metadata.dist) && _lodash.default.isString(metadata.dist.tarball)) {
        const tarball = metadata.dist.tarball.replace(/.*\//, '');

        if ((0, _utils.isObject)(data._attachments[tarball])) {
          if (_lodash.default.isNil(data._attachments[tarball].shasum) === false && _lodash.default.isNil(metadata.dist.shasum) === false) {
            if (data._attachments[tarball].shasum != metadata.dist.shasum) {
              const errorMessage = `shasum error, ${data._attachments[tarball].shasum} != ${metadata.dist.shasum}`;
              return cb(_utils.ErrorCode.getBadRequest(errorMessage));
            }
          }

          const currentDate = new Date().toISOString(); // some old storage do not have this field #740

          if (_lodash.default.isNil(data.time)) {
            data.time = {};
          }

          data.time['modified'] = currentDate;

          if ('created' in data.time === false) {
            data.time.created = currentDate;
          }

          data.time[version] = currentDate;
          data._attachments[tarball].version = version;
        }
      }

      data.versions[version] = metadata;
      (0, _utils.tagVersion)(data, version, tag);
      this.localData.add(name, addFailed => {
        if (addFailed) {
          return cb(_utils.ErrorCode.getBadData(addFailed.message));
        }

        cb();
      });
    }, callback);
  }
  /**
   * Merge a new list of tags for a local packages with the existing one.
   * @param {*} pkgName
   * @param {*} tags
   * @param {*} callback
   */


  mergeTags(pkgName, tags, callback) {
    this._updatePackage(pkgName, (data, cb) => {
      /* eslint guard-for-in: 0 */
      for (const tag in tags) {
        // this handle dist-tag rm command
        if (_lodash.default.isNull(tags[tag])) {
          delete data[_constants.DIST_TAGS][tag];
          continue;
        }

        if (_lodash.default.isNil(data.versions[tags[tag]])) {
          return cb(this._getVersionNotFound());
        }

        const version = tags[tag];
        (0, _utils.tagVersion)(data, version, tag);
      }

      cb();
    }, callback);
  }
  /**
   * Return version not found
   * @return {String}
   * @private
   */


  _getVersionNotFound() {
    return _utils.ErrorCode.getNotFound(_constants.API_ERROR.VERSION_NOT_EXIST);
  }
  /**
   * Return file no available
   * @return {String}
   * @private
   */


  _getFileNotAvailable() {
    return _utils.ErrorCode.getNotFound('no such file available');
  }
  /**
   * Update the package metadata, tags and attachments (tarballs).
   * Note: Currently supports unpublishing only.
   * @param {*} name
   * @param {*} incomingPkg
   * @param {*} revision
   * @param {*} callback
   * @return {Function}
   */


  changePackage(name, incomingPkg, revision, callback) {
    if (!(0, _utils.isObject)(incomingPkg.versions) || !(0, _utils.isObject)(incomingPkg[_constants.DIST_TAGS])) {
      return callback(_utils.ErrorCode.getBadData());
    }

    this._updatePackage(name, (localData, cb) => {
      for (const version in localData.versions) {
        if (_lodash.default.isNil(incomingPkg.versions[version])) {
          this.logger.info({
            name: name,
            version: version
          }, 'unpublishing @{name}@@{version}');
          delete localData.versions[version];
          delete localData.time[version];

          for (const file in localData._attachments) {
            if (localData._attachments[file].version === version) {
              delete localData._attachments[file].version;
            }
          }
        }
      }

      localData[_constants.DIST_TAGS] = incomingPkg[_constants.DIST_TAGS];
      cb();
    }, function (err) {
      if (err) {
        return callback(err);
      }

      callback();
    });
  }
  /**
   * Remove a tarball.
   * @param {*} name
   * @param {*} filename
   * @param {*} revision
   * @param {*} callback
   */


  removeTarball(name, filename, revision, callback) {
    (0, _assert.default)((0, _utils.validateName)(filename));

    this._updatePackage(name, (data, cb) => {
      if (data._attachments[filename]) {
        delete data._attachments[filename];
        cb();
      } else {
        cb(this._getFileNotAvailable());
      }
    }, err => {
      if (err) {
        return callback(err);
      }

      const storage = this._getLocalStorage(name);

      if (storage) {
        storage.deletePackage(filename, callback);
      }
    });
  }
  /**
   * Add a tarball.
   * @param {String} name
   * @param {String} filename
   * @return {Stream}
   */


  addTarball(name, filename) {
    (0, _assert.default)((0, _utils.validateName)(filename));
    let length = 0;
    const shaOneHash = (0, _cryptoUtils.createTarballHash)();
    const uploadStream = new _streams.UploadTarball();
    const _transform = uploadStream._transform;

    const storage = this._getLocalStorage(name);

    uploadStream.abort = function () {};

    uploadStream.done = function () {};

    uploadStream._transform = function (data, ...args) {
      shaOneHash.update(data); // measure the length for validation reasons

      length += data.length;
      const appliedData = [data, ...args];

      _transform.apply(uploadStream, appliedData);
    };

    if (name === '__proto__') {
      process.nextTick(() => {
        uploadStream.emit('error', _utils.ErrorCode.getForbidden());
      });
      return uploadStream;
    }

    if (!storage) {
      process.nextTick(() => {
        uploadStream.emit('error', "can't upload this package");
      });
      return uploadStream;
    }

    const writeStream = storage.writeTarball(filename);
    writeStream.on('error', err => {
      if (err.code === _constants.STORAGE.FILE_EXIST_ERROR) {
        uploadStream.emit('error', _utils.ErrorCode.getConflict());
        uploadStream.abort();
      } else if (err.code === _constants.STORAGE.NO_SUCH_FILE_ERROR) {
        // check if package exists to throw an appropriate message
        this.getPackageMetadata(name, function (_err, res) {
          if (_err) {
            uploadStream.emit('error', _err);
          } else {
            uploadStream.emit('error', err);
          }
        });
      } else {
        uploadStream.emit('error', err);
      }
    });
    writeStream.on('open', function () {
      // re-emitting open because it's handled in storage.js
      uploadStream.emit('open');
    });
    writeStream.on('success', () => {
      this._updatePackage(name, function updater(data, cb) {
        data._attachments[filename] = {
          shasum: shaOneHash.digest('hex')
        };
        cb();
      }, function (err) {
        if (err) {
          uploadStream.emit('error', err);
        } else {
          uploadStream.emit('success');
        }
      });
    });

    uploadStream.abort = function () {
      writeStream.abort();
    };

    uploadStream.done = function () {
      if (!length) {
        uploadStream.emit('error', _utils.ErrorCode.getBadData('refusing to accept zero-length file'));
        writeStream.abort();
      } else {
        writeStream.done();
      }
    };

    uploadStream.pipe(writeStream);
    return uploadStream;
  }
  /**
   * Get a tarball.
   * @param {*} name
   * @param {*} filename
   * @return {ReadTarball}
   */


  getTarball(name, filename) {
    (0, _assert.default)((0, _utils.validateName)(filename));

    const storage = this._getLocalStorage(name);

    if (_lodash.default.isNil(storage)) {
      return this._createFailureStreamResponse();
    }

    return this._streamSuccessReadTarBall(storage, filename);
  }
  /**
   * Return a stream that emits a read failure.
   * @private
   * @return {ReadTarball}
   */


  _createFailureStreamResponse() {
    const stream = new _streams.ReadTarball();
    process.nextTick(() => {
      stream.emit('error', this._getFileNotAvailable());
    });
    return stream;
  }
  /**
   * Return a stream that emits the tarball data
   * @param {Object} storage
   * @param {String} filename
   * @private
   * @return {ReadTarball}
   */


  _streamSuccessReadTarBall(storage, filename) {
    const stream = new _streams.ReadTarball();
    const readTarballStream = storage.readTarball(filename);
    const e404 = _utils.ErrorCode.getNotFound;

    stream.abort = function () {
      if (_lodash.default.isNil(readTarballStream) === false) {
        readTarballStream.abort();
      }
    };

    readTarballStream.on('error', function (err) {
      if (err && err.code === _constants.STORAGE.NO_SUCH_FILE_ERROR) {
        stream.emit('error', e404('no such file available'));
      } else {
        stream.emit('error', err);
      }
    });
    readTarballStream.on('content-length', function (v) {
      stream.emit('content-length', v);
    });
    readTarballStream.on('open', function () {
      // re-emitting open because it's handled in storage.js
      stream.emit('open');
      readTarballStream.pipe(stream);
    });
    return stream;
  }
  /**
   * Retrieve a package by name.
   * @param {*} name
   * @param {*} callback
   * @return {Function}
   */


  getPackageMetadata(name, callback = () => {}) {
    const storage = this._getLocalStorage(name);

    if (_lodash.default.isNil(storage)) {
      return callback(_utils.ErrorCode.getNotFound());
    }

    this._readPackage(name, storage, callback);
  }
  /**
   * Search a local package.
   * @param {*} startKey
   * @param {*} options
   * @return {Function}
   */


  search(startKey, options) {
    const stream = new _streams.ReadTarball({
      objectMode: true
    });

    this._searchEachPackage((item, cb) => {
      if (item.time > parseInt(startKey, 10)) {
        this.getPackageMetadata(item.name, (err, data) => {
          if (err) {
            return cb(err);
          }

          const time = new Date(item.time).toISOString();
          const result = (0, _storageUtils.prepareSearchPackage)(data, time);

          if (_lodash.default.isNil(result) === false) {
            stream.push(result);
          }

          cb();
        });
      } else {
        cb();
      }
    }, function onEnd(err) {
      if (err) {
        return stream.emit('error', err);
      }

      stream.end();
    });

    return stream;
  }
  /**
   * Retrieve a wrapper that provide access to the package location.
   * @param {Object} pkgName package name.
   * @return {Object}
   */


  _getLocalStorage(pkgName) {
    return this.localData.getPackageStorage(pkgName);
  }
  /**
   * Read a json file from storage.
   * @param {Object} storage
   * @param {Function} callback
   */


  _readPackage(name, storage, callback) {
    storage.readPackage(name, (err, result) => {
      if (err) {
        if (err.code === _constants.STORAGE.NO_SUCH_FILE_ERROR) {
          return callback(_utils.ErrorCode.getNotFound());
        } else {
          return callback(this._internalError(err, _constants.STORAGE.PACKAGE_FILE_NAME, 'error reading'));
        }
      }

      callback(err, (0, _storageUtils.normalizePackage)(result));
    });
  }
  /**
   * Walks through each package and calls `on_package` on them.
   * @param {*} onPackage
   * @param {*} onEnd
   */


  _searchEachPackage(onPackage, onEnd) {
    // save wait whether plugin still do not support search functionality
    if (_lodash.default.isNil(this.localData.search)) {
      this.logger.warn('plugin search not implemented yet');
      onEnd();
    } else {
      this.localData.search(onPackage, onEnd, _utils.validateName);
    }
  }
  /**
   * Retrieve either a previous created local package or a boilerplate.
   * @param {*} pkgName
   * @param {*} callback
   * @return {Function}
   */


  _readCreatePackage(pkgName, callback) {
    const storage = this._getLocalStorage(pkgName);

    if (_lodash.default.isNil(storage)) {
      return this._createNewPackage(pkgName, callback);
    }

    storage.readPackage(pkgName, (err, data) => {
      // TODO: race condition
      if (_lodash.default.isNil(err) === false) {
        if (err.code === _constants.STORAGE.NO_SUCH_FILE_ERROR) {
          data = (0, _storageUtils.generatePackageTemplate)(pkgName);
        } else {
          return callback(this._internalError(err, _constants.STORAGE.PACKAGE_FILE_NAME, 'error reading'));
        }
      }

      callback(null, (0, _storageUtils.normalizePackage)(data));
    });
  }

  _createNewPackage(name, callback) {
    return callback(null, (0, _storageUtils.normalizePackage)((0, _storageUtils.generatePackageTemplate)(name)));
  }
  /**
   * Handle internal error
   * @param {*} err
   * @param {*} file
   * @param {*} message
   * @return {Object} Error instance
   */


  _internalError(err, file, message) {
    this.logger.error({
      err: err,
      file: file
    }, `${message}  @{file}: @{!err.message}`);
    return _utils.ErrorCode.getInternalError();
  }
  /**
   * @param {*} name package name
   * @param {*} updateHandler function(package, cb) - update function
   * @param {*} callback callback that gets invoked after it's all updated
   * @return {Function}
   */


  _updatePackage(name, updateHandler, callback) {
    const storage = this._getLocalStorage(name);

    if (!storage) {
      return callback(_utils.ErrorCode.getNotFound());
    }

    storage.updatePackage(name, updateHandler, this._writePackage.bind(this), _storageUtils.normalizePackage, callback);
  }
  /**
   * Update the revision (_rev) string for a package.
   * @param {*} name
   * @param {*} json
   * @param {*} callback
   * @return {Function}
   */


  _writePackage(name, json, callback) {
    const storage = this._getLocalStorage(name);

    if (_lodash.default.isNil(storage)) {
      return callback();
    }

    storage.savePackage(name, this._setDefaultRevision(json), callback);
  }

  _setDefaultRevision(json) {
    // calculate revision from couch db
    if (_lodash.default.isString(json._rev) === false) {
      json._rev = _constants.STORAGE.DEFAULT_REVISION;
    } // this is intended in debug mode we do not want modify the store revision


    if (_lodash.default.isNil(this.config._debug)) {
      json._rev = (0, _storageUtils.generateRevision)(json._rev);
    }

    return json;
  }

  _deleteAttachments(storage, attachments, callback) {
    const unlinkNext = function (cb) {
      if (_lodash.default.isEmpty(attachments)) {
        return cb();
      }

      const attachment = attachments.shift();
      storage.deletePackage(attachment, function () {
        unlinkNext(cb);
      });
    };

    unlinkNext(function () {
      // try to unlink the directory, but ignore errors because it can fail
      storage.removePackage(function (err) {
        callback(err);
      });
    });
  }
  /**
   * Ensure the dist file remains as the same protocol
   * @param {Object} hash metadata
   * @param {String} upLinkKey registry key
   * @private
   */


  _updateUplinkToRemoteProtocol(hash, upLinkKey) {
    // if we got this information from a known registry,
    // use the same protocol for the tarball
    //
    const tarballUrl = _url.default.parse(hash.url);

    const uplinkUrl = _url.default.parse(this.config.uplinks[upLinkKey].url);

    if (uplinkUrl.host === tarballUrl.host) {
      tarballUrl.protocol = uplinkUrl.protocol;
      hash.registry = upLinkKey;
      hash.url = _url.default.format(tarballUrl);
    }
  }

  getSecret(config) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const secretKey = yield _this.localData.getSecret();
      return _this.localData.setSecret(config.checkSecretKey(secretKey));
    })();
  }

  _loadStorage(config, logger) {
    const Storage = this._loadStorePlugin();

    if (_lodash.default.isNil(Storage)) {
      (0, _assert.default)(this.config.storage, 'CONFIG: storage path not defined');
      return new _localStorage.default(this.config, logger);
    } else {
      return Storage;
    }
  }

  _loadStorePlugin() {
    const plugin_params = {
      config: this.config,
      logger: this.logger
    };
    return _lodash.default.head((0, _pluginLoader.default)(this.config, this.config.store, plugin_params, plugin => {
      return plugin.getPackageStorage;
    }));
  }

}

var _default = LocalStorage;
exports.default = _default;