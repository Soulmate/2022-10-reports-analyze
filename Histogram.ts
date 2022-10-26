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

   async SaveToFile(filePath: string, binConvertFunction = (bin) => bin) {
      fs.writeFile(filePath, this.ToString(binConvertFunction), (err) => {
         if (err) {
            console.log(err);
            throw new Error("writeFile error");
         }
         else {
            console.log(`File written successfully ${filePath}`);
            resolve();
         }
      });
   }
}
