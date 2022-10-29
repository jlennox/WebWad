type u8 = number;
type u16 = number;
type u32 = number;
type i16 = number;

type number_t = u8 | u16 | u32 | i16;

class UserFileInput {
    constructor(target: HTMLElement, loaded: (userFile: ArrayBuffer) => void) {
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
        // Doing this is pretty silly... verify there's even unaligned values.
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

    public seek(position: number): void {
        this.position = position;
    }

    public pushPosition(newPosition: number): void {
        this.storedPositions.push(this.position);
        this.position = newPosition;
    }

    public popPosition(): void {
        this.position = this.storedPositions.pop()!;
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

    public readFixedLengthString(length: number): string {
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
        return nodeEntry.readAll(reader, (reader) => new NodeEntry(reader));
    }
}

// "lump"
class DirectoryEntry {
    public readonly filepos: u32;
    public readonly size: u32;
    public readonly name: string;

    private static readonly mapNameExpression = /^MAP\d+$|^E\d+M\d+$/;

    constructor(reader: BinaryFileReader) {
        this.filepos = reader.readU32();
        this.size = reader.readU32();
        this.name = reader.readFixedLengthString(8);
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

class ThingEntry {
    public readonly x: i16;
    public readonly y: i16;
    public readonly angle: u16;
    public readonly type: u16;
    public readonly spawnFlags: u16;
    public readonly description?: ThingDescription;

    constructor(reader: BinaryFileReader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
        this.angle = reader.readU16();
        this.type = reader.readU16();
        this.spawnFlags = reader.readU16();
        this.description = thingDescriptions[this.type];
    }

    public static readAll(entry: DirectoryEntry, reader: BinaryFileReader): readonly ThingEntry[] {
        return entry.readAll(reader, (reader) => new ThingEntry(reader));
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
    public readonly things: readonly ThingEntry[];

    private readonly reader: BinaryFileReader

    constructor(reader: BinaryFileReader, name: string, entries: IMapDirectoryEntry) {
        this.reader = reader;
        this.name = name;
        this.entries = entries;
        this.vertexes = Vertex.readAll(entries.vertexes, reader);
        this.linedefs = LiknedefEntry.readAll(entries.linedefs, reader, this.vertexes);
        this.things = ThingEntry.readAll(entries.things, reader);
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
    public readonly wadInfo: WadInfo;
    public readonly directory: readonly DirectoryEntry[];
    public readonly maps: readonly MapEntry[];

    private readonly reader: BinaryFileReader;

    constructor(file: ArrayBuffer) {
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadInfo(this.reader);

        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.loadAll(this.reader, this.directory);
    }
}

class HitTester<TInfo> {
    // Storing in Int16Array to (hopefully...) improve memory locality and speed.
    private points: Int16Array | null = null;
    private index: number = 0;
    private infos: TInfo[] = [];
    private count: number = 0;

    public startUpdate(count: number): void {
        if (this.count < count) {
            this.points = new Int16Array(count * 3);
            this.infos = new Array(count);
        }

        this.index = 0;
        this.count = count;
    }

    public addPoint(x: i16, y: i16, radius: i16, info: TInfo): void {
        if (this.points == null) throw new Error("Object not initialized.");

        const pointsIndex = this.index * 3;

        this.points[pointsIndex] = x;
        this.points[pointsIndex + 1] = y;
        this.points[pointsIndex + 2] = radius;
        this.infos[this.index] = info;

        ++this.index;
    }

    public hitTest(x: i16, y: i16): {
        info: TInfo,
        index: number
    } | null {
        const points = this.points;
        if (points == null) return null;

        let pointIndex = 0;
        for (let i = 0; i < this.count; ++i) {
            const pointX = points[pointIndex++];
            const pointY = points[pointIndex++];
            const pointRadius = points[pointIndex++];

            const dx = Math.abs(pointX - x);
            if (dx > pointRadius) continue;

            const dy = Math.abs(pointY - y);
            if (dy > pointRadius) continue;

            if (Math.pow(dx, 2) + Math.pow(dy, 2) > Math.pow(pointRadius, 2)) continue;

            return { info: this.infos[i], index: i };
        }

        return null;
    }
}

class MapView {
    private readonly wad: Promise<WadFile>;
    private readonly thingHitTester = new HitTester<ThingEntry>();

    private scale = 1;
    private baseX: number;
    private baseY: number;
    private currentMap: MapEntry | undefined;
    private canvasWidth: number;
    private canvasHeight: number;
    private highlightedThingIndex: number = -1;
    private awaitingRender = false;
    private dashedStrokeOffset: number = 0;

    constructor(private readonly canvas: HTMLCanvasElement) {
        canvas.style.position = "fixed";
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;

        this.baseX = canvas.width / 2;
        this.baseY = canvas.height / 2;

        this.wad = new Promise<WadFile>((resolve, _reject) => {
            new UserFileInput(canvas, (file) => {
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

        window.addEventListener("resize", (_event) => {
            this.canvas.width  = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.canvasWidth = canvas.width;
            this.canvasHeight = canvas.height;
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
            const hitResult = this.thingHitTester.hitTest(event.offsetX, event.offsetY);
            const newHighlightedIndex = hitResult?.index ?? -1;
            if (this.highlightedThingIndex != newHighlightedIndex) {
                console.log(hitResult?.info, hitResult?.info?.description);
                this.highlightedThingIndex = newHighlightedIndex;
                this.dashedStrokeOffset = 0;
                this.redraw();
            }

            if (isMouseDown == false) return;

            if (lastMouseEvent != null) {
                this.baseX -= lastMouseEvent.offsetX - event.offsetX;
                this.baseY -= lastMouseEvent.offsetY - event.offsetY;
                this.redraw();
            }

            lastMouseEvent = event;
        });

        setInterval(() => {
            if (this.highlightedThingIndex == -1) return;
            --this.dashedStrokeOffset;
            this.redraw();
        }, 40);

        this.redraw();
    }

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
        const context = this.canvas.getContext("2d")!;
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        const map = this.currentMap;
        if (map == null) {
            context.font = "40px serif";
            const metrics = context.measureText("Drag & Drop WAD");
            const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            context.fillText(
                "Drag & Drop WAD",
                this.canvasWidth / 2 - metrics.width / 2,
                this.canvasHeight / 2 - actualHeight / 2,
                this.canvasWidth);
            return;
        }

        context.lineWidth = 1;
        for (const linedef of map.linedefs) {
            context.beginPath();
            context.strokeStyle = linedef.hasFlag(LinedefFlags.SECRET) ? "red" : "black";
            context.moveTo(linedef.vertexA.x * this.scale + this.baseX, linedef.vertexA.y * -1 * this.scale + this.baseY);
            context.lineTo(linedef.vertexB.x * this.scale + this.baseX, linedef.vertexB.y * -1 * this.scale + this.baseY);
            context.stroke();
        }

        let thingIndex = 0;
        this.thingHitTester.startUpdate(map.things.length);
        for (const thing of map.things) {
            if (thing.description == null) {
                console.info("Unknown thing type", thing);
                continue;
            }

            // Are the thing's x/y actually the centers?
            const centerX = thing.x * this.scale + this.baseX;
            const centerY = thing.y * -1 * this.scale + this.baseY;
            const radius = thing.description.radius * this.scale;

            const isHighlighted = thingIndex == this.highlightedThingIndex;
            this.thingHitTester.addPoint(centerX, centerY, radius, thing);
            ++thingIndex;

            if (isHighlighted) continue;

            if (thing.description.sprite == ThingSprite.BON1) {
                context.beginPath();
                context.fillStyle = "blue";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                context.fill();
            } else {
                context.beginPath();
                context.strokeStyle = "green";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                // context.moveTo(centerX, centerY);
                // const lineLength = thing.description.radius * this.scale * 2;
                // context.lineTo(
                context.stroke();
            }
        }

        // Draw last to allow the box to have highest Z order.
        if (this.highlightedThingIndex != -1) {
            const thing = map.things[this.highlightedThingIndex];

            const centerX = thing.x * this.scale + this.baseX;
            const centerY = thing.y * -1 * this.scale + this.baseY;
            const radius = thing.description!.radius * this.scale;

            context.beginPath();
            context.strokeStyle = "red";
            context.setLineDash([6 * this.scale, 6 * this.scale]);
            context.lineDashOffset = this.dashedStrokeOffset;
            context.arc(centerX, centerY, radius, 0, Math.PI * 2);
            context.stroke();
            context.setLineDash([]);

            context.beginPath();
            const boxX = centerX - radius;
            const boxY = centerY + radius;
            context.clearRect(boxX, boxY, 300, 100);
            context.rect(boxX, boxY, 300, 100);
            context.font = "12pt serif";
            context.fillStyle = "Black";
            context.fillText(thing.description?.description ?? "", boxX + 10, boxY + 10, 300);
            context.stroke();
        }
    }

    public async displayLevel(name: string): Promise<void> {
        const wad = await this.wad;
        this.currentMap = wad.maps.find((map) => map.name == name) ?? wad.maps[0];
        this.redraw();
    }
}

const el = document.querySelector<HTMLCanvasElement>("canvas")!;
const mapView = new MapView(el);
mapView.displayLevel("MAP01");
