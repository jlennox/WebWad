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

    private awaitingRender: boolean = false;

    constructor(protected readonly canvas: HTMLCanvasElement) {
        this.wad = new Promise<WadFile>((resolve, _reject) => {
            canvas.addEventListener("dblclick", async (_event) => {
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
        document.addEventListener("resize", (e) => this.onResize(e));
        canvas.addEventListener("mousedown", (e) => {
            this.isMouseDown = true;
            this.onMouseDown(e);
        });
        canvas.addEventListener("mouseup", (e) => {
            this.isMouseDown = false;
            this.onMouseUp(e);
        });
        canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
        canvas.addEventListener("keyup", (e) => this.onKeyUp(e));
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
    protected abstract onKeyUp(event: KeyboardEvent): void;
}

function matVecMul(m: any, v: any) {
    return {
        x: m.a * v.x + m.c * v.y + m.e,
        y: m.b * v.x + m.d * v.y + m.f
    };
}

class MapView2D extends MapView {
    private readonly thingHitTester;

    private currentMap: MapEntry | undefined;
    private canvasWidth: number;
    private canvasHeight: number;
    private highlightedThingIndex: number = -1;
    private dashedStrokeOffset: number = 0;
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

        this.viewMatrix.translateSelf(pos.x, pos.y);
        this.viewMatrix.scaleSelf(event.deltaY < 0 ? 1.1 : 0.9);
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

    protected override onMouseDown(event: MouseEvent): void {}
    protected override onMouseUp(event: MouseEvent): void {}

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

    protected override onKeyUp(event: KeyboardEvent): void {
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
        drawBottomLeft("Controls:\nZoom: Mouse wheel (shift for faster zoom)\nPan: Drag with mouse", this.canvasWidth, this.canvasHeight);
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
            context.arc(0, 0, 30, 0, Math.PI * 2);
            context.fill();
        }

        context.lineWidth = 1;
        let i = 0;
        for (const linedef of map.linedefs) {
            context.beginPath();
            if (linedef.hasFlag(LinedefFlags.SECRET)) {
                context.strokeStyle = "red";
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

            if (thing.description.sprite == ThingSprite.BON1) {
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
            context.setLineDash([6, 6 ]);
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
    }

    public override async displayLevel(index: number): Promise<void> {
        const wad = await this.wad;
        this.currentMap = wad.maps[index] ?? wad.maps[0];
        const player1Start = this.currentMap.things.find((t) => t.type == 1);
        if (player1Start != undefined) {
            // TODO: Fix. Works really badly on doom1.wad
            this.viewMatrix.translateSelf(player1Start.x, player1Start.y);
        }

        // let x = Number.MAX_VALUE, y = Number.MAX_VALUE, dx = Number.MIN_VALUE, dy = Number.MIN_VALUE;
        // for (const linedef of this.currentMap.linedefs) {
        //     x = Math.min(x, linedef.vertexA.x);
        //     x = Math.min(x, linedef.vertexB.x);
        //     y = Math.min(y, linedef.vertexA.y * 1);
        //     y = Math.min(y, linedef.vertexB.y * 1);
        //     dx = Math.max(dx, linedef.vertexA.x);
        //     dx = Math.max(dx, linedef.vertexB.x);
        //     dy = Math.max(dy, linedef.vertexA.y * 1);
        //     dy = Math.max(dy, linedef.vertexB.y * 1);
        // }
        // this.baseX = x;
        // this.baseY = y;
        this.redraw();
    }
}

const el = document.querySelector<HTMLCanvasElement>("canvas")!;
const mapView = new MapView2D(el);
mapView.displayLevel(0);
