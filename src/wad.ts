// Typing the numeric sizes wont enforce anything at the typing level, but it does
// help with code clarity.
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
        // Doing this might be pretty silly... the idea is it'll work for unaligned access, but I do not believe
        // unaligned access exists.
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

    public readU32Array(length: number): Uint32Array {
        const offset = this.position % 4;
        const start = (this.position - offset) / 4;
        const result = this.u32[offset].slice(start, start + length);
        this.position += length * 4;
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

    // There's no great way to case-insensitive compare in JavaScript and the cases are mixed between definitions
    // and references, so just read them as uppercase to be safe.
    public readFixedLengthStringUppercase(length: number): string {
        return this.readFixedLengthString(length).toUpperCase();
    }
}

enum WadIdentifier {
    IWAD = 0x44415749 as u32, // "IWAD"
    PWAD = 0x44415750 as u32, // "PWAD"
}

class WadHeader {
    public readonly identifier: WadIdentifier; // u32
    public readonly numlumps: u32;
    public readonly infotableofs: u32;

    constructor(reader: BinaryFileReader) {
        const identifier = reader.readU32();
        this.identifier = identifier as WadIdentifier;
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();

        if (identifier != WadIdentifier.IWAD && identifier != WadIdentifier.PWAD) {
            throw new Error(`Invalid WAD identifier ${identifier.toString(16).padStart(8, "0")}`);
        }
    }
}

// https://doomwiki.org/wiki/WAD
class WadFile {
    public readonly wadInfo: WadHeader;
    public readonly directory: readonly DirectoryEntry[];
    public readonly maps: readonly MapEntry[];
    public readonly patches: Map<string, PatchEntry>;
    public readonly flats: Map<string, FlatEntry>;
    public readonly palette: PaletteEntry;
    public readonly patchNameDirectory: Map<number, DirectoryEntry>;
    public readonly mapTextures: Map<string, MapTextureEntry>;
    private readonly imageDataCache = new Map<string, NamedImageData[]>();

    private readonly reader: BinaryFileReader;
    private readonly decodeImagesCache = new Map<string, DecodedImage>();
    private readonly directoryMap: Map<string, DirectoryEntry>;

    constructor(file: ArrayBuffer) {
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadHeader(this.reader);

        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.directoryMap = new Map(this.directory.map((entry) => [entry.name, entry]));

        this.maps = MapEntry.readAll(this, this.reader, this.directory);
        this.patches = PatchEntry.readAll(this, this.reader);
        this.palette = PaletteEntry.read(this, this.reader);
        this.flats = FlatEntry.readAll(this, this.reader);
        this.patchNameDirectory = PatchNamesEntry.read(this, this.reader);
        this.mapTextures = MapTextureEntry.readAll(this, this.reader);
    }

    public tryGetDirectoryEntry(name: LumpName | string): DirectoryEntry | undefined {
        return this.directoryMap.get(name);
    }

    public getDirectoryEntry(name: LumpName | string): DirectoryEntry {
        const lump = this.directoryMap.get(name);
        if (lump == null) throw new Error(`Lump "${name}" not found.`);
        return lump;
    }

    public tryGetImage(name: string): DecodedImage | undefined {
        const fromCache = this.decodeImagesCache.get(name);
        if (fromCache != null) return fromCache;

        const fromFlats = this.flats.get(name);
        if (fromFlats != null) {
            const data = fromFlats.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }

        const fromPatches = this.patches.get(name);
        if (fromPatches != null) {
            const data = fromPatches.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }

        const fromDirectoryMap = this.directoryMap.get(name);
        if (fromDirectoryMap != null) {
            const patch = new PatchEntry(this.reader, fromDirectoryMap);
            const data = patch.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }

        const fromMapTexture = this.mapTextures.get(name);
        if (fromMapTexture != null) {
            const data = fromMapTexture.decode(this);
            this.decodeImagesCache.set(name, data);
            return data;
        }

        return undefined;
    }

