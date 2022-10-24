import * as fs from "fs";
import { parse } from 'csv-parse';


class Histogram {
   minValue: number;
   maxValue: number;
   binSize: number;
   binCount: number;

   binCenters: number[] = [];
   binEdges: number[] = [];

   data: number[];
   dataLower: number = 0; // что что выше верхней границы
   dataUpper: number = 0; // что что ниже нижней границы

   constructor(minValue: number, maxValue: number,
      binSize: number) {
      if (binSize <= 0 || maxValue - minValue < binSize) {
         throw ('binSize error');
      }
      this.minValue = minValue;
      this.maxValue = maxValue;
      this.binSize = binSize;

      this.binCount = Math.floor((this.maxValue - this.minValue) / this.binSize);

      for (let i = 0; i < this.binCount; i++) {
         this.binEdges.push(this.minValue + i * this.binSize);
         this.binCenters.push(this.minValue + i * this.binSize + this.binSize / 2);
      }
      this.binEdges.push(this.minValue + this.binCount * this.binSize);

      this.data = new Array(this.binCount).fill(0);
   }

   GetBinNumber(value: number): number {
      return Math.floor((value - this.minValue) / this.binSize);
   }

   AddPoint(value: number, weight: number = 1): void {
      const binNumber = this.GetBinNumber(value);
      if (binNumber < 0) {
         this.dataLower += weight;
         return;
      }
      if (binNumber >= this.binCount) {
         this.dataUpper += weight;
         return;
      }
      this.data[binNumber] += weight;
   }

   ToString(binConvertFunction = (bin) => bin) {
      let resultArray: string[] = [];
      for (let i = 0; i < this.binCount; i++) {
         resultArray.push(
            `${binConvertFunction(this.binCenters[i])}\t` +
            `${binConvertFunction(this.binEdges[i])}\t` +
            `${binConvertFunction(this.binEdges[i + 1])}\t` +
            `${this.data[i]}\n`);
      }
      return resultArray.reduce((sum, e) => sum += e, '');
   }

   SaveToFile(filePath: string, binConvertFunction = (bin) => bin) {
      fs.writeFile(filePath, this.ToString(binConvertFunction), (err) => {
         if (err)
            console.log(err);
         else {
            console.log("File written successfully\n");
         }
      });
   }
}

// hist initialize
const binSizeDays = 10;
const dateFrom = Date.parse('00:00:00 2022-07-01 GMT');
const dateTo = Date.now();
const histogramWithoutWeight = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
const histogramWeightSize = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);


// AWS
var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
let s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const BUCKET_NAME = 'fl-prod-migration-reports';
var bucketParams = {
  Bucket: BUCKET_NAME,
};
s3.listObjects(bucketParams, function (err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    const objList = data.Contents.map((obj) => obj.Key);
    console.log("Object list recieved", objList);
  }
});


const fileNameArr = [
   'test data/report.1dc373df-7cf6-426b-9a55-ba63488dec70.2022-10-19-02-30-26-808.csv',
   'test data/report.033d984b-5748-480a-82db-66a8e6dbc9ff.2022-10-21-22-16-50-399.csv'];

const promises = fileNameArr.map((fileName) =>
   new Promise((resolve, reject) => {
      fs.createReadStream(fileName)
         .pipe(parse({ delimiter: ',', from: 2 }))
         .on('data', function (row) {
            let src_size: number = +row[4]; // src size
            let src_last_modified: number = Date.parse(row[6]); // src last modified 12:17:24 2022-07-15 GMT 

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
         })
   })
);

Promise.all(promises).then((result) => {
   console.log('result', result);
   // console.log(histogramWithoutWeight.ToString());
   console.log(histogramWeightSize.ToString(
      (bin) => new Date(bin)
         .toLocaleString("en-US", { year: 'numeric',month: 'numeric', day: 'numeric', })));
});
