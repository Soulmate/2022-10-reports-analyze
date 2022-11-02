import { rejects } from "assert";
import * as fs from "fs";
import { resolve } from "path";

export class BinarySaver {
   listOfStreams = {};
   AddBinaryValues(migrationId: number, src_last_modified: number, src_size: number, migration_timestamp: number) {
      if (!this.listOfStreams[migrationId]) {
         this.listOfStreams[migrationId] = [
            fs.createWriteStream(`./output/${migrationId}.bin`, { flags: 'w' }),
            []
         ];
         console.log(`New binary file ${migrationId}`);
      }
      this.listOfStreams[migrationId][1].push([src_last_modified, src_size, migration_timestamp]);
      // console.log('AddBinaryValues',this.listOfStreams[migrationId][1].length);
   }
   async WriteBinaryValues() {
      for (let [key, value] of Object.entries(this.listOfStreams)) {
         // console.log(`Writing stream ${key}`);

         const stream = (value[0] as fs.WriteStream);
         const arr = (value[1] as number[]);

         const float64array = new Float64Array(arr);
         const uint8Array = new Uint8Array(float64array.buffer);

         let promise = new Promise<void>((resolve, reject) =>
            stream.write(uint8Array, (err) => err ? reject(err) : resolve()));
         await promise;
         
         // console.log('Binary file appended', key);
      }
   }
   async CloseAllBinaryStreams() {
      for (let [key, value] of Object.entries(this.listOfStreams)) {
         console.log(`Closing stream ${key}`);

         const stream = (value[0] as fs.WriteStream);
         
         let promise = new Promise<void>((resolve, reject) =>
            stream.end(() => resolve()));
         await promise;
         console.log('Closed', key);
      }
   }
}
