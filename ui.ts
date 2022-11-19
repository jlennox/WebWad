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

class MapView {
    private readonly wad: Promise<WadFile>;
    private readonly thingHitTester = new HitTester<ThingEntry>();

    private scale: number = 1;
    private baseX: number;
    private baseY: number;
    private currentMap: MapEntry | undefined;
    private canvasWidth: number;
    private canvasHeight: number;
    private highlightedThingIndex: number = -1;
    private awaitingRender: boolean = false;
    private dashedStrokeOffset: number = 0;

    constructor(private readonly canvas: HTMLCanvasElement) {
        canvas.style.position = "fixed";
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;

        this.baseX = canvas.width / 2;
        this.baseY = canvas.height / 2;

        this.wad = new Promise<WadFile>((resolve, _reject) => {
            canvas.addEventListener("dblclick", async (_event) => {
                console.log(_event);
                const response = await fetch("./doom1.wad");
                if (response.status != 200) {
                    alert(`Download failed :(  ${response.statusText} (${response.status}) ${await response.text()}`);
                    return;
                }

                const blob = await response.blob()
                resolve(new WadFile(await blob.arrayBuffer()));
            });

            new UserFileInput(canvas, (file) => {
                const wad = new WadFile(file);
                console.log("wad", wad);
                resolve(wad);
            });
        });

        document.addEventListener("wheel", (event) => {
            const step = event.shiftKey ? .1 : .025;
            const oldScale = this.scale;
            this.scale += (event.deltaY < 0 ? 1 : -1) * step;
            if (this.scale < .025) this.scale = .025;

            const scaleDifference = oldScale - this.scale;
            if (scaleDifference != 0) {
                const widthChange = this.canvas.width * scaleDifference;
                const heightChange = this.canvas.height * scaleDifference;
                const cursorX = event.offsetX / this.canvas.width;
                const cursorY = event.offsetY / this.canvas.height;
                console.log({x: widthChange * cursorX, y: heightChange * cursorY, scaleDifference, widthChange, heightChange, cursorX, cursorY, });
                // this.baseX -= widthChange * cursorX; //cursorX * this.canvas.width * this.scale;
                // this.baseY -= heightChange * cursorY; //cursorY * this.canvas.height * this.scale;
                // this.baseX -= (event.offsetX - this.baseX) * step;
                // this.baseY -= (event.offsetY - this.baseY) * step;

                // This does not work because the origin is not the top left.
                this.baseX -= widthChange * cursorX;
                this.baseY -= heightChange * cursorY;
            }

            this.redraw();
        });

        window.addEventListener("resize", (_event) => {
            this.canvas.width  = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.canvasWidth = canvas.width;
            this.canvasHeight = canvas.height;
            this.redraw();
        });

        let isMouseDown = false;

        canvas.addEventListener("mousedown", (_event) => {
            isMouseDown = true;
        });

        canvas.addEventListener("mouseup", (_event) => {
            isMouseDown = false;
        });

        canvas.addEventListener("mousemove", (event) => {
            const hitResult = this.thingHitTester.hitTest(event.offsetX, event.offsetY);
            const newHighlightedIndex = hitResult?.index ?? -1;
            if (this.highlightedThingIndex != newHighlightedIndex) {
                console.log(hitResult?.info, hitResult?.info?.description);
                this.highlightedThingIndex = newHighlightedIndex;
                this.dashedStrokeOffset = 0;
                this.redraw();
            }

            if (isMouseDown) {
                this.baseX += event.movementX;
                this.baseY += event.movementY;
                this.redraw();
            }
        });

        setInterval(() => {
            if (this.highlightedThingIndex == -1) return;
            --this.dashedStrokeOffset;
            this.redraw();
        }, 40);

        this.redraw();
    }

    private redraw(): void {
        if (this.awaitingRender) return;
        this.awaitingRender = true;

        requestAnimationFrame(() => {
            this.redraw2d();
            this.awaitingRender = false;
        });
    }

