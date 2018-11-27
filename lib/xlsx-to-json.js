'use strict'

var xlsx = require('node-xlsx');
var fs = require('fs');
var path = require('path');
var moment = require('moment');
var utils = require('../util/utils');

var arraySeparator = ",";

// valid data type
var arrValidDataType = [
    'basic&int',
    'basic&float',
    'basic&double',
    'date',
    'string',
    'int',
    'float',
    'double',
    'bool',
    'json',
    'BASIC&INT',
    'BASIC&FLOAT',
    'BASIC&DOUBLE',
    'DATE',
    'STRING',
    'INT',
    'FLOAT',
    'DOUBLE',
    'BOOL',
    'JSON',
    '{}',
    '[]',
    '[{}]'
];

var CODE = {
    OK: 0,
    INVALID_TYPE: 1,
    INVALID_NUMBER: 100,
    INVALID_JSON: 101,
    INVALID_OBJECT: 102,
    INVALID_ARRAY: 103
};

var CODE_MSG = {};
CODE_MSG[CODE.INVALID_TYPE] = 'cannot find the type';
CODE_MSG[CODE.INVALID_NUMBER] = 'invalid number';
CODE_MSG[CODE.INVALID_JSON] = 'invalid json string';
CODE_MSG[CODE.INVALID_OBJECT] = 'invalid object';
CODE_MSG[CODE.INVALID_ARRAY] = 'invalid array';

var UPPER_LETTERS = [
    'A', 'B', 'C', 'D', 'E',
    'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O',
    'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y',
    'Z'
];

/**
 * to col
 * @param num
 * @returns {string}
 */
var toCol = function(num){
    if(num <= 0){
        return '' + num;
    }

    num = num - 1;
    if(typeof UPPER_LETTERS[num] === 'string'){
        return UPPER_LETTERS[num];
    }

    var fIdx = Math.floor(num/UPPER_LETTERS.length) - 1;
    if(typeof UPPER_LETTERS[fIdx] === 'string'){
        return UPPER_LETTERS[fIdx] + UPPER_LETTERS[num%UPPER_LETTERS.length];
    }
    return '' + (num + 1);
};

module.exports = {
    /**
     * export .xlsx file to json
     * src_excel_file: path of .xlsx files.
     * dest_dir: directory for exported json files.
     */
    toJson: function(logger, src_excel_file, dest_dir) {
        //arraySeparator = separator;
        if (!fs.existsSync(dest_dir)) {
            fs.mkdirSync(dest_dir);
        }

        fs.appendFileSync(logger, '\r\n========================================'
        + '======================================\r\n');
        var log = 'info: start parsing excel: ' + src_excel_file;
        console.log(log);
        fs.appendFileSync(logger, log + '\r\n');

        var parseSrc = path.parse(src_excel_file);
        var parseDest = path.parse(dest_dir);

        var part = parseSrc.dir.substring(parseDest.dir.length + 1);
        part = (part.indexOf('\\') === -1) ? '': part.substring(part.indexOf('\\'));

        //console.log('ddddddd: %s', dd);
        //console.log(parseSrc.dir);
        //console.log(parseDest.dir);
        //console.log(dest_dir);
        //console.log('---------------');

        var now_dir = path.resolve(dest_dir) + part;
        utils.mkSubDir(dest_dir, now_dir);

        var excel_name = parseSrc.name;
        //console.log('excel_name:%j now_dir:%j', excel_name, now_dir);

        var excel = xlsx.parse(src_excel_file);
        _toJson(logger, excel, excel_name, now_dir);
    }
};

/**
 * export .xlsx file to json formate.
 * excel: json string converted by 'node-xlsx'。
 * head : line number of excell headline.
 * dest : directory for exported json files.
 */
