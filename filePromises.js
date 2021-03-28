// ✍️ filePromises.js
var fs = require('fs/promises');

async function main() {
  console.log('Welcome to Node!');

  var filename = 'README.md';
  try {
    var lines = await fs.readFile(filename, 'utf8');
    console.log(`Characters in ${filename}: ${lines.length}`);
  } catch (e) {
    console.error(e);
  }
};

main();