import { parse } from 'csv-parse';
import { Histogram } from "./Histogram";

const TEST_CUT = false; // pick only part of objects


const SAVE_EVERY_N = 100; // every Nth object save current historgams
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const CURRENT_TIME_STAMP = Date.now();

const unknownValuesOfMigrationType = new Set();
const unknownValuesOfDecision = new Set();
const unknownValuesOfResult = new Set();

// hist initialize
const binSizeDays = 7;
const maxAgeDays = 20 * 365; // maximum age of objects
const histAgeDaysAtNowObjNumber = new Histogram(0, maxAgeDays, binSizeDays);
const histAgeDaysAtMigrationObjNumber = new Histogram(0, maxAgeDays, binSizeDays);
const histAgeDaysAtNowSize = new Histogram(0, maxAgeDays, binSizeDays);
const histAgeDaysAtMigrationSize = new Histogram(0, maxAgeDays, binSizeDays);

function AddDataToHistograms(src_last_modified_timestamp: number, src_size: number, migration_timestamp: number) {
   let objAgeDaysAtNow: number = (CURRENT_TIME_STAMP - src_last_modified_timestamp) / MS_IN_DAY;
   let objAgeDaysAtMigration: number = (migration_timestamp - src_last_modified_timestamp) / MS_IN_DAY;
   histAgeDaysAtNowObjNumber.AddPoint(objAgeDaysAtNow);
   histAgeDaysAtMigrationObjNumber.AddPoint(objAgeDaysAtMigration);
   histAgeDaysAtNowSize.AddPoint(objAgeDaysAtNow, src_size);
   histAgeDaysAtMigrationSize.AddPoint(objAgeDaysAtMigration, src_size);
}

async function SaveHistograms() {
   console.log('Saving histograms:');
   await histAgeDaysAtNowObjNumber.SaveToFile('output/histAgeDaysAtNowObjNumber.dat');
   await histAgeDaysAtMigrationObjNumber.SaveToFile('output/histAgeDaysAtMigrationObjNumber.dat');
   await histAgeDaysAtNowSize.SaveToFile('output/histAgeDaysAtNowSize.dat');
   await histAgeDaysAtMigrationSize.SaveToFile('output/histAgeDaysAtMigrationSize.dat');
}

// cache for list of reports
var flatCache = require('flat-cache');
var cache = flatCache.load('listAllKeys');

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
   let reportsList: any[];

   let cachedListAllKeys = cache.getKey('reportsList');
   if (cachedListAllKeys) {
      console.log('reportsList loaded from cache');
      reportsList = cache.getKey('reportsList');
   }
   else {
      console.log('No cached reportsList');
      reportsList = await listAllKeys({ Bucket: BUCKET_NAME }) as any[];
      cache.setKey('reportsList', reportsList);
      cache.save();
   }

   if (TEST_CUT) {
      reportsList = reportsList
         .filter((obj) => obj.Size < 0.1 * 1e6)
         .slice(0, 100)
   }

   console.log(`Object list received: ${reportsList.length} objects.`);

   for (let i = 0; i < reportsList.length; i++) {
      let migrationId = await DownloadAndAnalyzeObject(reportsList[i]);
      console.log(`${new Date()}\t${i}/${reportsList.length}\tloaded migrationId\t${migrationId}`);
      if (i % SAVE_EVERY_N == 0) {
         await SaveHistograms();
      }
   }

   await SaveHistograms();
}

async function DownloadAndAnalyzeObject(report) {
   const objKey = report.Key;
   const migration_timestamp = report.LastModified;
   const migrationId: number = +objKey.split('/')[1];

   // console.log(`Downloading ${objKey} ${migration_timestamp} ${migrationId}`);

   var options = {
      Bucket: BUCKET_NAME,
      Key: objKey,
   };

   return await new Promise(function (resolve, reject) {
      s3.getObject(options).createReadStream()
         .pipe(parse({ delimiter: ',', from: 2 }))
         .on('data', function (row) {
            let migration_type: string = row[2];
            let src_size: number = +row[4]; // src size
            let src_last_modified: number = Date.parse(row[6]); // format: 12:17:24 2022-07-15 GMT                    
            let decision: string = row[32];
            let result: string = row[33];

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
               case 'move':
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
   });
}

DownloadAndAnalyzeAllObjects();