function _toJson(logger, excel, excel_name, dest) {
    for (var i_sheet = 0; i_sheet < excel.worksheets.length; i_sheet++) {
        var sheet = excel.worksheets[i_sheet];
        fs.appendFileSync(logger, '\r\n*************************************'
        + '*****************************************\r\n');
        var log = 'info: sheet name: ' + sheet.name;
        console.log(log);
        fs.appendFileSync(logger, log + '\r\n');

        if(!sheet.data || sheet.data.length === 0){
            continue;
        }

        var result = null;
        var flag = trim(sheet.data[0][0].value).toLowerCase();
        if(flag === '$object'){
            if(sheet.data.length !== 0){
                result = exportObject(sheet, logger, 1);
            }
        }else{
            result = exportArrayObject(sheet, logger, 2);
        }

        if(!result){
            continue;
        }

        var dest_file = path.resolve(dest, excel_name + ".json");
        if (excel.worksheets.length > 1) {
            dest_file = path.resolve(dest, excel_name + '.' + sheet.name + ".json");
        }

        fs.writeFile(dest_file, result.output, function (err) {
            if (err) {
                console.error("writeFile: %j, error: ", dest_file, err);
            }
        });

        log = 'info: export json success: '
            + path.basename(dest_file)
            + ', (total:' + result.dataNum
            + ', export:' + result.outNum
            + ', lose:' + (result.dataNum - result.outNum) + ')';
        console.log(log);
        fs.appendFileSync(logger, log + '\r\n');
    }
}

/**
 * export object
 * @param sheet
 * @param logger
 * @param head
 * @returns {{dataNum: number, outNum: number, output: string}}
 */
function exportObject(sheet, logger, head) {
    var log = '';
    var dataNum = 0;
    var output = {
        $describe: []
    };
    var arrDesc = [];
    for(var i=head,l=sheet.data.length; i<l; i++){
        var row = sheet.data[i];
        if(!row || row.length === 0){
            continue;
        }

        var desc = '';
        if(row[0] && row[0].value){
            desc = row[0].value;
        }

        if(!row[1] || !row[1].value){
            continue;
        }

        dataNum++;
        var spRes = row[1].value.split('#');
        var key = trim(spRes[0]);
        var type = spRes[1] ? spRes[1].split('*')[0] : '';
        var fetchRes = fetchCellValue(type, row[2]);
        if(fetchRes.code !== CODE.OK){
            log = 'error: cell[' + (i + 1) + ',' + (toCol(2)) + '], code: '
                + fetchRes.code + ', msg: ' + CODE_MSG[fetchRes.code] + ', error: ' + (fetchRes.codeErr ? fetchRes.codeErr.message : 'null');
            console.error(log);
            fs.appendFileSync(logger, log + '\r\n');
            continue;
        }

        if(output.hasOwnProperty(key)){
            log = 'error: cell[' + (i + 1) + ',' + (toCol(2)) + '], repeat key: ' + key;
            console.error(log);
            fs.appendFileSync(logger, log + '\r\n');
            continue;
        }

        output[key] = fetchRes.value;
        arrDesc.push('' + key + ':' + desc);
    }

    output.$describe = arrDesc;
    var outNum = Object.keys(output).length - 1;
    output = JSON.stringify(output, null, 2);

    return {
        dataNum: dataNum,
        outNum: outNum,
        output: output
    };
}

/**
 * export array object
 * @param sheet
 * @param logger
 * @param head
 * @returns {{dataNum: number, outNum: number, output: string}}
 */
