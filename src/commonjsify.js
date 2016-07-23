'use strict';

var through1 = require('through'),
    fs       = require('fs-extra'),
    path     = require('path');
global.mainThrough = through1;

function commonjsify(content, exports) {
  if(exports) {
    return content + '\n module.exports = window.' + exports + ';';
  } else {
    return content;
  }
}

/**
 * Creates the Browserify transform function which Browserify will pass the
 * file to.
 * @param   {object}    options
 * @returns {stream}
 */
module.exports = function(options) {
  /**
   * The function Browserify will use to transform the input.
   * @param   {string} file
   * @returns {stream}
   */
  function browserifyTransform(file) {
    var chunks = [];

    var write = function(buffer) {
      chunks.push(buffer);
    };

    var end = function endcjs() {
      var content = Buffer.concat(chunks).toString('utf8');
      // convention fileName == key for shim options
      try {
        var dir = file.match(/(^.*\\).*$/)[1],
            pkg = fs.readJsonSync(dir + 'package.json'),
            moduleName;
        console.log(`path: ${path.dirname(file)}\ndir: ${dir}`)
      } catch(e) {
        moduleName = `.${path.sep}${path.relative(process.cwd(), file)}`.replace('/\\/','/');
        console.log(`from ${process.cwd()} to ${file} -> ${moduleName}`);
      }
      this.queue(commonjsify(content, options[moduleName]));
      this.queue(null);
    };

    return through1(write, end);
  }

  return browserifyTransform;
};

// Test-environment specific exports...
if(process.env.NODE_ENV === 'test') {
  module.exports.commonjsify = commonjsify;
}
