import * as fs from "fs";
import { resolve } from "path";

export class Histogram {
   minValue: number;
   maxValue: number;
   binSize: number;
   binCount: number;

   binCenters: number[] = [];
   binEdges: number[] = [];

   data: number[];
   dataLower: number = 0; // data below the lowest bin
   dataUpper: number = 0; // data above the highest bin

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

   ToString() {
      let resultArray: string[] = [];
      resultArray.push(
         `${(NaN)}\t` +
         `${(NaN)}\t` +
         `${(this.binEdges[0])}\t` +
         `${this.dataLower}`);
      for (let i = 0; i < this.binCount; i++) {
         resultArray.push(
            `${(this.binCenters[i])}\t` +
            `${(this.binEdges[i])}\t` +
            `${(this.binEdges[i + 1])}\t` +
            `${this.data[i]}`);
      }
      resultArray.push(
         `${(NaN)}\t` +
         `${(this.binEdges[this.binCount])}\t` +
         `${(NaN)}\t` +
         `${this.dataUpper}`);
      return resultArray.join('\n');
   }

   FromString(s: string) {
      const resultArray: string[] = s.split('\n');
      const dataLower: number = +resultArray.shift().split('\t')[3];
      const dataUpper: number = +resultArray.pop().split('\t')[3];
      const data: number[] = resultArray.map((row) => +row.split('\t')[3]);
      if (data.length != this.binCenters.length) {
         throw ('Invalid input string: ' + s);
      }
      this.data = data;
      this.dataLower = dataLower;
      this.dataUpper = dataUpper;
   }

   async SaveToFile(filePath: string) {
      try {
         fs.writeFileSync(filePath, this.ToString());
         // console.log(`File written successfully ${filePath}`);
      }
      catch (err) {
         console.log(err);
         throw new Error("writeFile error");
      }
   }

   async LoadFromFile(filePath: string) {
      const s: string = (fs.readFileSync(filePath)).toString();
      this.FromString(s);
   }
}
