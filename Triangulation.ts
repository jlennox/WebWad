type IVertex = Readonly<{ x: number; y: number; z: number }>;
type IVertex2D = Readonly<{ x: number; y: number }>;
type ITriangle = Readonly<{ v1: IVertex; v2: IVertex; v3: IVertex }>;
type IRectangle = Readonly<{ x: IVertex; y: IVertex; x2: IVertex; y2: IVertex }>;

class Triangulation {
    // Rectangles are a compromise because floors require triangles.
    // This exists for experimental types of rendering that require rectangles.
    public static getRectangles(map: MapEntry): readonly IRectangle[] {
        let rectangles: IRectangle[] = [];

        for (const linedef of map.linedefs) {
            const a = linedef.vertexA;
            const b = linedef.vertexB;
            const sectorLeft = linedef.sidedefLeft?.sector;
            const sectorRight = linedef.sidedefRight?.sector;

            if (sectorLeft == null || sectorRight == null) {
                // Single-sided wall: full wall from floor to ceiling.
                const sector = sectorLeft ?? sectorRight;
                if (sector == null) continue;
                rectangles.push({
                    x:  { x: a.x, y: a.y, z: sector.floorHeight },
                    y:  { x: a.x, y: a.y, z: sector.ceilingHeight },
                    x2: { x: b.x, y: b.y, z: sector.floorHeight },
                    y2: { x: b.x, y: b.y, z: sector.ceilingHeight }
                });
            } else {
                // Two-sided wall: draw walls where heights differ.
                var lowerFloor = Math.min(sectorLeft.floorHeight, sectorRight.floorHeight);
                var upperFloor = Math.max(sectorLeft.floorHeight, sectorRight.floorHeight);
                var lowerCeiling = Math.min(sectorLeft.ceilingHeight, sectorRight.ceilingHeight);
                var upperCeiling = Math.max(sectorLeft.ceilingHeight, sectorRight.ceilingHeight);

                // Lower wall (step-up between different floor heights).
                if (upperFloor > lowerFloor) {
                    rectangles.push({
                        x:  { x: a.x, y: a.y, z: lowerFloor },
                        y:  { x: a.x, y: a.y, z: upperFloor },
                        x2: { x: b.x, y: b.y, z: lowerFloor },
                        y2: { x: b.x, y: b.y, z: upperFloor }
                    });
                }

                // Upper wall (between different ceiling heights).
                if (upperCeiling > lowerCeiling) {
                    rectangles.push({
                        x:  { x: a.x, y: a.y, z: lowerCeiling },
                        y:  { x: a.x, y: a.y, z: upperCeiling },
                        x2: { x: b.x, y: b.y, z: lowerCeiling },
                        y2: { x: b.x, y: b.y, z: upperCeiling }
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

            // Triangulation.rectToTriangleHorizontal(triangles, x, y, dx, dy, floorHeight);
            rectangles.push({
                x: { x: x, y: y, z: floorHeight },
                y: { x: x, y: dy, z: floorHeight },
                x2: { x: dx, y: y, z: floorHeight },
                y2: { x: dx, y: dy, z: floorHeight }
            });
        }

        return rectangles;
    }

    public static rectToTriangleHorizontal(
        triangles: ITriangle[],
        x: number, y: number, x2: number, y2: number,
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
