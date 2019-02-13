"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lunrMutableIndexes = _interopRequireDefault(require("lunr-mutable-indexes"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Handle the search Indexer.
 */
class Search {
  /**
   * Constructor.
   */
  constructor() {
    _defineProperty(this, "index", void 0);

    _defineProperty(this, "storage", void 0);

    /* eslint no-invalid-this: "off" */
    this.index = (0, _lunrMutableIndexes.default)(function () {
      this.field('name', {
        boost: 10
      });
      this.field('description', {
        boost: 4
      });
      this.field('author', {
        boost: 6
      });
      this.field('keywords', {
        boost: 7
      });
      this.field('version');
      this.field('readme');
    });
  }
  /**
   * Performs a query to the indexer.
   * If the keyword is a * it returns all local elements
   * otherwise performs a search
   * @param {*} q the keyword
   * @return {Array} list of results.
   */


  query(query) {
    return query === '*' ? this.storage.localStorage.localData.get(items => {
      items.map(function (pkg) {
        return {
          ref: pkg,
          score: 1
        };
      });
    }) : this.index.search(`*${query}*`);
  }
  /**
   * Add a new element to index
   * @param {*} pkg the package
   */


  add(pkg) {
    this.index.add({
      id: pkg.name,
      name: pkg.name,
      description: pkg.description,
      version: `v${pkg.version}`,
      keywords: pkg.keywords,
      author: pkg._npmUser ? pkg._npmUser.name : '???'
    });
  }
  /**
   * Remove an element from the index.
   * @param {*} name the id element
   */


  remove(name) {
    this.index.remove({
      id: name
    });
  }
  /**
   * Force a re-index.
   */


  reindex() {
    const self = this;
    this.storage.getLocalDatabase(function (error, packages) {
      if (error) {
        // that function shouldn't produce any
        throw error;
      }

      let i = packages.length;

      while (i--) {
        self.add(packages[i]);
      }
    });
  }
  /**
   * Set up the {Storage}
   * @param {*} storage An storage reference.
   */


  configureStorage(storage) {
    this.storage = storage;
    this.reindex();
  }

}

var _default = new Search();

exports.default = _default;