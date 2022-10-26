var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var UserFileReader = /** @class */ (function () {
    function UserFileReader(target, loaded) {
        target.addEventListener("dragover", function (event) {
            event.stopPropagation();
            event.preventDefault();
        });
        target.addEventListener("dragleave", function (event) {
            event.stopPropagation();
            event.preventDefault();
        });
        target.addEventListener("drop", function (event) {
            event.preventDefault();
            var file = event.dataTransfer.files[0];
            var reader = new FileReader();
            reader.addEventListener("loadend", function (loadEvent) {
                loaded(reader.result);
            });
            reader.readAsArrayBuffer(file);
        });
    }
    return UserFileReader;
}());
var BinaryFileReader = /** @class */ (function () {
    function BinaryFileReader(file) {
        this.position = 0;
        this.storedPositions = [];
        this.u8 = new Uint8Array(file);
        this.u16 = new Uint16Array(file);
        this.u32 = new Uint32Array(file);
        this.i16 = new Int16Array(file);
    }
    BinaryFileReader.prototype.seek = function (position) {
        this.position = position;
        return this;
    };
    BinaryFileReader.prototype.pushPosition = function (newPosition) {
        this.storedPositions.push(this.position);
        this.position = newPosition;
        return this;
    };
    BinaryFileReader.prototype.popPosition = function () {
        this.position = this.storedPositions.pop();
        return this;
    };
    BinaryFileReader.prototype.readU8 = function () {
        var result = this.u8[this.position];
        ++this.position;
        return result;
    };
    BinaryFileReader.prototype.readU16 = function () {
        if (this.position % 2 != 0) {
            throw new Error("Unalign i32 read attempt: ".concat(this.position));
        }
        var result = this.u16[this.position / 2];
        this.position += 2;
        return result;
    };
    BinaryFileReader.prototype.readU32 = function () {
        if (this.position % 4 != 0) {
            throw new Error("Unalign u32 read attempt: ".concat(this.position));
        }
        var result = this.u32[this.position / 4];
        this.position += 4;
        return result;
    };
    BinaryFileReader.prototype.readI16 = function () {
        if (this.position % 2 != 0) {
            throw new Error("Unalign i32 read attempt: ".concat(this.position));
        }
        var result = this.i16[this.position / 2];
        this.position += 2;
        return result;
    };
    BinaryFileReader.prototype.readFixLengthString = function (length) {
        var start = this.position;
        var sub = 0;
        for (var i = 0; i < length; ++i) {
            if (this.readU8() == 0) {
                sub = 1;
                break;
            }
        }
        var slice = this.u8.slice(start, this.position - sub);
        var result = BinaryFileReader.textDecoder.decode(slice);
        this.position = start + length;
        return result;
    };
    BinaryFileReader.textDecoder = new TextDecoder("us-ascii"); // Correct encoding?
    return BinaryFileReader;
}());
var WadInfo = /** @class */ (function () {
    function WadInfo(reader) {
        this.identifier = reader.readU32();
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();
    }
    return WadInfo;
}());
var BoundingBox = /** @class */ (function () {
    function BoundingBox(reader) {
        this.top = reader.readI16();
        this.bottom = reader.readI16();
        this.left = reader.readI16();
        this.right = reader.readI16();
    }
    return BoundingBox;
}());
// https://doomwiki.org/wiki/Node
var NodeEntry = /** @class */ (function () {
    function NodeEntry(reader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
        this.dx = reader.readI16();
        this.dy = reader.readI16();
        this.boundingBoxLeft = new BoundingBox(reader);
        this.boundingBoxRight = new BoundingBox(reader);
        this.rightChild = reader.readI16();
        this.leftChild = reader.readI16();
    }
    NodeEntry.loadAll = function (reader, nodeEntry) {
        reader.pushPosition(nodeEntry.filepos);
        var nodes = [];
        var end = reader.position + nodeEntry.size;
        while (reader.position <= end) {
            var node = new NodeEntry(reader);
            nodes.push(node);
        }
        reader.popPosition();
        return nodes;
    };
    NodeEntry.size = 28;
    return NodeEntry;
}());
// "lump"
var DirectoryEntry = /** @class */ (function () {
    function DirectoryEntry(reader) {
        this.filepos = reader.readU32();
        this.size = reader.readU32();
        this.name = reader.readFixLengthString(8);
    }
    DirectoryEntry.read = function (reader, count) {
        var entries = [];
        for (var i = 0; i < count; ++i) {
            entries.push(new DirectoryEntry(reader));
        }
        return entries;
    };
    DirectoryEntry.prototype.isMapEntry = function () {
        return DirectoryEntry.mapNameExpression.test(this.name);
    };
    DirectoryEntry.prototype.readAll = function (reader, read) {
        var results = [];
        reader.pushPosition(this.filepos);
        var end = reader.position + this.size;
        while (reader.position <= end) {
            results.push(read(reader));
        }
        reader.popPosition();
        return results;
    };
    DirectoryEntry.mapNameExpression = /^MAP\d\d$|^E\dM\d$/;
    return DirectoryEntry;
}());
var Vertex = /** @class */ (function () {
    function Vertex(reader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
    }
    Vertex.readAll = function (entry, reader) {
        return entry.readAll(reader, function (reader) { return new Vertex(reader); });
    };
    return Vertex;
}());
var LinedefFlags;
(function (LinedefFlags) {
    LinedefFlags[LinedefFlags["BLOCKING"] = 1] = "BLOCKING";
    LinedefFlags[LinedefFlags["BLOCKMONSTERS"] = 2] = "BLOCKMONSTERS";
    LinedefFlags[LinedefFlags["TWOSIDED"] = 4] = "TWOSIDED";
    LinedefFlags[LinedefFlags["DONTPEGTOP"] = 8] = "DONTPEGTOP";
    LinedefFlags[LinedefFlags["DONTPEGBOTTOM"] = 16] = "DONTPEGBOTTOM";
    LinedefFlags[LinedefFlags["SECRET"] = 32] = "SECRET";
    LinedefFlags[LinedefFlags["SOUNDBLOCK"] = 64] = "SOUNDBLOCK";
    LinedefFlags[LinedefFlags["DONTDRAW"] = 128] = "DONTDRAW";
    LinedefFlags[LinedefFlags["MAPPED"] = 256] = "MAPPED";
    LinedefFlags[LinedefFlags["REPEAT_SPECIAL"] = 512] = "REPEAT_SPECIAL";
    LinedefFlags[LinedefFlags["SPAC_Use"] = 1024] = "SPAC_Use";
    LinedefFlags[LinedefFlags["SPAC_MCross"] = 2048] = "SPAC_MCross";
    LinedefFlags[LinedefFlags["SPAC_Impact"] = 3072] = "SPAC_Impact";
    LinedefFlags[LinedefFlags["SPAC_Push"] = 4096] = "SPAC_Push";
    LinedefFlags[LinedefFlags["SPAC_PCross"] = 5120] = "SPAC_PCross";
    LinedefFlags[LinedefFlags["SPAC_UseThrough"] = 6144] = "SPAC_UseThrough";
    LinedefFlags[LinedefFlags["TRANSLUCENT"] = 4096] = "TRANSLUCENT";
    LinedefFlags[LinedefFlags["MONSTERSCANACTIVATE"] = 8192] = "MONSTERSCANACTIVATE";
    LinedefFlags[LinedefFlags["BLOCK_PLAYERS"] = 16384] = "BLOCK_PLAYERS";
    LinedefFlags[LinedefFlags["BLOCKEVERYTHING"] = 32768] = "BLOCKEVERYTHING";
})(LinedefFlags || (LinedefFlags = {}));
var somePromise = Promise.resolve("hello world");
function foobar() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("entrance");
                    _b = (_a = console).log;
                    return [4 /*yield*/, somePromise];
                case 1:
                    _b.apply(_a, [_c.sent()]);
                    console.log("exit");
                    return [2 /*return*/];
            }
        });
    });
}
var LiknedefEntry = /** @class */ (function () {
    function LiknedefEntry(reader, vertexes) {
        this.vertexAIndex = reader.readU16();
        this.vertexBIndex = reader.readU16();
        this.flags = reader.readU16();
        this.linetype = reader.readU16();
        this.tag = reader.readU16();
        this.sidedefRight = reader.readU16();
        this.sidedefLeft = reader.readU16();
        this.vertexA = vertexes[this.vertexAIndex];
        this.vertexB = vertexes[this.vertexBIndex];
    }
    LiknedefEntry.prototype.hasFlag = function (flag) {
        return (this.flags & flag) == flag;
    };
    LiknedefEntry.readAll = function (entry, reader, vertexes) {
        return entry.readAll(reader, function (reader) { return new LiknedefEntry(reader, vertexes); });
    };
    return LiknedefEntry;
}());
var MapEntryName;
(function (MapEntryName) {
    MapEntryName["THINGS"] = "THINGS";
    MapEntryName["LINEDEFS"] = "LINEDEFS";
    MapEntryName["SIDEDEFS"] = "SIDEDEFS";
    MapEntryName["VERTEXES"] = "VERTEXES";
    MapEntryName["SEGS"] = "SEGS";
    MapEntryName["SSECTORS"] = "SSECTORS";
    MapEntryName["NODES"] = "NODES";
    MapEntryName["SECTORS"] = "SECTORS";
    MapEntryName["REJECT"] = "REJECT";
    MapEntryName["BLOCKMAP"] = "BLOCKMAP";
})(MapEntryName || (MapEntryName = {}));
var MapEntry = /** @class */ (function () {
    function MapEntry(reader, name, entries) {
        this.reader = reader;
        this.name = name;
        this.entries = entries;
        this.vertexes = Vertex.readAll(entries.vertexes, reader);
        this.linedefs = LiknedefEntry.readAll(entries.linedefs, reader, this.vertexes);
    }
    MapEntry.prototype.getNodes = function () {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    };
    MapEntry.loadAll = function (reader, entries) {
        var maps = [];
        var i = 0;
        function demandNextEntry(type) {
            var next = entries[i + 1];
            if (next.name == type) {
                ++i;
                return next;
            }
            throw new Error("Missing entry ".concat(type));
        }
        for (; i < entries.length; ++i) {
            var entry = entries[i];
            if (entry.isMapEntry()) {
                maps.push(new MapEntry(reader, entry.name, {
                    map: entry,
                    things: demandNextEntry(MapEntryName.THINGS),
                    linedefs: demandNextEntry(MapEntryName.LINEDEFS),
                    sidedefs: demandNextEntry(MapEntryName.SIDEDEFS),
                    vertexes: demandNextEntry(MapEntryName.VERTEXES),
                    segs: demandNextEntry(MapEntryName.SEGS),
                    ssectors: demandNextEntry(MapEntryName.SSECTORS),
                    nodes: demandNextEntry(MapEntryName.NODES),
                    sectors: demandNextEntry(MapEntryName.SECTORS),
                    reject: demandNextEntry(MapEntryName.REJECT),
                    blockmap: demandNextEntry(MapEntryName.BLOCKMAP),
                }));
            }
        }
        return maps;
    };
    return MapEntry;
}());
var WadFile = /** @class */ (function () {
    function WadFile(file) {
        this.file = file;
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadInfo(this.reader);
        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.loadAll(this.reader, this.directory);
    }
    return WadFile;
}());
var el = document.querySelector(".loadingzone");
new UserFileReader(el, function (file) {
    var wad = new WadFile(file);
    console.log("wad", wad);
    var nodes = wad.maps[0].linedefs;
    console.log("nodes", nodes);
    var context = el.getContext("2d");
    var baseX = 200, baseY = 200;
    context.lineWidth = 1;
    context.beginPath();
    context.strokeStyle = "green";
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var node = nodes_1[_i];
        context.moveTo(node.vertexA.x + baseX, node.vertexA.y + baseY);
        context.lineTo(node.vertexB.x + baseX, node.vertexB.y + baseY);
        // context.strokeRect(
        //     baseX + node.boundingBoxLeft.left,
        //     baseY + node.boundingBoxLeft.bottom,
        //     baseX + node.boundingBoxLeft.right,
        //     baseY + node.boundingBoxLeft.top);
        // context.strokeStyle = "blue";
        // context.strokeRect(
        //     baseX + node.boundingBoxRight.left,
        //     baseY + node.boundingBoxRight.bottom,
        //     baseX + node.boundingBoxRight.right,
        //     baseY + node.boundingBoxRight.top);
    }
    context.stroke();
});
