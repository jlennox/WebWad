type u8 = number;
type u16 = number;
type u32 = number;
type i16 = number;

type number_t = u8 | u16 | u32 | i16;

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

    public pushPosition(newPosition?: number): void {
        this.storedPositions.push(this.position);
        if (newPosition !== undefined) {
            this.position = newPosition;
        }
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

    public readArray(length: number): Uint8Array {
        const array = this.u8.slice(this.position, this.position + length);
        this.position += length;
        return array;
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

class WadHeader {
    public readonly identifier: u32;
    public readonly numlumps: u32;
    public readonly infotableofs: u32;

    constructor(reader: BinaryFileReader) {
        this.identifier = reader.readU32();
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();
    }
}

class WadFile {
    public readonly wadInfo: WadHeader;
    public readonly directory: readonly DirectoryEntry[];
    public readonly maps: readonly MapEntry[];
    public readonly patches: Readonly<{[name: string]: PatchEntry}>;

    private readonly reader: BinaryFileReader;

    constructor(file: ArrayBuffer) {
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadHeader(this.reader);

        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.readAll(this, this.reader, this.directory);
        this.patches = PatchEntry.readAll(this, this.reader);
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
        this.description = Things.descriptions[this.type];

        if (this.description == null) {
            console.info("Unknown thing type", this);
        }
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

class LinedefEntry {
    public readonly vertexAIndex: u16;
    public readonly vertexBIndex: u16;
    public readonly flags: LinedefFlags; // u16
    public readonly linetype: u16;
    public readonly tag: u16;
    public readonly sidedefRightIndex: u16;
    public readonly sidedefLeftIndex: u16;

    public get vertexA(): Vertex { return this.map.vertexes[this.vertexAIndex]; }
    public get vertexB(): Vertex { return this.map.vertexes[this.vertexBIndex]; }
    public get sidedefRight(): SideDefEntry { return this.map.sidedefs[this.sidedefRightIndex]; }
    public get sidedefLeft(): SideDefEntry | null { return this.sidedefLeftIndex == 0xFFFF ? null : this.map.sidedefs[this.sidedefLeftIndex]; }

    constructor(private readonly map: MapEntry, reader: BinaryFileReader) {
        this.vertexAIndex = reader.readU16();
        this.vertexBIndex = reader.readU16();
        this.flags = reader.readU16();
        this.linetype = reader.readU16();
        this.tag = reader.readU16();
        this.sidedefRightIndex = reader.readU16();
        this.sidedefLeftIndex = reader.readU16();
    }

    public hasFlag(flag: LinedefFlags): boolean {
        return (this.flags & flag) == flag;
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly LinedefEntry[] {
        return entry.readAll(reader, (reader) => new LinedefEntry(map, reader));
    }
}

class SideDefEntry {
    public readonly xOffset: i16;
    public readonly yOffset: i16;
    public readonly textureNameUpper: string;
    public readonly textureNameLower: string;
    public readonly textureNameMiddle: string;
    public readonly sectorIndex: u16;

    public get textureUpper(): PatchEntry { return this.map.wadFile.patches[this.textureNameUpper]; }
    public get textureLower(): PatchEntry { return this.map.wadFile.patches[this.textureNameLower]; }
    public get textureMiddle(): PatchEntry { return this.map.wadFile.patches[this.textureNameMiddle]; }
    public get sector(): SectorEntry { return this.map.sectors[this.sectorIndex]; }

    constructor(private readonly map: MapEntry, reader: BinaryFileReader) {
        this.xOffset = reader.readI16();
        this.yOffset = reader.readI16();
        this.textureNameUpper = reader.readFixedLengthString(8);
        this.textureNameLower = reader.readFixedLengthString(8);
        this.textureNameMiddle = reader.readFixedLengthString(8);
        this.sectorIndex = reader.readU16();
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly SideDefEntry[] {
        return entry.readAll(reader, (reader) => new SideDefEntry(map, reader));
    }
}

class SectorEntry {
    public readonly floorHeight: i16;
    public readonly ceilingHeight: i16;
    public readonly textureNameFloor: string;
    public readonly textureNameCeiling: string;
    public readonly lightLevel: i16;
    public readonly specialType: i16;
    public readonly tag: i16;

    public get textureFloor(): PatchEntry { return this.map.wadFile.patches[this.textureNameFloor]; }
    public get textureCeiling(): PatchEntry { return this.map.wadFile.patches[this.textureNameCeiling]; }

    constructor(private readonly map: MapEntry, reader: BinaryFileReader) {
        this.floorHeight = reader.readI16();
        this.ceilingHeight = reader.readI16();
        this.textureNameFloor = reader.readFixedLengthString(8);
        this.textureNameCeiling = reader.readFixedLengthString(8);
        this.lightLevel = reader.readI16();
        this.specialType = reader.readI16();
        this.tag = reader.readI16();
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly SectorEntry[] {
        return entry.readAll(reader, (reader) => new SectorEntry(map, reader));
    }
}

class SegmentEntry {
    public readonly vertextStartIndex: i16;
    public readonly vertextEndIndex: i16;
    public readonly angle: i16;
    public readonly linedefIndex: i16;
    public readonly direction: i16; // Direction: 0 (same as linedef) or 1 (opposite of linedef)
    public readonly offset: i16; // Offset: distance along linedef to start of seg

    public get vertexes(): readonly Vertex[] { return this.map.vertexes.slice(this.vertextStartIndex, this.vertextEndIndex); }
    public get linedef(): LinedefEntry { return this.map.linedefs[this.linedefIndex]; }

    constructor(private readonly map: MapEntry, reader: BinaryFileReader) {
        this.vertextStartIndex = reader.readI16();
        this.vertextEndIndex = reader.readI16();
        this.angle = reader.readI16();
        this.linedefIndex = reader.readI16();
        this.direction = reader.readI16();
        this.offset = reader.readI16();
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly SegmentEntry[] {
        return entry.readAll(reader, (reader) => new SegmentEntry(map, reader));
    }
}

class SubSectorEntry {
    public readonly segCount: i16;
    public readonly firstSegIndex: i16;

    public readonly segments: readonly SegmentEntry[];

    constructor( map: MapEntry, reader: BinaryFileReader) {
        this.segCount = reader.readI16();
        this.firstSegIndex = reader.readI16();

        this.segments = map.segments.slice(this.firstSegIndex, this.segCount);
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly SubSectorEntry[] {
        return entry.readAll(reader, (reader) => new SubSectorEntry(map, reader));
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
    public readonly wadFile: WadFile;
    public readonly name: string;
    public readonly displayName: string;
    public readonly entries: IMapDirectoryEntry;
    public readonly vertexes: readonly Vertex[];
    public readonly linedefs: readonly LinedefEntry[];
    public readonly sidedefs: readonly SideDefEntry[];
    public readonly things: readonly ThingEntry[];
    public readonly segments: readonly SegmentEntry[];
    public readonly subSectors: readonly SubSectorEntry[];
    public readonly sectors: readonly SectorEntry[];

    private readonly reader: BinaryFileReader

    constructor(wadFile: WadFile, reader: BinaryFileReader, name: string, entries: IMapDirectoryEntry) {
        this.wadFile = wadFile;
        this.reader = reader;
        this.name = name;
        this.displayName = entries.map.name;
        this.entries = entries;
        this.vertexes = Vertex.readAll(entries.vertexes, reader);
        this.linedefs = LinedefEntry.readAll(this, entries.linedefs, reader);
        this.sidedefs = SideDefEntry.readAll(this, entries.sidedefs, reader);
        this.things = ThingEntry.readAll(entries.things, reader);
        this.segments = SegmentEntry.readAll(this, entries.segs, reader);
        this.subSectors = SubSectorEntry.readAll(this, entries.ssectors, reader);
        this.sectors = SectorEntry.readAll(this, entries.sectors, reader);
    }

    public getNodes(): readonly NodeEntry[] {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    }

    public static readAll(wadFile: WadFile, reader: BinaryFileReader, entries: readonly DirectoryEntry[]): readonly MapEntry[] {
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
                maps.push(new MapEntry(wadFile, reader, entry.name, {
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

        // This should really be parsing out the numbers, but they should happen to order correctly regardless due
        // to leading 0 padding.
        return maps.sort((a, b) => a.name < b.name ? -1 : 1);
    }
}

class PatchEntry {
    public readonly width: u16;
    public readonly height: u16;
    public readonly leftOffset: i16;
    public readonly topOffset: i16;
    public readonly columnofs: readonly u32[];
    public readonly posts: readonly PatchPostEntry[];

    constructor(reader: BinaryFileReader, directoryEntry: DirectoryEntry) {
        reader.position = directoryEntry.filepos;
        const relative = reader.position;
        this.width = reader.readU16();
        this.height = reader.readU16();
        this.leftOffset = reader.readI16();
        this.topOffset = reader.readI16();
        const columnofs: u32[] = [];
        for (let i = 0; i < this.width; ++i) {
            columnofs.push(reader.readU32());
        }
        this.columnofs = columnofs;
        // Save position at the end of the patch entry.
        reader.pushPosition();
        const posts: PatchPostEntry[] = [];
        for (const offset of columnofs) {
            reader.position = offset + relative;
            posts.push(new PatchPostEntry(reader));
        }
        this.posts = posts;
        reader.popPosition();
    }

    public static readAll(file: WadFile, reader: BinaryFileReader): Readonly<{[name: string]: PatchEntry}> {
        const patches: {[name: string]: PatchEntry} = {};

        const firstSpriteIndex = file.directory.findIndex((dir) => dir.name == "S_START" || dir.name == "SS_START");
        if (firstSpriteIndex == -1) return patches;

        for (let i = firstSpriteIndex + 1; i < file.directory.length; ++i) {
            const dir = file.directory[i];
            if (dir.name == "S_END" || dir.name == "SS_END") break;
            if (dir.size == 0) {
                console.info("Empty dir entry in sprite list?", dir);
                continue;
            }

            patches[dir.name] = new PatchEntry(reader, dir);
        }

        return patches;
    }
}

class PatchPostEntry {
    public readonly topdelta: u8;
    public readonly length: u8;
    // public readonly unused: u8;
    public readonly data: Uint8Array;
    // public readonly unused2: u8;

    constructor(reader: BinaryFileReader) {
        this.topdelta = reader.readU8();
        this.length = reader.readU8();
        reader.readU8(); // unused
        this.data = reader.readArray(this.length);
        reader.readU8(); // unused
    }
}
