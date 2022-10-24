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
      resultArray.push(
         `${binConvertFunction(NaN)}\t` +
         `${binConvertFunction(NaN)}\t` +
         `${binConvertFunction(this.binEdges[0])}\t` +
         `${this.dataLower}`);
      for (let i = 0; i < this.binCount; i++) {
         resultArray.push(
            `${binConvertFunction(this.binCenters[i])}\t` +
            `${binConvertFunction(this.binEdges[i])}\t` +
            `${binConvertFunction(this.binEdges[i + 1])}\t` +
            `${this.data[i]}`);
      }
      resultArray.push(
         `${binConvertFunction(NaN)}\t` +
         `${binConvertFunction(this.binEdges[this.binCount])}\t` +
         `${binConvertFunction(NaN)}\t` +
         `${this.dataUpper}`);
      return resultArray.join('\n');
   }

   SaveToFile(filePath: string, binConvertFunction = (bin) => bin) {
      fs.writeFile(filePath, this.ToString(binConvertFunction), (err) => {
         if (err)
            console.log(err);
         else {
            console.log(`File written successfully ${filePath}\n`);
         }
      });
   }
}

// hist initialize
const binSizeDays = 10;
const dateFrom = Date.parse('00:00:00 2000-01-01 GMT');
const dateTo = Date.now();
const histogramWithoutWeight = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
const histogramWeightSize = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);

let reportIndex = 0; //для счетчтика

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
      let objList: string[] = data.Contents
         .filter((obj) => obj.Size < 10000000) // test cut
         .map((obj) => obj.Key);
         // .slice(0, 10000); // test cut

      console.log(`Object list recieved: ${objList.length} objects.`);

      const promises = objList.map((fileKey) =>
         new Promise((resolve, reject) => {
            const migrationId: number = +fileKey.split('/')[1];

            var options = {
               Bucket: BUCKET_NAME,
               Key: fileKey,
            };

            s3.getObject(options).createReadStream()
               .pipe(parse({ delimiter: ',', from: 2 }))
               .on('data', function (row) {
                  let src_size: number = +row[4]; // src size
                  let src_last_modified: number = Date.parse(row[6]); // src last modified 12:17:24 2022-07-15 GMT 

                  histogramWithoutWeight.AddPoint(src_last_modified);
                  histogramWeightSize.AddPoint(src_last_modified, src_size);
               })
               .on('end', function () {
                  console.log(`${reportIndex}/${objList.length}\tloaded\t${migrationId}`);
                  resolve(reportIndex);
                  reportIndex++;
               })
         })
      );

      Promise.all(promises).then((result) => {
         const convertToDateFunction = (bin) => new Date(bin)
            .toLocaleString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric', })

         // console.log(histogramWithoutWeight.ToString(convertToDateFunction));

         histogramWithoutWeight.SaveToFile('output/histogramWithoutWeight_datenum.dat');
         histogramWithoutWeight.SaveToFile('output/histogramWithoutWeight.dat', convertToDateFunction);
         histogramWeightSize.SaveToFile('output/histogramWeightSize_datenum.dat');
         histogramWeightSize.SaveToFile('output/histogramWeightSize.dat', convertToDateFunction);
      });
   }
});