function exportArrayObject(sheet, logger, head) {
    var log = '';
    var col_type = [];  //column data type
    var col_name = [];  //column name
    var col_key = [];   //column index key (primary, unique)

    var row_head = sheet.data[head - 1];
    //console.log(row_head);

    //读取表头 解读列名字和列数据类型
    //parse headline to get column name & column data type
    for (var i_cell = 0; i_cell < row_head.length; i_cell++) {
        if (!row_head[i_cell]) {
            continue;
        }

        var name = row_head[i_cell].value;
        if (typeof name === 'undefined' || !name) {
            break;
        }

        var type = 'basic';   // basic
        var key = 'none';     // none
        if (name.indexOf('#') !== -1) {
            var arr1 = name.split('#');
            var temp1 = arr1[0];
            var temp2 = arr1[1];
            if (temp1.indexOf('*') !== -1) {
                var arr2 = temp1.split('*');
                name = arr2[0];
                key = arr2[1];
                type = temp2;
            } else if (temp2.indexOf('*') !== -1) {
                name = temp1;
                var arr3 = temp2.split('*');
                type = arr3[0];
                key = arr3[1];
            } else {
                name = temp1;
                type = temp2;
            }
        } else if (name.indexOf('*') !== -1) {
            var arr1 = name.split('*');
            name = arr1[0];
            key = arr1[1];
        }

        trim(name);
        trim(type);
        trim(key);
        col_name.push(name);
        col_type.push(type);
        col_key.push(key);
    }

    // check data type
    var bValidType = true;
    for (var i_type = 0; i_type < col_type.length; i_type++) {
        if (-1 === arrValidDataType.indexOf(col_type[i_type])) {
            bValidType = false;
            log = 'error: col[' + toCol(i_type + 1)
                + '] invalid data type, '
                + col_type[i_type];
            console.error(log);
            fs.appendFileSync(logger, log + '\r\n');
            continue;
        }
    }

    if (!bValidType) {
        return;
    }

    var keyMap = {
        primary: null,
        unique: []
    };

    for (var i_key = 0; i_key < col_key.length; i_key++) {
        var temp = col_key[i_key];
        if (temp === 'none') {
            continue;
        } else if (temp === 'primary') {
            if (!keyMap.primary) {
                if (col_type[i_key] === 'int'
                    || col_type[i_key] === 'INT'
                    || col_type[i_key] === 'float'
                    || col_type[i_key] === 'FLOAT'
                    || col_type[i_key] === 'double'
                    || col_type[i_key] === 'DOUBLE'
                    || col_type[i_key] === 'string'
                    || col_type[i_key] === 'STRING') {
                    keyMap.primary = col_name[i_key];
                } else {
                    log = 'warn: col[' + toCol(i_key + 1)
                        + '] invalid primary key data type, '
                        + col_name[i_key] + ', data type:'
                        + col_type[i_key];
                    console.warn(log);
                    fs.appendFileSync(logger, log + '\r\n');
                }
            } else {
                log = 'warn: col[' + toCol(i_key + 1)
                    + '] duplication primary key, '
                    + col_name[i_key];
                console.warn(log);
                fs.appendFileSync(logger, log + '\r\n');
            }
        } else if (temp.indexOf('unique') !== -1) {
            var temp1 = temp.substr(temp.indexOf('unique') + 6);
            temp1 = temp1.substr(1);
            temp1 = temp1.substr(0, temp1.length - 1);
            var arrKey = [];
            var bValid = true;
            if (temp1.length !== 0) {
                var tempArr = temp1.split(',');
                for (var i = 0; i < tempArr.length; i++) {
                    var findIndex = col_name.indexOf(tempArr[i]);
                    if (findIndex !== -1) {
                        if (col_type[findIndex] === 'int'
                            || col_type[findIndex] === 'INT'
                            || col_type[findIndex] === 'float'
                            || col_type[findIndex] === 'FLOAT'
                            || col_type[findIndex] === 'double'
                            || col_type[findIndex] === 'DOUBLE'
                            || col_type[findIndex] === 'string'
                            || col_type[findIndex] === 'STRING') {
                            if (arrKey.indexOf(tempArr[i]) === -1) {
                                arrKey.push(tempArr[i]);
                            }
                        } else {
                            bValid = false;
                            log = 'warn: col[' + toCol(i_key + 1)
                                + '] invalid unique key data type, '
                                + col_name[i_key] + ', index:' + tempArr[i]
                                + ', data type:' + col_type[findIndex];
                            console.warn(log);
                            fs.appendFileSync(logger, log + '\r\n');
                        }
                    } else {
                        bValid = false;
                        log = 'warn: col[' + toCol(i_key + 1)
                            + '] invalid unique key, '
                            + col_name[i_key] + ', unique key:'
                            + temp1 + ', index:' + tempArr[i];
                        console.warn(log);
                        fs.appendFileSync(logger, log + '\r\n');
                    }
                }
            }

            // invalid
            if (!bValid) {
                arrKey = [];
            }

            if (arrKey.length !== 0) {
                var bSame = false;
                for (var i = 0; i < keyMap.unique.length; i++) {
                    var tempArr = keyMap.unique[i];
                    if (arrKey.length !== tempArr.length) {
                        continue;
                    }
                    var num = 0;
                    for (var j = 0; j < arrKey.length; j++) {
                        if (tempArr.indexOf(arrKey[j]) !== -1) {
                            num += 1;
                        }
                    }
                    if (num === arrKey.length) {
                        bSame = true;
                        break;
                    }
                }

                if (!bSame) {
                    keyMap.unique.push(arrKey);
                }
            }
        } else {
            log = 'warn: col[' + toCol(i_key + 1)
                + '] invalid key, ' + col_name[i_key]
                + ', key:' + temp;
            console.warn(log);
            fs.appendFileSync(logger, log + '\r\n');
        }
    }

    var dataNum = 0;
    var output = [];
    for (var i_row = head; i_row < sheet.data.length; i_row++) {
        var row = sheet.data[i_row];
        if (typeof(row) === 'undefined'
            || typeof(row[0]) === 'undefined') {
            //log = 'error: row['+(i_row+1) + '] (undefined)';
            //console.error(log);
            continue;
        }
        dataNum += 1;

        var json_obj = {};
        var bValidRow = true;
        for (var i_col = 0; i_col < col_type.length; i_col++) {
            var cell = row[i_col];
            if (typeof(cell) === 'undefined') {
                //bValidRow = false;
                log = 'error: cell[' + (i_row + 1) + ',' + toCol(i_col + 1) + ']: is (undefined)';
                console.warn(log);
                fs.appendFileSync(logger, log + '\r\n');
                //continue;
            }

            var fetchRes = fetchCellValue(col_type[i_col], cell);
            if (fetchRes.code === CODE.OK) {
                json_obj[col_name[i_col]] = fetchRes.value;
            } else {
                bValidRow = false;
                log = 'error: cell[' + (i_row + 1) + ',' + toCol(i_col + 1) + '], code: '
                    + fetchRes.code + ', msg: ' + CODE_MSG[fetchRes.code];
                console.error(log);
                fs.appendFileSync(logger, log + '\r\n');
            }
        }

        if (!bValidRow) {
            continue;
        }

        // check primary key
        var bDupPriKey = false;
        if (keyMap.primary) {
            if (getObjArrIndex(output, keyMap.primary, json_obj[keyMap.primary]) !== -1) {
                bDupPriKey = true;
            }
        }

        // check unique key
        var bDupUniKey = false;
        var arrUniName = [];
        for (var i = 0; i < keyMap.unique.length; i++) {
            var tempArr = keyMap.unique[i];
            if (tempArr.length === 0) {
                continue;
            }

            var UKeyName = '';
            for (var j = 0; j < tempArr.length; j++) {
                UKeyName = UKeyName + tempArr[j] + ',';
            }
            UKeyName = UKeyName.substr(0, UKeyName.length - 1);

            for (var n = 0, s = output.length; n < s; n++) {
                var tempRow = output[n];
                var repeat = true;
                for (var j = 0; j < tempArr.length; j++) {
                    var index_name = tempArr[j];
                    if (tempRow[index_name] !== json_obj[index_name]) {
                        repeat = false;
                    }
                }

                if (repeat) {
                    bDupUniKey = true;
                    arrUniName.push(UKeyName);
                    break;
                }
            }
        }

        if (bDupPriKey) {
            log = 'error: row[' + (i_row + 1)
                + '] primary key duplication value, '
                + keyMap.primary;
            console.error(log);
            fs.appendFileSync(logger, log + '\r\n');
        }

        if (bDupUniKey) {
            for (var i = 0; i < arrUniName.length; i++) {
                log = 'error: row[' + (i_row + 1)
                    + '] unique key duplication value, '
                    + arrUniName[i];
                console.error(log);
                fs.appendFileSync(logger, log + '\r\n');
            }
        }

        if (!bDupPriKey && !bDupUniKey) {
            output.push(json_obj);
        }
    }

    var outNum = output.length;
    output = JSON.stringify(output, null, 2);

    return {
        dataNum: dataNum,
        outNum: outNum,
        output: output
    };
}

