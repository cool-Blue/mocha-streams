'use strict';

var expect = require('chai').expect;

var through       = require('through2'),
    prettifySynch = require('js-beautify'),
    util = require('util');


var fs = require('fs');
var glob = require('glob').sync;
var browserify = require('browserify');

describe('test-streams', function() {
    var output = __dirname + '/output/';
    function listenAll(stream, excl) {

        var _excl = Array.isArray(excl) ? excl : [excl];
        ['unpipe', 'finish', 'cork', 'close', 'drain', 'error', 'end', 'readable'].forEach(function(e) {
            stream.on(e, function(evt) {
                if(!_excl.includes(evt)) util.log(`${e} event: ${evt}`)
            })
        })
    }

    var prettify = (function() {
        var chunks = [];

        function write(chunk, enc, cb) {
            chunks.push(chunk);
            cb()
        }

        function getContent() {
            return Buffer.concat(chunks).toString('utf8')
        }

        function end(cb) {
            var content = getContent();
            this.push(prettifySynch(content));
            this.push(null);
            cb();
        }

        return {stream: through(write, end), buffer: getContent}
    })();
    listenAll(prettify.stream, ['data']);

    function synchOut(err, src) {
        if(err) throw err;
        src = src.toString();
        fs.writeFileSync(output + 'bundle.synch.js', prettifySynch(src))
    }

    before(function() {
        //clear previous outputs
        require('glob').sync(output + '*.js').forEach(function(f) {
            fs.unlinkSync(f)
        })
    });

    var writeBundle = fs.createWriteStream.bind(fs, output + 'bundle.js')();
    listenAll(writeBundle, ['data']);

    var bundle = function(cb) {
        var fixtures = __dirname + '/fixtures';
        browserify({noParse: false})
            .require(fixtures + '/lib.js', {expose: 'lib'})
            .bundle(function(err, src) {
                if(err) {
                    cb(err);
                } else {
                    synchOut(err, src);
                    cb(src);
                }
            })
            .pipe(prettify.stream)
            .pipe(writeBundle)
    };

    it('is forced a fail to see what happens fail', function(done) {
        bundle(function(src) {
            expect(src).to.be.a('object');
            done();
        });
    });

    }
);
