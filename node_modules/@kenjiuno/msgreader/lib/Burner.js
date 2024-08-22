"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.burn = void 0;
var Reader_1 = require("./Reader");
var DataStream_1 = __importDefault(require("./DataStream"));
var const_1 = __importDefault(require("./const"));
function RoundUpto4096(num) {
    return (num + 4095) & (~4095);
}
function RoundUpto512(bytes) {
    return (bytes + 511) & (~511);
}
function RoundUpto64(bytes) {
    return (bytes + 63) & (~63);
}
function repeatValue(value, count) {
    var array = [];
    for (var x = 0; x < count; x++) {
        array.push(value);
    }
    return array;
}
var LiteFat = /** @class */ (function () {
    function LiteFat(source) {
        this.sectors = source;
    }
    LiteFat.prototype.allocate = function (count) {
        var first = this.sectors.length;
        for (var x = 0; x < count; x++) {
            var next = (x + 1 === count) ? -2 : first + x + 1;
            this.sectors.push(next);
        }
        return first;
    };
    LiteFat.prototype.allocateAs = function (count, value) {
        var first = this.sectors.length;
        for (var x = 0; x < count; x++) {
            this.sectors.push(value);
        }
        return first;
    };
    LiteFat.prototype.finalize = function (boundary, value) {
        var num = (boundary - (this.sectors.length % boundary)) % boundary;
        for (; num >= 1; num -= 1) {
            this.sectors.push(value);
        }
        return this;
    };
    LiteFat.prototype.count = function () {
        return this.sectors.length;
    };
    return LiteFat;
}());
var LiteBurner = /** @class */ (function () {
    function LiteBurner(entries) {
        this.fat = new LiteFat([]);
        this.miniFat = new LiteFat([]);
        this.liteEnts = entries
            .map(function (it) { return ({
            entry: it,
            left: -1,
            right: -1,
            child: -1,
            firstSector: 0,
            isMini: it.length < 4096,
        }); });
        this.buildTree(0);
        var entriesFirstSector = this.fat.allocate(RoundUpto512(128 * this.liteEnts.length) / 512);
        for (var _i = 0, _a = this.liteEnts
            .filter(function (it) { return true
            && it.entry.type == Reader_1.TypeEnum.DOCUMENT
            && it.isMini === false; }); _i < _a.length; _i++) {
            var liteEnt = _a[_i];
            liteEnt.firstSector = (liteEnt.entry.length === 0)
                ? -2
                : this.fat.allocate(RoundUpto512(liteEnt.entry.length) / 512);
        }
        for (var _b = 0, _c = this.liteEnts
            .filter(function (it) { return true
            && it.entry.type == Reader_1.TypeEnum.DOCUMENT
            && it.isMini === true; }); _b < _c.length; _b++) {
            var liteEnt = _c[_b];
            liteEnt.firstSector = (liteEnt.entry.length === 0)
                ? -2
                : this.miniFat.allocate(RoundUpto64(liteEnt.entry.length) / 64);
        }
        var numMiniFatSectors = RoundUpto512(4 * this.miniFat.count()) / 512;
        var firstMiniFatSector = (numMiniFatSectors !== 0)
            ? this.fat.allocate(numMiniFatSectors)
            : -2;
        var bytesMiniFat = 64 * this.miniFat.count();
        var firstMiniDataSector = this.fat.allocate(RoundUpto512(bytesMiniFat) / 512);
        this.liteEnts[0].firstSector = firstMiniDataSector;
        var firstFatSector = this.fat.allocateAs(RoundUpto512(4 * (this.fat.count() + this.fat.count() / 128 + this.fat.count() / (128 * 109))) / 512, -3);
        var numFatSectors = this.fat.count() - firstFatSector;
        var numDifatSectors = (numFatSectors > 109)
            ? RoundUpto512(4 * Math.floor((numFatSectors - 109) / 127 * 128)) / 512
            : 0;
        var firstDifatSector = (numDifatSectors !== 0)
            ? this.fat.allocateAs(numDifatSectors, -4)
            : -2;
        var array = new ArrayBuffer(512 * (1 + this.fat.count()));
        var ds = new DataStream_1.default(array, 0, DataStream_1.default.LITTLE_ENDIAN);
        ds.dynamicSize = false;
        this.miniFat.finalize(512 / 4, -1);
        var difat1 = [];
        var difat2 = [];
        {
            var x = 0;
            for (; x < 109 && x < numFatSectors; x++) {
                difat1.push(firstFatSector + x);
            }
            var nextDifatSector = firstDifatSector + 1;
            for (; x < numFatSectors; x++) {
                difat2.push(firstFatSector + x);
                var remain = (difat2.length & 127);
                if (remain === 127) {
                    difat2.push(nextDifatSector);
                    nextDifatSector++;
                }
            }
            while (true) {
                var remain = (difat2.length & 127);
                if (remain === 0) {
                    break;
                }
                difat2.push((remain === 127) ? -2 : -1);
            }
        }
        // header
        {
            ds.seek(0);
            ds.writeUint8Array(const_1.default.FILE_HEADER);
            ds.seek(0x18);
            ds.writeUint16(0x3E); //ushort MinorVersion
            ds.writeUint16(0x03); //ushort MajorVersion
            ds.writeUint16(0xFFFE); //ushort ByteOrder
            ds.writeUint16(9); //ushort SectorShift
            ds.writeUint16(6); //ushort MiniSectorShift
            ds.seek(0x2C);
            ds.writeInt32(numFatSectors); //int32 NumberOfFATSectors
            ds.writeInt32(entriesFirstSector); //int32 FirstDirectorySectorLocation
            ds.seek(0x38);
            ds.writeInt32(4096); //int32 MiniStreamCutoffSize
            ds.writeInt32(firstMiniFatSector); //int32 FirstMiniFATSectorLocation
            ds.writeInt32(numMiniFatSectors); //int32 NumberOfMiniFATSectors
            ds.writeInt32(firstDifatSector); //int32 FirstDIFATSectorLocation
            ds.writeInt32(numDifatSectors); //int32 NumberOfDIFATSectors
            var x = 0;
            for (; x < difat1.length; x++) {
                ds.writeInt32(difat1[x]); //int32 DIFAT[x]
            }
            for (; x < 109; x++) {
                ds.writeInt32(-1); //int32 DIFAT[x]
            }
        }
        // entries
        for (var x = 0; x < this.liteEnts.length; x++) {
            var liteEnt = this.liteEnts[x];
            var pos = 512 * (1 + entriesFirstSector) + 128 * x;
            ds.seek(pos);
            ds.writeUCS2String(liteEnt.entry.name, null, null);
            var numBytesName = ds.position - pos;
            ds.seek(pos + 0x40);
            ds.writeUint16(Math.min(64, numBytesName + 2));
            ds.writeUint8(liteEnt.entry.type);
            ds.writeUint8((x === 0) ? 0 : 1);
            ds.writeInt32(liteEnt.left);
            ds.writeInt32(liteEnt.right);
            ds.writeInt32(liteEnt.child);
            if (x === 0) {
                ds.seek(pos + 0x50);
                ds.writeUint8Array([0x0B, 0x0D, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46]);
            }
            var length_1 = (x === 0)
                ? bytesMiniFat
                : liteEnt.entry.length;
            var firstSector = (length_1 !== 0)
                ? liteEnt.firstSector
                : (liteEnt.entry.type === Reader_1.TypeEnum.DIRECTORY ? 0 : -2);
            ds.seek(pos + 0x74);
            ds.writeInt32(firstSector);
            ds.writeInt32(length_1);
        }
        for (var _d = 0, _e = this.liteEnts
            .filter(function (it) { return true
            && it.entry.type == Reader_1.TypeEnum.DOCUMENT
            && it.isMini === false; }); _d < _e.length; _d++) {
            var liteEnt = _e[_d];
            var bytes = liteEnt.entry.binaryProvider();
            ds.seek(512 * (1 + liteEnt.firstSector));
            ds.writeUint8Array(bytes);
        }
        for (var _f = 0, _g = this.liteEnts
            .filter(function (it) { return true
            && it.entry.type == Reader_1.TypeEnum.DOCUMENT
            && it.isMini === true; }); _f < _g.length; _f++) {
            var liteEnt = _g[_f];
            var bytes = liteEnt.entry.binaryProvider();
            ds.seek(512 * (1 + firstMiniDataSector) + 64 * liteEnt.firstSector);
            ds.writeUint8Array(bytes);
        }
        // minifat
        ds.seek(512 * (1 + firstMiniFatSector));
        ds.writeInt32Array(this.miniFat.sectors);
        // fat
        this.fat.finalize(512 / 4, -1);
        ds.seek(512 * (1 + firstFatSector));
        ds.writeInt32Array(this.fat.sectors);
        // difat
        if (numDifatSectors >= 1) {
            ds.seek(512 * (1 + firstDifatSector));
            ds.writeInt32Array(difat2);
        }
        this.array = array;
    }
    /**
     * CFBF dedicated name comparer
     *
     * - At first compare UTF-16 length.
     * - Then compare upper cased UTF-16 string.
     */
    LiteBurner.prototype.compareName = function (a, b) {
        var t = a.length - b.length;
        if (t === 0) {
            var x = a.toUpperCase();
            var y = b.toUpperCase();
            if (x > y) {
                t = 1;
            }
            else if (x < y) {
                t = -1;
            }
        }
        return t;
    };
    LiteBurner.prototype.buildTree = function (dirIndex) {
        var _this = this;
        var liteEnts = this.liteEnts;
        var liteEntry = liteEnts[dirIndex];
        if (liteEntry.entry.type === Reader_1.TypeEnum.DOCUMENT) {
            throw new Error("It must be a storage!");
        }
        var children = liteEntry.entry.children.concat();
        if (children.length >= 1) {
            children.sort(function (a, b) {
                return _this.compareName(liteEnts[a].entry.name, liteEnts[b].entry.name);
            });
            liteEntry.child = children[0];
            for (var x = 0; x < children.length - 1; x++) {
                liteEnts[children[x]].right = children[x + 1];
            }
            for (var _i = 0, _a = children
                .filter(function (it) { return liteEnts[it].entry.type === Reader_1.TypeEnum.DIRECTORY; }); _i < _a.length; _i++) {
                var subIndex = _a[_i];
                this.buildTree(subIndex);
            }
        }
    };
    return LiteBurner;
}());
/**
 * Burn CFBF file on the fly.
 *
 * CFBF = Compound File Binary Format
 *
 * @param entries The flattened (not tree) entries starting with `Root Entry`.
 * @returns The binary.
 */
function burn(entries) {
    return new Uint8Array(new LiteBurner(entries).array);
}
exports.burn = burn;