/**
 * fetch cell value
 * @param type
 * @param cell
 * @returns {{code: number}}
 */
function fetchCellValue(type, cell) {
    type = type.toLowerCase().trim();
    var result = {code: CODE.OK};
    switch (type) {
        case 'basic&int':
        case 'BASIC&INT':// int string boolean
            if (cell) {
                if (cell.value === null) {
                    result.value = "";
                } else {
                    var isNumber = !isNaN(+cell.value.toString());
                    if (isNumber) {
                        result.value = Math.round(Number(cell.value.toString())||0);
                    } else {
                        if (isBoolean(cell.value.toString())) {
                            result.value = toBoolean(cell.value.toString());
                        } else {
                            // take [],{},[{}],string
                            if (0 === cell.value.indexOf('[]')) {
                                cell.value = cell.value.slice(2);
                                if (cell) {
                                    result.value = parseBasicArrayField(cell.value);
                                } else {
                                    result.value = [];
                                }
                            } else if (0 === cell.value.indexOf('{}')) {
                                cell.value = cell.value.slice(2);
                                if (cell) {
                                    result.value = parseObject(cell.value);
                                } else {
                                    result.value = {};
                                }
                            } else if (0 === cell.value.indexOf('[{}]')) {
                                cell.value = cell.value.slice(4);
                                if (cell) {
                                    result.value = parseObjectArrayField(cell.value);
                                } else {
                                    result.value = [];
                                }
                            } else {
                                result.value = cell.value.toString();
                            }
                        }
                    }
                }
            } else {
                result.value = "";
            }
            break;
        case "basic&float":
        case "BASIC&FLOAT":
        case "basic&double":
        case "BASIC&DOUBLE":// float,double string boolean
            if (cell) {
                if (cell.value === null) {
                    result.value = "";
                } else {
                    var isNumber = !isNaN(+cell.value.toString());
                    if (isNumber){
                        result.value = Number(cell.value.toString())||0;
                    }else {
                        if (isBoolean(cell.value.toString())) {
                            result.value = toBoolean(cell.value.toString());
                        } else {
                            // take [],{},[{}],string
                            if (0 === cell.value.indexOf('[]')) {
                                cell.value = cell.value.slice(2);
                                if (cell) {
                                    result.value = parseBasicArrayField(cell.value);
                                } else {
                                    result.value = [];
                                }
                            } else if (0 === cell.value.indexOf('{}')) {
                                cell.value = cell.value.slice(2);
                                if (cell) {
                                    result.value = parseObject(cell.value);
                                } else {
                                    result.value = {};
                                }
                            } else if (0 === cell.value.indexOf('[{}]')) {
                                cell.value = cell.value.slice(4);
                                if (cell) {
                                    result.value = parseObjectArrayField(cell.value);
                                } else {
                                    result.value = [];
                                }
                            } else {
                                result.value = cell.value.toString();
                            }
                        }
                    }
                }
            } else {
                result.value = "";
            }
            break;
        case 'date':
        case 'DATE':
            if (cell) {
                if (cell.value === null) {
                    result.value = "";
                }else{
                    result.value = parseDateType(cell.value);
                }
            }else{
                result.value = "";
            }
            break;
        case 'string':
        case 'STRING':
            if (cell) {
                if(cell.value === null){
                    result.value = "";
                } else if (isDateType(cell.value)) {
                    result.value = parseDateType(cell.value);
                } else {
                    if (typeof cell.value === 'string'){
                        result.value = cell.value;
                    } else if(isNaN(cell.value)) {
                        result.value = "";
                    } else {
                        result.value = cell.value.toString();
                    }
                }
            } else {
                result.value = "";
            }
            break;
        case 'int':
        case 'INT':
            if (cell){
                if (cell.value === null) {
                    result.value = 0;
                } else {
                    var isNumber = !isNaN(+cell.value.toString());
                    if (isNumber) {
                        result.value = Math.round(Number(cell.value.toString())||0);
                    } else {
                        result.value = 0;
                    }
                    if (!isNumber) {
                        result.code = CODE.INVALID_NUMBER;
                    }
                }
            } else {
                result.value = 0;
            }
            break;
        case 'float':
        case 'FLOAT':
        case 'double':
        case 'DOUBLE':
            if (cell){
                if (cell.value === null) {
                    result.value = 0;
                } else {
                    var isNumber = !isNaN(+cell.value.toString());
                    if (cell && isNumber) {
                        result.value = Number(cell.value.toString())||0;
                    } else {
                        result.value = 0;
                    }
                    if (!isNumber) {
                        result.code = CODE.INVALID_NUMBER;
                    }
                }
            }else{
                result.value = 0;
            }
            break;
        case 'bool':
        case 'BOOL':
            if (cell) {
                if (cell.value === null) {
                    result.value = false;
                }else{
                    result.value = toBoolean(cell.value.toString());
                }
            } else {
                result.value = false;
            }
            break;
        case '{}': //support {number boolean string date} property type
            if (cell) {
                if (cell.value === null) {
                    result.value = {};
                    result.code = CODE.INVALID_OBJECT;
                }else{
                    result.value = parseObject(cell.value);
                }
            }else{
                result.value = {};
            }
            break;
        case '[]': //[number] [boolean] [string]  todo:support [date] type
            if (cell) {
                if (cell.value === null) {
                    result.value = [];
                    result.code = CODE.INVALID_ARRAY;
                }else{
                    result.value = parseBasicArrayField(cell.value);
                }
            }else{
                result.value = [];
            }
            break;
        case '[{}]':
            if (cell) {
                if (cell.value === null) {
                    result.value = [];
                    result.code = CODE.INVALID_ARRAY;
                }else{
                    result.value = parseObjectArrayField(cell.value);
                }
            } else {
                result.value = [];
            }
            break;
        case 'json':
        case 'JSON':
            if (cell) {
                var res = parseJsonField(cell.value);
                if (res.err) {
                    result.code = CODE.INVALID_JSON;
					result.codeErr = res.err;
                } else {
                    result.value = res.value;
                }
            } else {
                //result.value = null;
                result.code = CODE.INVALID_JSON;
            }
            break;
        default:
            result.code = CODE.INVALID_TYPE;
            break;
    }
    return result;
}

