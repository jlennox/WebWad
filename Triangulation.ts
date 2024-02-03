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
            const sectora = linedef.sidedefLeft?.sector;
            const sectorb = linedef.sidedefRight?.sector;
            const floora = sectora?.floorHeight ?? 0;
            const floorb = sectorb?.floorHeight ?? 0;
            const ceilinga = sectora?.ceilingHeight ?? 0;
            const ceilingb = sectorb?.ceilingHeight ?? 0;

            // Triangulation.rectToTriangleVertical(triangles, a.x, a.y, b.x, b.y, floora, floorb);
            // Triangulation.rectToTriangleVertical(triangles, a.x, a.y, b.x, b.y, ceilinga, ceilingb);
            const bl = { x: a.x, y: a.y, z: floora };
            const br = { x: a.x, y: a.y, z: ceilinga };
            const tl = { x: b.x, y: b.y, z: floorb };
            const tr = { x: b.x, y: b.y, z: ceilingb };
            rectangles.push({
                x: bl,
                y: bl,
                x2: tl,
                y2: tl
            });
            rectangles.push({
                x: br,
                y: br,
                x2: tr,
                y2: tr
            });
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
            const v1 = triangle.v1;
            const v2 = triangle.v2;
            const v3 = triangle.v3;
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
