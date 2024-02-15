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

// We only ever want a single client area sized canvas, and we want it to destroy and recreate
// because we may switch the context type.
class GlobalCanvas {
    public readonly element: HTMLCanvasElement;

    public get width(): number { return this._width; }
    public get height(): number { return this._height; }

    private _width: number;
    private _height: number;

    constructor(onResize?: (event: UIEvent) => void) {
        document.querySelector("canvas")?.remove();

        this.element = document.createElement("canvas");
        this.element.style.position = "fixed";
        this.element.width  = window.innerWidth;
        this.element.height = window.innerHeight;
        this._width = this.element.width;
        this._height = this.element.height;

        document.body.appendChild(this.element);

        window.addEventListener("resize", (e) => {
            this.element.width  = window.innerWidth;
            this.element.height = window.innerHeight;
            this._width = this.element.width;
            this._height = this.element.height;

            onResize?.(e);
        });
    }

    public getContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null;
    public getContext(contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext | null;
    public getContext(contextId: "webgl", options?: WebGLContextAttributes): WebGLRenderingContext | null;
    public getContext(contextId: "webgl2", options?: WebGLContextAttributes): WebGL2RenderingContext | null;
    public getContext(contextId: string, options?: any): RenderingContext | null {
        return this.element.getContext(contextId, options);
    }
}

class UserFileInputUI {
    private readonly canvas: GlobalCanvas = new GlobalCanvas(() => this.draw());