/**
 * parse date type
 * @param value
 * @returns {*|string}
 */
function parseDateType(value) {
    return convert2Date(value);
}

/**
 * convert string to date type
 * value: cell value
 */
function convert2Date(value) {
    var dateTime = moment(value);
    if (dateTime.isValid()) {
        return dateTime.format("YYYY-MM-DD HH:mm:ss");
    } else {
        return "";
    }
}

/**
 * parse object array.
 * @param value
 * @returns {Array}
 */
function parseObjectArrayField(value) {
    var obj_array = [];
    if (value) {
        if (value.indexOf(',') !== -1) {
            obj_array = value.split(',');
        } else {
            obj_array.push(value.toString());
        }
    }

    // if (typeof(value) === 'string' && value.indexOf(',') !== -1) {
    //     obj_array = value.split(',');
    // } else {
    //     obj_array.push(value.toString());
    // };

    var result = [];
    obj_array.forEach(function(v) {
        if (v) {
            result.push(array2object(v.split(';')));
        }
    });

    return result;
}

/**
 * parse json field.
 */
function parseJsonField(value) {
    try{
        return {err: null, value: JSON.parse(value)};
    }catch (e) {
        return {err: e};
    }
}

/**
 * parse object from array.
 *  for example : [a:123,b:45] => {'a':123,'b':45}
 */
