const mm = require('music-metadata');
const path = require('path');
const fs = require('fs');

const MUSIC_DIR = path.resolve(__dirname, 'music');

async function testMetadata() {
  try {
    const files = fs.readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'));
    if (files.length === 0) {
      console.log('No MP3 files found in music/ directory');
      return;
    }

    for (const file of files) {
      const filePath = path.join(MUSIC_DIR, file);
      const metadata = await mm.parseFile(filePath);
      console.log(`File: ${file}`);
      console.log(`  Title: ${metadata.common.title}`);
      console.log(`  Artist: ${metadata.common.artist}`);
      console.log(`  Album: ${metadata.common.album}`);
      console.log(`  Duration: ${metadata.format.duration}`);
      console.log('---');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testMetadata();