    private redraw3d(): void {
        const gl = this.canvas.getContext("webgl")!;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        const positions = [
            1.0,  1.0,
           -1.0,  1.0,
            1.0, -1.0,
           -1.0, -1.0,
         ];
         gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array(positions),
            gl.STATIC_DRAW);

        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix,     // destination matrix
            modelViewMatrix,     // matrix to translate
            [-0.0, 0.0, -6.0]);  // amount to translate

        {
            const numComponents = 2;  // pull out 2 values per iteration
            const type = gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // don't normalize
            const stride = 0;         // how many bytes to get from one set of values to the next
                                        // 0 = use type and numComponents above
            const offset = 0;         // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            // gl.vertexAttribPointer(
            //     programInfo.attribLocations.vertexPosition,
            //     numComponents,
            //     type,
            //     normalize,
            //     stride,
            //     offset);
            // gl.enableVertexAttribArray(
            //     programInfo.attribLocations.vertexPosition);
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

        context.font = "40px serif";
        drawCentered("Drag & Drop WAD", this.canvasWidth, this.canvasHeight);
        context.font = "20px serif";
        drawCentered("Or double click to load the shareware WAD", this.canvasWidth, this.canvasHeight + 40);
        context.font = "20px serif";
        drawBottomLeft("Controls:\nZoom: Mouse wheel (shift for faster zoom)\nPan: Drag with mouse", this.canvasWidth, this.canvasHeight);
    }

    private redraw2d(): void {
        const context = this.canvas.getContext("2d")!;
        context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        const map = this.currentMap;
        if (map == null) {
            this.drawHelpText2d(context);
            return;
        }

        // Draws a circle at the origin.
        if (false) {
            context.beginPath();
            context.fillStyle = "red";
            context.arc(this.baseX, this.baseY, 30, 0, Math.PI * 2);
            context.fill();
        }

        context.lineWidth = 1;
        for (const linedef of map.linedefs) {
            context.beginPath();
            context.strokeStyle = linedef.hasFlag(LinedefFlags.SECRET) ? "red" : "black";
            context.moveTo(linedef.vertexA.x * this.scale + this.baseX, linedef.vertexA.y * -1 * this.scale + this.baseY);
            context.lineTo(linedef.vertexB.x * this.scale + this.baseX, linedef.vertexB.y * -1 * this.scale + this.baseY);
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
            const centerX = thing.x * this.scale + this.baseX;
            const centerY = thing.y * -1 * this.scale + this.baseY;
            const radius = thing.description.radius * this.scale;

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

            const centerX = thing.x * this.scale + this.baseX;
            const centerY = thing.y * -1 * this.scale + this.baseY;
            const radius = thing.description!.radius * this.scale;

            context.beginPath();
            context.strokeStyle = "red";
            context.setLineDash([6 * this.scale, 6 * this.scale]);
            context.lineDashOffset = this.dashedStrokeOffset;
            context.arc(centerX, centerY, radius, 0, Math.PI * 2);
            context.stroke();
            context.setLineDash([]);

            context.beginPath();
            const boxX = centerX - radius;
            const boxY = centerY + radius;
            context.clearRect(boxX, boxY, 300, 100);
            context.rect(boxX, boxY, 300, 100);
            context.font = "12pt serif";
            context.fillStyle = "Black";
            context.fillText(thing.description?.description ?? "", boxX + 10, boxY + 10, 300);
            context.stroke();
        }
    }

    public async displayLevel(name: string): Promise<void> {
        const wad = await this.wad;
        this.currentMap = wad.maps.find((map) => map.name == name) ?? wad.maps[0];
        const player1Start = this.currentMap.things.find((t) => t.type == 1);
        if (player1Start != undefined) {
            // TODO: Fix. Works really badly on doom1.wad
            this.baseX = (player1Start.x + this.canvasWidth / 2) * this.scale;
            this.baseY = (player1Start.y + this.canvasHeight / 2) * this.scale;
        }

        let x = Number.MAX_VALUE, y = Number.MAX_VALUE, dx = Number.MIN_VALUE, dy = Number.MIN_VALUE;
        for (const linedef of this.currentMap.linedefs) {
            x = Math.min(x, linedef.vertexA.x);
            x = Math.min(x, linedef.vertexB.x);
            y = Math.min(y, linedef.vertexA.y * 1);
            y = Math.min(y, linedef.vertexB.y * 1);
            dx = Math.max(dx, linedef.vertexA.x);
            dx = Math.max(dx, linedef.vertexB.x);
            dy = Math.max(dy, linedef.vertexA.y * 1);
            dy = Math.max(dy, linedef.vertexB.y * 1);
        }
        // this.baseX = x;
        // this.baseY = y;
        this.redraw();
    }
}

const el = document.querySelector<HTMLCanvasElement>("canvas")!;
const mapView = new MapView(el);
mapView.displayLevel("MAP01");
