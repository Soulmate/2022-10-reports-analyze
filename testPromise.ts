let promises = [];



// Promise.all(promises).then(() => console.log('all'));

// const SAVE_EVERY_N = 10;
// for (let i = SAVE_EVERY_N; i < promises.length; i += SAVE_EVERY_N) {
//     promises[i].then(P1);
// }

// async function P1(){
//     await new Promise((resolve, reject) => {
//         setTimeout(() => {
//             console.log('p1');
//             resolve("result");
//         }, 100);
//     });
// }

async function P2() {
    for (let i = 0; i < 100; i += 1) {
        let promise = new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log(i);
                resolve("result");
            }, 100);
        });
        promises.push(promise);
        await promise;
    }
}

P2()