    public getImage(name: string, defaultImage?: DecodedImage): DecodedImage {
        const fromCache = this.tryGetImage(name);
        if (fromCache != null) return fromCache;

        // Cache unfound images so we don't spam the console with errors.
        console.error(`Image "${name}" not found`);
        const def = defaultImage ?? new DecodedImage(0, 0, new Uint8Array());
        this.decodeImagesCache.set(name, def);
        return def;
    }

    public getImageData(name: string | undefined): NamedImageData[] {
        if (name == null) return [];

        const cached = this.imageDataCache.get(name);
        if (cached != null) return cached;

        const images: NamedImageData[] = [];
        for (const patch of this.patches) {
            const patchName = patch[0];
            if (!patchName.startsWith(name)) continue;

            const image = this.getImage(patchName);
            const uint8 = new Uint8ClampedArray(image.pixels);
            const imageData = new ImageData(uint8, image.width, image.height) as NamedImageData;
            imageData.name = patchName;
            images.push(imageData);
        }

        this.imageDataCache.set(name, images);
        return images;
    }
}

interface NamedImageData extends ImageData {
    name: string;
}

class BoundingBox {
    public readonly top: i16;
    public readonly bottom: i16;
    public readonly left: i16;
    public readonly right: i16;

    public get width(): number { return this.right - this.left; }
    public get height(): number { return this.bottom - this.top; }

    constructor(top: number, bottom: number, left: number, right: number) {
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
    }
}

class BoundingBoxEntry extends BoundingBox {
    constructor(reader: BinaryFileReader) {
        super(reader.readI16(), reader.readI16(), reader.readI16(), reader.readI16());
    }
}

// https://doomwiki.org/wiki/Node
class NodeEntry {
    public readonly x: i16;
    public readonly y: i16;
    public readonly dx: i16;
    public readonly dy: i16;
    public readonly boundingBoxLeft: BoundingBoxEntry;
    public readonly boundingBoxRight: BoundingBoxEntry;
    public readonly rightChild: i16;
    public readonly leftChild: i16;

    constructor(reader: BinaryFileReader) {
        this.x = reader.readI16();
        this.y = reader.readI16();
        this.dx = reader.readI16();
        this.dy = reader.readI16();
        this.boundingBoxLeft = new BoundingBoxEntry(reader);
        this.boundingBoxRight = new BoundingBoxEntry(reader);
        this.rightChild = reader.readI16();
        this.leftChild = reader.readI16();
    }

    public static loadAll(reader: BinaryFileReader, nodeEntry: DirectoryEntry): readonly NodeEntry[] {
        return nodeEntry.readAll(reader, (reader) => new NodeEntry(reader));
    }
}

enum LumpName {
    PLAYPAL = "PLAYPAL",
    PNAMES = "PNAMES",
    TEXTURE1 = "TEXTURE1",
    TEXTURE2 = "TEXTURE2",
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
        this.name = reader.readFixedLengthStringUppercase(8);
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
        while (reader.position < end) {
            results.push(read(reader));
        }

        reader.popPosition();
        return results;
    }
}

class Vertex {
    constructor(
        public readonly x: i16,
        public readonly y: i16,
    ) {}

    private static read(reader: BinaryFileReader) {
        return new Vertex(reader.readI16(), reader.readI16());
    }

    public static readAll(entry: DirectoryEntry, reader: BinaryFileReader): readonly Vertex[] {
        return entry.readAll(reader, (reader) => Vertex.read(reader));
    }

    public static areEqual(a: Vertex, b: Vertex): boolean {
        return a.x == b.x && a.y == b.y;
    }

    public subtract(other: Vertex): Vertex {
        return new Vertex(this.x - other.x, this.y - other.y);
    }

    public dot(other: Vertex): number {
        return this.x * other.x + this.y * other.y;
    }

    public cross(other: Vertex): number {
        return this.x * other.y - this.y * other.x;
    }

    public toString(): string {
        return `(${this.x},${this.y})`;
    }

    public pack(): number {
        // Mask a to avoid sign bleed.
        return (this.x & 0xFFFF) | (this.y << 16);
    }

    public static unpack(packed: number): Vertex {
        const x = (packed << 16) >> 16;
        const y = packed >> 16;
        return new Vertex(x, y);
    }
}

class SkillLevel {
    private constructor() { }

