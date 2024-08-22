"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = void 0;
/**
 * @internal
 */
function parse(ds) {
    // 2.2.1.74.1 VoteOption Structure
    // https://docs.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxomsg/87488eff-3eec-4502-bc94-2368c04e3109
    var items = [];
    var count = 0;
    while (!ds.isEof()) {
        var version = ds.readUint16();
        if (version === 258) {
            count = ds.readUint16();
            var dummy1 = ds.readUint16();
            for (var index = 0; index < count; index += 1) {
                var VerbType = ds.readInt32();
                var DisplayNameCount = ds.readUint8();
                var DisplayName = ds.readString(DisplayNameCount);
                var MsgClsNameCount = ds.readUint8();
                var MsgClsName = ds.readString(MsgClsNameCount);
                var Internal1StringCount = ds.readUint8();
                var Internal1String = ds.readString(Internal1StringCount);
                var DisplayNameCountRepeat = ds.readUint8();
                var DisplayNameRepeat = ds.readString(DisplayNameCountRepeat);
                var Internal2 = ds.readInt32();
                var Internal3 = ds.readUint8();
                var fUseUSHeaders = ds.readInt32();
                var Internal4 = ds.readInt32();
                var SendBehavior = ds.readInt32();
                var Internal5 = ds.readInt32();
                var ID = ds.readInt32();
                var Internal6 = ds.readInt32();
                items.push({ VerbType: VerbType, DisplayName: DisplayName });
            }
        }
        else if (version === 260) {
            for (var index = 0; index < count; index += 1) {
                var DisplayNameCount = ds.readUint8();
                var DisplayName = ds.readUCS2String(DisplayNameCount);
                var DisplayNameCountRepeat = ds.readUint8();
                var DisplayNameRepeat = ds.readUCS2String(DisplayNameCountRepeat);
                items[index].DisplayName = DisplayName;
            }
        }
    }
    return items
        .filter(function (it) { return it.VerbType === 4; })
        .map(function (it) { return it.DisplayName; })
        .join(";");
}
exports.parse = parse;
