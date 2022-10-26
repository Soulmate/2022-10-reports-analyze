"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var csv_parse_1 = require("csv-parse");
var Histogram_1 = require("./Histogram");
var TEST_CUT = false; // pick only part of objects
var SAVE_EVERY_N = 100; // every Nth object save current historgams
// hist initialize
var binSizeDays = 10;
var dateFrom = Date.parse('00:00:00 2000-01-01 GMT');
var dateTo = Date.now();
var histogramWithoutWeight = new Histogram_1.Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
var histogramWeightSize = new Histogram_1.Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
function AddDataToHistograms(src_last_modified, src_size) {
    histogramWithoutWeight.AddPoint(src_last_modified);
    histogramWeightSize.AddPoint(src_last_modified, src_size);
}
// AWS initialize
var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
var BUCKET_NAME = 'fl-prod-migration-reports';
var listAllKeys = function (params, out) {
    if (out === void 0) { out = []; }
    return new Promise(function (resolve, reject) {
        s3.listObjectsV2(params).promise()
            .then(function (_a) {
            var Contents = _a.Contents, IsTruncated = _a.IsTruncated, NextContinuationToken = _a.NextContinuationToken;
            out.push.apply(out, Contents);
            console.log("Found ".concat(out.length, " objects"));
            if (TEST_CUT && out.length > 100) {
                resolve(out);
                return;
            }
            !IsTruncated ? resolve(out) : resolve(listAllKeys(Object.assign(params, { ContinuationToken: NextContinuationToken }), out));
        })
            .catch(reject);
    });
};
function DownloadAndAnalyzeAllObjects() {
    return __awaiter(this, void 0, void 0, function () {
        var contents, objList, i, fileKey_1, migrationId_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, listAllKeys({ Bucket: BUCKET_NAME })];
                case 1:
                    contents = _a.sent();
                    if (TEST_CUT) {
                        contents = contents
                            .filter(function (obj) { return obj.Size < 0.1 * 1e6; })
                            .slice(0, 100);
                    }
                    objList = contents.map(function (obj) { return obj.Key; });
                    console.log("Object list received: ".concat(objList.length, " objects."));
                    i = 0;
                    _a.label = 2;
                case 2:
                    if (!(i < objList.length)) return [3 /*break*/, 6];
                    fileKey_1 = objList[i];
                    return [4 /*yield*/, DownloadAndAnalyzeObject(fileKey_1)];
                case 3:
                    migrationId_1 = _a.sent();
                    console.log("".concat(new Date(), "\t").concat(i, "/").concat(objList.length, "\tloaded migrationId\t").concat(migrationId_1));
                    if (!(i % SAVE_EVERY_N == 0)) return [3 /*break*/, 5];
                    return [4 /*yield*/, SaveResults()];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5:
                    i++;
                    return [3 /*break*/, 2];
                case 6: return [4 /*yield*/, SaveResults()];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function DownloadAndAnalyzeObject(fileKey) {
    return __awaiter(this, void 0, void 0, function () {
        var migrationId, options;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    migrationId = +fileKey.split('/')[1];
                    options = {
                        Bucket: BUCKET_NAME,
                        Key: fileKey,
                    };
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            s3.getObject(options).createReadStream()
                                .pipe((0, csv_parse_1.parse)({ delimiter: ',', from: 2 }))
                                .on('data', function (row) {
                                var src_size = +row[4]; // src size
                                var src_last_modified = Date.parse(row[6]); // src last modified 12:17:24 2022-07-15 GMT 
                                AddDataToHistograms(src_last_modified, src_size);
                            })
                                .on('end', function () {
                                resolve(migrationId);
                            })
                                .on('error', reject);
                        })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function SaveResults() {
    return __awaiter(this, void 0, void 0, function () {
        var convertToDateFunction;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    convertToDateFunction = function (bin) { return new Date(bin)
                        .toLocaleString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric', }); };
                    console.log('Saving results:');
                    return [4 /*yield*/, histogramWithoutWeight.SaveToFile('output/histogramWithoutWeight_datenum.dat')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, histogramWithoutWeight.SaveToFile('output/histogramWithoutWeight.dat', convertToDateFunction)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, histogramWeightSize.SaveToFile('output/histogramWeightSize_datenum.dat')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, histogramWeightSize.SaveToFile('output/histogramWeightSize.dat', convertToDateFunction)];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
DownloadAndAnalyzeAllObjects();
//# sourceMappingURL=calcHistForReports.js.map