type u8 = number;
type u16 = number;
type u32 = number;
type i16 = number;

type number_t = u8 | u16 | u32 | i16;

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
    private readonly u16: Uint16Array;
    private readonly u32: Uint32Array;
    private readonly i16: Int16Array;

    private readonly storedPositions: number[] = [];

    private static readonly textDecoder = new TextDecoder("us-ascii"); // Correct encoding?

    constructor(file: ArrayBuffer) {
        this.u8 = new Uint8Array(file);
        this.u16 = new Uint16Array(file);
        this.u32 = new Uint32Array(file);
        this.i16 = new Int16Array(file);
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
        if (this.position % 2 != 0) {
            throw new Error(`Unalign i32 read attempt: ${this.position}`);
        }

        const result = this.u16[this.position / 2];
        this.position += 2;
        return result;
    }

    public readU32(): u32 {
        if (this.position % 4 != 0) {
            throw new Error(`Unalign u32 read attempt: ${this.position}`);
        }

        const result = this.u32[this.position / 4];
        this.position += 4;
        return result;
    }

    public readI16(): i16 {
        if (this.position % 2 != 0) {
            throw new Error(`Unalign i32 read attempt: ${this.position}`);
        }

        const result = this.i16[this.position / 2];
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

const somePromise = Promise.resolve("hello world");
async function foobar() {
    console.log("entrance");
    console.log(await somePromise);
    console.log("exit");
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

    constructor(element: HTMLCanvasElement) {
        this.baseX = element.width / 2;
        this.baseY = element.height / 2;

        this.wad = new Promise<WadFile>((resolve, _reject) => {
            new UserFileReader(element, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });
    }

    public async displayLevel(name: string): Promise<void> {
        const wad = await this.wad;
        const nodes = wad.maps[0].linedefs;
        const context = el.getContext("2d")!;
        context.lineWidth = 1;
        context.beginPath();
        context.strokeStyle = "green";
        for (const node of nodes) {
            context.moveTo(node.vertexA.x + this.baseX, node.vertexA.y + this.baseY);
            context.lineTo(node.vertexB.x + this.baseX, node.vertexB.y + this.baseY);
        }
        context.stroke();
    }
}

const el = document.querySelector<HTMLCanvasElement>(".loadingzone")!;
new UserFileReader(el, (file) => {
    const wad = new WadFile(file);
    console.log("wad", wad);
    const nodes = wad.maps[0].linedefs;
    console.log("nodes", nodes);
    const context = el.getContext("2d")!;
    const baseX = 200, baseY = 200;
    context.lineWidth = 1;
    context.beginPath();
    context.strokeStyle = "green";
    for (const node of nodes) {
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