    constructor(ctor: (wad: WadFile) => MapView) {
        const wad = new Promise<WadFile>((resolve, _reject) => {
            this.canvas.element.addEventListener("dblclick", async (_event) => {
                try {
                    this.canvas.element.classList.add("loading");
                    const response = await fetch("./doom1.wad");
                    if (response.status != 200) {
                        alert(`Download failed :(  ${response.statusText} (${response.status}) ${await response.text()}`);
                        return;
                    }

                    const blob = await response.blob()
                    resolve(new WadFile(await blob.arrayBuffer()));
                } finally {
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

    private draw(): void {
        const context = this.canvas.getContext("2d")!;
        if (context == null) throw new Error("Unable to get 2d context");

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
        drawCentered("Drag & Drop WAD", this.canvas.width, this.canvas.height);
        context.font = "20px serif";
        drawCentered("Or double click to load the shareware WAD", this.canvas.width, this.canvas.height + 40);
        context.font = "20px serif";
        drawBottomLeft("Controls:\nZoom: Mouse wheel (shift for faster zoom)\nPan: Drag with mouse\nChange level: + and -", this.canvas.width, this.canvas.height);
    }
}

abstract class MapView {
    protected readonly canvas: GlobalCanvas = new GlobalCanvas();
    protected isMouseDown: boolean = false;
    protected currentMap: MapEntry;

    private levelIndex: number = 0;
    private awaitingRender: boolean = false;

    constructor(protected readonly wad: WadFile) {
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
                    } else {
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

class MapView2D extends MapView {
    private readonly viewMatrix = new DOMMatrix([1, 0, 0, -1, 0, 0]);
    private readonly thingHitTester = new HitTester<ThingEntry>();

    private highlightedThingIndex: number = -1;
    private dashedStrokeOffset: number = 0;

    constructor(wad: WadFile) {
        super(wad);
        this.resetValues();

        setInterval(() => {
            if (this.highlightedThingIndex == -1) return;
            --this.dashedStrokeOffset;
            this.redraw();
        }, 40);

        this.redraw();
    }

    private resetValues(): void {
        this.highlightedThingIndex = -1;
        this.dashedStrokeOffset = 0;
        this.thingHitTester.startUpdate(0);
    }

    protected override onWheel(event: WheelEvent): void {
        if (this.currentMap == null) return;

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

    protected override onResize(_event: UIEvent): void {
        this.redraw();
    }

    protected override onMouseDown(_event: MouseEvent): void {}
    protected override onMouseUp(_event: MouseEvent): void {}

    protected override onMouseMove(event: MouseEvent): void {
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

    protected override onDoubleClick(_event: MouseEvent): void {
        // This is temporary test code.
        const triangles: ITriangle[] = [];
        const rects = Triangulation.getRectangles(this.currentMap);
        for (const rect of rects) {
            Triangulation.rectToTriangle(triangles, rect);
        }
        const stl = Triangulation.getStl(triangles);
        console.log(stl);
    }

    protected override onKeyUp(_event: KeyboardEvent): void {}

    protected override draw(): void {
        const context = this.canvas.getContext("2d");
        if (context == null) throw new Error("Unable to get 2d context");

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

        // Not all entries are used as index values, so we must grab selectedThingEntry while enumerating.
        let selectedThingEntry: ThingEntry | null = null;
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

            if (thing.type == ThingsType.HealthBonus) {
                context.beginPath();
                context.fillStyle = "blue";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);
                context.fill();
            } else {
                const desc = thing.description;
                const isMonster = (desc.class & ThingsClass.Monster) == ThingsClass.Monster;
                context.beginPath();
                context.strokeStyle = isMonster ? "red" : "green";
                context.arc(centerX, centerY, radius, 0, Math.PI * 2);

                // Is it directional? If so, draw a directional line.
                const isDirectional = isMonster || desc.sprite == ThingSprite.PLAY;
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
        context.fillText(this.currentMap.displayName ?? "Unknown", 0, 0, 300);
    }

    public override async displayLevel(index: number): Promise<void> {
        this.currentMap = this.wad.maps[index] ?? this.wad.maps[0];
        this.resetValues();

        const player1Start = this.currentMap.things.find((t) => t.type == ThingsType.PlayerOneStart);
        if (player1Start != undefined) {
            // Eh. Centering on the player start isn't the best, but might be improvable.
            // this.viewMatrix.translateSelf(-player1Start.x, -player1Start.y);
            // this.redraw();
        }

        this.fitLevelToView(this.currentMap);
    }

    private fitLevelToView(map: MapEntry): void {
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
    constructor(wad: WadFile) {
        super(wad);
        this.redraw();
    }

    public async displayLevel(index: number): Promise<void> {
        this.currentMap = this.wad.maps[index] ?? this.wad.maps[0];
    }

    private gl: WebGLRenderingContext | null = null;

    protected override draw(): void {
        const gl = this.gl ?? this.canvas.getContext("webgl");
        if (gl === null) throw new Error("WebGL not available");
        this.gl = gl;

        // Vertex shader program
        const vsSource = `
            attribute vec4 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;

            void main() {
            gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            }
        `;

        // Fragment shader program
        const fsSource = `
            void main() {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0); // Set the color to white
            }
        `;

        const loadShader = (type: number, source: string) => {
            const shader = gl.createShader(type);
            if (shader == null) throw new Error("Unable to create shader");

            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        };

        function assertShader(gl: WebGLRenderingContext, shader: WebGLShader | null): asserts shader is WebGLShader {
            if (shader == null) throw new Error("Unable to create shader is null");
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Unable to compile shader ${gl.getShaderInfoLog(shader)}`);
        }

        const shaderProgram = (() => {
            const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
            assertShader(gl, vertexShader)
            const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);
            assertShader(gl, fragmentShader)

            const shaderProgram = gl.createProgram();
            if (shaderProgram == null) throw new Error("Unable to create shader program");
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                throw new Error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
            }

            return shaderProgram;
        })();

        const verticesNumber: number[] = [];
        const rectangles = Triangulation.getRectangles(this.currentMap);

        for (const rect of rectangles) {
            verticesNumber.push(rect.x.x, rect.x.y, rect.x.z);
            verticesNumber.push(rect.y.x, rect.y.y, rect.y.z);
            verticesNumber.push(rect.x2.x, rect.x2.y, rect.x2.z);

            verticesNumber.push(rect.x2.x, rect.x2.y, rect.x2.z);
            verticesNumber.push(rect.y.x, rect.y.y, rect.y.z);
            verticesNumber.push(rect.y2.x, rect.y2.y, rect.y2.z);
        }

        const vertices = new Float32Array(verticesNumber);
        console.log("vertices", vertices);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.clearColor(0.1, 1.0, 0.1, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL); // Near things obscure far things

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(shaderProgram);

        // Set the shader uniforms

        const modelViewMatrix = mat4.create();
        mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]); // Move the drawing position a bit to where we want to start drawing the square

        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
        // gl.drawElements(gl.TRIANGLES, vertices.length / 3, gl.UNSIGNED_INT, 0);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        const projectionMatrix = mat4.create();
        // mat4.perspective(projectionMatrix, 45 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.1, 100.0);
        mat4.perspective(projectionMatrix,
            Math.PI / 4, // field of view in radians
            gl.canvas.width / gl.canvas.height, // aspect ratio
            0.1, // near clipping plane
            100); // far clipping plane


        const viewMatrixUniformLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
        if (viewMatrixUniformLocation == null) throw new Error("Unable to get uniform location");
        this.viewMatrixUniformLocation = viewMatrixUniformLocation;
    }

    private viewMatrixUniformLocation: WebGLUniformLocation | null = null;

    private cameraPosition = { x: 0, y: 0, z: 5 }; // Initial camera position
    private cameraRotation = { x: 0, y: 0 }; // Camera rotation, in radians

    protected override onMouseMove(event: MouseEvent): void {
        if (!this.isMouseDown) {
            return;
        }

        const sensitivity = 0.01;
        this.cameraRotation.y +=  event.movementX * sensitivity;
        this.cameraRotation.x +=  event.movementY * sensitivity;
        this.updateCamera();
    }

    private updateCamera() {
        const viewMatrix = mat4.create();
        mat4.rotateX(viewMatrix, viewMatrix, this.cameraRotation.x);
        mat4.rotateY(viewMatrix, viewMatrix, this.cameraRotation.y);
        mat4.translate(viewMatrix, viewMatrix, [-this.cameraPosition.x, -this.cameraPosition.y, -this.cameraPosition.z]);

        // Set your viewMatrix uniform in your shaders to this new viewMatrix
        this.gl!.uniformMatrix4fv(this.viewMatrixUniformLocation!, false, viewMatrix);
    }

    protected override onWheel(_event: WheelEvent): void {}
    protected override onResize(_event: UIEvent): void {}
    protected override onMouseDown(_event: MouseEvent): void {}
    protected override onMouseUp(_event: MouseEvent): void {}
    protected override onDoubleClick(_event: MouseEvent): void {}
    protected override onKeyUp(_event: KeyboardEvent): void {}
}

const _fileinput = new UserFileInputUI((wad) => new MapView2D(wad));
