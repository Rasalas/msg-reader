# rtf-stream-parser
This module is primarily used to extract RTF-encapsulated text and HTML, which is a common message body format used in Outlook / Exchange / MAPI email messages and the related file formats (.msg, .pst, .ost, .olm). The RTF-encapsulated formats are described in [[MS-OXRTFEX]](https://docs.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxrtfex/411d0d58-49f7-496c-b8c3-5859b045f6cf).

This module exposes high-level functions where you may pass in an RTF string, Buffer, or stream, and get out the de-encapsulated content. Additionally, this module contains two lower level stream Transform classes that handle the tokenization and de-encapsulation processs and may be used for other low-level operations.

This code is used in production at [GoldFynch](https://goldfynch.com), an e-discovery platform, for extracting HTML and text email bodies that have passed through Outlook mail systems.

## New in version 3.x
- Many additional options to avoid conflicts between the original / indicated charset in the HTML and the Unicode output data, including:
  - Option to HTML-encode any non-ASCII characters in output HTML.
  - Option to find & replace the `charset` in output HTML with "UTF-8".
  - Option to receive output as a `Buffer` of text in the default encoding of the RTF document.

- Better handling of symbol fonts (Wingdings, Webdings, etc.), including:
  - Special handling of these fonts to always output the correct font codepoints.
  - Option to re-code these symbols to the closest Unicode symbol, to avoid any dependency on the symbol fonts.

## Simple Usage
This module generally needs to be used with an expanded string decoder library such as [iconv-lite](https://github.com/ashtuchkin/iconv-lite) or [iconv](https://www.npmjs.com/package/iconv) in order to handle the various ANSI codepages commonly found in RTF. The string decoding is done via a callback that is passed in an options object.

### Using iconv-lite
```javascript
import * as iconvLite from 'iconv-lite';
import { deEncapsulateSync } from 'rtf-stream-parser';

const rtf = '{\\rtf1\\ansi\\ansicpg1252\\fromtext{{{{{{hello}}}}}}}';
const result = deEncapsulateSync(rtf, { decode: iconvLite.decode });
console.log(result); // { mode: 'text', text: 'hello' }
```

### Using iconv
```javascript
import * as iconv from 'iconv';
import { deEncapsulateSync } from 'rtf-stream-parser';

const decode = (buf, enc) => {
    const converter = new iconv.Iconv(enc, 'UTF-8//TRANSLIT//IGNORE');
    return converter.convert(buf).toString('utf8');
};

const rtf = '{\\rtf1\\ansi\\ansicpg1252\\fromtext{{{{{{hello}}}}}}}';
const result = deEncapsulateSync(rtf, { decode: decode });
console.log(result); // { mode: 'text', text: 'hello' }
```

### De-encapsulating a stream (async buffered result)
```javascript
import * as fs from 'fs';
import * as iconvLite from 'iconv-lite';
import { deEncapsulateStream } from 'rtf-stream-parser';

const stream = fs.createReadStream('encapsulated.rtf');
deEncapsulateStream(stream, { decode: iconvLite.decode }).then(result => {
    console.log(result); // { mode: '...', text: '... }
});
```

### De-encapsulating a stream (streaming result)
```javascript
import * as fs from 'fs';
import * as iconvLite from 'iconv-lite';
import { Tokenize, DeEncapsulate } from 'rtf-stream-parser';

const input = fs.createReadStream('encapsulated.rtf');
const output = fs.createWriteStream('output.html');

input.pipe(new Tokenize())
     .pipe(new DeEncapsulate({
         decode: iconvLite.decode
         mode: 'either'
     })
     .pipe(output);
```

## High-level functions
### deEncapsulateSync(input[, options])
* `input`: `<string>` | `<Buffer>` - The RTF data. Buffers recommended to avoid encoding issues.
* `options`: `<Object>` - Optional argument, see DeEncapsulate class options below.
* Returns: `<Object>` - The de-encapsulation result.
    * mode: `"html"` or `"text"` - Indicates whether the RTF data contained encapsulated HTML or text data.
    * text: `<string>` or `<Buffer>` - The de-encapsulated HTML or text.
 
This function de-encapsulates HTML or text data from an RTF string or Buffer. Throws an error if the given RTF does not contain encapsulated data.

### deEncapsulateStream(input[, options])
* `input`: `<ReadableStream>` - The RTF data. Buffer streams recommended (without an encoding set).
* `options`: `<Object>` - Optional argument, see DeEncapsulate class options below.
* Returns: `<Promise<Object>>` - The de-encapsulation result.
    * mode: `"html"` or `"text"` - Indicates whether the RTF data contained encapsulated HTML or text data.
    * text: `<string>` or `<Buffer>` - The de-encapsulated HTML or text.
 
This function de-encapsulates HTML or text data from an RTF string or Buffer. Throws an error if the given RTF does not contain encapsulated data.

## Tokenize Class
A low-level parser & tokenizer of incoming RTF data. This
[Transform](https://nodejs.org/api/stream.html#stream_duplex_and_transform_streams)
stream takes input of raw RTF data, generally in the form of `Buffer` chunks, and generates
["object mode"](https://nodejs.org/api/stream.html#stream_object_mode)
output chunks representing the parsed RTF operations. String input chunks are
also accepted, but are converted to `Buffer` based on the stream's
[default string encoding](https://nodejs.org/api/stream.html#stream_writable_setdefaultencoding_encoding).

The output objects have the following format:
```
{
    // The type of the token.
    type: number; // GROUP_START = 0, GROUP_END = 1, CONTROL = 2, TEXT = 3

    // For control words / symbols, the name of the word / symbol.
    word?: string;

    // The optional numerical parameter that control words may have.
    param?: number;

    // Binary data from `\binN` and `\'XX` controls as well as string literals.
    // String literals are kept as binary due to unknown encoding at this
    // level of processing.
    data?: Buffer
}
```

### Notes:
- Unicode characters (`\uN`) will populate the `param` property with the code point `N`.
- At this level, the parser isn't aware of which control words represent destinations,
so destination groups will be output as a `GROUP_START` token followed by a `CONTROL` token. It is left to further processors to determine if the control word represents a destination.
- Optional destination groups (`{\*\destination ...}`) will be output as three tokens (CONTROL_START, CONTROL word `*`, and CONTROL word `destination`).

## De-Encapsulate Class

This class takes RTF-encapsulated text (HTML or text),
[de-encapsulates it](https://msdn.microsoft.com/en-us/library/ee159984(v=exchg.80).aspx),
and produces a string output.
This Transform class takes tokenized object output from the Tokenize class and produces string chunks of output HTML.

Apart from it's specific use, this class also serves as an example of how to consume
and use the Tokenize class.

The constructor takes two optional arguments:
```javascript
new DeEncapsulate(options);
```
* `options`: `<Object>` - De-encapsulation options.
    * `warn`: `<Function>` - A callback function that takes a single string message argument. Used to warn of RTF or decoding issues. Defaults to `console.warn`.
    * `outputMode` - `"string"`, `"buffer-utf8"`, or `"buffer-default-cpg"`. Defaults to `"string"`. The format of output chunks from this stream. "buffer-default-cpg" will attempt to re-encode the output data back to the default codepage of the rtf document, and likely requires a custom `encode` callback as well.
    * `decode`: `<Function>` - Defaults to `Buffer.toString()`. A callback function that takes a Buffer data argument and a string argument indicating the encoding, e.g. `"cp1252"`.
    * `encode`: `<Function>` - Defaults to `Buffer.from()`. A callback function that takes a string data argument and a string argument indicating the encoding, e.g. `"cp1252"`, and returns a `Buffer` of the string re-encoded to the provided encoding. Used when the output mode is set to `buffer-default-cpg`.
    * `mode`: `"html"`, `"text"`, or `"either"` - Defualts to `"either"`. Whether to only accept encapsulated HTML or text. If the given RTF stream is not encapsulated text, or does not match the given mode (e.g. is encapsulated text but mode is set to `"html"`), the stream will emit an error.
    * `prefix`: `true` or `false` - If `true`, the output text will have either `"html:"` or `"text:"` prefixed to the output string. Otherwise, property getters `DeEncapsulate.isHtml` and `DeEncapsulate.isText` can be used to interpret the output text.
    * `replaceSymbolFontChars`: `Boolean` - Defaults to `false`. Indicates whether symbol font (e.g. Wingdings) characters should be replaced with their closest Unicode symbol in the output text. Note that this wont work for symbol font characters that are already HTML-encoded.
    * `htmlEncodeNonAscii`: `Boolean` - Defaults to `false`. Indicates whether non-ASCII (e.g. > U+007F) characters should be HTML-encoded when de-encapsulating HTML data.
     symbol font (e.g. Wingdings) characters should be replaced with their closest Unicode symbol in the output text.
    * `htmlFixContentType`: `Boolean` - Defaults to `false`. Indicates whether the de-encapsulator should scan for and replace any original HTML `charset` header with a new `UTF-8` value to match the output text.
    * `allowCp0`: `Boolean` - New in 3.7 - allows user to handle codepage 0 (system / default) instead of throwing. When `true`, the `decode` callback may get an encoding of `cp0` if the RTF file has some text that explicilty uses codepage 0.


## Future Work

Currently, the Tokenize class is pretty low level, and the DeEncapsulate class is very use-case specific. Some work could be done to abstract the generally-useful parts of the DeEncapsulate class into a more generic consumer. I would also like to add build-in support for all codepages mentioned in the RTF spec. 