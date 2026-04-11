interface IVertex {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

interface IVertex2D {
    readonly x: number;
    readonly y: number;
}

interface ITriangle {
    readonly v1: IVertex;
    readonly v2: IVertex;
    readonly v3: IVertex;
}

interface IRectangle {
    readonly x: IVertex;
    readonly y: IVertex;
    readonly x2: IVertex;
    readonly y2: IVertex;
}

enum SurfaceType {
    Floor,
    Ceiling,
    Wall,
    MiddleWall,
    Sprite,
}

interface ISurface extends IRectangle {
    readonly textureName: string;
    readonly lightLevel: number;
    readonly textureOffsetX?: number;
    readonly textureOffsetY?: number;
    readonly type: SurfaceType;
    // Is texture anchored to the floor, not to the ceiling?
    readonly bottomPegged?: boolean;
}

interface SidedefTexture {
    readonly textureName: string;
    readonly sidedef: SideDefEntry
}

class Triangulation {
    private static findSidedefTexture(
        right: SideDefEntry,
        left: SideDefEntry | null,
        getter: (s: SideDefEntry) => string
    ): SidedefTexture | null {
        const rightName = getter(right);
        if (rightName != "-") return { textureName: rightName, sidedef: right };

        if (left != null) {
            const leftName = getter(left);
            if (leftName != "-") return { textureName: leftName, sidedef: left };
        }
        return null;
    }

    // This should ultimately return triangles, but for simplicity, it currently returns rectangles.
    public static getRectangles(map: MapEntry): readonly ISurface[] {
        let rectangles: ISurface[] = [];

        for (const linedef of map.linedefs) {
            const b = linedef.vertexA;
            const a = linedef.vertexB;
            const sidedefFont = linedef.sidedefFont;
            const sidedefBack = linedef.sidedefBack;
            const sectorFront = sidedefFont?.sector;
            const sectorBack = sidedefBack?.sector;

            // Single-sided wall: full wall from floor to ceiling.
            if (sectorBack == null || sectorFront == null) {
                const sidedef = sidedefFont ?? sidedefBack;
                const sector = sectorFront ?? sectorBack;
                if (sector == null || sidedef == null) continue;
                rectangles.push({
                    x:  { x: a.x, y: a.y, z: sector.floorHeight },
                    y:  { x: a.x, y: a.y, z: sector.ceilingHeight },
                    x2: { x: b.x, y: b.y, z: sector.floorHeight },
                    y2: { x: b.x, y: b.y, z: sector.ceilingHeight },
                    textureName: sidedef.textureNameMiddle,
                    lightLevel: sector.lightLevel,
                    textureOffsetX: sidedef.textureXOffset,
                    textureOffsetY: sidedef.textureYOffset,
                    type: SurfaceType.Wall,
                    bottomPegged: linedef.hasFlag(LinedefFlags.DONTPEGBOTTOM),
                });
                continue;
            }

            // Two-sided wall: draw walls where heights differ.
            // Lower wall (step-up between different floor heights).
            if (sectorBack.floorHeight != sectorFront.floorHeight) {
                const lowerZ = Math.min(sectorBack.floorHeight, sectorFront.floorHeight);
                const upperZ = Math.max(sectorBack.floorHeight, sectorFront.floorHeight);
                const sidedef = Triangulation.findSidedefTexture(sidedefFont, sidedefBack, (s) => s.textureNameLower);

                if (sidedef != null) {
                    rectangles.push({
                        x:  { x: a.x, y: a.y, z: lowerZ },
                        y:  { x: a.x, y: a.y, z: upperZ },
                        x2: { x: b.x, y: b.y, z: lowerZ },
                        y2: { x: b.x, y: b.y, z: upperZ },
                        textureName: sidedef.textureName,
                        lightLevel: sidedef.sidedef.sector.lightLevel,
                        textureOffsetX: sidedef.sidedef.textureXOffset,
                        textureOffsetY: sidedef.sidedef.textureYOffset,
                        type: SurfaceType.Wall,
                    });
                }
            }

            // Upper wall (between different ceiling heights).
            if (sectorBack.ceilingHeight != sectorFront.ceilingHeight) {
                const lowerZ = Math.min(sectorBack.ceilingHeight, sectorFront.ceilingHeight);
                const upperZ = Math.max(sectorBack.ceilingHeight, sectorFront.ceilingHeight);
                const sidedef = Triangulation.findSidedefTexture(sidedefFont, sidedefBack, (s) => s.textureNameUpper);

                if (sidedef != null) {
                    rectangles.push({
                        x:  { x: a.x, y: a.y, z: lowerZ },
                        y:  { x: a.x, y: a.y, z: upperZ },
                        x2: { x: b.x, y: b.y, z: lowerZ },
                        y2: { x: b.x, y: b.y, z: upperZ },
                        textureName: sidedef.textureName,
                        lightLevel: sidedef.sidedef.sector.lightLevel,
                        textureOffsetX: sidedef.sidedef.textureXOffset,
                        textureOffsetY: sidedef.sidedef.textureYOffset,
                        type: SurfaceType.Wall,
                        bottomPegged: !linedef.hasFlag(LinedefFlags.DONTPEGTOP),
                    });
                }
            }

            // Middle wall on a two-sided linedef (gates, fences, grates).
            const middleSidedef = Triangulation.findSidedefTexture(sidedefFont, sidedefBack, (s) => s.textureNameMiddle);
            if (middleSidedef != null) {
                // Midtex spans the open part of the portal: from the higher floor up to the lower ceiling.
                const lowerZ = Math.max(sectorFront.floorHeight, sectorBack.floorHeight);
                const upperZ = Math.min(sectorFront.ceilingHeight, sectorBack.ceilingHeight);
                if (upperZ > lowerZ) {
                    rectangles.push({
                        x:  { x: a.x, y: a.y, z: lowerZ },
                        y:  { x: a.x, y: a.y, z: upperZ },
                        x2: { x: b.x, y: b.y, z: lowerZ },
                        y2: { x: b.x, y: b.y, z: upperZ },
                        textureName: middleSidedef.textureName,
                        lightLevel: middleSidedef.sidedef.sector.lightLevel,
                        textureOffsetX: middleSidedef.sidedef.textureXOffset,
                        textureOffsetY: middleSidedef.sidedef.textureYOffset,
                        type: SurfaceType.MiddleWall,
                        bottomPegged: linedef.hasFlag(LinedefFlags.DONTPEGBOTTOM),
                    });
                }
            }
        }

        for (const [sectorIndex, linedefs] of Object.entries(map.linedefsPerSector)) {
            const vertices: IVertex2D[] = [];
            const usedVertixes = new Set<Number>();
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
                dy == Number.NEGATIVE_INFINITY)
            {
                continue;
            }

            // Floor.
            // x2/y are swapped from ceiling so texture faces into the sector.
            rectangles.push({
                x: { x: x, y: y, z: floorHeight },
                x2: { x: x, y: dy, z: floorHeight },
                y: { x: dx, y: y, z: floorHeight },
                y2: { x: dx, y: dy, z: floorHeight },
                textureName: sector.textureNameFloor,
                lightLevel: sector.lightLevel,
                type: SurfaceType.Floor,
            });

            // Ceiling.
            rectangles.push({
                x: { x: x, y: y, z: sector.ceilingHeight },
                y: { x: x, y: dy, z: sector.ceilingHeight },
                x2: { x: dx, y: y, z: sector.ceilingHeight },
                y2: { x: dx, y: dy, z: sector.ceilingHeight },
                textureName: sector.textureNameCeiling,
                lightLevel: sector.lightLevel,
                type: SurfaceType.Ceiling,
            });
        }

        for (const thing of map.things) {
            const graphic = map.wadFile.getImageData(thing.description?.sprite)[0];
            if (graphic == null) continue;

            const halfWidth = graphic.width / 2;
            const height = graphic.height;
            const sector = map.findSector(thing.x, thing.y);
            if (sector == null) {
                console.error(`Unable to find sector for thing at (${thing.x}, ${thing.y}). Skipping.`, thing);
                continue;
            }

            const floorZ = sector.floorHeight;
            rectangles.push({
                x:  { x: thing.x - halfWidth, y: thing.y, z: floorZ },
                y:  { x: thing.x - halfWidth, y: thing.y, z: floorZ + height },
                x2: { x: thing.x + halfWidth, y: thing.y, z: floorZ },
                y2: { x: thing.x + halfWidth, y: thing.y, z: floorZ + height },
                textureName: graphic.name,
                lightLevel: 255,
                type: SurfaceType.Sprite,
            });
        }

        return rectangles;
    }

    public static rectToTriangleHorizontal(
        triangles: ITriangle[],
        x: number, y: number,
        x2: number, y2: number,
        z: number): void
    {
        const bl = { x: x, y: y, z: z };
        const tl = { x: x, y: y2, z: z };
        const br = { x: x2, y: y, z: z };
        const tr = { x: x2, y: y2, z: z };
        triangles.push({ v1: bl, v2: tl, v3: br });
        triangles.push({ v1: tr, v2: tl, v3: br });
    }

    public static rectToTriangleVertical(
        triangles: ITriangle[],
        x: number, y: number, x2: number, y2: number,
        z: number, z2: number): void
    {
        const bl = { x: x, y: y, z: z };
        const br = { x: x, y: y, z: z2 };
        const tl = { x: x2, y: y2, z: z };
        const tr = { x: x2, y: y2, z: z2 };
        triangles.push({ v1: br, v2: bl, v3: tr });
        triangles.push({ v1: bl, v2: tl, v3: tr });
    }

    public static rectToTriangle(triangles: ITriangle[], rect: IRectangle): void {
        if (rect.x.z == rect.x2.z) {
            Triangulation.rectToTriangleHorizontal(
                triangles,
                rect.x.x, rect.x.y,
                rect.x2.x, rect.y2.y,
                rect.x.z);
        } else {
            Triangulation.rectToTriangleVertical(
                triangles,
                rect.x.x, rect.x.y,
                rect.x2.x, rect.x2.y,
                rect.x.z, rect.x2.z);
        }
    }

    public static getStl(triangles: readonly ITriangle[]): string {
        let stlString = "solid doom_map\n";

        for (let triangle of triangles) {
            const {v1, v2, v3} = triangle;
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
