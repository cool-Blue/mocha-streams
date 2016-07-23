'use strict';

var expect = require('chai').expect;

var through       = require('through2'),
    prettifySynch = require('js-beautify');

var fs = require('fs');
var glob = require('glob').sync;
var browserify = require('browserify');

describe('test-streams', function() {
    var output = __dirname + '/output/';
    var prettify = (function() {
        var chunks = [];

        function write(chunk, enc, cb) {
            chunks.push(chunk);
            cb()
        }

        function getContent() {
            return Buffer.concat(chunks).toString('utf8')
        }

        function endTest(cb) {
            var content = getContent();
            this.push(prettifySynch(content));
            this.push(null);
            cb();
        }

        return {stream: through(write, endTest), buffer: getContent}
    })();

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
            .pipe(fs.createWriteStream(output + 'bundle.js'));
    };

    it('is forced a fail to see what happens fail', function(done) {
        bundle(function(src) {
            expect(src).to.be.a('object');
            done();
        });
    });

    }
);
