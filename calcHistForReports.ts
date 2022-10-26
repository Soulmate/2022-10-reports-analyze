import { parse } from 'csv-parse';
import { Histogram } from "./Histogram";

const TEST_CUT = false; // pick only part of objects
const SAVE_EVERY_N = 100; // every Nth object save current historgams

// hist initialize
const binSizeDays = 10;
const dateFrom = Date.parse('00:00:00 2000-01-01 GMT');
const dateTo = Date.now();
const histogramWithoutWeight = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
const histogramWeightSize = new Histogram(dateFrom, dateTo, binSizeDays * 24 * 60 * 60 * 1000);
function AddDataToHistograms(src_last_modified: number, src_size: number) {
   histogramWithoutWeight.AddPoint(src_last_modified);
   histogramWeightSize.AddPoint(src_last_modified, src_size);
}

// AWS initialize
var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
let s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const BUCKET_NAME = 'fl-prod-migration-reports';
const listAllKeys = (params, out = []) => new Promise((resolve, reject) => {
   s3.listObjectsV2(params).promise()
      .then(({ Contents, IsTruncated, NextContinuationToken }) => {
         out.push(...Contents);
         console.log(`Found ${out.length} objects`);

         if (TEST_CUT && out.length > 100) {
            resolve(out);
            return;
         }

         !IsTruncated ? resolve(out) : resolve(listAllKeys(Object.assign(params, { ContinuationToken: NextContinuationToken }), out));
      })
      .catch(reject);
});

async function DownloadAndAnalyzeAllObjects() {
   let contents: any[] = await listAllKeys({ Bucket: BUCKET_NAME }) as any[];
   if (TEST_CUT) {
      contents = contents
         .filter((obj) => obj.Size < 0.1 * 1e6)
         .slice(0, 100)
   }
   let objList: string[] = contents.map((obj) => obj.Key);
   console.log(`Object list received: ${objList.length} objects.`);

   for (let i = 0; i < objList.length; i++) {
      let fileKey: string = objList[i];
      let migrationId = await DownloadAndAnalyzeObject(fileKey);
      console.log(`${new Date()}\t${i}/${objList.length}\tloaded migrationId\t${migrationId}`);
      if (i % SAVE_EVERY_N == 0) {
         await SaveResults();
      }
   }

   await SaveResults();
}

async function DownloadAndAnalyzeObject(fileKey) {
   // console.log(`Downloading fileKey ${fileKey}`);
   const migrationId: number = +fileKey.split('/')[1];

   var options = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
   };

   return await new Promise(function (resolve, reject) {
      s3.getObject(options).createReadStream()
         .pipe(parse({ delimiter: ',', from: 2 }))
         .on('data', function (row) {
            let src_size: number = +row[4]; // src size
            let src_last_modified: number = Date.parse(row[6]); // src last modified 12:17:24 2022-07-15 GMT 
            AddDataToHistograms(src_last_modified, src_size);
         })
         .on('end', function () {
            resolve(migrationId);
         })
         .on('error', reject);
   });
}

async function SaveResults() {
   const convertToDateFunction = (bin) => new Date(bin)
      .toLocaleString("en-US", { year: 'numeric', month: 'numeric', day: 'numeric', });

   console.log('Saving results:');
   await histogramWithoutWeight.SaveToFile('output/histogramWithoutWeight_datenum.dat');
   await histogramWithoutWeight.SaveToFile('output/histogramWithoutWeight.dat', convertToDateFunction);
   await histogramWeightSize.SaveToFile('output/histogramWeightSize_datenum.dat');
   await histogramWeightSize.SaveToFile('output/histogramWeightSize.dat', convertToDateFunction);
}

DownloadAndAnalyzeAllObjects();