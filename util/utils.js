var path = require('path');
var fs = require('fs');

var utils = module.exports;

utils.mkSubDir = function (baseDir, subDir) {
    baseDir = path.resolve(baseDir);
    subDir = path.resolve(subDir);
    var arrDirs = subDir.substr(baseDir.length + 1).split('\\');
    arrDirs.forEach(function (value) {
        baseDir += '\\' + value;
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir);
        }
    });
};
