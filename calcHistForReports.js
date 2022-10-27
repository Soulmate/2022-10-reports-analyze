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
var MS_IN_DAY = 24 * 60 * 60 * 1000;
var CURRENT_TIME_STAMP = Date.now();
var unknownValuesOfMigrationType = new Set();
var unknownValuesOfDecision = new Set();
var unknownValuesOfResult = new Set();
// hist initialize
var binSizeDays = 7;
var maxAgeDays = 20 * 365; // maximum age of objects
var histAgeDaysAtNowObjNumber = new Histogram_1.Histogram(0, maxAgeDays, binSizeDays);
var histAgeDaysAtMigrationObjNumber = new Histogram_1.Histogram(0, maxAgeDays, binSizeDays);
var histAgeDaysAtNowSize = new Histogram_1.Histogram(0, maxAgeDays, binSizeDays);
var histAgeDaysAtMigrationSize = new Histogram_1.Histogram(0, maxAgeDays, binSizeDays);
function AddDataToHistograms(src_last_modified_timestamp, src_size, migration_timestamp) {
    var objAgeDaysAtNow = (CURRENT_TIME_STAMP - src_last_modified_timestamp) / MS_IN_DAY;
    var objAgeDaysAtMigration = (migration_timestamp - src_last_modified_timestamp) / MS_IN_DAY;
    histAgeDaysAtNowObjNumber.AddPoint(objAgeDaysAtNow);
    histAgeDaysAtMigrationObjNumber.AddPoint(objAgeDaysAtMigration);
    histAgeDaysAtNowSize.AddPoint(objAgeDaysAtNow, src_size);
    histAgeDaysAtMigrationSize.AddPoint(objAgeDaysAtMigration, src_size);
}
function SaveHistograms() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('Saving histograms:');
                    return [4 /*yield*/, histAgeDaysAtNowObjNumber.SaveToFile('output/histAgeDaysAtNowObjNumber.dat')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, histAgeDaysAtMigrationObjNumber.SaveToFile('output/histAgeDaysAtMigrationObjNumber.dat')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, histAgeDaysAtNowSize.SaveToFile('output/histAgeDaysAtNowSize.dat')];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, histAgeDaysAtMigrationSize.SaveToFile('output/histAgeDaysAtMigrationSize.dat')];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// cache for list of reports
var flatCache = require('flat-cache');
var cache = flatCache.load('listAllKeys');
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
        var reportsList, cachedListAllKeys, i, migrationId_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cachedListAllKeys = cache.getKey('reportsList');
                    if (!cachedListAllKeys) return [3 /*break*/, 1];
                    console.log('reportsList loaded from cache');
                    reportsList = cache.getKey('reportsList');
                    return [3 /*break*/, 3];
                case 1:
                    console.log('No cached reportsList');
                    return [4 /*yield*/, listAllKeys({ Bucket: BUCKET_NAME })];
                case 2:
                    reportsList = (_a.sent());
                    cache.setKey('reportsList', reportsList);
                    cache.save();
                    _a.label = 3;
                case 3:
                    if (TEST_CUT) {
                        reportsList = reportsList
                            .filter(function (obj) { return obj.Size < 0.1 * 1e6; })
                            .slice(0, 100);
                    }
                    console.log("Object list received: ".concat(reportsList.length, " objects."));
                    i = 0;
                    _a.label = 4;
                case 4:
                    if (!(i < reportsList.length)) return [3 /*break*/, 8];
                    return [4 /*yield*/, DownloadAndAnalyzeObject(reportsList[i])];
                case 5:
                    migrationId_1 = _a.sent();
                    console.log("".concat(new Date(), "\t").concat(i, "/").concat(reportsList.length, "\tloaded migrationId\t").concat(migrationId_1));
                    if (!(i % SAVE_EVERY_N == 0)) return [3 /*break*/, 7];
                    return [4 /*yield*/, SaveHistograms()];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7:
                    i++;
                    return [3 /*break*/, 4];
                case 8: return [4 /*yield*/, SaveHistograms()];
                case 9:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function DownloadAndAnalyzeObject(report) {
    return __awaiter(this, void 0, void 0, function () {
        var objKey, migration_timestamp, migrationId, options;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    objKey = report.Key;
                    migration_timestamp = report.LastModified;
                    migrationId = +objKey.split('/')[1];
                    options = {
                        Bucket: BUCKET_NAME,
                        Key: objKey,
                    };
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            s3.getObject(options).createReadStream()
                                .pipe((0, csv_parse_1.parse)({ delimiter: ',', from: 2 }))
                                .on('data', function (row) {
                                var migration_type = row[2];
                                var src_size = +row[4]; // src size
                                var src_last_modified = Date.parse(row[6]); // format: 12:17:24 2022-07-15 GMT                    
                                var decision = row[32];
                                var result = row[33];
                                switch (migration_type) {
                                    case 'single':
                                    case 'multi part':
                                        break;
                                    case 'number of part':
                                        return;
                                    case '':
                                        if (decision.startsWith('skip')) {
                                            return;
                                        }
                                        else {
                                            console.log('!unknown migration_type and decision', migration_type, {}, row, objKey);
                                            return;
                                        }
                                    default:
                                        unknownValuesOfMigrationType.add(migration_type);
                                        console.log('!unknown migration_type', migration_type, unknownValuesOfMigrationType, row, objKey);
                                        return;
                                }
                                switch (decision) {
                                    case 'copy':
                                        break;
                                    case 'skip due to rules':
                                    case 'skip due to hash match':
                                    case 'skip due to newer versions':
                                    case 'undefined':
                                        return;
                                    default:
                                        unknownValuesOfDecision.add(decision);
                                        console.log('!unknown decision', decision, unknownValuesOfDecision);
                                        return;
                                }
                                switch (result) {
                                    case 'success':
                                        break;
                                    case 'failure':
                                        return;
                                    default:
                                        unknownValuesOfResult.add(result);
                                        console.log('!unknown result', result, unknownValuesOfResult);
                                        return;
                                }
                                AddDataToHistograms(src_last_modified, src_size, migration_timestamp);
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
DownloadAndAnalyzeAllObjects();
//# sourceMappingURL=calcHistForReports.js.map