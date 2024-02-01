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
            reader.addEventListener("loadend", (_loadEvent) => {
                loaded(reader.result as ArrayBuffer);
            });

            reader.readAsArrayBuffer(file);
        });
    }
}

abstract class MapView {
    protected readonly wad: Promise<WadFile>;
    protected isMouseDown: boolean = false;
    protected currentMap: MapEntry | undefined;

    private awaitingRender: boolean = false;

    constructor(protected readonly canvas: HTMLCanvasElement) {
        this.wad = new Promise<WadFile>((resolve, _reject) => {
            canvas.addEventListener("dblclick", async (_event) => {
                if (this.wad != null) return;

                try {
                    canvas.classList.add("loading");
                    const response = await fetch("./doom1.wad");
                    if (response.status != 200) {
                        alert(`Download failed :(  ${response.statusText} (${response.status}) ${await response.text()}`);
                        return;
                    }

                    const blob = await response.blob()
                    resolve(new WadFile(await blob.arrayBuffer()));
                }
                finally {
                    canvas.classList.remove("loading");
                }
            });

            new UserFileInput(canvas, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });

        document.addEventListener("wheel", (e) => this.onWheel(e));
        window.addEventListener("resize", (e) => this.onResize(e));
        canvas.addEventListener("mousedown", (e) => {
            this.isMouseDown = true;
            this.onMouseDown(e);
        });
        canvas.addEventListener("mouseup", (e) => {
            this.isMouseDown = false;
            this.onMouseUp(e);
        });
        canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
        canvas.addEventListener("dblclick", (e) => this.onDoubleClick(e));
        document.addEventListener("keyup", (e) => this.onKeyUp(e));
    }

    protected redraw(): void {
        if (this.awaitingRender) return;
        this.awaitingRender = true;

        requestAnimationFrame(() => {
            this.draw();
            this.awaitingRender = false;
        });
    }

    public abstract displayLevel(index: number): Promise<void>;

    protected abstract draw(): void;
    protected abstract onWheel(event: WheelEvent): void;
    protected abstract onResize(event: UIEvent): void;
    protected abstract onMouseDown(event: MouseEvent): void;
    protected abstract onMouseUp(event: MouseEvent): void;
    protected abstract onMouseMove(event: MouseEvent): void;
    protected abstract onDoubleClick(event: MouseEvent): void;
    protected abstract onKeyUp(event: KeyboardEvent): void;
}

function matVecMul(m: any, v: any) {
    return {
        x: m.a * v.x + m.c * v.y + m.e,
        y: m.b * v.x + m.d * v.y + m.f
    };
}

type IVertex = Readonly<{ x: number; y: number; z: number }>;
type IVertex2D = Readonly<{ x: number; y: number }>;
type ITriangle = Readonly<{ v1: IVertex; v2: IVertex; v3: IVertex }>;
type IRectangle = Readonly<{ x: IVertex; y: IVertex; x2: IVertex; y2: IVertex }>;

class Triangulation {
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
            const br = { x: a.x, y: a.y, z: ceilingb };
            const tl = { x: b.x, y: b.y, z: floora };
            const tr = { x: b.x, y: b.y, z: ceilingb };
            rectangles.push({
                x: { x: a.x, y: a.y, z: floora },
                y: { x: a.x, y: a.y, z: floora },
                x2: { x: b.x, y: b.y, z: floorb },
                y2: { x: b.x, y: b.y, z: floorb }
            });
            rectangles.push({
                x: { x: a.x, y: a.y, z: ceilinga },
                y: { x: a.x, y: a.y, z: ceilinga },
                x2: { x: b.x, y: b.y, z: ceilingb },
                y2: { x: b.x, y: b.y, z: ceilingb }
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
                dy == Number.NEGATIVE_INFINITY) {
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

    public static rectToTriangleHorizontal(triangles: ITriangle[], x: number, y: number, x2: number, y2: number, z: number): void {
        const bl = { x: x,  y: y,  z: z };
        const tl = { x: x,  y: y2, z: z };
        const br = { x: x2, y: y,  z: z };
        const tr = { x: x2, y: y2, z: z };
        triangles.push({ v1: bl, v2: tl, v3: br });
        triangles.push({ v1: tr, v2: tl, v3: br });
    }

    public static rectToTriangleVertical(triangles: ITriangle[], x: number, y: number, x2: number, y2: number, z: number, z2: number): void {
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

// class MapView3D extends MapView {
// }

class MapView2D extends MapView {
    private readonly thingHitTester;

    private canvasWidth: number;
    private canvasHeight: number;
    private highlightedThingIndex: number = -1;
    private dashedStrokeOffset: number = 0;
    private levelIndex: number = 0;
    private readonly viewMatrix = new DOMMatrix([1, 0, 0, -1, 0, 0]);

    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        canvas.style.position = "fixed";
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;

        this.thingHitTester = new HitTester<ThingEntry>(this.viewMatrix)

        setInterval(() => {
            if (this.highlightedThingIndex == -1) return;
            --this.dashedStrokeOffset;
            this.redraw();
        }, 40);

        this.redraw();
    }

    protected override onWheel(event: WheelEvent): void {
        if (this.currentMap == null) return;

        const pos = matVecMul(this.viewMatrix.inverse(), {
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

    protected override onResize(event: UIEvent): void {
        this.canvas.width  = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvasWidth = this.canvas.width;
        this.canvasHeight = this.canvas.height;
        this.redraw();
    }

    protected override onMouseDown(_event: MouseEvent): void {}
    protected override onMouseUp(_event: MouseEvent): void {}

    protected override onMouseMove(event: MouseEvent): void {
        if (this.currentMap == null) return;

        const hitResult = this.thingHitTester.hitTest(event.offsetX, event.offsetY);
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

    protected override onDoubleClick(_event: MouseEvent): void {
        const map = this.currentMap!;

        if (map == null) {
            console.error("No map!");
            return;
        }

        const triangles: ITriangle[] = [];
        const rects = Triangulation.getRectangles(map);
        for (const rect of rects) {
            Triangulation.rectToTriangle(triangles, rect);
        }
        const stl = Triangulation.getStl(triangles);
        console.log(stl);
    }

    protected override onKeyUp(event: KeyboardEvent): void {
        switch (event.key) {
            case "-":
                this.levelIndex = Math.max(this.levelIndex - 1, 0);
                this.displayLevel(this.levelIndex);
                break;
            case "+":
                this.levelIndex = this.levelIndex + 1;
                this.displayLevel(this.levelIndex);
                break;
        }
    }

    private drawHelpText2d(context: CanvasRenderingContext2D): void {
        function drawCentered(text: string, width: number, height: number): void {
            const metrics = context.measureText(text);
            const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            context.fillText(text, width / 2 - metrics.width / 2, height / 2 - actualHeight / 2, width);
        }

        function drawBottomLeft(text: string, width: number, height: number): void {
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
        drawCentered("Drag & Drop WAD", this.canvasWidth, this.canvasHeight);
        context.font = "20px serif";
        drawCentered("Or double click to load the shareware WAD", this.canvasWidth, this.canvasHeight + 40);
        context.font = "20px serif";
        drawBottomLeft("Controls:\nZoom: Mouse wheel (shift for faster zoom)\nPan: Drag with mouse\nChange level: + and -", this.canvasWidth, this.canvasHeight);
    }

    protected override draw(): void {
        const context = this.canvas.getContext("2d")!;
        context.setTransform(undefined);
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        context.setTransform(this.viewMatrix);

        context.imageSmoothingQuality = "high";
        context.imageSmoothingEnabled = true;

        const map = this.currentMap;
        if (map == null) {
            this.drawHelpText2d(context);
            return;
        }

        // Draws a circle at the origin.
        if (true) {
            context.beginPath();
            context.fillStyle = "red";
            context.arc(0, 0, 20, 0, Math.PI * 2);
            context.fill();
        }

        context.lineWidth = 1;
        let i = 0;
        for (const linedef of map.linedefs) {
            context.beginPath();
            if (linedef.hasFlag(LinedefFlags.SECRET)) {
                context.strokeStyle = "purple";
            } else if (linedef.hasFlag(LinedefFlags.DONTDRAW)) {
                context.strokeStyle = "grey";
            } else {
                context.strokeStyle = "black";
            }

            context.moveTo(linedef.vertexA.x, linedef.vertexA.y);
            context.lineTo(linedef.vertexB.x, linedef.vertexB.y);
            context.stroke();
        }

        // Not all entries are used as index values, so we must grab this while enumerating.
        let selectedThingEntry: ThingEntry | null = null;
        let thingIndex = 0;
        this.thingHitTester.startUpdate(map.things.length);
        for (const thing of map.things) {
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

            if (thing.type == ThingsType.HealthBonus) {
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
        if (selectedThingEntry != null) {
            const thing = selectedThingEntry;

            const centerX = thing.x;
            const centerY = thing.y;
            const radius = thing.description!.radius;

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
        context.fillText(this.currentMap?.displayName ?? "Unknown", 0, 0, 300);
    }

    public override async displayLevel(index: number): Promise<void> {
        this.levelIndex = index;
        const wad = await this.wad;
        this.currentMap = wad.maps[index] ?? wad.maps[0];
        const player1Start = this.currentMap.things.find((t) => t.type == ThingsType.PlayerOneStart);
        this.currentMap.linedefs
        if (player1Start != undefined) {
            // Eh. Centering on the player start isn't the best, but might be improvable.
            // this.viewMatrix.translateSelf(-player1Start.x, -player1Start.y);
            // this.redraw();
        }

        this.fitLevelToView(this.currentMap);
    }

    private fitLevelToView(map: MapEntry): void {
        let x = Number.POSITIVE_INFINITY;
        let y = Number.POSITIVE_INFINITY;
        let dx = Number.NEGATIVE_INFINITY;
        let dy = Number.NEGATIVE_INFINITY;
        for (const linedef of map.linedefs) {
            x = Math.min(x, linedef.vertexA.x);
            x = Math.min(x, linedef.vertexB.x);
            y = Math.min(y, linedef.vertexA.y * 1);
            y = Math.min(y, linedef.vertexB.y * 1);
            dx = Math.max(dx, linedef.vertexA.x);
            dx = Math.max(dx, linedef.vertexB.x);
            dy = Math.max(dy, linedef.vertexA.y * 1);
            dy = Math.max(dy, linedef.vertexB.y * 1);
        }

        const canvasWidth = this.canvasWidth;
        const canvasHeight = this.canvasHeight;
        const scaleX = canvasWidth / (dx - x);
        const scaleY = canvasHeight / (dy - y);
        const scale = Math.min(scaleX, scaleY);

        let translateX = (canvasWidth - (dx - x) * scale) / 2 - x * scale;
        let translateY = (canvasHeight - (dy - y) * scale) / 2 - y * scale;

        this.viewMatrix.a = scale;
        this.viewMatrix.d = scale;
        this.viewMatrix.e = translateX;
        this.viewMatrix.f = translateY;

        this.redraw();
    }
}

class MapView3D extends MapView {
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        canvas.style.position = "fixed";
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;

        this.redraw();
    }

    public async displayLevel(index: number): Promise<void> {
        const wad = await this.wad;
        this.currentMap = wad.maps[index] ?? wad.maps[0];
    }

    protected draw(): void {}
    protected onWheel(_event: WheelEvent): void {}
    protected onResize(_event: UIEvent): void {}
    protected onMouseDown(_event: MouseEvent): void {}
    protected onMouseUp(_event: MouseEvent): void {}
    protected onMouseMove(_event: MouseEvent): void {}
    protected onDoubleClick(_event: MouseEvent): void {}
    protected onKeyUp(_event: KeyboardEvent): void {}
}

const el = document.querySelector<HTMLCanvasElement>("canvas")!;
const mapView = new MapView2D(el);
mapView.displayLevel(0);
