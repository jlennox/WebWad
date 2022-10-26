"use strict";
class UserFileReader {
    constructor(target, loaded) {
        target.addEventListener("dragover", (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        target.addEventListener("dragleave", (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        target.addEventListener("drop", (event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            const reader = new FileReader();
            reader.addEventListener("loadend", (loadEvent) => {
                loaded(reader.result);
            });
            reader.readAsArrayBuffer(file);
        });
    }
}
class BinaryFileReader {
    position = 0;
    u8;
    u16;
    u32;
    i16;
    storedPositions = [];
    static textDecoder = new TextDecoder("us-ascii"); // Correct encoding?
    constructor(file) {
        this.u8 = new Uint8Array(file);
        this.u16 = new Uint16Array(file);
        this.u32 = new Uint32Array(file);
        this.i16 = new Int16Array(file);
    }
    seek(position) {
        this.position = position;
        return this;
    }
    pushPosition(newPosition) {
        this.storedPositions.push(this.position);
        this.position = newPosition;
        return this;
    }
    popPosition() {
        this.position = this.storedPositions.pop();
        return this;
    }
    readU8() {
        const result = this.u8[this.position];
        ++this.position;
        return result;
    }
    readU16() {
        if (this.position % 2 != 0) {
            throw new Error(`Unalign i32 read attempt: ${this.position}`);
        }
        const result = this.u16[this.position / 2];
        this.position += 2;
        return result;
    }
    readU32() {
        if (this.position % 4 != 0) {
            throw new Error(`Unalign u32 read attempt: ${this.position}`);
        }
        const result = this.u32[this.position / 4];
        this.position += 4;
        return result;
    }
    readI16() {
        if (this.position % 2 != 0) {
            throw new Error(`Unalign i32 read attempt: ${this.position}`);
        }
        const result = this.i16[this.position / 2];
        this.position += 2;
        return result;
    }
    readFixLengthString(length) {
        const start = this.position;
        let sub = 0;
        for (let i = 0; i < length; ++i) {
            if (this.readU8() == 0) {
                sub = 1;
                break;
            }
        }
        const slice = this.u8.slice(start, this.position - sub);
        const result = BinaryFileReader.textDecoder.decode(slice);
        this.position = start + length;
        return result;
    }
}
class WadInfo {
    identifier;
    numlumps;
    infotableofs;
    constructor(reader) {
        this.identifier = reader.readU32();
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();
    }
}
class BoundingBox {
    top;
    bottom;
    left;
    right;
    constructor(reader) {
        this.top = reader.readI16();
        this.bottom = reader.readI16();
        this.left = reader.readI16();
        this.right = reader.readI16();
    }
}
// https://doomwiki.org/wiki/Node
class NodeEntry {
    static size = 28;
    x;
    y;
    dx;
    dy;
    boundingBoxLeft;
    boundingBoxRight;
    rightChild;
    leftChild;
    constructor(reader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
        this.dx = reader.readI16();
        this.dy = reader.readI16();
        this.boundingBoxLeft = new BoundingBox(reader);
        this.boundingBoxRight = new BoundingBox(reader);
        this.rightChild = reader.readI16();
        this.leftChild = reader.readI16();
    }
    static loadAll(reader, nodeEntry) {
        reader.pushPosition(nodeEntry.filepos);
        const nodes = [];
        const end = reader.position + nodeEntry.size;
        while (reader.position <= end) {
            const node = new NodeEntry(reader);
            nodes.push(node);
        }
        reader.popPosition();
        return nodes;
    }
}
// "lump"
class DirectoryEntry {
    filepos;
    size;
    name;
    static mapNameExpression = /^MAP\d\d$|^E\dM\d$/;
    constructor(reader) {
        this.filepos = reader.readU32();
        this.size = reader.readU32();
        this.name = reader.readFixLengthString(8);
    }
    static read(reader, count) {
        const entries = [];
        for (let i = 0; i < count; ++i) {
            entries.push(new DirectoryEntry(reader));
        }
        return entries;
    }
    isMapEntry() {
        return DirectoryEntry.mapNameExpression.test(this.name);
    }
    readAll(reader, read) {
        const results = [];
        reader.pushPosition(this.filepos);
        const end = reader.position + this.size;
        while (reader.position <= end) {
            results.push(read(reader));
        }
        reader.popPosition();
        return results;
    }
}
class Vertex {
    x;
    y;
    constructor(reader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
    }
    static readAll(entry, reader) {
        return entry.readAll(reader, (reader) => new Vertex(reader));
    }
}
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
const somePromise = Promise.resolve("hello world");
async function foobar() {
    console.log("entrance");
    console.log(await somePromise);
    console.log("exit");
}
class LiknedefEntry {
    vertexAIndex;
    vertexBIndex;
    flags; // u16
    linetype;
    tag;
    sidedefRight;
    sidedefLeft;
    vertexA;
    vertexB;
    constructor(reader, vertexes) {
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
    hasFlag(flag) {
        return (this.flags & flag) == flag;
    }
    static readAll(entry, reader, vertexes) {
        return entry.readAll(reader, (reader) => new LiknedefEntry(reader, vertexes));
    }
}
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
class MapEntry {
    name;
    entries;
    vertexes;
    linedefs;
    reader;
    constructor(reader, name, entries) {
        this.reader = reader;
        this.name = name;
        this.entries = entries;
        this.vertexes = Vertex.readAll(entries.vertexes, reader);
        this.linedefs = LiknedefEntry.readAll(entries.linedefs, reader, this.vertexes);
    }
    getNodes() {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    }
    static loadAll(reader, entries) {
        const maps = [];
        let i = 0;
        function demandNextEntry(type) {
            const next = entries[i + 1];
            if (next.name == type) {
                ++i;
                return next;
            }
            throw new Error(`Missing entry ${type}`);
        }
        for (; i < entries.length; ++i) {
            const entry = entries[i];
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
    }
}
class WadFile {
    file;
    reader;
    wadInfo;
    directory;
    maps;
    constructor(file) {
        this.file = file;
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadInfo(this.reader);
        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.loadAll(this.reader, this.directory);
    }
}
class MapView {
    canvas;
    wad;
    scale = 1;
    baseX;
    baseY;
    currentMap;
    canvasWidth;
    canvasHeight;
    constructor(canvas) {
        this.canvas = canvas;
        canvas.style.position = "fixed";
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        this.baseX = canvas.width / 2;
        this.baseY = canvas.height / 2;
        this.wad = new Promise((resolve, _reject) => {
            new UserFileReader(canvas, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });
        document.addEventListener("wheel", (event) => {
            const step = event.shiftKey ? .1 : .025;
            this.scale += (event.deltaY < 0 ? 1 : -1) * step;
            if (this.scale < .025)
                this.scale = .025;
            // this.baseX += (event.offsetX - this.baseX) * .1;
            // this.baseY += (event.offsetY - this.baseY) * .1;
            this.redraw();
        });
        let isMouseDown = false;
        let lastMouseEvent = null;
        canvas.addEventListener("mousedown", (event) => {
            isMouseDown = true;
            lastMouseEvent = event;
        });
        canvas.addEventListener("mouseup", (_event) => {
            isMouseDown = false;
            lastMouseEvent = null;
        });
        canvas.addEventListener("mousemove", (event) => {
            if (isMouseDown == false)
                return;
            if (lastMouseEvent != null) {
                const deltaX = lastMouseEvent.x - event.x;
                const deltaY = lastMouseEvent.y - event.y;
                this.baseX -= deltaX;
                this.baseY -= deltaY;
                this.redraw();
            }
            lastMouseEvent = event;
        });
    }
    redraw() {
        this.redraw2d();
    }
    redraw3d() {
        const gl = this.canvas.getContext("webgl");
    }
    redraw2d() {
        const linedefs = this.currentMap.linedefs;
        const context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        context.lineWidth = 1;
        for (const def of linedefs) {
            context.beginPath();
            context.strokeStyle = def.hasFlag(LinedefFlags.SECRET) ? "red" : "black";
            context.moveTo(def.vertexA.x * this.scale + this.baseX, def.vertexA.y * this.scale + this.baseY);
            context.lineTo(def.vertexB.x * this.scale + this.baseX, def.vertexB.y * this.scale + this.baseY);
            context.stroke();
        }
    }
    async displayLevel(name) {
        const wad = await this.wad;
        this.currentMap = wad.maps[0];
        this.redraw();
    }
}
const el = document.querySelector(".loadingzone");
const mapView = new MapView(el);
mapView.displayLevel("MAP01");
