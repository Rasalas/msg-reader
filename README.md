# *.msg Reader

## Quick Start
1. Clone the repository
```bash
git clone
```

2. Install the dependencies
```bash
npm install
```

3. Run the application
```bash
npm start
```
A browser window should open with the application running.


## Development
1. Clone the repository
```bash
git clone
```

2. Install the dependencies
```bash
npm install 
```

3. Run the application in development mode
```bash
npm run dev
```

A browser window should open with the application running. The application will automatically reload when changes are made to the source code.

## Other Commands

### Watch
```bash
npm run watch
```
This will watch the code for changes and bundle the code using browserify.

### Build

```bash
npm run build
```
This will bundle the code using browserify and output the bundled code to the `dist` directory inside the `bundle.js`.

### Build it brick by brick

Bundle the code the hard way:
```bash
npx browserify src/msgreader.js -o dist/bundle.js
```