"use strict";
/* Copyright 2016 Yury Karpovich
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*
 MSG Reader
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverrideFlags = exports.EndType = exports.CalendarType = exports.PatternType = exports.RecurFrequency = void 0;
var const_1 = __importDefault(require("./const"));
var DataStream_1 = __importDefault(require("./DataStream"));
var Reader_1 = require("./Reader");
var Burner_1 = require("./Burner");
var utils_1 = require("./utils");
var EntryStreamParser_1 = require("./EntryStreamParser");
var VerbStreamParser_1 = require("./VerbStreamParser");
var TZDEFINITIONParser_1 = require("./TZDEFINITIONParser");
var TZREGParser_1 = require("./TZREGParser");
var AppointmentRecurParser_1 = require("./AppointmentRecurParser");
var AppointmentRecurParser_2 = require("./AppointmentRecurParser");
Object.defineProperty(exports, "RecurFrequency", { enumerable: true, get: function () { return AppointmentRecurParser_2.RecurFrequency; } });
Object.defineProperty(exports, "PatternType", { enumerable: true, get: function () { return AppointmentRecurParser_2.PatternType; } });
Object.defineProperty(exports, "CalendarType", { enumerable: true, get: function () { return AppointmentRecurParser_2.CalendarType; } });
Object.defineProperty(exports, "EndType", { enumerable: true, get: function () { return AppointmentRecurParser_2.EndType; } });
Object.defineProperty(exports, "OverrideFlags", { enumerable: true, get: function () { return AppointmentRecurParser_2.OverrideFlags; } });
/**
 * CONST.MSG.PROP.TYPE_ENUM
 */
var TypeEnum;
(function (TypeEnum) {
    TypeEnum[TypeEnum["DIRECTORY"] = 1] = "DIRECTORY";
    TypeEnum[TypeEnum["DOCUMENT"] = 2] = "DOCUMENT";
    TypeEnum[TypeEnum["ROOT"] = 5] = "ROOT";
})(TypeEnum || (TypeEnum = {}));
var KeyType;
(function (KeyType) {
    KeyType[KeyType["root"] = 0] = "root";
    KeyType[KeyType["toSub"] = 1] = "toSub";
    KeyType[KeyType["named"] = 2] = "named";
})(KeyType || (KeyType = {}));
function fileTimeToUnixEpoch(time) {
    return (time - 116444736000000000) / 10000;
}
/**
 * The core implementation of MsgReader
 */
