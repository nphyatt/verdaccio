"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

var _express = _interopRequireDefault(require("express"));

var _compression = _interopRequireDefault(require("compression"));

var _cors = _interopRequireDefault(require("cors"));

var _storage = _interopRequireDefault(require("../lib/storage"));

var _pluginLoader = _interopRequireDefault(require("../lib/plugin-loader"));

var _debug = _interopRequireDefault(require("./debug"));

var _auth = _interopRequireDefault(require("../lib/auth"));

var _endpoint = _interopRequireDefault(require("./endpoint"));

var _utils = require("../lib/utils");

var _constants = require("../lib/constants");

var _config = _interopRequireDefault(require("../lib/config"));

var _api = _interopRequireDefault(require("./web/api"));

var _web = _interopRequireDefault(require("./web"));

var _logger = require("../lib/logger");

var _middleware = require("./middleware");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

const defineAPI = function (config, storage) {
  const auth = new _auth.default(config);
  const app = (0, _express.default)(); // run in production mode by default, just in case
  // it shouldn't make any difference anyway

  app.set('env', process.env.NODE_ENV || 'production');
  app.use((0, _cors.default)()); // Router setup

  app.use(_middleware.log);
  app.use(_middleware.errorReportingMiddleware);
  app.use(function (req, res, next) {
    res.setHeader('X-Powered-By', config.user_agent);
    next();
  });
  app.use((0, _compression.default)());
  app.get('/favicon.ico', function (req, res, next) {
    req.url = '/-/static/favicon.png';
    next();
  }); // Hook for tests only

  if (config._debug) {
    (0, _debug.default)(app, config.self_path);
  } // register middleware plugins


  const plugin_params = {
    config: config,
    logger: _logger.logger
  };
  const plugins = (0, _pluginLoader.default)(config, config.middlewares, plugin_params, function (plugin) {
    return plugin.register_middlewares;
  });
  plugins.forEach(plugin => {
    plugin.register_middlewares(app, auth, storage);
  }); // For  npm request

  app.use((0, _endpoint.default)(config, auth, storage)); // For WebUI & WebUI API

  if (_lodash.default.get(config, 'web.enable', true)) {
    app.use('/', (0, _web.default)(config, auth, storage));
    app.use('/-/verdaccio/', (0, _api.default)(config, auth, storage));
  } else {
    app.get('/', function (req, res, next) {
      next(_utils.ErrorCode.getNotFound(_constants.API_ERROR.WEB_DISABLED));
    });
  } // Catch 404


  app.get('/*', function (req, res, next) {
    next(_utils.ErrorCode.getNotFound(_constants.API_ERROR.FILE_NOT_FOUND));
  });
  app.use(function (err, req, res, next) {
    if (_lodash.default.isError(err)) {
      if (err.code === 'ECONNABORT' && res.statusCode === _constants.HTTP_STATUS.NOT_MODIFIED) {
        return next();
      }

      if (_lodash.default.isFunction(res.report_error) === false) {
        // in case of very early error this middleware may not be loaded before error is generated
        // fixing that
        (0, _middleware.errorReportingMiddleware)(req, res, _lodash.default.noop);
      }

      res.report_error(err);
    } else {
      // Fall to Middleware.final
      return next(err);
    }
  });
  app.use(_middleware.final);
  return app;
};

var _default =
/*#__PURE__*/
function () {
  var _ref = _asyncToGenerator(function* (configHash) {
    (0, _logger.setup)(configHash.logs);
    const config = new _config.default(configHash);
    const storage = new _storage.default(config); // waits until init calls have been initialized

    yield storage.init(config);
    return defineAPI(config, storage);
  });

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}();

exports.default = _default;