/**
 * Created by Admin on 24/07/2016.
 * experiment to develop log-events
 * Usage
 *  $ node testWriteStream [{--log, -l} logfile-rel-path | > logfile-rel-path]
 */
const fs = require('fs');
const util = require('util');
const path = require('path');

/**
 * get the CL args and connect the output destination
 * */
const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    { name: 'logfile', alias: 'l', type: String }
];
const options = commandLineArgs(optionDefinitions);
var output = options.logfile ? path.relative(__dirname, options.logfile) : process.stdout;
const listenAll = require('log-events')(output);

/**
* apply logs to selected event emitting objects
* */
var streamEvents = ['pipe', 'unpipe', 'finish', 'cork', 'close', 'drain', 'error', 'end', 'readable'];
var procEvents = ['beforeExit', 'exit', 'message', 'rejectionHandled', 'uncaughtException', 'unhandledRejection'];

listenAll.open((process.name = process.execPath, process), procEvents, 'beforeExit');

listenAll.open((_logStream.name = '_logStream', _logStream), streamEvents, 'data');

