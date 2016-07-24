/**
 * Created by cool.blue on 19/07/2016.
 */
var gulp     = require("gulp"),
    through = require('through2'),
    prettifySynch = require('js-beautify'),
    util = require('util');
var fs = require('fs');

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

var browserify = require('browserify');
var prettify = Prettify();

['unpipe', 'finish', 'cork', 'close', 'drain', 'error', 'end'].forEach(function(e) {
    prettify.stream.on(e, function(evt) {
        util.log(`${e} event: ${evt}`)
    })
});

function synchOut(err, src){
    if(err) throw err;
    var src = src.toString();
    fs.writeFileSync(__dirname + '/test/output/jquery.expose.cjs.synch.js', prettifySynch(src))
}

browserify()
    .require('./js/jquery.expose.js', {expose: 'expose'})
    .bundle(synchOut)
    .pipe(prettify.stream)
    .pipe(fs.createWriteStream(__dirname + '/test/output/jquery.expose.cjs.js'))

var a = ['1'];
console.log(typeof a.find)
