### Second level pipe breaks if chai assertion fails in mocha test
#### Build
    $ npm install
#### [SO Question](http://stackoverflow.com/q/38538793/2670182)  

I was trying to test a browserify transform with mocha but I wanted to stream the output from `b.bundle` through a prettify transform before piping it to a file.  All this inside a `describe` clause.

The [b.bundle()][1] method in browserify returns a stream but also accepts a call-back to which it passes it's output synchronously.  

In the test, the browserify process is initiated from an `it` clause, which provides a call-back to accept the synchronous output from `b.bundle`, but, I also want to create a stream to asynchronously output to a file at the same time.

The problem is that the pipe breaks if the assertion in the `it` clause fails.  

I can work around it by deleting the piped prettify and using the synchronous approach but, I am curious to understand why it fails.

The prettify stream, which uses the npm module [through2][2], works fine in a standard node context...

    function Prettify () {
        var chunks = [];
        function write(chunk, enc, cb){
            chunks.push(chunk);
            cb()
        }
        function getContent(){
            return Buffer.concat(chunks).toString('utf8')
        }
        function endTest (cb){
            var content = getContent();
            this.push(prettifySynch(content));
            this.push(null);
            cb();
        }
    
        return {stream: through(write, endTest), buffer: getContent}
    }

    browserify()
        .require('./js/jquery.expose.js', {expose: 'expose'})
        .bundle(synchOut)
        .pipe(prettify.stream)
        .pipe(fs.createWriteStream(__dirname + '/test/output/jquery.expose.cjs.js'))

But when I try this in a mocha test, it breaks if an assertion fails.  
Minimal example...

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
    
            function end(cb) {
                var content = getContent();
                this.push(prettifySynch(content));
                this.push(null);
                cb();
            }
    
            return {stream: through(write, end), buffer: getContent}
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
                expect(src).to.be.a('fail');
                done();
            });
        });
    
        }
    );

This is stripped down and doesn't include the transform I want to test because it still fails without it.  

All I am doing is running browserify with a call-back in `b.bundle` which, in turn, has a call-back from an `it` clause.  In the `b.bundle` call-back, I output the bundle through a synchronous prettify function (I added this to verify that bundle is ok), before passing it to the `it` clause with the provided call-back.

Meanwhile, the bundle stream is piped through a prettify transform and then to an output file.

The `it` clause is intentionally failing.

The intended result is that both the synchronous and asynchronous files (bundle.js and bundle.synch.js) should be prettified versions of the bundle.

The result is that the synchronous output is fine but the streamed version is blank.

 - If I make it so that the assertion passes, it works fine.
 - If I eliminate the synchronous output when the assertion fails, the streamed output is still blank.
 - If I just delete the `.pipe(prettify.stream)` line, then the unprettified bundle successfully pipes to the file even if the assertion fails.

I guess that this is because mocha is killing the context before the stream can complete, but I'm not really sure and I'm very new to node so my head is spinning.  

When it fails, the `end` function in the `prettify` object is never called by `through2` but, `prettify.buffer()` still returns the expected bundle.  So the stream is being written to successfully but is not drained by the next pipe.

I originally tried using [through][3] to build the stream and had exactly the same behaviour.  So I guess it's not an issue unique to `through2`

Can someone help me to understand what's going on?
  


  [1]: https://github.com/substack/node-browserify#bbundlecb
  [2]: https://www.npmjs.com/package/through2
  [3]: https://www.npmjs.com/package/through