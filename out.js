"use strict";
class HitTester {
    // Storing in Int16Array to (hopefully...) improve memory locality and speed.
    points = null;
    index = 0;
    infos = [];
    count = 0;
    constructor() { }
    startUpdate(count) {
        if (this.count < count) {
            this.points = new Int16Array(count * 3 /* PointIndex.NumberOfEntries */);
            this.infos = new Array(count);
        }
        this.index = 0;
        this.count = count;
    }
    addPoint(x, y, radius, info) {
        if (this.points == null)
            throw new Error("Object not initialized.");
        const pointsIndex = this.index * 3;
        this.points[pointsIndex + 0 /* PointIndex.x */] = x;
        this.points[pointsIndex + 1 /* PointIndex.y */] = y;
        this.points[pointsIndex + 2 /* PointIndex.radius */] = radius;
        this.infos[this.index] = info;
        ++this.index;
    }
    hitTest(matrix, x, y) {
        const points = this.points;
        if (points == null)
            return null;
        const translated = new DOMPoint(x, y).matrixTransform(matrix.inverse());
        let pointIndex = 0;
        for (let i = 0; i < this.count; ++i) {
            const pointX = points[pointIndex + 0 /* PointIndex.x */];
            const pointY = points[pointIndex + 1 /* PointIndex.y */];
            const pointRadius = points[pointIndex + 2 /* PointIndex.radius */];
            pointIndex += 3 /* PointIndex.NumberOfEntries */;
            const dx = Math.abs(pointX - translated.x);
            if (dx > pointRadius)
                continue;
            const dy = Math.abs(pointY - translated.y);
            if (dy > pointRadius)
                continue;
            if (Math.pow(dx, 2) + Math.pow(dy, 2) > Math.pow(pointRadius, 2))
                continue;
            return { info: this.infos[i], index: i };
        }
        return null;
    }
}
class Matrix {
    static vectexMultiply(m, v) {
        return {
            x: m.a * v.x + m.c * v.y + m.e,
            y: m.b * v.x + m.d * v.y + m.f
        };
    }
}
class Triangulation {
    // Rectangles are a compromise because floors require triangles.
    // This exists for experimental types of rendering that require rectangles.
    static getRectangles(map) {
        let rectangles = [];
        for (const linedef of map.linedefs) {
            const a = linedef.vertexA;
            const b = linedef.vertexB;
            const sectorLeft = linedef.sidedefLeft?.sector;
            const sectorRight = linedef.sidedefRight?.sector;
            if (sectorLeft == null || sectorRight == null) {
                // Single-sided wall: full wall from floor to ceiling.
                const sector = sectorLeft ?? sectorRight;
                if (sector == null)
                    continue;
                rectangles.push({
                    x: { x: a.x, y: a.y, z: sector.floorHeight },
                    y: { x: a.x, y: a.y, z: sector.ceilingHeight },
                    x2: { x: b.x, y: b.y, z: sector.floorHeight },
                    y2: { x: b.x, y: b.y, z: sector.ceilingHeight }
                });
            }
            else {
                // Two-sided wall: draw walls where heights differ.
                var lowerFloor = Math.min(sectorLeft.floorHeight, sectorRight.floorHeight);
                var upperFloor = Math.max(sectorLeft.floorHeight, sectorRight.floorHeight);
                var lowerCeiling = Math.min(sectorLeft.ceilingHeight, sectorRight.ceilingHeight);
                var upperCeiling = Math.max(sectorLeft.ceilingHeight, sectorRight.ceilingHeight);
                // Lower wall (step-up between different floor heights).
                if (upperFloor > lowerFloor) {
                    rectangles.push({
                        x: { x: a.x, y: a.y, z: lowerFloor },
                        y: { x: a.x, y: a.y, z: upperFloor },
                        x2: { x: b.x, y: b.y, z: lowerFloor },
                        y2: { x: b.x, y: b.y, z: upperFloor }
                    });
                }
                // Upper wall (between different ceiling heights).
                if (upperCeiling > lowerCeiling) {
                    rectangles.push({
                        x: { x: a.x, y: a.y, z: lowerCeiling },
                        y: { x: a.x, y: a.y, z: upperCeiling },
                        x2: { x: b.x, y: b.y, z: lowerCeiling },
                        y2: { x: b.x, y: b.y, z: upperCeiling }
                    });
                }
            }
        }
        for (const [sectorIndex, linedefs] of Object.entries(map.linedefsPerSector)) {
            const vertices = [];
            const usedVertixes = new Set();
            for (const linedef of linedefs) {
                for (const vertex of [linedef.vertexA, linedef.vertexB]) {
                    const vertexValue = (vertex.x << 16) | vertex.y;
                    if (!usedVertixes.has(vertexValue)) {
                        usedVertixes.add(vertexValue);
                        vertices.push(vertex);
                    }
                }
            }
            const sector = map.sectors[parseInt(sectorIndex)];
            const floorHeight = sector.floorHeight;
            let x = Number.POSITIVE_INFINITY;
            let y = Number.POSITIVE_INFINITY;
            let dx = Number.NEGATIVE_INFINITY;
            let dy = Number.NEGATIVE_INFINITY;
            for (const linedef of linedefs) {
                x = Math.min(x, linedef.vertexA.x);
                x = Math.min(x, linedef.vertexB.x);
                y = Math.min(y, linedef.vertexA.y);
                y = Math.min(y, linedef.vertexB.y);
                dx = Math.max(dx, linedef.vertexA.x);
                dx = Math.max(dx, linedef.vertexB.x);
                dy = Math.max(dy, linedef.vertexA.y);
                dy = Math.max(dy, linedef.vertexB.y);
            }
            if (x == Number.POSITIVE_INFINITY ||
                y == Number.POSITIVE_INFINITY ||
                dx == Number.NEGATIVE_INFINITY ||
                dy == Number.NEGATIVE_INFINITY) {
                continue;
            }
            rectangles.push({
                x: { x: x, y: y, z: floorHeight },
                y: { x: x, y: dy, z: floorHeight },
                x2: { x: dx, y: y, z: floorHeight },
                y2: { x: dx, y: dy, z: floorHeight },
                textureName: sector.textureNameFloor,
                lightLevel: sector.lightLevel,
            });
            // Ceiling. Skip sky textures.
            if (sector.textureNameCeiling != "F_SKY1") {
                rectangles.push({
                    x: { x: x, y: y, z: sector.ceilingHeight },
                    y: { x: x, y: dy, z: sector.ceilingHeight },
                    x2: { x: dx, y: y, z: sector.ceilingHeight },
                    y2: { x: dx, y: dy, z: sector.ceilingHeight },
                    textureName: sector.textureNameCeiling,
                    lightLevel: sector.lightLevel,
                });
            }
        }
        return rectangles;
    }
    static rectToTriangleHorizontal(triangles, x, y, x2, y2, z) {
        const bl = { x: x, y: y, z: z };
        const tl = { x: x, y: y2, z: z };
        const br = { x: x2, y: y, z: z };
        const tr = { x: x2, y: y2, z: z };
        triangles.push({ v1: bl, v2: tl, v3: br });
        triangles.push({ v1: tr, v2: tl, v3: br });
    }
    static rectToTriangleVertical(triangles, x, y, x2, y2, z, z2) {
        const bl = { x: x, y: y, z: z };
        const br = { x: x, y: y, z: z2 };
        const tl = { x: x2, y: y2, z: z };
        const tr = { x: x2, y: y2, z: z2 };
        triangles.push({ v1: br, v2: bl, v3: tr });
        triangles.push({ v1: bl, v2: tl, v3: tr });
    }
    static rectToTriangle(triangles, rect) {
        if (rect.x.z == rect.x2.z) {
            Triangulation.rectToTriangleHorizontal(triangles, rect.x.x, rect.x.y, rect.x2.x, rect.y2.y, rect.x.z);
        }
        else {
            Triangulation.rectToTriangleVertical(triangles, rect.x.x, rect.x.y, rect.x2.x, rect.x2.y, rect.x.z, rect.x2.z);
        }
    }
    static getStl(triangles) {
        let stlString = "solid doom_map\n";
        for (let triangle of triangles) {
            const { v1, v2, v3 } = triangle;
            stlString += `facet normal 0 0 0\n`;
            stlString += `    outer loop\n`;
            stlString += `        vertex ${v1.x} ${v1.y} ${v1.z}\n`;
            stlString += `        vertex ${v2.x} ${v2.y} ${v2.z}\n`;
            stlString += `        vertex ${v3.x} ${v3.y} ${v3.z}\n`;
            stlString += `    endloop\n`;
            stlString += `endfacet\n`;
        }
        stlString += "endsolid doom_map\n";
        return stlString;
    }
}
class Things {
    static descriptions = {
        1: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": 0 /* ThingsClass.None */,
            "description": "Player 1 start"
        },
        2: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": 0 /* ThingsClass.None */,
            "description": "Player 2 start"
        },
        3: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": 0 /* ThingsClass.None */,
            "description": "Player 3 start"
        },
        4: {
            "version": "S",
            "radius": 16,
            "height": 56,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "A+",
            "class": 0 /* ThingsClass.None */,
            "description": "Player 4 start"
        },
        5: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BKEY" /* ThingSprite.BKEY */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Blue keycard"
        },
        6: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "YKEY" /* ThingSprite.YKEY */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Yellow keycard"
        },
        7: {
            "version": "R",
            "radius": 128,
            "height": 100,
            "sprite": "SPID" /* ThingSprite.SPID */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Spiderdemon"
        },
        8: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BPAK" /* ThingSprite.BPAK */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Backpack"
        },
        9: {
            "version": "S",
            "radius": 20,
            "height": 56,
            "sprite": "SPOS" /* ThingSprite.SPOS */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Shotgun guy"
        },
        10: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "W",
            "class": 0 /* ThingsClass.None */,
            "description": "Bloody mess"
        },
        11: {
            "version": "S",
            "radius": 20,
            "height": 56,
            "sprite": "none" /* ThingSprite.none */,
            "sequence": "-",
            "class": 0 /* ThingsClass.None */,
            "description": "Deathmatch start"
        },
        12: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "W",
            "class": 0 /* ThingsClass.None */,
            "description": "Bloody mess 2"
        },
        13: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "RKEY" /* ThingSprite.RKEY */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Red keycard"
        },
        14: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "none4" /* ThingSprite.none4 */,
            "sequence": "-",
            "class": 0 /* ThingsClass.None */,
            "description": "Teleport landing"
        },
        15: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PLAY" /* ThingSprite.PLAY */,
            "sequence": "N",
            "class": 0 /* ThingsClass.None */,
            "description": "Dead player"
        },
        16: {
            "version": "R",
            "radius": 40,
            "height": 110,
            "sprite": "CYBR" /* ThingSprite.CYBR */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Cyberdemon"
        },
        17: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "CELP" /* ThingSprite.CELP */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Energy cell pack"
        },
        18: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "POSS" /* ThingSprite.POSS */,
            "sequence": "L",
            "class": 0 /* ThingsClass.None */,
            "description": "Dead former human"
        },
        19: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "SPOS" /* ThingSprite.SPOS */,
            "sequence": "L",
            "class": 0 /* ThingsClass.None */,
            "description": "Dead former sergeant"
        },
        20: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "TROO" /* ThingSprite.TROO */,
            "sequence": "M",
            "class": 0 /* ThingsClass.None */,
            "description": "Dead imp"
        },
        21: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "SARG" /* ThingSprite.SARG */,
            "sequence": "N",
            "class": 0 /* ThingsClass.None */,
            "description": "Dead demon"
        },
        22: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "HEAD" /* ThingSprite.HEAD */,
            "sequence": "L",
            "class": 0 /* ThingsClass.None */,
            "description": "Dead cacodemon"
        },
        23: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "SKUL" /* ThingSprite.SKUL */,
            "sequence": "K",
            "class": 0 /* ThingsClass.None */,
            "description": "Dead lost soul (invisible)"
        },
        24: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "POL5" /* ThingSprite.POL5 */,
            "sequence": "A",
            "class": 0 /* ThingsClass.None */,
            "description": "Pool of blood and flesh"
        },
        25: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL1" /* ThingSprite.POL1 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Impaled human"
        },
        26: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL6" /* ThingSprite.POL6 */,
            "sequence": "AB",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Twitching impaled human"
        },
        27: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL4" /* ThingSprite.POL4 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Skull on a pole"
        },
        28: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL2" /* ThingSprite.POL2 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Five skulls \"shish kebab\""
        },
        29: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "POL3" /* ThingSprite.POL3 */,
            "sequence": "AB",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Pile of skulls and candles"
        },
        30: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL1" /* ThingSprite.COL1 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Tall green pillar"
        },
        31: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL2" /* ThingSprite.COL2 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short green pillar"
        },
        32: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL3" /* ThingSprite.COL3 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Tall red pillar"
        },
        33: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL4" /* ThingSprite.COL4 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short red pillar"
        },
        34: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "CAND" /* ThingSprite.CAND */,
            "sequence": "A",
            "class": 0 /* ThingsClass.None */,
            "description": "Candle"
        },
        35: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "CBRA" /* ThingSprite.CBRA */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Candelabra"
        },
        36: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL5" /* ThingSprite.COL5 */,
            "sequence": "AB",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short green pillar with beating heart"
        },
        37: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "COL6" /* ThingSprite.COL6 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short red pillar with skull"
        },
        38: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "RSKU" /* ThingSprite.RSKU */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Red skull key"
        },
        39: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "YSKU" /* ThingSprite.YSKU */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Yellow skull key"
        },
        40: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "BSKU" /* ThingSprite.BSKU */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Blue skull key"
        },
        41: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "CEYE" /* ThingSprite.CEYE */,
            "sequence": "ABCB",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Evil eye"
        },
        42: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "FSKU" /* ThingSprite.FSKU */,
            "sequence": "ABC",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Floating skull"
        },
        43: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "TRE1" /* ThingSprite.TRE1 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Burnt tree"
        },
        44: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "TBLU" /* ThingSprite.TBLU */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Tall blue firestick"
        },
        45: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "TGRN" /* ThingSprite.TGRN */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Tall green firestick"
        },
        46: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "TRED" /* ThingSprite.TRED */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Tall red firestick"
        },
        47: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMIT" /* ThingSprite.SMIT */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Brown stump"
        },
        48: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "ELEC" /* ThingSprite.ELEC */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Tall techno column"
        },
        49: {
            "version": "R",
            "radius": 16,
            "height": 68,
            "sprite": "GOR1" /* ThingSprite.GOR1 */,
            "sequence": "ABCB",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, twitching"
        },
        50: {
            "version": "R",
            "radius": 16,
            "height": 84,
            "sprite": "GOR2" /* ThingSprite.GOR2 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, arms out"
        },
        51: {
            "version": "R",
            "radius": 16,
            "height": 84,
            "sprite": "GOR3" /* ThingSprite.GOR3 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, one-legged"
        },
        52: {
            "version": "R",
            "radius": 16,
            "height": 68,
            "sprite": "GOR4" /* ThingSprite.GOR4 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging pair of legs"
        },
        53: {
            "version": "R",
            "radius": 16,
            "height": 52,
            "sprite": "GOR5" /* ThingSprite.GOR5 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging leg"
        },
        54: {
            "version": "R",
            "radius": 32,
            "height": 16,
            "sprite": "TRE2" /* ThingSprite.TRE2 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Large brown tree"
        },
        55: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMBT" /* ThingSprite.SMBT */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short blue firestick"
        },
        56: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMGT" /* ThingSprite.SMGT */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short green firestick"
        },
        57: {
            "version": "R",
            "radius": 16,
            "height": 16,
            "sprite": "SMRT" /* ThingSprite.SMRT */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short red firestick"
        },
        58: {
            "version": "S",
            "radius": 30,
            "height": 56,
            "sprite": "SARG" /* ThingSprite.SARG */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Spectre"
        },
        59: {
            "version": "R",
            "radius": 20,
            "height": 84,
            "sprite": "GOR2" /* ThingSprite.GOR2 */,
            "sequence": "A",
            "class": 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, arms out"
        },
        60: {
            "version": "R",
            "radius": 20,
            "height": 68,
            "sprite": "GOR4" /* ThingSprite.GOR4 */,
            "sequence": "A",
            "class": 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging pair of legs"
        },
        61: {
            "version": "R",
            "radius": 20,
            "height": 52,
            "sprite": "GOR3" /* ThingSprite.GOR3 */,
            "sequence": "A",
            "class": 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, one-legged"
        },
        62: {
            "version": "R",
            "radius": 20,
            "height": 52,
            "sprite": "GOR5" /* ThingSprite.GOR5 */,
            "sequence": "A",
            "class": 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging leg"
        },
        63: {
            "version": "R",
            "radius": 20,
            "height": 68,
            "sprite": "GOR1" /* ThingSprite.GOR1 */,
            "sequence": "ABCB",
            "class": 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, twitching"
        },
        64: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "VILE" /* ThingSprite.VILE */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Arch-vile"
        },
        65: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "CPOS" /* ThingSprite.CPOS */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Heavy weapon dude"
        },
        66: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "SKEL" /* ThingSprite.SKEL */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Revenant"
        },
        67: {
            "version": "2",
            "radius": 48,
            "height": 64,
            "sprite": "FATT" /* ThingSprite.FATT */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Mancubus"
        },
        68: {
            "version": "2",
            "radius": 64,
            "height": 64,
            "sprite": "BSPI" /* ThingSprite.BSPI */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Arachnotron"
        },
        69: {
            "version": "2",
            "radius": 24,
            "height": 64,
            "sprite": "BOS2" /* ThingSprite.BOS2 */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Hell knight"
        },
        70: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "FCAN" /* ThingSprite.FCAN */,
            "sequence": "ABC",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Burning barrel"
        },
        71: {
            "version": "2",
            "radius": 31,
            "height": 56,
            "sprite": "PAIN" /* ThingSprite.PAIN */,
            "sequence": "A+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Pain elemental"
        },
        72: {
            "version": "2",
            "radius": 16,
            "height": 72,
            "sprite": "KEEN" /* ThingSprite.KEEN */,
            "sequence": "A+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Commander Keen"
        },
        73: {
            "version": "2",
            "radius": 16,
            "height": 88,
            "sprite": "HDB1" /* ThingSprite.HDB1 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, guts removed"
        },
        74: {
            "version": "2",
            "radius": 16,
            "height": 88,
            "sprite": "HDB2" /* ThingSprite.HDB2 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging victim, guts and brain removed"
        },
        75: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB3" /* ThingSprite.HDB3 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging torso, looking down"
        },
        76: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB4" /* ThingSprite.HDB4 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging torso, open skull"
        },
        77: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB5" /* ThingSprite.HDB5 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging torso, looking up"
        },
        78: {
            "version": "2",
            "radius": 16,
            "height": 64,
            "sprite": "HDB6" /* ThingSprite.HDB6 */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Hanging torso, brain removed"
        },
        79: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "POB1" /* ThingSprite.POB1 */,
            "sequence": "A",
            "class": 0 /* ThingsClass.None */,
            "description": "Pool of blood"
        },
        80: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "POB2" /* ThingSprite.POB2 */,
            "sequence": "A",
            "class": 0 /* ThingsClass.None */,
            "description": "Pool of blood"
        },
        81: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "BRS1" /* ThingSprite.BRS1 */,
            "sequence": "A",
            "class": 0 /* ThingsClass.None */,
            "description": "Pool of brains"
        },
        82: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "SGN2" /* ThingSprite.SGN2 */,
            "sequence": "A",
            "class": 4 /* ThingsClass.Weapon */ | 2 /* ThingsClass.Pickup */,
            "description": "Super shotgun"
        },
        83: {
            "version": "2",
            "radius": 20,
            "height": 16,
            "sprite": "MEGA" /* ThingSprite.MEGA */,
            "sequence": "ABCD",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Megasphere"
        },
        84: {
            "version": "2",
            "radius": 20,
            "height": 56,
            "sprite": "SSWV" /* ThingSprite.SSWV */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Wolfenstein SS"
        },
        85: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "TLMP" /* ThingSprite.TLMP */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Tall techno floor lamp"
        },
        86: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "TLP2" /* ThingSprite.TLP2 */,
            "sequence": "ABCD",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Short techno floor lamp"
        },
        87: {
            "version": "2",
            "radius": 20,
            "height": 32,
            "sprite": "none3" /* ThingSprite.none3 */,
            "sequence": "-",
            "class": 0 /* ThingsClass.None */,
            "description": "Spawn spot"
        },
        88: {
            "version": "2",
            "radius": 16,
            "height": 16,
            "sprite": "BBRN" /* ThingSprite.BBRN */,
            "sequence": "A+",
            "class": 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Romero's head"
        },
        89: {
            "version": "2",
            "radius": 20,
            "height": 32,
            "sprite": "none1" /* ThingSprite.none1 */,
            "sequence": "-",
            "class": 0 /* ThingsClass.None */,
            "description": "Monster spawner"
        },
        2001: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SHOT" /* ThingSprite.SHOT */,
            "sequence": "A",
            "class": 4 /* ThingsClass.Weapon */ | 2 /* ThingsClass.Pickup */,
            "description": "Shotgun"
        },
        2002: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "MGUN" /* ThingSprite.MGUN */,
            "sequence": "A",
            "class": 4 /* ThingsClass.Weapon */ | 2 /* ThingsClass.Pickup */,
            "description": "Chaingun"
        },
        2003: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "LAUN" /* ThingSprite.LAUN */,
            "sequence": "A",
            "class": 4 /* ThingsClass.Weapon */ | 2 /* ThingsClass.Pickup */,
            "description": "Rocket launcher"
        },
        2004: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "PLAS" /* ThingSprite.PLAS */,
            "sequence": "A",
            "class": 4 /* ThingsClass.Weapon */ | 2 /* ThingsClass.Pickup */,
            "description": "Plasma gun"
        },
        2005: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "CSAW" /* ThingSprite.CSAW */,
            "sequence": "A",
            "class": 4 /* ThingsClass.Weapon */ | 2 /* ThingsClass.Pickup */,
            "description": "Chainsaw"
        },
        2006: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "BFUG" /* ThingSprite.BFUG */,
            "sequence": "A",
            "class": 4 /* ThingsClass.Weapon */ | 2 /* ThingsClass.Pickup */,
            "description": "BFG9000"
        },
        2007: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "CLIP" /* ThingSprite.CLIP */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Clip"
        },
        2008: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SHEL" /* ThingSprite.SHEL */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "4 shotgun shells"
        },
        2010: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "ROCK" /* ThingSprite.ROCK */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Rocket"
        },
        2011: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "STIM" /* ThingSprite.STIM */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Stimpack"
        },
        2012: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "MEDI" /* ThingSprite.MEDI */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Medikit"
        },
        2013: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SOUL" /* ThingSprite.SOUL */,
            "sequence": "ABCDCB",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Supercharge"
        },
        2014: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BON1" /* ThingSprite.BON1 */,
            "sequence": "ABCDCB",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Health bonus"
        },
        2015: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BON2" /* ThingSprite.BON2 */,
            "sequence": "ABCDCB",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Armor bonus"
        },
        2018: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "ARM1" /* ThingSprite.ARM1 */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Armor"
        },
        2019: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "ARM2" /* ThingSprite.ARM2 */,
            "sequence": "AB",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Megaarmor"
        },
        2022: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "PINV" /* ThingSprite.PINV */,
            "sequence": "ABCD",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Invulnerability"
        },
        2023: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "PSTR" /* ThingSprite.PSTR */,
            "sequence": "A",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Berserk"
        },
        2024: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PINS" /* ThingSprite.PINS */,
            "sequence": "ABCD",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Partial invisibility"
        },
        2025: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SUIT" /* ThingSprite.SUIT */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Radiation shielding suit"
        },
        2026: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PMAP" /* ThingSprite.PMAP */,
            "sequence": "ABCDCB",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Computer area map"
        },
        2028: {
            "version": "S",
            "radius": 16,
            "height": 16,
            "sprite": "COLU" /* ThingSprite.COLU */,
            "sequence": "A",
            "class": 16 /* ThingsClass.Obstacle */,
            "description": "Floor lamp"
        },
        2035: {
            "version": "S",
            "radius": 10,
            "height": 42,
            "sprite": "BAR1" /* ThingSprite.BAR1 */,
            "sequence": "AB",
            "class": 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Exploding barrel"
        },
        2045: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "PVIS" /* ThingSprite.PVIS */,
            "sequence": "AB",
            "class": 1 /* ThingsClass.ArtifactItem */ | 2 /* ThingsClass.Pickup */,
            "description": "Light amplification visor"
        },
        2046: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "BROK" /* ThingSprite.BROK */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Box of rockets"
        },
        2047: {
            "version": "R",
            "radius": 20,
            "height": 16,
            "sprite": "CELL" /* ThingSprite.CELL */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Energy cell"
        },
        2048: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "AMMO" /* ThingSprite.AMMO */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Box of bullets"
        },
        2049: {
            "version": "S",
            "radius": 20,
            "height": 16,
            "sprite": "SBOX" /* ThingSprite.SBOX */,
            "sequence": "A",
            "class": 2 /* ThingsClass.Pickup */,
            "description": "Box of shotgun shells"
        },
        3001: {
            "version": "S",
            "radius": 20,
            "height": 56,
            "sprite": "TROO" /* ThingSprite.TROO */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Imp"
        },
        3002: {
            "version": "S",
            "radius": 30,
            "height": 56,
            "sprite": "SARG" /* ThingSprite.SARG */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Demon"
        },
        3003: {
            "version": "S",
            "radius": 24,
            "height": 64,
            "sprite": "BOSS" /* ThingSprite.BOSS */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Baron of Hell"
        },
        3004: {
            "version": "S",
            "radius": 20,
            "height": 56,
            "sprite": "POSS" /* ThingSprite.POSS */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */,
            "description": "Zombieman"
        },
        3005: {
            "version": "R",
            "radius": 31,
            "height": 56,
            "sprite": "HEAD" /* ThingSprite.HEAD */,
            "sequence": "A+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Cacodemon"
        },
        3006: {
            "version": "R",
            "radius": 16,
            "height": 56,
            "sprite": "SKUL" /* ThingSprite.SKUL */,
            "sequence": "AB+",
            "class": 8 /* ThingsClass.Monster */ | 16 /* ThingsClass.Obstacle */ | 32 /* ThingsClass.Shootable */ | 64 /* ThingsClass.HangsFromCeiling */,
            "description": "Lost soul"
        }
    };
}
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
    /**
     * Rotates a matrix by the given angle around the X axis
     *
     * @param {mat4} out the receiving matrix
     * @param {ReadonlyMat4} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    static rotateX(out, a, rad) {
        let s = Math.sin(rad);
        let c = Math.cos(rad);
        let a10 = a[4];
        let a11 = a[5];
        let a12 = a[6];
        let a13 = a[7];
        let a20 = a[8];
        let a21 = a[9];
        let a22 = a[10];
        let a23 = a[11];
        if (a !== out) {
            // If the source and destination differ, copy the unchanged rows
            out[0] = a[0];
            out[1] = a[1];
            out[2] = a[2];
            out[3] = a[3];
            out[12] = a[12];
            out[13] = a[13];
            out[14] = a[14];
            out[15] = a[15];
        }
        // Perform axis-specific matrix multiplication
        out[4] = a10 * c + a20 * s;
        out[5] = a11 * c + a21 * s;
        out[6] = a12 * c + a22 * s;
        out[7] = a13 * c + a23 * s;
        out[8] = a20 * c - a10 * s;
        out[9] = a21 * c - a11 * s;
        out[10] = a22 * c - a12 * s;
        out[11] = a23 * c - a13 * s;
        return out;
    }
    /**
     * Rotates a matrix by the given angle around the Y axis
     *
     * @param {mat4} out the receiving matrix
     * @param {ReadonlyMat4} a the matrix to rotate
     * @param {Number} rad the angle to rotate the matrix by
     * @returns {mat4} out
     */
    static rotateY(out, a, rad) {
        let s = Math.sin(rad);
        let c = Math.cos(rad);
        let a00 = a[0];
        let a01 = a[1];
        let a02 = a[2];
        let a03 = a[3];
        let a20 = a[8];
        let a21 = a[9];
        let a22 = a[10];
        let a23 = a[11];
        if (a !== out) {
            // If the source and destination differ, copy the unchanged rows
            out[4] = a[4];
            out[5] = a[5];
            out[6] = a[6];
            out[7] = a[7];
            out[12] = a[12];
            out[13] = a[13];
            out[14] = a[14];
            out[15] = a[15];
        }
        // Perform axis-specific matrix multiplication
        out[0] = a00 * c - a20 * s;
        out[1] = a01 * c - a21 * s;
        out[2] = a02 * c - a22 * s;
        out[3] = a03 * c - a23 * s;
        out[8] = a00 * s + a20 * c;
        out[9] = a01 * s + a21 * c;
        out[10] = a02 * s + a22 * c;
        out[11] = a03 * s + a23 * c;
        return out;
    }
}
class UserFileInput {
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
            reader.addEventListener("loadend", (_loadEvent) => {
                loaded(reader.result);
            });
            reader.readAsArrayBuffer(file);
        });
    }
}
// We only ever want a single client area sized canvas, and we want it to destroy and recreate
// because we may switch the context type.
class GlobalCanvas {
    element;
    get width() { return this._width; }
    get height() { return this._height; }
    _width;
    _height;
    constructor(onResize) {
        document.querySelector("canvas")?.remove();
        this.element = document.createElement("canvas");
        this.element.style.position = "fixed";
        this.element.width = window.innerWidth;
        this.element.height = window.innerHeight;
        this._width = this.element.width;
        this._height = this.element.height;
        document.body.appendChild(this.element);
        window.addEventListener("resize", (e) => {
            this.element.width = window.innerWidth;
            this.element.height = window.innerHeight;
            this._width = this.element.width;
            this._height = this.element.height;
            onResize?.(e);
        });
    }
    getContext(contextId, options) {
        return this.element.getContext(contextId, options);
    }
}
class UserFileInputUI {
    canvas = new GlobalCanvas(() => this.draw());
    constructor(ctor) {
        const wad = new Promise((resolve, _reject) => {
            this.canvas.element.addEventListener("dblclick", async (_event) => {
                try {
                    this.canvas.element.classList.add("loading");
                    const response = await fetch("./doom1.wad");
                    if (response.status != 200) {
                        alert(`Download failed :(  ${response.statusText} (${response.status}) ${await response.text()}`);
                        return;
                    }
                    const blob = await response.blob();
                    resolve(new WadFile(await blob.arrayBuffer()));
                }
                finally {
                    this.canvas.element.classList.remove("loading");
                }
            });
            new UserFileInput(this.canvas.element, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });
        wad.then((wad) => {
            const mapView = ctor(wad);
            mapView.displayLevel(0);
        });
        this.draw();
    }
    draw() {
        const context = this.canvas.getContext("2d");
        if (context == null)
            throw new Error("Unable to get 2d context");
        function drawCentered(text, width, height) {
            const metrics = context.measureText(text);
            const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            context.fillText(text, width / 2 - metrics.width / 2, height / 2 - actualHeight / 2, width);
        }
        function drawBottomLeft(text, width, height) {
            const lines = text.split("\n");
            const linePadding = 5;
            let yoffset = 0;
            const heights = lines.map((t) => {
                const metrics = context.measureText(t);
                const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + linePadding;
                yoffset += height;
                return height;
            });
            for (let i = 0; i < lines.length; ++i) {
                const line = lines[i];
                context.fillText(line, 0, height - yoffset, width);
                yoffset -= heights[i];
            }
        }
        context.setTransform(undefined);
        context.font = "40px serif";
        drawCentered("Drag & Drop WAD", this.canvas.width, this.canvas.height);
        context.font = "20px serif";
        drawCentered("Or double click to load the shareware WAD", this.canvas.width, this.canvas.height + 40);
        context.font = "20px serif";
        drawBottomLeft("Controls:\nZoom: Mouse wheel (shift for faster zoom)\nPan: Drag with mouse\nChange level: + and -", this.canvas.width, this.canvas.height);
    }
}
class MapView {
    wad;
    canvas = new GlobalCanvas();
    isMouseDown = false;
    currentMap;
    levelIndex = 0;
    awaitingRender = false;
    constructor(wad) {
        this.wad = wad;
        this.currentMap = this.wad.maps[0];
        document.addEventListener("wheel", (e) => this.onWheel(e));
        window.addEventListener("resize", (e) => this.onResize(e));
        this.canvas.element.addEventListener("mousedown", (e) => {
            this.isMouseDown = true;
            this.onMouseDown(e);
        });
        this.canvas.element.addEventListener("mouseup", (e) => {
            this.isMouseDown = false;
            this.onMouseUp(e);
        });
        this.canvas.element.addEventListener("mousemove", (e) => this.onMouseMove(e));
        this.canvas.element.addEventListener("dblclick", (e) => this.onDoubleClick(e));
        document.addEventListener("keyup", (e) => {
            switch (e.key) {
                case "-":
                    if (this.levelIndex == 0) {
                        this.levelIndex = this.wad.maps.length - 1;
                    }
                    else {
                        --this.levelIndex;
                    }
                    this.displayLevel(this.levelIndex);
                    break;
                case "+":
                    this.levelIndex = (this.levelIndex + 1) % this.wad.maps.length;
                    this.displayLevel(this.levelIndex);
                    break;
            }
            this.onKeyUp(e);
        });
    }
    redraw() {
        if (this.awaitingRender)
            return;
        this.awaitingRender = true;
        requestAnimationFrame(() => {
            this.draw();
            this.awaitingRender = false;
        });
    }
}
class MapView2D extends MapView {
    viewMatrix = new DOMMatrix([1, 0, 0, -1, 0, 0]);
    thingHitTester = new HitTester();
    highlightedThingIndex = -1;
    dashedStrokeOffset = 0;
    constructor(wad) {
        super(wad);
        this.resetValues();
        setInterval(() => {
            if (this.highlightedThingIndex == -1)
                return;
            --this.dashedStrokeOffset;
            this.redraw();
        }, 40);
        this.redraw();
    }
    resetValues() {
        this.highlightedThingIndex = -1;
        this.dashedStrokeOffset = 0;
        this.thingHitTester.startUpdate(0);
    }
    onWheel(event) {
        if (this.currentMap == null)
            return;
        const pos = Matrix.vectexMultiply(this.viewMatrix.inverse(), {
            x: event.clientX * 1,
            y: event.clientY * 1
        });
        const speed = event.shiftKey ? 0.15 : 0.08;
        const scale = 1 + (event.deltaY < 0 ? speed : -speed);
        this.viewMatrix.translateSelf(pos.x, pos.y);
        this.viewMatrix.scaleSelf(scale);
        this.viewMatrix.translateSelf(-pos.x, -pos.y);
        this.redraw();
    }
    onResize(_event) {
        this.redraw();
    }
    onMouseDown(_event) { }
    onMouseUp(_event) { }
    onMouseMove(event) {
        const hitResult = this.thingHitTester.hitTest(this.viewMatrix, event.offsetX, event.offsetY);
        const newHighlightedIndex = hitResult?.index ?? -1;
        if (this.highlightedThingIndex != newHighlightedIndex) {
            console.log(hitResult?.info, hitResult?.info?.description);
            this.highlightedThingIndex = newHighlightedIndex;
            this.dashedStrokeOffset = 0;
            this.redraw();
        }
        if (this.isMouseDown) {
            const inverse = this.viewMatrix.inverse();
            const pointDelta = new DOMPoint(event.movementX, event.movementY).matrixTransform(inverse);
            const pointOrigin = new DOMPoint(0, 0).matrixTransform(inverse);
            this.viewMatrix.translateSelf(pointDelta.x - pointOrigin.x, pointDelta.y - pointOrigin.y);
            this.redraw();
        }
    }
    onDoubleClick(_event) {
        // This is temporary test code.
        const triangles = [];
        const rects = Triangulation.getRectangles(this.currentMap);
        for (const rect of rects) {
            Triangulation.rectToTriangle(triangles, rect);
        }
        const stl = Triangulation.getStl(triangles);
        console.log(stl);
    }
    onKeyUp(_event) { }
    draw() {
        const context = this.canvas.getContext("2d");
        if (context == null)
            throw new Error("Unable to get 2d context");
        context.setTransform(undefined);
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        context.setTransform(this.viewMatrix);
        context.imageSmoothingQuality = "high";
        context.imageSmoothingEnabled = true;
        // Draws a circle at the origin.
        if (true) {
            context.beginPath();
            context.fillStyle = "red";
            context.arc(0, 0, 20, 0, Math.PI * 2);
            context.fill();
        }
        context.lineWidth = 1;
        for (const linedef of this.currentMap.linedefs) {
            context.beginPath();
            if (linedef.hasFlag(32 /* LinedefFlags.SECRET */)) {
                context.strokeStyle = "purple";
            }
            else if (linedef.hasFlag(128 /* LinedefFlags.DONTDRAW */)) {
                context.strokeStyle = "grey";
            }
            else {
                context.strokeStyle = "black";
            }
            context.moveTo(linedef.vertexA.x, linedef.vertexA.y);
            context.lineTo(linedef.vertexB.x, linedef.vertexB.y);
            context.stroke();
        }
        // Not all entries are used as index values, so we must grab selectedThingEntry while enumerating.
        let selectedThingEntry = null;
        let thingIndex = 0;
        this.thingHitTester.startUpdate(this.currentMap.things.length);
        for (const thing of this.currentMap.things) {
            if (thing.description == null) {
                continue;
            }
            // Are the thing's x/y actually the centers?
            const centerX = thing.x;
            const centerY = thing.y;
            const radius = thing.description.radius;
            const isHighlighted = thingIndex == this.highlightedThingIndex;
            this.thingHitTester.addPoint(centerX, centerY, radius, thing);
            ++thingIndex;
            if (isHighlighted) {
                selectedThingEntry = thing;
                continue;
            }
            if (thing.type == 2014 /* ThingsType.HealthBonus */) {
                context.beginPath();
                context.fillStyle = "blue";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                context.fill();
            }
            else {
                const desc = thing.description;
                const isMonster = (desc.class & 8 /* ThingsClass.Monster */) == 8 /* ThingsClass.Monster */;
                context.beginPath();
                context.strokeStyle = isMonster ? "red" : "green";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                // Is it directional? If so, draw a directional line.
                const isDirectional = isMonster || desc.sprite == "PLAY" /* ThingSprite.PLAY */;
                if (isDirectional) {
                    context.moveTo(centerX, centerY);
                    const lineLength = desc.radius * 1.5;
                    const radians = (thing.angle / 256) * (Math.PI * 2);
                    const endX = centerX + Math.cos(radians) * lineLength;
                    const endY = centerY + Math.sin(radians) * lineLength;
                    context.lineTo(endX, endY);
                }
                context.stroke();
            }
        }
        // Draw last to allow the box to have highest Z order.
        if (selectedThingEntry != null) {
            const thing = selectedThingEntry;
            const centerX = thing.x;
            const centerY = thing.y;
            const radius = thing.description.radius;
            const point = new DOMPoint(centerX, centerY);
            const transformedPoint = point.matrixTransform(this.viewMatrix);
            context.beginPath();
            context.strokeStyle = "red";
            context.setLineDash([6, 6]);
            context.lineDashOffset = this.dashedStrokeOffset;
            context.arc(centerX, centerY, radius, 0, Math.PI * 2);
            context.stroke();
            context.setLineDash([]);
            context.setTransform(undefined);
            context.beginPath();
            const boxX = transformedPoint.x - radius;
            const boxY = transformedPoint.y + radius;
            context.clearRect(boxX, boxY, 300, 100);
            context.rect(boxX, boxY, 300, 100);
            context.font = "12pt serif";
            context.fillStyle = "Black";
            context.textBaseline = "top";
            context.fillText(thing.description?.description ?? "", boxX + 5, boxY + 5, 300);
            context.stroke();
        }
        context.setTransform(undefined);
        context.font = "12pt serif";
        context.fillStyle = "Black";
        context.textBaseline = "top";
        context.fillText(this.currentMap.displayName ?? "Unknown", 0, 0, 300);
    }
    async displayLevel(index) {
        this.currentMap = this.wad.maps[index] ?? this.wad.maps[0];
        this.resetValues();
        const player1Start = this.currentMap.things.find((t) => t.type == 1 /* ThingsType.PlayerOneStart */);
        if (player1Start != undefined) {
            // Eh. Centering on the player start isn't the best, but might be improvable.
            // this.viewMatrix.translateSelf(-player1Start.x, -player1Start.y);
            // this.redraw();
        }
        this.fitLevelToView(this.currentMap);
    }
    fitLevelToView(map) {
        const bb = LinedefEntry.getBoundingBox(map.linedefs);
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const scaleX = canvasWidth / bb.width;
        const scaleY = canvasHeight / bb.height;
        const scale = Math.min(scaleX, scaleY);
        let translateX = (canvasWidth - bb.width * scale) / 2 - bb.left * scale;
        let translateY = (canvasHeight - bb.height * scale) / 2 - bb.top * scale;
        this.viewMatrix.a = scale;
        this.viewMatrix.d = scale;
        this.viewMatrix.e = translateX;
        this.viewMatrix.f = translateY;
        this.redraw();
    }
}
class MapView3D extends MapView {
    gl;
    shaderProgram;
    positionBuffer;
    colorBuffer;
    texCoordBuffer;
    aVertexPosition;
    aVertexColor;
    aTexCoord;
    uProjectionMatrix;
    uModelViewMatrix;
    uTexture;
    whiteTexture;
    textureCache = new Map();
    drawGroups = [];
    cameraPosition = { x: 0, y: 0, z: 0 };
    cameraYaw = 0;
    cameraPitch = 0;
    keysDown = new Set();
    constructor(wad) {
        super(wad);
        const gl = this.canvas.getContext("webgl");
        if (gl === null)
            throw new Error("WebGL not available.");
        this.gl = gl;
        const vsSource = `
            attribute vec3 aVertexPosition;
            attribute vec3 aVertexColor;
            attribute vec2 aTexCoord;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelViewMatrix;
            varying lowp vec3 vColor;
            varying highp vec2 vTexCoord;

            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
                vColor = aVertexColor;
                vTexCoord = aTexCoord;
            }
        `;
        const fsSource = `
            precision lowp float;
            varying lowp vec3 vColor;
            varying highp vec2 vTexCoord;
            uniform sampler2D uTexture;

            void main() {
                vec4 texColor = texture2D(uTexture, vTexCoord);
                gl_FragColor = vec4(vColor * texColor.rgb, texColor.a);
            }
        `;
        function loadShader(gl, type, source) {
            const shader = gl.createShader(type);
            if (shader == null)
                throw new Error("Unable to create shader");
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                const error = gl.getShaderInfoLog(shader);
                gl.deleteShader(shader);
                throw new Error(`An error occurred compiling the shaders: ${error}`);
            }
            return shader;
        }
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram();
        if (program == null)
            throw new Error("Unable to create shader program");
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(program)}`);
        }
        this.shaderProgram = program;
        this.aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");
        this.aVertexColor = gl.getAttribLocation(program, "aVertexColor");
        this.aTexCoord = gl.getAttribLocation(program, "aTexCoord");
        this.uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
        this.uModelViewMatrix = gl.getUniformLocation(program, "uModelViewMatrix");
        this.uTexture = gl.getUniformLocation(program, "uTexture");
        const positionBuffer = gl.createBuffer();
        if (positionBuffer == null)
            throw new Error("Unable to create position buffer.");
        this.positionBuffer = positionBuffer;
        const colorBuffer = gl.createBuffer();
        if (colorBuffer == null)
            throw new Error("Unable to create color buffer.");
        this.colorBuffer = colorBuffer;
        const texCoordBuffer = gl.createBuffer();
        if (texCoordBuffer == null)
            throw new Error("Unable to create texcoord buffer.");
        this.texCoordBuffer = texCoordBuffer;
        // 1x1 white texture used for untextured (flat-shaded) geometry.
        const whiteTexture = gl.createTexture();
        if (whiteTexture == null)
            throw new Error("Unable to create white texture.");
        gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        this.whiteTexture = whiteTexture;
        document.addEventListener("keydown", (e) => this.keysDown.add(e.key.toLowerCase()));
        document.addEventListener("keyup", (e) => this.keysDown.delete(e.key.toLowerCase()));
        UIOverlay.setLowerLeftText("Move: WASD\n" +
            "Look: Mouse drag\n" +
            "Up/down: Space/Z or mouse wheel\n" +
            "Change level: +/-");
        setInterval(() => this.tick(), 1000 / 60);
        this.redraw();
    }
    async displayLevel(index) {
        this.currentMap = this.wad.maps[index] ?? this.wad.maps[0];
        this.buildGeometry();
        const playerStart = this.currentMap.things.find((t) => t.type == 1 /* ThingsType.PlayerOneStart */);
        if (playerStart != undefined) {
            this.cameraPosition.x = playerStart.x;
            this.cameraPosition.y = 41;
            this.cameraPosition.z = -playerStart.y;
            const radians = (playerStart.angle / 256) * (Math.PI * 2);
            this.cameraYaw = -radians + Math.PI;
        }
        else {
            this.cameraPosition.x = 0;
            this.cameraPosition.y = 41;
            this.cameraPosition.z = 0;
            this.cameraYaw = 0;
        }
        this.cameraPitch = 0;
        this.redraw();
    }
    getOrCreateTexture(name) {
        let texture = this.textureCache.get(name);
        if (texture != null)
            return texture;
        const gl = this.gl;
        const flat = this.wad.getGraphic(name, FlatEntry.default);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, flat.width, flat.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, flat.pixels);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        this.textureCache.set(name, texture);
        return texture;
    }
    buildGeometry() {
        const gl = this.gl;
        const positions = [];
        const colors = [];
        const texCoords = [];
        const rectangles = Triangulation.getRectangles(this.currentMap);
        // Separate walls (untextured) from textured flats, grouped by texture name.
        const wallRects = [];
        const texturedGroups = new Map();
        for (const rect of rectangles) {
            if (rect.textureName != null) {
                let group = texturedGroups.get(rect.textureName);
                if (group == null) {
                    group = [];
                    texturedGroups.set(rect.textureName, group);
                }
                group.push(rect);
            }
            else {
                wallRects.push(rect);
            }
        }
        this.drawGroups = [];
        let vertexCount = 0;
        // Emit wall geometry (flat-shaded, no texture).
        const wallStart = vertexCount;
        for (const rect of wallRects) {
            this.emitRect(rect, positions, colors, texCoords, false);
            vertexCount += 6;
        }
        if (vertexCount > wallStart) {
            this.drawGroups.push({ textureName: null, start: wallStart, count: vertexCount - wallStart });
        }
        // Emit textured groups (floors/ceilings).
        for (const [textureName, rects] of texturedGroups) {
            const groupStart = vertexCount;
            for (const rect of rects) {
                this.emitRect(rect, positions, colors, texCoords, true);
                vertexCount += 6;
            }
            this.drawGroups.push({ textureName, start: groupStart, count: vertexCount - groupStart });
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    }
    emitRect(rect, positions, colors, texCoords, isTextured) {
        // Remap: doom(x, y, z) -> gl(x, z, -y). Y is negated to convert Doom's left-handed coordinates
        // to GL's right-handed coordinates. Otherwise left-facing hallways become right-facing.
        const v0x = rect.x.x, v0y = rect.x.z, v0z = -rect.x.y;
        const v1x = rect.y.x, v1y = rect.y.z, v1z = -rect.y.y;
        const v2x = rect.x2.x, v2y = rect.x2.z, v2z = -rect.x2.y;
        const v3x = rect.y2.x, v3y = rect.y2.z, v3z = -rect.y2.y;
        positions.push(v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z, v2x, v2y, v2z, v1x, v1y, v1z, v3x, v3y, v3z);
        if (isTextured) {
            // Flats tile at 64 world units. UVs use original DOOM x/y coords.
            const u0 = rect.x.x / 64, w0 = rect.x.y / 64;
            const u1 = rect.y.x / 64, w1 = rect.y.y / 64;
            const u2 = rect.x2.x / 64, w2 = rect.x2.y / 64;
            const u3 = rect.y2.x / 64, w3 = rect.y2.y / 64;
            texCoords.push(u0, w0, u1, w1, u2, w2, u2, w2, u1, w1, u3, w3);
            // Use sector light level for brightness.
            const brightness = (rect.lightLevel ?? 128) / 255;
            for (let i = 0; i < 6; ++i) {
                colors.push(brightness, brightness, brightness);
            }
        }
        else {
            // Untextured walls: UV doesn't matter (white 1x1 texture), use flat shading.
            for (let i = 0; i < 6; ++i) {
                texCoords.push(0, 0);
            }
            const edge1x = v1x - v0x, edge1y = v1y - v0y, edge1z = v1z - v0z;
            const edge2x = v2x - v0x, edge2y = v2y - v0y, edge2z = v2z - v0z;
            let normalX = edge1y * edge2z - edge1z * edge2y;
            let normalY = edge1z * edge2x - edge1x * edge2z;
            let normalZ = edge1x * edge2y - edge1y * edge2x;
            const length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
            if (length > 0) {
                normalX /= length;
                normalY /= length;
                normalZ /= length;
            }
            let lightDot = normalX * 0.3 + normalY * 0.7 + normalZ * 0.2;
            if (lightDot < 0)
                lightDot = -lightDot;
            const brightness = 0.25 + 0.75 * lightDot;
            const r = 0.55 * brightness;
            const g = 0.45 * brightness;
            const b = 0.35 * brightness;
            for (let i = 0; i < 6; ++i) {
                colors.push(r, g, b);
            }
        }
    }
    tick() {
        let moved = false;
        const moveSpeed = this.keysDown.has("shift") ? 30 : 10;
        const forwardX = Math.sin(this.cameraYaw);
        const forwardZ = -Math.cos(this.cameraYaw);
        const rightX = Math.cos(this.cameraYaw);
        const rightZ = Math.sin(this.cameraYaw);
        if (this.keysDown.has("w")) {
            this.cameraPosition.x += forwardX * moveSpeed;
            this.cameraPosition.z += forwardZ * moveSpeed;
            moved = true;
        }
        if (this.keysDown.has("s")) {
            this.cameraPosition.x -= forwardX * moveSpeed;
            this.cameraPosition.z -= forwardZ * moveSpeed;
            moved = true;
        }
        if (this.keysDown.has("a")) {
            this.cameraPosition.x -= rightX * moveSpeed;
            this.cameraPosition.z -= rightZ * moveSpeed;
            moved = true;
        }
        if (this.keysDown.has("d")) {
            this.cameraPosition.x += rightX * moveSpeed;
            this.cameraPosition.z += rightZ * moveSpeed;
            moved = true;
        }
        if (this.keysDown.has(" ")) {
            this.cameraPosition.y += 20;
            moved = true;
        }
        if (this.keysDown.has("z")) {
            this.cameraPosition.y -= 20;
            moved = true;
        }
        if (moved)
            this.redraw();
    }
    draw() {
        const gl = this.gl;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.clearColor(0.1, 0.1, 0.15, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.shaderProgram);
        // Projection matrix.
        const projectionMatrix = mat4.create();
        const aspect = gl.canvas.width / gl.canvas.height;
        mat4.perspective(projectionMatrix, Math.PI / 4, aspect, 1, 50000);
        gl.uniformMatrix4fv(this.uProjectionMatrix, false, projectionMatrix);
        // View matrix: rotate then translate (camera transform).
        const viewMatrix = mat4.create();
        mat4.rotateX(viewMatrix, viewMatrix, this.cameraPitch);
        mat4.rotateY(viewMatrix, viewMatrix, this.cameraYaw);
        mat4.translate(viewMatrix, viewMatrix, [
            -this.cameraPosition.x,
            -this.cameraPosition.y,
            -this.cameraPosition.z
        ]);
        gl.uniformMatrix4fv(this.uModelViewMatrix, false, viewMatrix);
        // Bind position attribute.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aVertexPosition);
        // Bind color attribute.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(this.aVertexColor, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aVertexColor);
        // Bind tex coord attribute.
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.vertexAttribPointer(this.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.aTexCoord);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(this.uTexture, 0);
        for (const group of this.drawGroups) {
            if (group.textureName != null) {
                gl.bindTexture(gl.TEXTURE_2D, this.getOrCreateTexture(group.textureName));
            }
            else {
                gl.bindTexture(gl.TEXTURE_2D, this.whiteTexture);
            }
            gl.drawArrays(gl.TRIANGLES, group.start, group.count);
        }
    }
    onMouseMove(event) {
        if (!this.isMouseDown)
            return;
        const sensitivity = 0.003;
        this.cameraYaw += event.movementX * sensitivity;
        this.cameraPitch += event.movementY * sensitivity;
        // Clamp pitch to avoid flipping.
        const maxPitch = Math.PI / 2 - 0.01;
        if (this.cameraPitch > maxPitch)
            this.cameraPitch = maxPitch;
        if (this.cameraPitch < -maxPitch)
            this.cameraPitch = -maxPitch;
        this.redraw();
    }
    onWheel(event) {
        const moveSpeed = event.shiftKey ? 100 : 30;
        const direction = event.deltaY < 0 ? -1 : 1;
        this.cameraPosition.y += moveSpeed * direction;
        this.redraw();
    }
    onResize(_event) { this.redraw(); }
    onMouseDown(_event) { }
    onMouseUp(_event) { }
    onDoubleClick(_event) { }
    onKeyUp(event) { }
}
class UIOverlay {
    static instance = new UIOverlay();
    lowerleftElement;
    constructor() {
        this.lowerleftElement = document.querySelector(".overlay .lowerleft");
        if (this.lowerleftElement == null)
            throw new Error("Unable to find overlay element.");
    }
    static setLowerLeftText(text) {
        UIOverlay.instance.lowerleftElement.textContent = text;
    }
}
const _fileinput = new UserFileInputUI((wad) => new MapView3D(wad));
class BinaryFileReader {
    position = 0;
    u8;
    u16;
    u32;
    i16;
    storedPositions = [];
    static textDecoder = new TextDecoder("us-ascii"); // Correct encoding?
    constructor(file) {
        // Doing this is pretty silly... verify there's even unaligned values.
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
    }
    pushPosition(newPosition) {
        this.storedPositions.push(this.position);
        if (newPosition !== undefined) {
            this.position = newPosition;
        }
    }
    popPosition() {
        this.position = this.storedPositions.pop();
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
    readArray(length) {
        const array = this.u8.slice(this.position, this.position + length);
        this.position += length;
        return array;
    }
    readU32Array(length) {
        const offset = this.position % 4;
        const start = (this.position - offset) / 4;
        const result = this.u32[offset].slice(start, start + length);
        this.position += length * 4;
        return result;
    }
    readFixedLengthString(length) {
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
var WadIdentifier;
(function (WadIdentifier) {
    WadIdentifier[WadIdentifier["IWAD"] = 0x44415749] = "IWAD";
    WadIdentifier[WadIdentifier["PWAD"] = 0x44415750] = "PWAD";
})(WadIdentifier || (WadIdentifier = {}));
class WadHeader {
    identifier; // u32
    numlumps;
    infotableofs;
    constructor(reader) {
        const identifier = reader.readU32();
        this.identifier = identifier;
        this.numlumps = reader.readU32();
        this.infotableofs = reader.readU32();
        if (identifier != WadIdentifier.IWAD && identifier != WadIdentifier.PWAD) {
            throw new Error(`Invalid WAD identifier ${identifier.toString(16).padStart(8, "0")}`);
        }
    }
}
// https://doomwiki.org/wiki/WAD
class WadFile {
    wadInfo;
    directory;
    maps;
    patches;
    flats;
    palette;
    reader;
    decodeImagesCache = new Map();
    constructor(file) {
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadHeader(this.reader);
        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.maps = MapEntry.readAll(this, this.reader, this.directory);
        this.patches = PatchEntry.readAll(this, this.reader);
        this.palette = PaletteEntry.read(this, this.reader);
        this.flats = FlatEntry.readAll(this, this.reader);
    }
    getGraphic(name, defaultImage) {
        if (this.decodeImagesCache.has(name)) {
            return this.decodeImagesCache.get(name);
        }
        if (this.flats.has(name)) {
            const flat = this.flats.get(name);
            const data = flat.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }
        if (this.patches.has(name)) {
            const patch = this.patches.get(name);
            const data = patch.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }
        for (const entry of this.directory) {
            if (entry.name == name) {
                const patch = new PatchEntry(this.reader, entry);
                const data = patch.decode(this.palette);
                this.decodeImagesCache.set(name, data);
                return data;
            }
        }
        console.error(`Graphic "${name}" not found`);
        return defaultImage ?? new DecodedImage(0, 0, new Uint8Array());
    }
}
class BoundingBox {
    top;
    bottom;
    left;
    right;
    get width() { return this.right - this.left; }
    get height() { return this.bottom - this.top; }
    constructor(top, bottom, left, right) {
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
    }
}
class BoundingBoxEntry extends BoundingBox {
    constructor(reader) {
        super(reader.readI16(), reader.readI16(), reader.readI16(), reader.readI16());
    }
}
// https://doomwiki.org/wiki/Node
class NodeEntry {
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
        this.boundingBoxLeft = new BoundingBoxEntry(reader);
        this.boundingBoxRight = new BoundingBoxEntry(reader);
        this.rightChild = reader.readI16();
        this.leftChild = reader.readI16();
    }
    static loadAll(reader, nodeEntry) {
        return nodeEntry.readAll(reader, (reader) => new NodeEntry(reader));
    }
}
var LumpName;
(function (LumpName) {
    LumpName["PLAYPAL"] = "PLAYPAL";
})(LumpName || (LumpName = {}));
// "lump"
class DirectoryEntry {
    filepos;
    size;
    name;
    static mapNameExpression = /^MAP\d+$|^E\d+M\d+$/;
    constructor(reader) {
        this.filepos = reader.readU32();
        this.size = reader.readU32();
        this.name = reader.readFixedLengthString(8);
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
        while (reader.position < end) {
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
    static areEqual(a, b) {
        return a.x == b.x && a.y == b.y;
    }
}
// https://doomwiki.org/wiki/Thing
class ThingEntry {
    x;
    y;
    angle; // 0 = east, 64 = north, 128 = west, 192 = south
    type;
    spawnFlags;
    description;
    constructor(reader) {
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
    static readAll(entry, reader) {
        return entry.readAll(reader, (reader) => new ThingEntry(reader));
    }
}
class LinedefEntry {
    map;
    vertexAIndex;
    vertexBIndex;
    flags; // u16
    linetype;
    tag;
    sidedefRightIndex;
    sidedefLeftIndex;
    get vertexA() { return this.map.vertexes[this.vertexAIndex]; }
    get vertexB() { return this.map.vertexes[this.vertexBIndex]; }
    get sidedefRight() { return this.map.sidedefs[this.sidedefRightIndex]; }
    get sidedefLeft() { return this.sidedefLeftIndex == 0xFFFF ? null : this.map.sidedefs[this.sidedefLeftIndex]; }
    constructor(map, reader) {
        this.map = map;
        this.vertexAIndex = reader.readU16();
        this.vertexBIndex = reader.readU16();
        this.flags = reader.readU16();
        this.linetype = reader.readU16();
        this.tag = reader.readU16();
        this.sidedefRightIndex = reader.readU16();
        this.sidedefLeftIndex = reader.readU16();
    }
    hasFlag(flag) {
        return (this.flags & flag) == flag;
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new LinedefEntry(map, reader));
    }
    static areEqual(a, b) {
        return Vertex.areEqual(a.vertexA, b.vertexA) && Vertex.areEqual(a.vertexB, b.vertexB);
    }
    static getBoundingBox(linedefs) {
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
            dy == Number.NEGATIVE_INFINITY) {
            throw new Error("Invalid bounds");
        }
        return new BoundingBox(y, dy, x, dx);
    }
}
// https://doomwiki.org/wiki/Sidedef
class SideDefEntry {
    map;
    textureXOffset;
    textureYOffset;
    textureNameUpper;
    textureNameLower;
    textureNameMiddle;
    sectorIndex;
    get textureUpper() { return this.map.wadFile.getGraphic(this.textureNameUpper); }
    get textureLower() { return this.map.wadFile.getGraphic(this.textureNameLower); }
    get textureMiddle() { return this.map.wadFile.getGraphic(this.textureNameMiddle); }
    get sector() { return this.map.sectors[this.sectorIndex]; }
    constructor(map, reader) {
        this.map = map;
        this.textureXOffset = reader.readI16();
        this.textureYOffset = reader.readI16();
        this.textureNameUpper = reader.readFixedLengthString(8);
        this.textureNameLower = reader.readFixedLengthString(8);
        this.textureNameMiddle = reader.readFixedLengthString(8);
        this.sectorIndex = reader.readU16();
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SideDefEntry(map, reader));
    }
}
// https://doomwiki.org/wiki/Sector
class SectorEntry {
    map;
    floorHeight;
    ceilingHeight;
    textureNameFloor;
    textureNameCeiling;
    lightLevel;
    specialType;
    tag;
    get textureFloor() { return this.map.wadFile.getGraphic(this.textureNameFloor); }
    get textureCeiling() { return this.map.wadFile.getGraphic(this.textureNameCeiling); }
    constructor(map, reader) {
        this.map = map;
        this.floorHeight = reader.readI16();
        this.ceilingHeight = reader.readI16();
        this.textureNameFloor = reader.readFixedLengthString(8);
        this.textureNameCeiling = reader.readFixedLengthString(8);
        this.lightLevel = reader.readI16();
        this.specialType = reader.readI16();
        this.tag = reader.readI16();
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SectorEntry(map, reader));
    }
}
class SegmentEntry {
    map;
    vertextStartIndex;
    vertextEndIndex;
    angle;
    linedefIndex;
    direction; // Direction: 0 (same as linedef) or 1 (opposite of linedef)
    offset; // Offset: distance along linedef to start of seg
    get vertexes() { return this.map.vertexes.slice(this.vertextStartIndex, this.vertextEndIndex); }
    get linedef() { return this.map.linedefs[this.linedefIndex]; }
    constructor(map, reader) {
        this.map = map;
        this.vertextStartIndex = reader.readI16();
        this.vertextEndIndex = reader.readI16();
        this.angle = reader.readI16();
        this.linedefIndex = reader.readI16();
        this.direction = reader.readI16();
        this.offset = reader.readI16();
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SegmentEntry(map, reader));
    }
}
class SubSectorEntry {
    segCount;
    firstSegIndex;
    segments;
    constructor(map, reader) {
        this.segCount = reader.readI16();
        this.firstSegIndex = reader.readI16();
        this.segments = map.segments.slice(this.firstSegIndex, this.firstSegIndex + this.segCount);
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => new SubSectorEntry(map, reader));
    }
}
class MapEntry {
    wadFile;
    name;
    displayName;
    entries;
    vertexes;
    linedefs;
    sidedefs;
    things;
    segments;
    subSectors;
    sectors;
    linedefsPerSector;
    reader;
    constructor(wadFile, reader, name, entries) {
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
        // Must come after sectors are loaded.
        this.linedefsPerSector = this.getLinedefsPerSector();
    }
    getLinedefsPerSector() {
        const linedefsPerSector = {};
        for (const linedef of this.linedefs) {
            for (const sidedef of [linedef.sidedefLeft, linedef.sidedefRight]) {
                if (sidedef == null)
                    continue;
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
    getNodes() {
        return NodeEntry.loadAll(this.reader, this.entries.nodes);
    }
    static readAll(wadFile, reader, entries) {
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
                maps.push(new MapEntry(wadFile, reader, entry.name, {
                    map: entry,
                    things: demandNextEntry("THINGS" /* MapEntryName.THINGS */),
                    linedefs: demandNextEntry("LINEDEFS" /* MapEntryName.LINEDEFS */),
                    sidedefs: demandNextEntry("SIDEDEFS" /* MapEntryName.SIDEDEFS */),
                    vertexes: demandNextEntry("VERTEXES" /* MapEntryName.VERTEXES */),
                    segs: demandNextEntry("SEGS" /* MapEntryName.SEGS */),
                    ssectors: demandNextEntry("SSECTORS" /* MapEntryName.SSECTORS */),
                    nodes: demandNextEntry("NODES" /* MapEntryName.NODES */),
                    sectors: demandNextEntry("SECTORS" /* MapEntryName.SECTORS */),
                    reject: demandNextEntry("REJECT" /* MapEntryName.REJECT */),
                    blockmap: demandNextEntry("BLOCKMAP" /* MapEntryName.BLOCKMAP */),
                }));
            }
        }
        // This should really be parsing out the numbers, but they should happen to order correctly regardless due
        // to leading 0 padding.
        return maps.sort((a, b) => a.name < b.name ? -1 : 1);
    }
}
class DecodedImage {
    width;
    height;
    pixels;
    constructor(width, height, pixels) {
        this.width = width;
        this.height = height;
        this.pixels = pixels;
    }
}
// https://doomwiki.org/wiki/Flat
class FlatEntry {
    static width = 64;
    static height = 64;
    static default = FlatEntry.magentaCheckerBoard();
    pixels;
    constructor(reader, directoryEntry) {
        reader.pushPosition(directoryEntry.filepos);
        this.pixels = reader.readArray(FlatEntry.width * FlatEntry.height);
        reader.popPosition();
    }
    decode(palette) {
        const buffer = new ArrayBuffer(FlatEntry.width * FlatEntry.height * 4);
        const pixels = new Uint32Array(buffer);
        for (let i = 0; i < FlatEntry.width * FlatEntry.height; ++i) {
            pixels[i] = palette.palette[this.pixels[i]];
        }
        return new DecodedImage(FlatEntry.width, FlatEntry.height, new Uint8Array(buffer));
    }
    static readAll(file, reader) {
        const flats = new Map();
        const startIndex = file.directory.findIndex((dir) => dir.name == "F_START" || dir.name == "FF_START");
        if (startIndex == -1)
            return flats;
        for (let i = startIndex + 1; i < file.directory.length; ++i) {
            const dir = file.directory[i];
            if (dir.name == "F_END" || dir.name == "FF_END")
                break;
            if (dir.size != 4096)
                continue;
            flats.set(dir.name, new FlatEntry(reader, dir));
        }
        return flats;
    }
    static magentaCheckerBoard() {
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
    width;
    height;
    leftOffset;
    topOffset;
    columnofs;
    posts;
    constructor(reader, directoryEntry) {
        reader.position = directoryEntry.filepos;
        const relative = reader.position;
        this.width = reader.readU16();
        this.height = reader.readU16();
        this.leftOffset = reader.readI16();
        this.topOffset = reader.readI16();
        this.columnofs = reader.readU32Array(this.width);
        ;
        // Save position at the end of the patch entry.
        reader.pushPosition();
        const posts = [];
        for (const offset of this.columnofs) {
            reader.position = offset + relative;
            posts.push(new PatchPostEntry(reader));
        }
        this.posts = posts;
        reader.popPosition();
    }
    static readAll(file, reader) {
        const patches = new Map();
        const firstSpriteIndex = file.directory.findIndex((dir) => dir.name == "S_START" || dir.name == "SS_START");
        if (firstSpriteIndex == -1)
            return patches;
        for (let i = firstSpriteIndex + 1; i < file.directory.length; ++i) {
            const dir = file.directory[i];
            if (dir.name == "S_END" || dir.name == "SS_END")
                break;
            if (dir.size == 0) {
                console.info("Empty dir entry in sprite list?", dir);
                continue;
            }
            patches.set(dir.name, new PatchEntry(reader, dir));
        }
        return patches;
    }
    decode(palette) {
        // TODO: Do I need a stride?
        const buffer = new ArrayBuffer(this.width * this.height * 4);
        const pixels = new Uint32Array(buffer);
        let i = 0;
        for (let x = 0; x < this.width; ++x) {
            const post = this.posts[x];
            for (let y = 0; y < post.length; ++y) {
                const colorIndex = post.data[y];
                pixels[i] = palette.palette[colorIndex];
            }
        }
        return new DecodedImage(this.width, this.height, new Uint8Array(buffer));
    }
}
class PatchPostEntry {
    topdelta;
    length;
    // public readonly unused: u8;
    data;
    // public readonly unused2: u8;
    constructor(reader) {
        this.topdelta = reader.readU8();
        this.length = reader.readU8();
        reader.readU8(); // unused
        this.data = reader.readArray(this.length);
        reader.readU8(); // unused
    }
}
// https://doomwiki.org/wiki/PLAYPAL
class PaletteEntry {
    palette;
    constructor(reader, directoryEntry) {
        reader.position = directoryEntry.filepos;
        this.palette = new Uint32Array(256);
        // Leave index 0 as transparent, since that's how the game treats it.
        for (let i = 0; i < 256; ++i) {
            const r = reader.readU8();
            const g = reader.readU8();
            const b = reader.readU8();
            const a = i == 0 ? 0 : 255;
            this.palette[i] = (a << 24) | (b << 16) | (g << 8) | r;
        }
        reader.popPosition();
    }
    static read(file, reader) {
        const directoryIndex = file.directory.findIndex((dir) => dir.name == LumpName.PLAYPAL);
        if (directoryIndex == -1)
            throw new Error("Missing PLAYPAL lump");
        return new PaletteEntry(reader, file.directory[directoryIndex]);
    }
}
