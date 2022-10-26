"use strict";
class mat4 {
    static create() {
        const out = new Float32Array(16);
        out[0] = 1;
        out[5] = 1;
        out[10] = 1;
        out[15] = 1;
        return out;
    }
    /**
     * Generates a perspective projection matrix with the given bounds.
     * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
     * which matches WebGL/OpenGL's clip volume.
     * Passing null/undefined/no value for far will generate infinite projection matrix.
     *
     * @param {mat4} out mat4 frustum matrix will be written into
     * @param {number} fovy Vertical field of view in radians
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum, can be null or Infinity
     * @returns {mat4} out
     */
    static perspective(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);
        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;
        out[8] = 0;
        out[9] = 0;
        out[11] = -1;
        out[12] = 0;
        out[13] = 0;
        out[15] = 0;
        if (far != null && far !== Infinity) {
            const nf = 1 / (near - far);
            out[10] = (far + near) * nf;
            out[14] = 2 * far * near * nf;
        }
        else {
            out[10] = -1;
            out[14] = -2 * near;
        }
        return out;
    }
    /**
     * Translate a mat4 by the given vector
     *
     * @param {mat4} out the receiving matrix
     * @param {ReadonlyMat4} a the matrix to translate
     * @param {ReadonlyVec3} v vector to translate by
     * @returns {mat4} out
     */
    static translate(out, a, v) {
        let x = v[0], y = v[1], z = v[2];
        let a00, a01, a02, a03;
        let a10, a11, a12, a13;
        let a20, a21, a22, a23;
        if (a === out) {
            out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
            out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
            out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
            out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        }
        else {
            a00 = a[0];
            a01 = a[1];
            a02 = a[2];
            a03 = a[3];
            a10 = a[4];
            a11 = a[5];
            a12 = a[6];
            a13 = a[7];
            a20 = a[8];
            a21 = a[9];
            a22 = a[10];
            a23 = a[11];
            out[0] = a00;
            out[1] = a01;
            out[2] = a02;
            out[3] = a03;
            out[4] = a10;
            out[5] = a11;
            out[6] = a12;
            out[7] = a13;
            out[8] = a20;
            out[9] = a21;
            out[10] = a22;
            out[11] = a23;
            out[12] = a00 * x + a10 * y + a20 * z + a[12];
            out[13] = a01 * x + a11 * y + a21 * z + a[13];
            out[14] = a02 * x + a12 * y + a22 * z + a[14];
            out[15] = a03 * x + a13 * y + a23 * z + a[15];
        }
        return out;
    }
}
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
        function createOffsetArrays(count, ctor) {
            const arrays = [];
            const roundedFile = file.slice(0, file.byteLength - count - file.byteLength % count);
            for (let i = 0; i < count; ++i) {
                arrays.push(ctor(roundedFile.slice(i, roundedFile.byteLength - (count - i % count))));
            }
            return arrays;
        }
        this.u8 = new Uint8Array(file);
        this.u16 = createOffsetArrays(2, (buff) => new Uint16Array(buff));
        this.u32 = createOffsetArrays(4, (buff) => new Uint32Array(buff));
        this.i16 = createOffsetArrays(2, (buff) => new Int16Array(buff));
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
        const offset = this.position % 2;
        const result = this.u16[offset][(this.position - offset) / 2];
        this.position += 2;
        return result;
    }
    readU32() {
        const offset = this.position % 4;
        const result = this.u32[offset][(this.position - offset) / 4];
        this.position += 4;
        return result;
    }
    readI16() {
        const offset = this.position % 2;
        const result = this.i16[offset][(this.position - offset) / 2];
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
    awaitingRender = false;
    redraw() {
        if (this.awaitingRender)
            return;
        this.awaitingRender = true;
        requestAnimationFrame(() => {
            this.redraw2d();
            this.awaitingRender = false;
        });
    }
    redraw3d() {
        const gl = this.canvas.getContext("webgl");
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            1.0, 1.0,
            -1.0, 1.0,
            1.0, -1.0,
            -1.0, -1.0,
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        gl.clearDepth(1.0); // Clear everything
        gl.enable(gl.DEPTH_TEST); // Enable depth testing
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const fieldOfView = 45 * Math.PI / 180; // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, // destination matrix
        modelViewMatrix, // matrix to translate
        [-0.0, 0.0, -6.0]); // amount to translate
        {
            const numComponents = 2; // pull out 2 values per iteration
            const type = gl.FLOAT; // the data in the buffer is 32bit floats
            const normalize = false; // don't normalize
            const stride = 0; // how many bytes to get from one set of values to the next
            // 0 = use type and numComponents above
            const offset = 0; // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            // gl.vertexAttribPointer(
            //     programInfo.attribLocations.vertexPosition,
            //     numComponents,
            //     type,
            //     normalize,
            //     stride,
            //     offset);
            // gl.enableVertexAttribArray(
            //     programInfo.attribLocations.vertexPosition);
        }
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
        this.currentMap = wad.maps.find((map) => map.name == name) ?? wad.maps[0];
        this.redraw();
    }
}
const el = document.querySelector(".loadingzone");
const mapView = new MapView(el);
mapView.displayLevel("MAP01");