    public static getDescrption(level: number): string {
        switch (level) {
            case 1: return "I'm too young to die.";
            case 2: return "Hey, not too rough";
            case 3: return "Hurt me plenty.";
            case 4: return "Ultra-Violence";
            case 5: return "Nightmare!";
        }

        throw new Error(`Unknown skill level ${level}.`);
    }
}

enum SpawnFlags {
    SkillLevels1And2 = 0x0001,
    SkillLevel3 = 0x0002,
    SkillLevel4and5 = 0x0004,
    Deaf = 0x0008,
    MultiplayerOnly = 0x0010,
    NotInDeathmatch = 0x0020, // Boom
    NotInCooperative = 0x0040, // Boom
    FriendlyMonster = 0x0080, // MBF
}

// https://doomwiki.org/wiki/Thing
class ThingEntry {
    public readonly x: i16;
    public readonly y: i16;
    public readonly angle: u16; // 0 = east, 64 = north, 128 = west, 192 = south
    public readonly type: u16 | ThingsType;
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

    public hasFlag(spawnFlag: SpawnFlags): boolean {
        return (this.spawnFlags & spawnFlag) == spawnFlag;
    }
}

const enum LinedefFlags {
    None = 0,
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

// https://doomwiki.org/wiki/Linedef
class LinedefEntry {
    private static readonly invalidSideDefIndex = 0xFFFF;

    public get hasSidedefBack() { return this.sidedefBackIndex != LinedefEntry.invalidSideDefIndex; }
    public get vertexA(): Vertex { return this.map.vertexes[this.vertexAIndex]; }
    public get vertexB(): Vertex { return this.map.vertexes[this.vertexBIndex]; }
    public get sidedefFont(): SideDefEntry { return this.map.sidedefs[this.sidedefFrontIndex]; }
    public get sidedefBack(): SideDefEntry | undefined { return this.hasSidedefBack ? this.map.sidedefs[this.sidedefBackIndex] : undefined; }

    constructor(
        public readonly map: MapEntry,
        public readonly vertexAIndex: u16,
        public readonly vertexBIndex: u16,
        public readonly flags: LinedefFlags, // u16
        public readonly linetype: u16,
        public readonly tag: u16,
        public readonly sidedefFrontIndex: u16,
        public readonly sidedefBackIndex: u16,
    ) {}

    public static read(map: MapEntry, reader: BinaryFileReader): LinedefEntry {
        return new LinedefEntry(
            map,
            reader.readU16(),
            reader.readU16(),
            reader.readU16(),
            reader.readU16(),
            reader.readU16(),
            reader.readU16(),
            reader.readU16());
    }

    public hasFlag(flag: LinedefFlags): boolean {
        return (this.flags & flag) == flag;
    }

    public tryReverse(): LinedefEntry | undefined {
        if (!this.hasSidedefBack) return undefined;

        return new LinedefEntry(
            this.map, this.vertexBIndex, this.vertexAIndex, this.flags,
            this.linetype, this.tag, this.sidedefBackIndex, this.sidedefFrontIndex);
    }

    public toString(): string {
        return `${this.vertexA}->${this.vertexB}`;
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly LinedefEntry[] {
        return entry.readAll(reader, (reader) => LinedefEntry.read(map, reader));
    }

    public static areEqual(a: LinedefEntry, b: LinedefEntry): boolean {
        return Vertex.areEqual(a.vertexA, b.vertexA) && Vertex.areEqual(a.vertexB, b.vertexB);
    }

    public static getBoundingBox(linedefs: readonly LinedefEntry[]): BoundingBox {
        let x = Number.POSITIVE_INFINITY;
        let y = Number.POSITIVE_INFINITY;
        let dx = Number.NEGATIVE_INFINITY;
        let dy = Number.NEGATIVE_INFINITY;

        for (const linedef of linedefs) {
            x = Math.min(x, linedef.vertexA.x, linedef.vertexB.x);
            y = Math.min(y, linedef.vertexA.y, linedef.vertexB.y);
            dx = Math.max(dx, linedef.vertexA.x, linedef.vertexB.x);
            dy = Math.max(dy, linedef.vertexA.y, linedef.vertexB.y);
        }

        if (x == Number.POSITIVE_INFINITY ||
            y == Number.POSITIVE_INFINITY ||
            dx == Number.NEGATIVE_INFINITY ||
            dy == Number.NEGATIVE_INFINITY)
        {
            throw new Error("Invalid bounds");
        }

        return new BoundingBox(y, dy, x, dx);
    }
}

// https://doomwiki.org/wiki/Sidedef
class SideDefEntry {
    public readonly textureXOffset: i16;
    public readonly textureYOffset: i16;
    public readonly textureNameUpper: string;
    public readonly textureNameLower: string;
    public readonly textureNameMiddle: string;
    public readonly sectorIndex: u16;

    public get textureUpper(): DecodedImage { return this.map.wadFile.getImage(this.textureNameUpper); }
    public get textureLower(): DecodedImage { return this.map.wadFile.getImage(this.textureNameLower); }
    public get textureMiddle(): DecodedImage { return this.map.wadFile.getImage(this.textureNameMiddle); }
    public get sector(): SectorEntry { return this.map.sectors[this.sectorIndex]; }

    constructor(private readonly map: MapEntry, reader: BinaryFileReader) {
        this.textureXOffset = reader.readI16();
        this.textureYOffset = reader.readI16();
        this.textureNameUpper = reader.readFixedLengthStringUppercase(8);
        this.textureNameLower = reader.readFixedLengthStringUppercase(8);
        this.textureNameMiddle = reader.readFixedLengthStringUppercase(8);
        this.sectorIndex = reader.readU16();
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly SideDefEntry[] {
        return entry.readAll(reader, (reader) => new SideDefEntry(map, reader));
    }
}

// https://doomwiki.org/wiki/Sector
class SectorEntry {
    public readonly floorHeight: i16;
    public readonly ceilingHeight: i16;
    public readonly textureNameFloor: string;
    public readonly textureNameCeiling: string;
    public readonly lightLevel: i16;
    public readonly specialType: i16;
    public readonly tag: i16;

    public get textureFloor(): DecodedImage { return this.map.wadFile.getImage(this.textureNameFloor); }
    public get textureCeiling(): DecodedImage { return this.map.wadFile.getImage(this.textureNameCeiling); }

    constructor(private readonly map: MapEntry, reader: BinaryFileReader) {
        this.floorHeight = reader.readI16();
        this.ceilingHeight = reader.readI16();
        this.textureNameFloor = reader.readFixedLengthStringUppercase(8);
        this.textureNameCeiling = reader.readFixedLengthStringUppercase(8);
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

    constructor(map: MapEntry, reader: BinaryFileReader) {
        this.segCount = reader.readI16();
        this.firstSegIndex = reader.readI16();

        this.segments = map.segments.slice(this.firstSegIndex, this.firstSegIndex + this.segCount);
    }

    public static readAll(map: MapEntry, entry: DirectoryEntry, reader: BinaryFileReader): readonly SubSectorEntry[] {
        return entry.readAll(reader, (reader) => new SubSectorEntry(map, reader));
    }
}

const enum MapEntryName {
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

type LinedefsPerSector = Readonly<{[sectorIndex: number]: readonly LinedefEntry[]}>;

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

    public readonly linedefsPerSector: LinedefsPerSector;

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
        this.linedefsPerSector = MapEntry.getLinedefsPerSector(this.linedefs);
    }

    private static getLinedefsPerSector(linedefs: readonly LinedefEntry[]): LinedefsPerSector {
        const linedefsPerSector: {[sectorIndex: number]: LinedefEntry[]} = {};
        for (const linedef of linedefs) {
            if (linedef.vertexB.x == 448 && linedef.vertexB.y == 960) {
                console.log("found", linedef);
            }
            for (const sidedef of [linedef.sidedefBack, linedef.sidedefFont]) {
                if (sidedef == null) continue;

                let linedefs = linedefsPerSector[sidedef.sectorIndex];
                if (linedefs == null) {
                    linedefs = [];
                    linedefsPerSector[sidedef.sectorIndex] = linedefs;
                }

                linedefs.push(linedef);
            }
        }
        return linedefsPerSector;
    }

    public getNodes(): readonly NodeEntry[] {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    }

    public findSector(x: number, y: number): SectorEntry | undefined {
        for (const [sectorIndex, linedefs] of Object.entries(this.linedefsPerSector)) {
            let crossings = 0;
            for (const linedef of linedefs) {
                const ax = linedef.vertexA.x;
                const ay = linedef.vertexA.y;
                const bx = linedef.vertexB.x;
                const by = linedef.vertexB.y;
                if ((ay > y) != (by > y)) {
                    const xIntersect = ax + (y - ay) * (bx - ax) / (by - ay);
                    if (x < xIntersect) crossings++;
                }
            }

            if (crossings % 2 == 1) {
                const sector = this.sectors[parseInt(sectorIndex)];
                return sector;
            }
        }
        return undefined;
    }

    public static readAll(
        wadFile: WadFile,
        reader: BinaryFileReader,
        entries: readonly DirectoryEntry[]
    ): readonly MapEntry[] {
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
        return maps.sort((a, b) => a.name.localeCompare(b.name));
    }
}

class DecodedImage {
    constructor(
        public readonly width: number,
        public readonly height: number,
        public readonly pixels: Uint8Array)
    {}
}

// https://doomwiki.org/wiki/Flat
class FlatEntry {
    private static readonly width = 64;
    private static readonly height = 64;

    public static readonly default = FlatEntry.magentaCheckerBoard();

    public readonly pixels: Uint8Array;

    constructor(reader: BinaryFileReader, directoryEntry: DirectoryEntry) {
        reader.pushPosition(directoryEntry.filepos);
        this.pixels = reader.readArray(FlatEntry.width * FlatEntry.height);
        reader.popPosition();
    }

    public decode(palette: PaletteEntry): DecodedImage {
        const buffer = new ArrayBuffer(FlatEntry.width * FlatEntry.height * 4);
        const decodedPixels = new Uint32Array(buffer);
        for (let i = 0; i < FlatEntry.width * FlatEntry.height; ++i) {
            decodedPixels[i] = palette.palette[this.pixels[i]];
        }

        return new DecodedImage(FlatEntry.width, FlatEntry.height, new Uint8Array(buffer));
    }

    public static readAll(file: WadFile, reader: BinaryFileReader): Map<string, FlatEntry> {
        const flats = new Map<string, FlatEntry>();
        const startIndex = file.directory.findIndex((dir) => dir.name == "F_START" || dir.name == "FF_START");
        if (startIndex == -1) return flats;

        for (let i = startIndex + 1; i < file.directory.length; ++i) {
            const dir = file.directory[i];
            if (dir.name == "F_END" || dir.name == "FF_END") break;
            if (dir.size != 4096) continue;
            flats.set(dir.name, new FlatEntry(reader, dir));
        }

        return flats;
    }

    private static magentaCheckerBoard(): DecodedImage {
        const pixels = new Uint8Array(FlatEntry.width * FlatEntry.height * 4);
        for (let i = 0; i < FlatEntry.width * FlatEntry.height; ++i) {
            const checker = ((i % 64) ^ Math.floor(i / 64)) & 8;
            const offset = i * 4;
            pixels[offset] = checker ? 255 : 128;
            pixels[offset + 1] = 0;
            pixels[offset + 2] = checker ? 255 : 128;
            pixels[offset + 3] = 255;
        }

        return new DecodedImage(FlatEntry.width, FlatEntry.height, pixels);
    }
}

// https://doomwiki.org/wiki/Picture_format
class PatchEntry {
    public readonly width: u16;
    public readonly height: u16;
    public readonly leftOffset: i16;
    public readonly topOffset: i16;
    public readonly columnofs: Uint32Array;
    public readonly columns: readonly PatchColumn[];

    constructor(reader: BinaryFileReader, directoryEntry: DirectoryEntry) {
        reader.position = directoryEntry.filepos;
        const relative = reader.position;
        this.width = reader.readU16();
        this.height = reader.readU16();
        this.leftOffset = reader.readI16();
        this.topOffset = reader.readI16();
        this.columnofs = reader.readU32Array(this.width);

        reader.pushPosition();
        const columns: PatchColumn[] = [];
        for (const offset of this.columnofs) {
            reader.position = offset + relative;
            // Each column is a list of posts terminated by a 0xFF topdelta.
            const posts: PatchPostEntry[] = [];
            while (true) {
                const topdelta = reader.readU8();
                if (topdelta == 0xFF) break;
                const length = reader.readU8();
                reader.readU8(); // unused padding
                const data = reader.readArray(length);
                reader.readU8(); // unused padding
                posts.push(new PatchPostEntry(topdelta, length, data));
            }
            columns.push(new PatchColumn(posts));
        }
        this.columns = columns;
        reader.popPosition();
    }

    public static readAll(file: WadFile, reader: BinaryFileReader): Map<string, PatchEntry> {
        const patches = new Map<string, PatchEntry>();

        const firstSpriteIndex = file.directory.findIndex((dir) => dir.name == "S_START" || dir.name == "SS_START");
        if (firstSpriteIndex == -1) return patches;

        for (let i = firstSpriteIndex + 1; i < file.directory.length; ++i) {
            const dir = file.directory[i];
            if (dir.name == "S_END" || dir.name == "SS_END") break;
            if (dir.size == 0) {
                console.info("Empty dir entry in sprite list?", dir);
                continue;
            }

            patches.set(dir.name, new PatchEntry(reader, dir));
        }

        return patches;
    }

    public decode(palette: PaletteEntry): DecodedImage {
        const buffer = new ArrayBuffer(this.width * this.height * 4);
        const pixels = new Uint32Array(buffer);

        for (let x = 0; x < this.width; ++x) {
            const column = this.columns[x];
            for (const post of column.posts) {
                let destY = post.topdelta * this.width + x;
                for (let y = 0; y < post.length; ++y, destY += this.width) {
                    pixels[destY] = palette.palette[post.data[y]];
                }
            }
        }

        return new DecodedImage(this.width, this.height, new Uint8Array(buffer));
    }
}

class PatchColumn {
    constructor(public readonly posts: readonly PatchPostEntry[]) {}
}

class PatchPostEntry {
    constructor(
        public readonly topdelta: u8,
        public readonly length: u8,
        public readonly data: Uint8Array,
    ) {}
}

// https://doomwiki.org/wiki/PLAYPAL
class PaletteEntry {
    public readonly palette: Uint32Array;

    constructor(reader: BinaryFileReader, directoryEntry: DirectoryEntry) {
        reader.position = directoryEntry.filepos;
        this.palette = new Uint32Array(256);
        // Leave index 0 as transparent, since that's how the game treats it.
        for (let i = 0; i < 256; ++i) {
            const r = reader.readU8();
            const g = reader.readU8();
            const b = reader.readU8();
            const a = 255;
            this.palette[i] = (a << 24) | (b << 16) | (g << 8) | r;
        }
    }

    public static read(file: WadFile, reader: BinaryFileReader): PaletteEntry {
        return new PaletteEntry(reader, file.getDirectoryEntry(LumpName.PLAYPAL));
    }
}

// https://doomwiki.org/wiki/PNAMES
class PatchNamesEntry {
    public readonly names: readonly string[];

    constructor(reader: BinaryFileReader, directoryEntry: DirectoryEntry) {
        reader.position = directoryEntry.filepos;

        const count = reader.readU32();
        const names = new Array(count);
        for (let i = 0; i < count; ++i) {
            names[i] = reader.readFixedLengthStringUppercase(8);
        }

        this.names = names;
    }

    public static read(file: WadFile, reader: BinaryFileReader): Map<number, DirectoryEntry> {
        const entry = file.getDirectoryEntry(LumpName.PNAMES);
        const patchNamesEntry = new PatchNamesEntry(reader, entry);

        // Build a lookup from the full directory using the FIRST match per name,
        // since directoryMap can clobber patches with later same-named map lumps.
        const firstByName = new Map<string, DirectoryEntry>();
        for (const dirEntry of file.directory) {
            if (!firstByName.has(dirEntry.name)) {
                firstByName.set(dirEntry.name, dirEntry);
            }
        }

        const map = new Map<number, DirectoryEntry>();
        for (let i = 0; i < patchNamesEntry.names.length; ++i) {
            const name = patchNamesEntry.names[i];
            const dirEntry = firstByName.get(name);
            if (dirEntry == null) {
                console.warn(`PNAMES[${i}]: patch "${name}" not found in directory`);
                continue;
            }
            map.set(i, dirEntry);
        }

        return map;
    }
}

class TextureEntry {
    public readonly count: u32;
    public readonly offsets: Uint32Array;
    public readonly textures: readonly MapTextureEntry[];

    constructor(reader: BinaryFileReader, directoryEntry: DirectoryEntry) {
        reader.position = directoryEntry.filepos;

        this.count = reader.readU32();
        this.offsets = reader.readU32Array(this.count);

        const textures = new Array<MapTextureEntry>(this.count);
        for (let i = 0; i < this.count; ++i) {
            reader.position = this.offsets[i] + directoryEntry.filepos;
            textures[i] = new MapTextureEntry(reader);
        }

        this.textures = textures;
    }
}

// https://doomwiki.org/wiki/TEXTURE1_and_TEXTURE2
class MapTextureEntry {
    public readonly name: string;
    public readonly masked: boolean;
    public readonly width: u16;
    public readonly height: u16;
    public readonly patchCount: u16;
    public readonly patches: readonly MapTexturePatchEntry[];

    constructor(reader: BinaryFileReader) {
        this.name = reader.readFixedLengthStringUppercase(8);
        this.masked = reader.readU32() != 0;
        this.width = reader.readU16();
        this.height = reader.readU16();
        reader.readU32(); // unused
        this.patchCount = reader.readU16();

        const patches = new Array<MapTexturePatchEntry>(this.patchCount);
        for (let i = 0; i < this.patchCount; ++i) {
            patches[i] = new MapTexturePatchEntry(reader);
        }

        this.patches = patches;
    }

    public static readAll(file: WadFile, reader: BinaryFileReader): Map<string, MapTextureEntry> {
        const map = new Map<string, MapTextureEntry>();

        for (const lumpName of [LumpName.TEXTURE1, LumpName.TEXTURE2]) {
            const entry = file.tryGetDirectoryEntry(lumpName);
            if (entry == null) continue;

            const textureEntry = new TextureEntry(reader, entry);
            for (const texture of textureEntry.textures) {
                map.set(texture.name, texture);
            }
        }

        return map;
    }

    public decode(wadFile: WadFile): DecodedImage {
        const buffer = new ArrayBuffer(this.width * this.height * 4);
        const pixels = new Uint32Array(buffer);

        for (const patch of this.patches) {
            const pname = wadFile.patchNameDirectory.get(patch.patchNameIndex);
            if (pname == null) {
                console.error(`Missing patch name for index ${patch.patchNameIndex}.`);
                continue;
            }

            const source = wadFile.getImage(pname.name, FlatEntry.default);
            const sourceU32 = new Uint32Array(source.pixels.buffer);
            let sourceIndex = 0;
            for (let y = 0; y < source.height; ++y) {
                const destY = patch.originY + y;
                if (destY < 0 || destY >= this.height) {
                    sourceIndex += source.width;
                    continue;
                }

                let destIndex = destY * this.width + patch.originX;
                for (let x = 0; x < source.width; ++x, ++destIndex, ++sourceIndex) {
                    const destX = patch.originX + x;
                    if (destX < 0 || destX >= this.width) continue;

                    const pixel = sourceU32[sourceIndex];
                    if ((pixel & 0xFF000000) == 0) continue; // transparent

                    pixels[destIndex] = pixel;
                }
            }
        }

        return new DecodedImage(this.width, this.height, new Uint8Array(buffer));
    }
}

class MapTexturePatchEntry {
    public readonly originX: i16;
    public readonly originY: i16;
    public readonly patchNameIndex: i16;
    public readonly stepdir: i16; // unused
    public readonly colormap: i16; // unused

    constructor(reader: BinaryFileReader) {
        this.originX = reader.readI16();
        this.originY = reader.readI16();
        this.patchNameIndex = reader.readU16();
        this.stepdir = reader.readI16();
        this.colormap = reader.readI16();
    }
}
