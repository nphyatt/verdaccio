"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleNotify = handleNotify;
exports.sendNotification = sendNotification;
exports.notify = notify;

var _handlebars = _interopRequireDefault(require("handlebars"));

var _lodash = _interopRequireDefault(require("lodash"));

var _notifyRequest = require("./notify-request");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function handleNotify(metadata, notifyEntry, publisherInfo, publishedPackage) {
  let regex;

  if (metadata.name && notifyEntry.packagePattern) {
    regex = new RegExp(notifyEntry.packagePattern, notifyEntry.packagePatternFlags || '');

    if (!regex.test(metadata.name)) {
      return;
    }
  }

  const template = _handlebars.default.compile(notifyEntry.content); // don't override 'publisher' if package.json already has that


  if (!metadata.publisher) {
    metadata = _objectSpread({}, metadata, {
      publishedPackage,
      publisher: publisherInfo
    });
  }

  const content = template(metadata);
  const options = {
    body: content
  }; // provides fallback support, it's accept an Object {} and Array of {}

  if (notifyEntry.headers && _lodash.default.isArray(notifyEntry.headers)) {
    const header = {};
    notifyEntry.headers.map(function (item) {
      if (Object.is(item, item)) {
        for (const key in item) {
          if (item.hasOwnProperty(key)) {
            header[key] = item[key];
          }
        }
      }
    });
    options.headers = header;
  } else if (Object.is(notifyEntry.headers, notifyEntry.headers)) {
    options.headers = notifyEntry.headers;
  }

  options.method = notifyEntry.method;

  if (notifyEntry.endpoint) {
    options.url = notifyEntry.endpoint;
  }

  return (0, _notifyRequest.notifyRequest)(options, content);
}

function sendNotification(metadata, key, ...moreMedatata) {
  return handleNotify(metadata, key, ...moreMedatata);
}

function notify(metadata, config, ...moreMedatata) {
  if (config.notify) {
    if (config.notify.content) {
      return sendNotification(metadata, config.notify, ...moreMedatata);
    } else {
      // multiple notifications endpoints PR #108
      return Promise.all(_lodash.default.map(config.notify, key => sendNotification(metadata, key, ...moreMedatata)));
    }
  }

  return Promise.resolve();
}