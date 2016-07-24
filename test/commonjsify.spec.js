'use strict';

var expect = require('chai').expect;

var through       = require('through2'),
    prettifySynch = require('js-beautify');

var path = require('path'),
    util = require('util');


var fs = require('fs');
var glob = require('glob').sync;
var browserify = require('browserify');

describe('test-streams', function() {
    var output = path.join(__dirname, '/output/');
    var streamEvents = ['pipe', 'unpipe', 'finish', 'cork', 'close', 'drain', 'error', 'end', 'readable'];
    var procEvents = ['beforeExit', 'exit', 'message', 'rejectionHandled', 'uncaughtException', 'unhandledRejection'];

    var listenAll = (function(logFile) {
        var _pad        = require('left-pad'),
            _w = 0, _w2 = 0;
        var fd, _logStream;

        if(logFile) {
            _logStream = fs.createWriteStream(logFile);
            _logStream.on('finish', function() {
                console.log('file has been written');
            });
        }
        var _log = (() => _logStream ? _logStream.write.bind(_logStream) : util.log.bind(util))();

        function _listenAll(stream, events, excl) {
            _w = Math.max(_w, stream.name ? stream.name.length : 0);
            var _excl = excl ? Array.isArray(excl) ? excl : [excl] : excl;
            events
                .forEach(function(e) {
                    _w2 = Math.max(e.length, _w2);
                    if(!_excl || !_excl.find(x => x === e))
                        stream.on(e, function(evt) {
                            _log(`${_pad(stream.name, _w)}\t${_pad(e, _w2)}\tevent: ${evt}\n`)
                        })
                })
        }

        return {
            open: _listenAll,
            close: function() {
                if(!_logStream.ended) _logStream.end()
            }
        }
    })(path.join(output, 'logFile.txt'));

    /**
     * listen to process events
     * */
    listenAll.open((process.name = process.execPath, process), procEvents, 'beforeExit');

    /**
     * set up prettify stream
     * */
    var prettify = (function() {
        var chunks = [];
        const _name = 'prettify';

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
    listenAll.open((prettify.stream.name = "prettify.stream", prettify.stream), streamEvents, ['data']);

    /**
     * set up output for synchronous write
     * */
    var synchOut = (function() {
        var s = {}, _f = function(){};
        s.on = function(e, f) {
            if(e === 'end') _f = f;
        };
        s.name = 'synchOut complete';
        function _log() {
            _f()
        }
        listenAll.open(s, ['_']);
        return function(err, src) {

            if(err) throw err;
            src = src.toString();
            fs.writeFile(output + 'bundle.synch.js', prettifySynch(src), _log());
        }
    })();

    /**
     *
     * */
    before(function() {
        //clear previous outputs
        require('glob').sync(output + '*.*').forEach(function(f) {
            fs.unlinkSync(f)
        })
    });
    after(function(){
        listenAll.close()
    });

    var writeBundle = fs.createWriteStream(output + 'bundle.js');
    listenAll.open((writeBundle.name = 'writeBundle', writeBundle), streamEvents, ['data']);

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
            // .pipe(prettify.stream)
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