var MsgReader = /** @class */ (function () {
    function MsgReader(arrayBuffer) {
        this.reader = new Reader_1.Reader(arrayBuffer);
    }
    MsgReader.prototype.decodeField = function (fieldClass, fieldType, provider, ansiEncoding, insideProps) {
        var array = provider();
        var ds = new DataStream_1.default(array, 0, DataStream_1.default.LITTLE_ENDIAN);
        var key = const_1.default.MSG.FIELD.FULL_NAME_MAPPING["".concat(fieldClass).concat(fieldType)]
            || const_1.default.MSG.FIELD.NAME_MAPPING[fieldClass];
        var keyType = KeyType.root;
        var propertySet = undefined;
        var propertyLid = undefined;
        var classValue = parseInt("0x".concat(fieldClass));
        if (classValue >= 0x8000) {
            var keyed = this.privatePidToKeyed[classValue];
            if (keyed) {
                if (keyed.useName) {
                    key = keyed.name;
                    keyType = KeyType.named;
                }
                else {
                    propertySet = keyed.propertySet;
                    propertyLid = (0, utils_1.toHex4)(keyed.propertyLid);
                    var lidDict = const_1.default.MSG.FIELD.PIDLID_MAPPING[keyed.propertySet];
                    if (lidDict !== undefined) {
                        var prop = lidDict[keyed.propertyLid];
                        if (prop !== undefined) {
                            if (prop.dispid !== undefined) {
                                key = prop.dispid; // e.g. `votingResponse`
                                keyType = KeyType.root;
                            }
                            else {
                                key = prop.id; // e.g. `PidLidVerbStream` listed in SomeParsedOxProps
                                keyType = KeyType.toSub;
                            }
                        }
                    }
                }
            }
        }
        var value = array;
        var skip = false;
        var decodeAs = const_1.default.MSG.FIELD.TYPE_MAPPING[fieldType];
        if (0) { }
        else if (decodeAs === "string") {
            value = ds.readString(array.length, ansiEncoding);
            skip = insideProps;
        }
        else if (decodeAs === "unicode") {
            value = ds.readUCS2String(array.length / 2);
            skip = insideProps;
        }
        else if (decodeAs === "binary") {
            skip = insideProps;
        }
        else if (decodeAs === "integer") {
            value = ds.readUint32();
        }
        else if (decodeAs === "boolean") {
            value = ds.readUint16() ? true : false;
        }
        else if (decodeAs === "time") {
            var lo = ds.readUint32();
            var fileTime = lo + (4294967296.0 * ds.readUint32());
            value = new Date(fileTimeToUnixEpoch(fileTime)).toUTCString();
        }
        if (skip) {
            key = undefined;
        }
        if (0) { }
        else if (key === "PidLidVerbStream") {
            key = "votingOptions";
            keyType = KeyType.root;
            value = (0, VerbStreamParser_1.parse)(ds);
        }
        else if (false
            || key === "apptTZDefStartDisplay"
            || key === "apptTZDefEndDisplay"
            || key === "apptTZDefRecur") {
            keyType = KeyType.root;
            value = (0, TZDEFINITIONParser_1.parse)(ds);
        }
        else if (key === "timeZoneStruct") {
            value = (0, TZREGParser_1.parse)(ds);
        }
        else if (key === "apptRecur") {
            try {
                value = (0, AppointmentRecurParser_1.parse)(ds, ansiEncoding);
            }
            catch (ex) {
                console.debug(ex);
                // drop this data
                key = undefined;
            }
        }
        else if (key === "recipType") {
            var MAPI_TO = 1;
            var MAPI_CC = 2;
            var MAPI_BCC = 3;
            if (0) { }
            else if (value === MAPI_TO) {
                value = "to";
            }
            else if (value === MAPI_CC) {
                value = "cc";
            }
            else if (value === MAPI_BCC) {
                value = "bcc";
            }
        }
        else if (key === "globalAppointmentID") {
            value = (0, utils_1.bin2HexUpper)(ds);
        }
        var propertyTag = "".concat(fieldClass).concat(fieldType);
        return { key: key, keyType: keyType, value: value, notForRawProp: skip, propertyTag: propertyTag, propertySet: propertySet, propertyLid: propertyLid, };
    };
    MsgReader.prototype.fieldsDataDocument = function (parserConfig, documentProperty, fields) {
        var value = documentProperty.name.substring(12).toLowerCase();
        var fieldClass = value.substring(0, 4);
        var fieldType = value.substring(4, 8);
        parserConfig.propertyObserver && parserConfig.propertyObserver(fields, parseInt(value.substring(0, 8), 16), documentProperty.provider());
        if (fieldClass == const_1.default.MSG.FIELD.CLASS_MAPPING.ATTACHMENT_DATA) {
            // attachment specific info
            fields.dataId = documentProperty.dataId;
            fields.contentLength = documentProperty.length;
        }
        else {
            this.setDecodedFieldTo(parserConfig, fields, this.decodeField(fieldClass, fieldType, documentProperty.provider, parserConfig.ansiEncoding, false));
        }
    };
    MsgReader.prototype.setDecodedFieldTo = function (parserConfig, fields, pair) {
        var key = pair.key, keyType = pair.keyType, value = pair.value;
        if (key !== undefined) {
            if (keyType === KeyType.root) {
                fields[key] = value;
            }
        }
        if (parserConfig.includeRawProps === true) {
            fields.rawProps = fields.rawProps || [];
            if (!pair.notForRawProp) {
                fields.rawProps.push({
                    propertyTag: pair.propertyTag,
                    propertySet: pair.propertySet,
                    propertyLid: pair.propertyLid,
                    propertyName: (pair.keyType === KeyType.named) ? pair.key : undefined,
                    value: value,
                });
            }
        }
    };
    MsgReader.prototype.getFieldType = function (fieldProperty) {
        var value = fieldProperty.name.substring(12).toLowerCase();
        return value.substring(4, 8);
    };
    MsgReader.prototype.fieldsDataDirInner = function (parserConfig, dirProperty, rootFolder, fields) {
        var _this = this;
        if (dirProperty.name.indexOf(const_1.default.MSG.FIELD.PREFIX.ATTACHMENT) == 0) {
            // attachment
            var attachmentField = {
                dataType: "attachment",
            };
            fields.attachments.push(attachmentField);
            this.fieldsDataDir(parserConfig, dirProperty, rootFolder, attachmentField, "attachment");
        }
        else if (dirProperty.name.indexOf(const_1.default.MSG.FIELD.PREFIX.RECIPIENT) == 0) {
            // recipient
            var recipientField = {
                dataType: "recipient",
            };
            fields.recipients.push(recipientField);
            this.fieldsDataDir(parserConfig, dirProperty, rootFolder, recipientField, "recip");
        }
        else if (dirProperty.name.indexOf(const_1.default.MSG.FIELD.PREFIX.NAMEID) == 0) {
            // unknown, read
            this.fieldsNameIdDir(parserConfig, dirProperty, rootFolder, fields);
        }
        else {
            // other dir
            var childFieldType = this.getFieldType(dirProperty);
            if (childFieldType != const_1.default.MSG.FIELD.DIR_TYPE.INNER_MSG) {
                // ignore
            }
            else {
                var innerMsgContentFields = {
                    dataType: "msg",
                    attachments: [],
                    recipients: [],
                };
                this.fieldsDataDir(parserConfig, dirProperty, rootFolder, innerMsgContentFields, "sub");
                fields.innerMsgContentFields = innerMsgContentFields;
                fields.innerMsgContent = true;
                fields.folderId = dirProperty.dataId;
                this.innerMsgBurners[dirProperty.dataId] = function () { return _this.burnMsg(dirProperty, rootFolder); };
            }
        }
    };
    MsgReader.prototype.burnMsg = function (folder, rootFolder) {
        var entries = [
            {
                name: "Root Entry",
                type: TypeEnum.ROOT,
                children: [],
                length: 0,
            }
        ];
        this.registerFolder(entries, 0, folder, rootFolder, 0);
        return (0, Burner_1.burn)(entries);
    };
    MsgReader.prototype.registerFolder = function (entries, index, folder, rootFolder, depth) {
        var _loop_1 = function (set) {
            var provider = set.provider, length_1 = set.length;
            if (depth === 0 && set.name === "__properties_version1.0") {
                var src = provider();
                var dst_1 = new Uint8Array(src.length + 8);
                dst_1.set(src.subarray(0, 24), 0);
                dst_1.set(src.subarray(24), 32);
                provider = function () { return dst_1; };
                length_1 = dst_1.length;
            }
            var subIndex = entries.length;
            entries[index].children.push(subIndex);
            entries.push({
                name: set.name,
                type: TypeEnum.DOCUMENT,
                binaryProvider: provider,
                length: length_1,
            });
        };
        for (var _i = 0, _a = folder.fileNameSets(); _i < _a.length; _i++) {
            var set = _a[_i];
            _loop_1(set);
        }
        if (depth === 0) {
            // include root `__nameid_version1.0` folder.
            var sources = rootFolder.subFolders()
                .filter(function (it) { return it.name === const_1.default.MSG.FIELD.PREFIX.NAMEID; });
            for (var _b = 0, sources_1 = sources; _b < sources_1.length; _b++) {
                var source = sources_1[_b];
                var subIndex = entries.length;
                entries[index].children.push(subIndex);
                entries.push({
                    name: source.name,
                    type: TypeEnum.DIRECTORY,
                    children: [],
                    length: 0,
                });
                this.registerFolder(entries, subIndex, source, rootFolder, depth + 1);
            }
        }
        for (var _c = 0, _d = folder.subFolders(); _c < _d.length; _c++) {
            var subFolder = _d[_c];
            var subIndex = entries.length;
            entries[index].children.push(subIndex);
            entries.push({
                name: subFolder.name,
                type: TypeEnum.DIRECTORY,
                children: [],
                length: 0,
            });
            this.registerFolder(entries, subIndex, subFolder, rootFolder, depth + 1);
        }
    };
    MsgReader.prototype.fieldsRecipAndAttachmentProperties = function (parserConfig, documentProperty, fields) {
        var propertiesBinary = documentProperty.provider();
        var propertiesDs = new DataStream_1.default(propertiesBinary, 8, DataStream_1.default.LITTLE_ENDIAN);
        this.importPropertiesFromFile(parserConfig, propertiesDs, fields);
    };
    MsgReader.prototype.importPropertiesFromFile = function (parserConfig, propertiesDs, fields) {
        // See: [MS-OXMSG]: Outlook Item (.msg) File Format, 2.4 Property Stream
        // https://docs.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxmsg/20c1125f-043d-42d9-b1dc-cb9b7e5198ef
        var typeConverters = {
            0x0040: function (dataView) {
                var fileTime = dataView.getUint32(0, true) + (4294967296.0 * dataView.getUint32(4, true));
                return new Date(fileTimeToUnixEpoch(fileTime)).toUTCString();
            },
        };
        var _loop_2 = function () {
            var propertyTag = propertiesDs.readUint32();
            if (propertyTag === 0) {
                return "break";
            }
            var flags = propertiesDs.readUint32();
            var arr = propertiesDs.readUint8Array(8);
            parserConfig.propertyObserver(fields, propertyTag, arr);
            var fieldClass = (0, utils_1.toHex2)((propertyTag / 65536) & 0xFFFF);
            var fieldType = (0, utils_1.toHex2)(propertyTag & 0xFFFF);
            this_1.setDecodedFieldTo(parserConfig, fields, this_1.decodeField(fieldClass, fieldType, function () { return arr; }, parserConfig.ansiEncoding, true));
        };
        var this_1 = this;
        while (!propertiesDs.isEof()) {
            var state_1 = _loop_2();
            if (state_1 === "break")
                break;
        }
    };
    MsgReader.prototype.fieldsRootProperties = function (parserConfig, documentProperty, fields) {
        var propertiesBinary = documentProperty.provider();
        var propertiesDs = new DataStream_1.default(propertiesBinary, 32, DataStream_1.default.LITTLE_ENDIAN);
        this.importPropertiesFromFile(parserConfig, propertiesDs, fields);
    };
    MsgReader.prototype.fieldsDataDir = function (parserConfig, dirProperty, rootFolder, fields, subClass) {
        for (var _i = 0, _a = dirProperty.subFolders(); _i < _a.length; _i++) {
            var subFolder = _a[_i];
            this.fieldsDataDirInner(parserConfig, subFolder, rootFolder, fields);
        }
        for (var _b = 0, _c = dirProperty.fileNameSets(); _b < _c.length; _b++) {
            var fileSet = _c[_b];
            if (0) { }
            else if (fileSet.name.indexOf(const_1.default.MSG.FIELD.PREFIX.DOCUMENT) == 0) {
                this.fieldsDataDocument(parserConfig, fileSet, fields);
            }
            else if (fileSet.name === "__properties_version1.0") {
                if (subClass === "recip" || subClass === "attachment" || subClass === "sub") {
                    this.fieldsRecipAndAttachmentProperties(parserConfig, fileSet, fields);
                }
                else if (subClass === "root") {
                    this.fieldsRootProperties(parserConfig, fileSet, fields);
                }
            }
        }
    };
    MsgReader.prototype.fieldsNameIdDir = function (parserConfig, dirProperty, rootFolder, fields) {
        var guidTable = undefined;
        var stringTable = undefined;
        var entryTable = undefined;
        for (var _i = 0, _a = dirProperty.fileNameSets(); _i < _a.length; _i++) {
            var fileSet = _a[_i];
            if (0) { }
            else if (fileSet.name.indexOf(const_1.default.MSG.FIELD.PREFIX.DOCUMENT) == 0) {
                var value = fileSet.name.substring(12).toLowerCase();
                var fieldClass = value.substring(0, 4);
                var fieldType = value.substring(4, 8);
                if (0) { }
                else if (fieldClass === "0002" && fieldType === "0102") {
                    guidTable = fileSet.provider();
                }
                else if (fieldClass === "0003" && fieldType === "0102") {
                    entryTable = fileSet.provider();
                }
                else if (fieldClass === "0004" && fieldType === "0102") {
                    stringTable = fileSet.provider();
                }
            }
        }
        //console.log("%", guidTable, stringTable, entryTable);
        if (guidTable !== undefined && stringTable !== undefined && entryTable !== undefined) {
            var entries = (0, EntryStreamParser_1.parse)(entryTable);
            var stringReader = new DataStream_1.default(stringTable, 0, DataStream_1.default.LITTLE_ENDIAN);
            for (var _b = 0, entries_1 = entries; _b < entries_1.length; _b++) {
                var entry = entries_1[_b];
                if (entry.isStringProperty) {
                    stringReader.seek(entry.key);
                    var numTextBytes = stringReader.readUint32();
                    this.privatePidToKeyed[0x8000 | entry.propertyIndex] = {
                        useName: true,
                        name: stringReader.readUCS2String(numTextBytes / 2),
                    };
                }
                else {
                    this.privatePidToKeyed[0x8000 | entry.propertyIndex] = {
                        useName: false,
                        propertySet: (entry.guidIndex === 1) ? "00020328-00000-0000-C000-00000000046"
                            : (entry.guidIndex === 2) ? "00020329-00000-0000-C000-00000000046"
                                : (0, utils_1.msftUuidStringify)(guidTable, 16 * (entry.guidIndex - 3)),
                        propertyLid: entry.key,
                    };
                }
            }
            //console.log("@", this.privatePidToKeyed);
        }
    };
    /**
     * extract real fields
     */
    MsgReader.prototype.fieldsDataReader = function (parserConfig) {
        var fields = {
            dataType: "msg",
            attachments: [],
            recipients: []
        };
        this.fieldsDataDir(parserConfig, this.reader.rootFolder(), this.reader.rootFolder(), fields, "root");
        return fields;
    };
    /**
     * convert binary data to dictionary
     */
    MsgReader.prototype.parseMsgData = function (parserConfig) {
        this.reader.parse();
        return this.fieldsDataReader(parserConfig);
    };
    MsgReader.prototype.getFileData = function () {
        var _a, _b, _c;
        if (this.fieldsData === undefined) {
            if (!this.reader.isMSGFile()) {
                return {
                    dataType: null,
                    error: 'Unsupported file type!'
                };
            }
            this.innerMsgBurners = {};
            this.privatePidToKeyed = {};
            this.fieldsData = this.parseMsgData({
                propertyObserver: ((_a = this.parserConfig) === null || _a === void 0 ? void 0 : _a.propertyObserver) || (function () { }),
                includeRawProps: ((_b = this.parserConfig) === null || _b === void 0 ? void 0 : _b.includeRawProps) ? true : false,
                ansiEncoding: (0, utils_1.emptyToNull)((_c = this.parserConfig) === null || _c === void 0 ? void 0 : _c.ansiEncoding),
            });
        }
        return this.fieldsData;
    };
    /**
     Reads an attachment content by key/ID
     
      @return {Object} The attachment for specific attachment key
      */
    MsgReader.prototype.getAttachment = function (attach) {
        var attachData = typeof attach === 'number' ? this.fieldsData.attachments[attach] : attach;
        if (attachData.innerMsgContent === true && typeof attachData.folderId === "number") {
            // embedded msg
            return { fileName: attachData.name + ".msg", content: this.innerMsgBurners[attachData.folderId]() };
        }
        else {
            // raw attachment file
            var fieldData = this.reader.readFileOf(attachData.dataId);
            return { fileName: attachData.fileName, content: fieldData };
        }
    };
    return MsgReader;
}());
exports.default = MsgReader;