function array2object(array) {
    var result = {};
    array.forEach(function(e) {
        if (e) {
            var kv = e.trim().split(':');
            if (isNumber(kv[1])) {
                kv[1] = Number(kv[1]);
            } else if (isBoolean(kv[1])) {
                kv[1] = toBoolean(kv[1]);
            } else if (isDateType(kv[1])) {
                kv[1] = convert2Date(kv[1]);
            }
            result[kv[0]] = kv[1];
        }
    });
    return result;
}

/**
 * parse object
 * @param data
 */
function parseObject(data) {
    return array2object(data.split(';'));
}

/**
 * parse simple array.
 * @param array
 * @returns {Array}
 */
function parseBasicArrayField(array) {
    var basic_array;
    if (typeof array === "string") {
        basic_array = array.split(arraySeparator);
    } else if (isNaN(array)) {
        basic_array = [];
    } else {
        basic_array = [];
        basic_array.push(array);
    }

    var result = [];
    if (isNumberArray(basic_array)) {
        basic_array.forEach(function(element) {
            result.push(Number(element));
        });
    } else if (isBooleanArray(basic_array)) {
        basic_array.forEach(function(element) {
            result.push(toBoolean(element));
        });
    } else { //string array
		basic_array.forEach(function(element) {
            result.push(element.trim());
        });
    }
    // console.log("basic_array", result + "|||" + cell.value);
    return result;
}

