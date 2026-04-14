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

        // Triangulate the floors/ceilings.

        nextSector: for (const [sectorIndexString, linedefs] of Object.entries(map.linedefsPerSector)) {
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

            // TODO: Remove dead ends. Doom 2 map 22 has multiple deadends on sector 109.

            // Now order the vertices from the linedefs into the hull polygons.
            // Sectors can have multiple hulls -- some are donut holes, but they can also be unconnected unique rooms.
            // Donut holes have the opposite winding.
            const loops: Vertex[][] = [];
            const searchPileDebug = [...searchPile];
            while (searchPile.length > 0) {
                const top = searchPile.pop()!;
                const loop: Vertex[] = [top.vertexA, top.vertexB];
                loops.push(loop);
                const hullStart = loop[0];
                continueSearch: while (true) {
                    // Loop until we have completed a full ring.
                    const last = loop[loop.length - 1];

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
                        loop.push(searchTarget.vertexB);
                        continue continueSearch;
                    }

                    console.info(`Unable to complete hull in sector index ${sectorIndexString}.`, searchPileDebug, loops);
                    continue nextSector;
                }
            }

            let indexesCut = 0;

            // Simplify straight lines into single segments.
            for (const loop of loops) {
                hullAgain: for (let i = 0; i < loop.length && loop.length > 3; ++i) {
                    // TODO: `next` could be looped on until the check condition is false to bulk these actions.
                    const bIndex = (i + 1) % loop.length;
                    const cIndex = (bIndex + 1) % loop.length;
                    const a = loop[i];
                    const b = loop[bIndex];
                    const c = loop[cIndex];

                    if (b.subtract(a).cross(c.subtract(a)) == 0)
                    {
                        // Since they're in a row, slice out the redundant middle index.
                        loop.splice(bIndex, 1);
                        ++indexesCut;

                        // Loop until there's no more mutations.
                        i = 0;
                        continue hullAgain;
                    }
                }
            }

            function isConvex(a: Vertex, b: Vertex, c: Vertex): boolean {
                // For clockwise winding (interior on right in Y-up Doom coords), a right turn (convex) gives a negative cross product.
                return b.subtract(a).cross(c.subtract(b)) < 0;
            }

            function isClockwise(vertices: readonly Vertex[]): boolean {
                let area = 0;
                for (let i = 0; i < vertices.length; i++) {
                    const a = vertices[i];
                    const b = vertices[(i + 1) % vertices.length];
                    area += (b.x - a.x) * (b.y + a.y);
                }
                return area < 0;
            }

            function doesTriangleContainPoint(a: Vertex, b: Vertex, c: Vertex, point: Vertex): boolean {
                var crossAC = a.subtract(c).cross(point.subtract(c));
                var crossBA = b.subtract(a).cross(point.subtract(a));

                if ((crossAC < 0) != (crossBA < 0) && crossAC != 0 && crossBA != 0) return false;

                var crossCB = c.subtract(b).cross(point.subtract(b));
                return crossCB == 0 || (crossCB < 0) == (crossAC + crossBA <= 0);
            }

            function isTriangleHullContained(a: Vertex, b: Vertex, c: Vertex, hull: readonly Vertex[]): boolean {
                for (const point of hull) {
                    if (point == a || point == b || point == c) continue;
                    if (doesTriangleContainPoint(a, b, c, point)) return false;
                }

                return true;
            }

            function isPointInsideLoop(loop: readonly Vertex[], point: Vertex): boolean {
                // Raycast and return if odd number of intersections.
                let inside = false;
                for (let i = 0; i < loop.length; i++) {
                    const a = loop[i];
                    const b = loop[(i + 1) % loop.length];
                    if ((a.y > point.y) == (b.y > point.y)) continue;
                    if (point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) {
                        inside = !inside;
                    }
                }
                return inside;
            }

            function isContainedByLoop(loop: readonly Vertex[], points: readonly Vertex[]): boolean {
                for (const point of points) {
                    if (isPointInsideLoop(loop, point)) return true;
                }
                return false;
            }

            function segmentsIntersect(p1: Vertex, p2: Vertex, p3: Vertex, p4: Vertex): boolean {
                const d1 = p4.subtract(p3).cross(p1.subtract(p3));
                const d2 = p4.subtract(p3).cross(p2.subtract(p3));
                const d3 = p2.subtract(p1).cross(p3.subtract(p1));
                const d4 = p2.subtract(p1).cross(p4.subtract(p1));

                if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
                    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
                    return true;
                }

                // Collinear overlap cases.
                if (d1 === 0 && isOnSegment(p3, p4, p1)) return true;
                if (d2 === 0 && isOnSegment(p3, p4, p2)) return true;
                if (d3 === 0 && isOnSegment(p1, p2, p3)) return true;
                if (d4 === 0 && isOnSegment(p1, p2, p4)) return true;

                return false;
            }

            // Is `point` inside A/B's AABB bounding box?
            function isOnSegment(a: Vertex, b: Vertex, point: Vertex): boolean {
                return Math.min(a.x, b.x) <= point.x && point.x <= Math.max(a.x, b.x) &&
                       Math.min(a.y, b.y) <= point.y && point.y <= Math.max(a.y, b.y);
            }

            function isBridgeValid(from: Vertex, to: Vertex, loops: Vertex[][]): boolean {
                for (const loop of loops) {
                    for (var i = 0; i < loop.length; i++) {
                        const a = loop[i];
                        const b = loop[(i + 1) % loop.length];
                        if (Vertex.areEqual(a, from) || Vertex.areEqual(a, to)) continue;
                        if (Vertex.areEqual(b, from) || Vertex.areEqual(b, to)) continue;
                        if (segmentsIntersect(from, to, a, b)) return false;
                    }
                }
                return true;
            }

            // Merges the holes into the outer loop. This is done by adding a bridge (a cut) going from the hole
            // to the outer loop. Since the holes are opposite windings, they're already in the correct order
            // for this operation. "Real-time Collision Detection" chapter 12.5.
            function mergeHoles(outer: readonly Vertex[], holes: readonly Vertex[][]): Vertex[] {
                let merged = [...outer];
                let remainingHoles = [...holes];

                nextHole: while (remainingHoles.length > 0) {
                    for (let holeIndex = 0; holeIndex < remainingHoles.length; holeIndex++) {
                        const hole = remainingHoles[holeIndex];
                        for (let holeVertex = 0; holeVertex < hole.length; holeVertex++) {
                            for (let mergedVertex = 0; mergedVertex < merged.length; mergedVertex++) {
                                const from = hole[holeVertex];
                                const to = merged[mergedVertex];
                                if (!isBridgeValid(from, to, [merged, ...remainingHoles])) continue;

                                const reorderedHole = [
                                    ...hole.slice(holeVertex),
                                    ...hole.slice(0, holeVertex),
                                ];

                                // Place cut from the outer loop into the hole and back:
                                // ...outer... -> bridgeOuter -> bridgeHole -> ...hole... -> bridgeHole -> bridgeOuter -> ...outer...
                                // Both bridge vertices are duplicated to form the two sides of the cut.
                                merged.splice(
                                    mergedVertex + 1,
                                    0,
                                    ...reorderedHole,
                                    reorderedHole[0],
                                    merged[mergedVertex],
                                );

                                remainingHoles.splice(holeIndex, 1);
                                continue nextHole;
                            }
                        }
                    }

                    throw new Error("No valid bridge found for hole");
                }

                return merged;
            }

            console.log("hulls", sectorIndex, loops, indexesCut);

            // Find the loops that are holes (reversed winding order).
            const holes: Vertex[][] = [];
            for (let i = loops.length - 1; i >= 0; --i) {
                const loop = loops[i];
                if (isClockwise(loop)) {
                    loops.splice(i, 1);
                    holes.push(loop);
                }
            }

            // Find which loops contain the holes.
            const hulls: { outer: readonly Vertex[], holes: readonly Vertex[][] }[] = [];
            for (let loop of loops) {
                const containedHoles: Vertex[][] = [];
                for (let i = holes.length - 1; i >= 0; --i) {
                    const hole = holes[i];
                    if (isContainedByLoop(loop, hole)) {
                        containedHoles.push(hole);
                        holes.splice(i, 1);
                    }
                }

                hulls.push({ outer: loop, holes: containedHoles });
            }

            if (holes.length > 0) {
                console.info(sectorIndex, "Sector contains holes that are not contained by an outer loop.", holes);
            }

            // Triangulate each loop.
            for (const hull of hulls) {
                const cloned = mergeHoles(hull.outer, hull.holes);
                const shapesStart = shapes.length;
                for (let i = 0; i < cloned.length && cloned.length > 2; ) {
                    const bIndex = (i + 1) % cloned.length;
                    const cIndex = (bIndex + 1) % cloned.length;
                    const a = cloned[i];
                    const b = cloned[bIndex];
                    const c = cloned[cIndex];

                    // The last triangle should not need any checks.
                    if (cloned.length > 3) {
                        if (!isConvex(a, b, c) || !isTriangleHullContained(a, b, c, cloned)) {
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
                    console.error(sectorIndex, "Did not consume all lines.", cloned);
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
