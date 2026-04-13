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

enum SurfaceShape {
    Rectangle, Triangle
}

interface ISurfaceBase {
    readonly textureName: string;
    readonly lightLevel: number;
    readonly textureOffsetX?: number;
    readonly textureOffsetY?: number;
    readonly type: SurfaceType;
    // Is texture anchored to the floor, not to the ceiling?
    readonly bottomPegged?: boolean;
}

interface ISurfaceRectangle extends ISurfaceBase, IRectangle {
    readonly shape: SurfaceShape.Rectangle;
}

interface ISurfaceTriangle extends ISurfaceBase, ITriangle {
    readonly shape: SurfaceShape.Triangle;
}

type ISurface = ISurfaceRectangle | ISurfaceTriangle;

interface SidedefTexture {
    readonly textureName: string;
    readonly sidedef: SideDefEntry
}

class Triangulation {
    private static findSidedefTexture(
        right: SideDefEntry,
        left: SideDefEntry | undefined,
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
        let shapes: ISurface[] = [];

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
                shapes.push({
                    shape: SurfaceShape.Rectangle,
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
                    shapes.push({
                        shape: SurfaceShape.Rectangle,
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
                    shapes.push({
                        shape: SurfaceShape.Rectangle,
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
                    shapes.push({
                        shape: SurfaceShape.Rectangle,
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

        for (const [sectorIndexString, linedefs] of Object.entries(map.linedefsPerSector)) {
            const sectorIndex = parseInt(sectorIndexString);
            const sector = map.sectors[sectorIndex];

            // Icon of Sin has a single linedef with an assigned sector off the map. No special tags. Who knows.
            if (linedefs.length == 1) {
                console.info(`Sector ${sectorIndex} has a single linedef, skipping.`, linedefs);
                continue;
            }

            // Create a list of all of the linedefs relevant to this sector. Reverse "back" faces so further code does
            // not need to special case them.
            const searchPile: LinedefEntry[] = [];
            for (const linedef of linedefs) {
                const front = linedef.sidedefFont.sectorIndex;
                const back = linedef.sidedefBack?.sectorIndex;

                // Self referencing linedefs are skippable. For example, Doom 2, Map 1, Sector 1, has a sound blocking
                // linedef that is fully contained inside the sector.
                if (front == back) {
                    console.info("Skipped inclusive linedef", linedef);
                    continue;
                }

                if (front == sectorIndex) searchPile.push(linedef);
                if (back == sectorIndex) searchPile.push(linedef.tryReverse()!);
            }

            // Now order the vertices from the linedefs into the hull polygons.
            // Sectors can have multiple hulls -- some are donut holes, but they can also be unconnected unique rooms.
            // Donut holes have the opposite winding.
            const hulls: Vertex[][] = [];
            const searchPileDebug = [...searchPile];
            while (searchPile.length > 0) {
                const top = searchPile.pop()!;
                const hull: Vertex[] = [top.vertexA, top.vertexB];
                hulls.push(hull);
                const hullStart = hull[0];
                continueSearch: while (true) {
                    // Loop until we have completed a full ring.
                    const last = hull[hull.length - 1];

                    for (let i = 0; i < searchPile.length; ++i) {
                        const searchTarget = searchPile[i];
                        // The `last` is always a vertexB, so it must connect to a vertexA.
                        if (!Vertex.areEqual(last, searchTarget.vertexA)) continue;

                        // Since order is not important, do the removal from the end so it's always O(1).
                        searchPile[i] = searchPile[searchPile.length - 1];
                        searchPile.pop();

                        // Loop until we have completed a full ring.
                        if (Vertex.areEqual(searchTarget.vertexB, hullStart)) break continueSearch;

                        // Only push B, since `last` and vertexA are ==
                        hull.push(searchTarget.vertexB);
                        continue continueSearch;
                    }

                    throw new Error(`Unable to complete hull in sector index ${sectorIndexString}.`);
                }
            }

            let indexesCut = 0;

            // Simplify straight lines into single segments.
            for (const hull of hulls) {
                hullAgain: for (let i = 0; i < hull.length && hull.length > 3; ++i) {
                    // TODO: `next` could be looped on until the check condition is false to bulk these actions.
                    const bIndex = (i + 1) % hull.length;
                    const cIndex = (bIndex + 1) % hull.length;
                    const a = hull[i];
                    const b = hull[bIndex];
                    const c = hull[cIndex];

                    if ((a.x == b.x && a.x == c.x) ||
                        (a.y == b.y && a.y == c.y))
                    {
                        // Since they're in a row, slice out the redundant middle index.
                        hull.splice(bIndex, 1);
                        ++indexesCut;

                        // Loop until there's no more mutations.
                        i = 0;
                        continue hullAgain;
                    }
                }
            }

            function isConvex(a: Vertex, b: Vertex, c: Vertex): boolean {
                // For clockwise winding (interior on right in Y-up Doom coords), a right turn (convex) gives a negative cross product.
                const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
                return cross < 0;
            }

            function doesTriangleContainPoint(a: Vertex, b: Vertex, c: Vertex, point: Vertex): boolean {
                var s = (a.x - c.x) * (point.y - c.y) - (a.y - c.y) * (point.x - c.x);
                var t = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);

                if ((s < 0) != (t < 0) && s != 0 && t != 0) return false;

                var d = (c.x - b.x) * (point.y - b.y) - (c.y - b.y) * (point.x - b.x);
                return d == 0 || (d < 0) == (s + t <= 0);
            }

            function isTriangleHullContained(a: Vertex, b: Vertex, c: Vertex, hull: readonly Vertex[]): boolean {
                for (const point of hull) {
                    if (point == a || point == b || point == c) continue;
                    if (doesTriangleContainPoint(a, b, c, point)) return false;
                }

                return true;
            }

            console.log("hulls", sectorIndex, hulls, indexesCut);

            for (const hull of hulls) {
                const cloned = [...hull];
                const shapesStart = shapes.length;
                for (let i = 0; i < cloned.length && cloned.length > 2; ) {
                    const bIndex = (i + 1) % cloned.length;
                    const cIndex = (bIndex + 1) % cloned.length;
                    const a = cloned[i];
                    const b = cloned[bIndex];
                    const c = cloned[cIndex];

                    // The last triangle should not need any checks.
                    if (cloned.length > 3) {
                        if (!isConvex(a, b, c)) {
                            ++i;
                            continue;
                        }

                        if (!isTriangleHullContained(a, b, c, hull)) {
                            ++i;
                            continue;
                        }
                    }

                    shapes.push({
                        shape: SurfaceShape.Triangle,
                        v1: { x: a.x, y: a.y, z: sector.floorHeight },
                        v2: { x: c.x, y: c.y, z: sector.floorHeight },
                        v3: { x: b.x, y: b.y, z: sector.floorHeight },
                        textureName: sector.textureNameFloor,
                        lightLevel: sector.lightLevel,
                        type: SurfaceType.Floor,
                    });

                    shapes.push({
                        shape: SurfaceShape.Triangle,
                        v1: { x: a.x, y: a.y, z: sector.ceilingHeight },
                        v2: { x: b.x, y: b.y, z: sector.ceilingHeight },
                        v3: { x: c.x, y: c.y, z: sector.ceilingHeight },
                        textureName: sector.textureNameCeiling,
                        lightLevel: sector.lightLevel,
                        type: SurfaceType.Ceiling,
                    });

                    // The middle vertex can be cut because the tip of that V is now "filled."
                    cloned.splice(bIndex, 1);

                    // If `i` remained the same, we'd check [a, c, c+1] because [b] is removed, but [a-1, a, c] needs
                    // to be checked again because that's also a validation mutation.
                    i = Math.max(0, i - 1);
                }

                if (cloned.length > 2) {
                    // throw new Error();
                }

                console.log(sectorIndex, "triangulated", cloned, hull, shapes.slice(shapesStart));
            }
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
            shapes.push({
                shape: SurfaceShape.Rectangle,
                x:  { x: thing.x - halfWidth, y: thing.y, z: floorZ },
                y:  { x: thing.x - halfWidth, y: thing.y, z: floorZ + height },
                x2: { x: thing.x + halfWidth, y: thing.y, z: floorZ },
                y2: { x: thing.x + halfWidth, y: thing.y, z: floorZ + height },
                textureName: graphic.name,
                lightLevel: 255,
                type: SurfaceType.Sprite,
            });
        }

        return shapes;
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
