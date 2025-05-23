# CodePen Export with Build Process
_Transform raw code into a browser-ready preview... offline_

This package contains all of the original code ([src/](./src/)), and a custom build script with processors. You'll be able to edit and build for a local CodePen-like experience.

## Installation

Ensure you have a recent version of [node & npm](https://nodejs.org/download/) or [yarn](https://yarnpkg.com/docs/install) installed.

All of the following steps run on the command line within this directory. You can substitute `npm` for `yarn` depending on your preferences.

Install all the necessary packages:

```
yarn install
```

## Build

To build for distribution:

```
yarn build
```

All of the final output will be dropped into the [/dist/](./dist) folder.

## Server

Run a local server that will automatically compile your code & refresh when you save a change!

```
yarn serve
```

---

## Folder Structure

```
/exported-item/
|-- /build/ - Build scripts
|  |-- gulpfile.js - The tasks for the main build process
|  |-- util.js - Utilities used by the tasks
|
|-- /src/ - Your code
|  |-- index.template.html - The wrapper around your compiled HTML that includes any external stylesheets and scripts
|  |-- index.partial.(html|pug|haml|...) - The raw HTML input or preprocessor equivalent
|  |-- style.(css|scss|less|...) - The raw CSS input, or preprocessor equivalent
|  |-- script.(js|ts|coffee|...) - The raw JavaScript input, or preprocessor equivalent
|
|-- /dist/ - The compiled output after running `npm run build`
|  |-- 
|  |-- script.js
|  |-- style.css
```