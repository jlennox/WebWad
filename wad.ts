type u8 = number;
type u16 = number;
type u32 = number;
type i16 = number;

type number_t = u8 | u16 | u32 | i16;
type matrix = Float32Array;
type vec3 = Float32Array;

class mat4 {
    public static create(): matrix {
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
    public static perspective(out: matrix, fovy: number, aspect: number, near: number, far: number): matrix {
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
        } else {
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
    public static translate(out: matrix, a: matrix, v: number[]): matrix {
        let x = v[0],
        y = v[1],
        z = v[2];
        let a00, a01, a02, a03;
        let a10, a11, a12, a13;
        let a20, a21, a22, a23;

        if (a === out) {
            out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
            out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
            out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
            out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        } else {
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
    constructor(target: HTMLElement, loaded: (result: ArrayBuffer) => void) {
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
            const file = event.dataTransfer!.files[0]
            const reader = new FileReader();
            reader.addEventListener("loadend", (loadEvent) => {
                loaded(reader.result as ArrayBuffer);
            });

            reader.readAsArrayBuffer(file);
        });
    }
}

class BinaryFileReader {
    public position: number = 0;

    private readonly u8: Uint8Array;
    private readonly u16: readonly Uint16Array[];
    private readonly u32: readonly Uint32Array[];
    private readonly i16: readonly Int16Array[];

    private readonly storedPositions: number[] = [];

    private static readonly textDecoder = new TextDecoder("us-ascii"); // Correct encoding?

    constructor(file: ArrayBuffer) {
        function createOffsetArrays<T>(count: number, ctor: (buff: ArrayBuffer) => T): readonly T[] {
            const arrays: T[] = [];
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

    public seek(position: number): BinaryFileReader {
        this.position = position;
        return this;
    }

    public pushPosition(newPosition: number): BinaryFileReader {
        this.storedPositions.push(this.position);
        this.position = newPosition;
        return this;
    }

    public popPosition(): BinaryFileReader {
        this.position = this.storedPositions.pop()!;
        return this;
    }

    public readU8(): u8 {
        const result = this.u8[this.position];
        ++this.position;
        return result;
    }

    public readU16(): u16 {
        const offset = this.position % 2;
        const result = this.u16[offset][(this.position - offset) / 2];
        this.position += 2;
        return result;
    }

    public readU32(): u32 {
        const offset = this.position % 4;
        const result = this.u32[offset][(this.position - offset) / 4];
        this.position += 4;
        return result;
    }

    public readI16(): i16 {
        const offset = this.position % 2;
        const result = this.i16[offset][(this.position - offset) / 2];
        this.position += 2;
        return result;
    }

    public readFixLengthString(length: number): string {
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
    public readonly identifier: u32;
    public readonly numlumps: u32;
    public readonly infotableofs: u32;

    constructor(reader: BinaryFileReader) {
        this.identifier = reader.readU32();
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();
    }
}

class BoundingBox {
    public readonly top: i16;
    public readonly bottom: i16;
    public readonly left: i16;
    public readonly right: i16;

    constructor(reader: BinaryFileReader) {
        this.top = reader.readI16();
        this.bottom = reader.readI16();
        this.left = reader.readI16();
        this.right = reader.readI16();
    }
}

// https://doomwiki.org/wiki/Node
class NodeEntry {
    public static size = 28;

    public readonly x: i16;
    public readonly y: i16;
    public readonly dx: i16;
    public readonly dy: i16;
    public readonly boundingBoxLeft: BoundingBox;
    public readonly boundingBoxRight: BoundingBox;
    public readonly rightChild: i16;
    public readonly leftChild: i16;

    constructor(reader: BinaryFileReader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
        this.dx = reader.readI16();
        this.dy = reader.readI16();
        this.boundingBoxLeft = new BoundingBox(reader);
        this.boundingBoxRight = new BoundingBox(reader);
        this.rightChild = reader.readI16();
        this.leftChild = reader.readI16();
    }

    public static loadAll(reader: BinaryFileReader, nodeEntry: DirectoryEntry): readonly NodeEntry[] {
        reader.pushPosition(nodeEntry.filepos);
        const nodes: NodeEntry[] = [];
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
    public readonly filepos: u32;
    public readonly size: u32;
    public readonly name: string;

    private static readonly mapNameExpression = /^MAP\d\d$|^E\dM\d$/;

    constructor(reader: BinaryFileReader) {
        this.filepos = reader.readU32();
        this.size = reader.readU32();
        this.name = reader.readFixLengthString(8);
    }

    public static read(reader: BinaryFileReader, count: number): readonly DirectoryEntry[] {
        const entries: DirectoryEntry[] = [];

        for (let i = 0; i < count; ++i) {
            entries.push(new DirectoryEntry(reader));
        }

        return entries;
    }

    public isMapEntry(): boolean {
        return DirectoryEntry.mapNameExpression.test(this.name);
    }

    public readAll<TResult>(reader: BinaryFileReader, read: (reader: BinaryFileReader) => TResult): readonly TResult[] {
        const results: TResult[] = [];
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
    public readonly x: i16;
    public readonly y: i16;

    constructor(reader: BinaryFileReader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
    }

    public static readAll(entry: DirectoryEntry, reader: BinaryFileReader): readonly Vertex[] {
        return entry.readAll(reader, (reader) => new Vertex(reader));
    }
}

enum LinedefFlags {
    BLOCKING = 0x0001, // blocks players and monsters 	Doom 	blocking 	BLOCKF_CREATURES
    BLOCKMONSTERS = 0x0002, // blocks monsters 	Doom 	blockmonsters 	BLOCKF_MONSTERS
    TWOSIDED = 0x0004, // two sided 	Doom 	twosided
    DONTPEGTOP = 0x0008, // upper texture is unpegged 	Doom 	dontpegtop
    DONTPEGBOTTOM = 0x0010, // lower texture is unpegged 	Doom 	dontpegbottom
    SECRET = 0x0020, // secret (shows as one-sided on automap) 	Doom 	secret
    SOUNDBLOCK = 0x0040, // blocks sound 	Doom 	blocksound 	BLOCKF_SOUND
    DONTDRAW = 0x0080, // never shows on automap 	Doom 	dontdraw
    MAPPED = 0x0100, // always shows on automap 	Doom 	mapped
    REPEAT_SPECIAL = 0x0200, // can be activated more than once 	ZDoom 	repeatspecial
    SPAC_Use = 0x0400, // activated when used by player 	ZDoom 	playeruse
    SPAC_MCross = 0x0800, // activated when crossed by monster 	ZDoom 	monstercross
    SPAC_Impact = 0x0C00, // activated when hit by projectile 	ZDoom 	impact
    SPAC_Push = 0x1000, // activated when bumped by player 	ZDoom 	playerpush
    SPAC_PCross = 0x1400, // activated crossed by projectile 	ZDoom 	missilecross
    SPAC_UseThrough = 0x1800, // activated when used by player (with pass through) 	ZDoom 	blocking
    TRANSLUCENT = 0x1000, // line is 25% translucent (alpha of 0.75) 	Strife 	translucent
    MONSTERSCANACTIVATE = 0x2000, // line can be activated by players and monsters 	ZDoom 	monsteractivate
    BLOCK_PLAYERS = 0x4000, // blocks players 	ZDoom 	blockplayers 	BLOCKF_PLAYERS
    BLOCKEVERYTHING = 0x8000, // blocks everything (includes gunshots & missiles) 	ZDoom 	blockeverything 	BLOCKF_EVERYTHING
}

class LiknedefEntry {
    public readonly vertexAIndex: u16;
    public readonly vertexBIndex: u16;
    public readonly flags: LinedefFlags; // u16
    public readonly linetype: u16;
    public readonly tag: u16;
    public readonly sidedefRight: u16;
    public readonly sidedefLeft: u16;

    public readonly vertexA: Vertex;
    public readonly vertexB: Vertex;

    constructor(reader: BinaryFileReader, vertexes: readonly Vertex[]) {
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

    public hasFlag(flag: LinedefFlags): boolean {
        return (this.flags & flag) == flag;
    }

    public static readAll(entry: DirectoryEntry, reader: BinaryFileReader, vertexes: readonly Vertex[]): readonly LiknedefEntry[] {
        return entry.readAll(reader, (reader) => new LiknedefEntry(reader, vertexes));
    }
}

enum MapEntryName {
    THINGS = "THINGS",
    LINEDEFS = "LINEDEFS",
    SIDEDEFS = "SIDEDEFS",
    VERTEXES = "VERTEXES",
    SEGS = "SEGS",
    SSECTORS = "SSECTORS",
    NODES = "NODES",
    SECTORS = "SECTORS",
    REJECT = "REJECT",
    BLOCKMAP = "BLOCKMAP",
}

interface IMapDirectoryEntry {
    readonly map: DirectoryEntry;
    readonly things: DirectoryEntry;
    readonly linedefs: DirectoryEntry;
    readonly sidedefs: DirectoryEntry;
    readonly vertexes: DirectoryEntry;
    readonly segs: DirectoryEntry;
    readonly ssectors: DirectoryEntry;
    readonly nodes: DirectoryEntry;
    readonly sectors: DirectoryEntry;
    readonly reject: DirectoryEntry;
    readonly blockmap: DirectoryEntry;
}

class MapEntry {
    public readonly name: string;
    public readonly entries: IMapDirectoryEntry;
    public readonly vertexes: readonly Vertex[];
    public readonly linedefs: readonly LiknedefEntry[];

    private readonly reader: BinaryFileReader

    constructor(reader: BinaryFileReader, name: string, entries: IMapDirectoryEntry) {
        this.reader = reader;
        this.name = name;
        this.entries = entries;
        this.vertexes = Vertex.readAll(entries.vertexes, reader);
        this.linedefs = LiknedefEntry.readAll(entries.linedefs, reader, this.vertexes);
    }

    public getNodes(): readonly NodeEntry[] {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    }

    public static loadAll(reader: BinaryFileReader, entries: readonly DirectoryEntry[]): readonly MapEntry[] {
        const maps: MapEntry[] = [];

        let i = 0;

        function demandNextEntry(type: MapEntryName): DirectoryEntry {
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
    private readonly reader: BinaryFileReader;

    public readonly wadInfo: WadInfo;
    public readonly directory: readonly DirectoryEntry[];
    public readonly maps: readonly MapEntry[];

    constructor(private readonly file: ArrayBuffer) {
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadInfo(this.reader);

        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.loadAll(this.reader, this.directory);
    }
}


class MapView {
    private readonly wad: Promise<WadFile>;

    private scale = 1;
    private baseX: number;
    private baseY: number;
    private currentMap: MapEntry | undefined;
    private readonly canvasWidth: number;
    private readonly canvasHeight: number;

    constructor(private readonly canvas: HTMLCanvasElement) {
        canvas.style.position = "fixed";
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;

        this.baseX = canvas.width / 2;
        this.baseY = canvas.height / 2;

        this.wad = new Promise<WadFile>((resolve, _reject) => {
            new UserFileReader(canvas, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });

        document.addEventListener("wheel", (event) => {
            const step = event.shiftKey ? .1 : .025;
            this.scale += (event.deltaY < 0 ? 1 : -1) * step;
            if (this.scale < .025) this.scale = .025;
            // this.baseX += (event.offsetX - this.baseX) * .1;
            // this.baseY += (event.offsetY - this.baseY) * .1;
            this.redraw();
        });

        let isMouseDown = false;
        let lastMouseEvent: MouseEvent | null = null;

        canvas.addEventListener("mousedown", (event) => {
            isMouseDown = true;
            lastMouseEvent = event;
        });

        canvas.addEventListener("mouseup", (_event) => {
            isMouseDown = false;
            lastMouseEvent = null;
        });

        canvas.addEventListener("mousemove", (event) => {
            if (isMouseDown == false) return;

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

    private awaitingRender = false;

    private redraw(): void {
        if (this.awaitingRender) return;
        this.awaitingRender = true;

        requestAnimationFrame(() => {
            this.redraw2d();
            this.awaitingRender = false;
        });
    }

    private redraw3d(): void {
        const gl = this.canvas.getContext("webgl")!;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            1.0,  1.0,
           -1.0,  1.0,
            1.0, -1.0,
           -1.0, -1.0,
         ];
         gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.STATIC_DRAW);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix,     // destination matrix
            modelViewMatrix,     // matrix to translate
            [-0.0, 0.0, -6.0]);  // amount to translate

        {
            const numComponents = 2;  // pull out 2 values per iteration
            const type = gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                        // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
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

    private redraw2d(): void {
        const linedefs = this.currentMap!.linedefs;
        const context = this.canvas.getContext("2d")!;
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

    public async displayLevel(name: string): Promise<void> {
        const wad = await this.wad;
        this.currentMap = wad.maps.find((map) => map.name == name) ?? wad.maps[0];
        this.redraw();
    }
}

const el = document.querySelector<HTMLCanvasElement>(".loadingzone")!;
const mapView = new MapView(el);
mapView.displayLevel("MAP01");
