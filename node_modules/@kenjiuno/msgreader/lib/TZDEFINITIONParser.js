"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
var utils_1 = require("./utils");
var TZDEFINITION_FLAG_VALID_GUID = 1;
var TZDEFINITION_FLAG_VALID_KEYNAME = 2;
var TZRULE_FLAG_EFFECTIVE_TZREG = 2;
var TZRULE_FLAG_RECUR_CURRENT_TZREG = 1;
/**
 * @internal
 */
function parse(ds) {
    // About persisting TZDEFINITION to a stream to commit to a binary property
    // https://learn.microsoft.com/en-us/office/client-developer/outlook/auxiliary/about-persisting-tzdefinition-to-a-stream-to-commit-to-a-binary-property?redirectedfrom=MSDN
    var tz = { rules: [] };
    if (!ds.isEof()) {
        var bMajorVersion = ds.readUint8();
        if (bMajorVersion !== 2) {
            throw new Error("TZDEFINITION major version not supported");
        }
        var bMinorVersion = ds.readUint8();
        if (bMajorVersion < 1) {
            throw new Error("TZDEFINITION minor version not supported");
        }
        var cbHeader = ds.readUint16();
        var wFlags = ds.readUint16();
        if (wFlags & TZDEFINITION_FLAG_VALID_GUID) {
            ds.readInt32();
            ds.readInt32();
            ds.readInt32();
            ds.readInt32();
        }
        if (wFlags & TZDEFINITION_FLAG_VALID_KEYNAME) {
            var cchKeyName = ds.readUint16();
            tz.keyName = ds.readUCS2String(cchKeyName);
        }
        var cRules = ds.readUint16();
        ds.seek(4 + cbHeader);
        for (var x = 0; x < cRules; x++) {
            var bMajorVersion_1 = ds.readUint8();
            if (bMajorVersion_1 !== 2) {
                break;
            }
            var bMinorVersion_1 = ds.readUint8();
            if (bMajorVersion_1 < 1) {
                break;
            }
            var cbRule = ds.readUint16();
            var basePos = ds.position;
            var wFlags_1 = ds.readUint16();
            var stStart = (0, utils_1.readSystemTime)(ds);
            var lBias = ds.readInt32();
            var lStandardBias = ds.readInt32();
            var lDaylightBias = ds.readInt32();
            var stStandardDate = (0, utils_1.readTransitionSystemTime)(ds);
            var stDaylightDate = (0, utils_1.readTransitionSystemTime)(ds);
            var rule = Object.assign({}, {
                flags: wFlags_1,
                start: (stStart === null || stStart === void 0 ? void 0 : stStart.toUTCString()) || null,
                bias: lBias,
                standardBias: lStandardBias,
                daylightBias: lDaylightBias,
                standardDate: stStandardDate,
                daylightDate: stDaylightDate,
            });
            tz.rules.push(rule);
            ds.seek(basePos + cbRule);
        }
    }
    return tz;
}
exports.parse = parse;
