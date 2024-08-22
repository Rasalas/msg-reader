const program = require('commander');
const fs = require('fs');
const { decompressRTF } = require('./lib/index');

program
    .command('decompress <binfile>')
    .action((binfile) => {
        fs.readFile(binfile, (err, data) => {
            if (err) {
                console.error(err);
            }
            else {
                console.log(Buffer.from(decompressRTF(data)).toString("UTF-8"));
            }
        });
    });

program
    .parse(process.argv);
