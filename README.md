

## Erstelle ein Browser-kompatibles Build:
Um den Code im Browser verwenden zu können, musst du die Datei mit Browserify oder einem ähnlichen Tool bündeln:

install dev dependencies:
```bash
npm install --save-dev browserify watchify
```

Development mode:
```bash
npm run watch
```

Bundle the code the easy way:
```bash
npm run build
```

Bundle the code the hard way:
```bash
npx browserify src/msgreader.js -o dist/bundle.js
```