/**
 * convert value to boolean.
 */
function toBoolean(value) {
    return value.toString().toLowerCase() === 'true';
}

/**
 * is a boolean array.
 */
function isBooleanArray(arr) {
    return arr.every(function(element, index, array) {
        return isBoolean(element);
    });
}

/**
 * is a number array.
 */
function isNumberArray(arr) {
    return arr.every(function(element, index, array) {
        return isNumber(element);
    });
}

/**
 * is a number.
 */
function isNumber(value) {
    if (typeof(value) === "undefined") {
        return false;
    }

    if (typeof value === 'number') {
        return true;
    }
    return !isNaN(+value.toString());
}

/**
 * boolean type check.
 */
function isBoolean(value) {
    if (typeof(value) === "undefined") {
        return false;
    }

    if (typeof value === 'boolean') {
        return true;
    }

    var b = value.toString().trim().toLowerCase();
    return b === 'true' || b === 'false';
}

//delete all space
function trim(str) {
    return str.replace(/(^\s+)|(\s+$)/g, "");
}

/**
 * date type check.
 */
function isDateType(value) {
    if (value) {
        value = value.toString();
        return moment(new Date(value), "YYYY-M-D", true).isValid() || moment(value, "YYYY-M-D H:m:s", true).isValid() || moment(value, "YYYY/M/D H:m:s", true).isValid() || moment(value, "YYYY/M/D", true).isValid();
    }
    return false;
}

/**
 * get obj arr index
 */
function getObjArrIndex(objArr, objField, findValue) {
    if (!objArr || objArr.length === 0){
        return -1;
    }

    var findIndex = -1;
    for (var i= 0, l = objArr.length; i < l; i++){
        var obj = objArr[i];
        if (obj && obj[objField] === findValue){
            findIndex = i;
            break;
        }
    }

    return findIndex;
}