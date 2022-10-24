"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var csv_parse_1 = require("csv-parse");
var Histogram = /** @class */ (function () {
    function Histogram(minValue, maxValue, binSize) {
        this.binCenters = [];
        this.binEdges = [];
        this.dataLower = 0; // что что выше верхней границы
        this.dataUpper = 0; // что что ниже нижней границы
        if (binSize <= 0 || maxValue - minValue < binSize) {
            throw ('binSize error');
        }
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.binSize = binSize;
        this.binCount = Math.floor((this.maxValue - this.minValue) / this.binSize);
        for (var i = 0; i < this.binCount; i++) {
            this.binEdges.push(this.minValue + i * this.binSize);
            this.binCenters.push(this.minValue + i * this.binSize + this.binSize / 2);
        }
        this.binEdges.push(this.minValue + this.binCount * this.binSize);
        this.data = new Array(this.binCount).fill(0);
    }
    Histogram.prototype.GetBinNumber = function (value) {
        return Math.floor((value - this.minValue) / this.binSize);
    };
    Histogram.prototype.AddPoint = function (value, weight) {
        if (weight === void 0) { weight = 1; }
        var binNumber = this.GetBinNumber(value);
        if (binNumber < 0) {
            this.dataLower += weight;
            return;
        }
        if (binNumber >= this.binCount) {
            this.dataUpper += weight;
            return;
        }
        this.data[binNumber] += weight;
    };
    Histogram.prototype.ToString = function (binConvertFunction) {
        if (binConvertFunction === void 0) { binConvertFunction = function (bin) { return bin; }; }
        var resultArray = [];
        resultArray.push("".concat(binConvertFunction(NaN), "\t") +
            "".concat(binConvertFunction(NaN), "\t") +
            "".concat(binConvertFunction(this.binEdges[0]), "\t") +
            "".concat(this.dataLower));
        for (var i = 0; i < this.binCount; i++) {
            resultArray.push("".concat(binConvertFunction(this.binCenters[i]), "\t") +
                "".concat(binConvertFunction(this.binEdges[i]), "\t") +
                "".concat(binConvertFunction(this.binEdges[i + 1]), "\t") +
                "".concat(this.data[i]));
        }
        resultArray.push("".concat(binConvertFunction(NaN), "\t") +
            "".concat(binConvertFunction(this.binEdges[this.binCount]), "\t") +
            "".concat(binConvertFunction(NaN), "\t") +
            "".concat(this.dataUpper));
        return resultArray.join('\n');
    };
    Histogram.prototype.SaveToFile = function (filePath, binConvertFunction) {
        if (binConvertFunction === void 0) { binConvertFunction = function (bin) { return bin; }; }
        fs.writeFile(filePath, this.ToString(binConvertFunction), function (err) {
            if (err)
                console.log(err);
            else {
                console.log("File written successfully ".concat(filePath, "\n"));
            }
        });
    };
    return Histogram;
}());
// hist initialize
var binSizeDays = 10;
var dateFrom = Date.parse('00:00:00 2000-01-01 GMT');
var dateTo = Date.now();
var histogramWithoutWeight = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
var histogramWeightSize = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
var reportIndex = 0; //для счетчтика
// AWS
var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
var BUCKET_NAME = 'fl-prod-migration-reports';
var bucketParams = {
    Bucket: BUCKET_NAME,
};
s3.listObjects(bucketParams, function (err, data) {
    if (err) {
        console.log("Error", err);
    }
    else {
        var objList_1 = data.Contents
            // .filter((obj) => obj.Size < 100000) // test cut
            .map(function (obj) { return obj.Key; });
        // .slice(0, 10); // test cut
        console.log("Object list recieved: ".concat(objList_1.length, " objects."));
        var promises = objList_1.map(function (fileKey) {
            return new Promise(function (resolve, reject) {
                var migrationId = +fileKey.split('/')[1];
                var options = {
                    Bucket: BUCKET_NAME,
                    Key: fileKey,
                };
                s3.getObject(options).createReadStream()
                    .pipe((0, csv_parse_1.parse)({ delimiter: ',', from: 2 }))
                    .on('data', function (row) {
                    var src_size = +row[4]; // src size
                    var src_last_modified = Date.parse(row[6]); // src last modified 12:17:24 2022-07-15 GMT 
                    histogramWithoutWeight.AddPoint(src_last_modified);
                    histogramWeightSize.AddPoint(src_last_modified, src_size);
                })
                    .on('end', function () {
                    console.log("".concat(reportIndex, "/").concat(objList_1.length, "\tloaded\t").concat(migrationId));
                    resolve(reportIndex);
                    reportIndex++;
                });
            });
        });
        Promise.all(promises).then(function (result) {
            var convertToDateFunction = function (bin) { return new Date(bin)
                .toLocaleString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric', }); };
            // console.log(histogramWithoutWeight.ToString(convertToDateFunction));
            histogramWithoutWeight.SaveToFile('output_histogramWithoutWeight_datenum.dat');
            histogramWithoutWeight.SaveToFile('output_histogramWithoutWeight.dat', convertToDateFunction);
            histogramWeightSize.SaveToFile('output_histogramWeightSize_datenum.dat');
            histogramWeightSize.SaveToFile('output_histogramWeightSize.dat', convertToDateFunction);
        });
    }
});
//# sourceMappingURL=calcHistForReports.js.map