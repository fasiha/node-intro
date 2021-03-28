// ✍️ file.js
var fs = require('fs');

var filename = 'README.md';

fs.readFile(filename, 'utf8', (err, lines) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`Characters in ${filename}: ${lines.length}`);
});

console.log('Welcome to Node!');
