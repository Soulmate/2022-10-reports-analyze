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
        for (var i = 0; i < this.binCount; i++) {
            resultArray.push("".concat(binConvertFunction(this.binCenters[i]), "\t") +
                "".concat(binConvertFunction(this.binEdges[i]), "\t") +
                "".concat(binConvertFunction(this.binEdges[i + 1]), "\t") +
                "".concat(this.data[i], "\n"));
        }
        return resultArray.reduce(function (sum, e) { return sum += e; }, '');
    };
    Histogram.prototype.SaveToFile = function (filePath, binConvertFunction) {
        if (binConvertFunction === void 0) { binConvertFunction = function (bin) { return bin; }; }
        fs.writeFile(filePath, this.ToString(binConvertFunction), function (err) {
            if (err)
                console.log(err);
            else {
                console.log("File written successfully\n");
            }
        });
    };
    return Histogram;
}());
// hist initialize
var binSizeDays = 10;
var dateFrom = Date.parse('00:00:00 2022-07-01 GMT');
var dateTo = Date.now();
var histogramWithoutWeight = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
var histogramWeightSize = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
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
        var objList = data.Contents.map(function (obj) { return obj.Key; });
        console.log("Object list recieved", objList);
    }
});
var fileNameArr = [
    'test data/report.1dc373df-7cf6-426b-9a55-ba63488dec70.2022-10-19-02-30-26-808.csv',
    'test data/report.033d984b-5748-480a-82db-66a8e6dbc9ff.2022-10-21-22-16-50-399.csv'
];
var promises = fileNameArr.map(function (fileName) {
    return new Promise(function (resolve, reject) {
        fs.createReadStream(fileName)
            .pipe((0, csv_parse_1.parse)({ delimiter: ',', from: 2 }))
            .on('data', function (row) {
            var src_size = +row[4]; // src size
            var src_last_modified = Date.parse(row[6]); // src last modified 12:17:24 2022-07-15 GMT 
            histogramWithoutWeight.AddPoint(src_last_modified);
            histogramWeightSize.AddPoint(src_last_modified, src_size);
            // console.log('point added', src_last_modified);
            // //TEST
            // dateNumArr.push([row[6], src_last_modified]);
        })
            .on('end', function () {
            console.log('Data loaded ' + fileName);
            resolve(1);
            // //TEST
            // const datenumArrStr: string = dateNumArr.map((e) => `${e[0]}\t${e[1]}`).join('\r\n');
            // fs.writeFile('test.dat', datenumArrStr, (err) => {
            //    if (err)
            //       console.log(err);
            //    else {
            //       console.log("File written successfully\n");
            //    }
            // });
        });
    });
});
Promise.all(promises).then(function (result) {
    console.log('result', result);
    // console.log(histogramWithoutWeight.ToString());
    console.log(histogramWeightSize.ToString(function (bin) { return new Date(bin)
        .toLocaleString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric', }); }));
});
//# sourceMappingURL=test_hist.js.map