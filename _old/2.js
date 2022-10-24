var fs = require('fs');
var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
var s3 = new AWS.S3({ apiVersion: '2006-03-01' });
var BUCKET_NAME = 'fl-prod-migration-reports';
// Create the parameters for calling listObjects
var bucketParams = {
    Bucket: BUCKET_NAME,
};
// Call S3 to obtain a list of the objects in the bucket
s3.listObjects(bucketParams, function (err, data) {
    if (err) {
        console.log("Error", err);
    }
    else {
        var objList = data.Contents.map(function (obj) { return obj.Key; });
        console.log("Object list recieved", objList);
    }
});
var fileKey = 'migration/00000000000000016550/report.461b2d10-ba74-4f72-b386-7af8ccd8fd12.2022-08-28-07-42-06-734.csv';
var migrationId = +fileKey.split('/')[1];
var options = {
    Bucket: BUCKET_NAME,
    Key: fileKey,
};
var fileStream = s3.getObject(options).createReadStream();
fileStream.on('data', function (chunk) {
    console.log(chunk);
})
    .on('end', function () {
    console.log('Data loaded ');
});
//# sourceMappingURL=2.js.map