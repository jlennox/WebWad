"use strict";
class HitTester {
    // Storing in Int16Array to (hopefully...) improve memory locality and speed.
    // If desired, these could be in some sort of binary tree (stored in a flat array) of rects for faster hit testing.
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
        // Lots of allocations: .inverse(), new DOMPointReadOnly, and matrixTransform.
        const translated = new DOMPointReadOnly(x, y).matrixTransform(matrix.inverse());
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
class UserFileInputUI {
    canvas = GlobalCanvas.get("UserFileInputUI", (() => this.draw()));
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
            for (const canvas of document.querySelectorAll("canvas"))
                canvas.remove();
            const thingsDialog = new ThingsViewerUI(wad);
            let mapViewIndex = 0;
            const mapViews = ctor(wad);
            let previousMapView = mapViews[0];
            function updateShownMapView() {
                const nextMapview = mapViews[mapViewIndex];
                // Avoid state thrashing when possible.
                if (previousMapView.levelIndex != nextMapview.levelIndex || nextMapview.levelIndex < 0) {
                    nextMapview.displayLevel(Math.max(previousMapView.levelIndex, 0));
                    console.info(`Showing ${nextMapview.name} + ${nextMapview.levelIndex}`);
                }
                nextMapview.activate();
                console.info(`Showing ${nextMapview.name}`);
                previousMapView = nextMapview;
            }
            document.addEventListener("keydown", (e) => {
                if (e.key === "Tab") {
                    e.preventDefault();
                    if (e.shiftKey) {
                        thingsDialog.show();
                        return;
                    }
                    mapViewIndex = (mapViewIndex + 1) % mapViews.length;
                    updateShownMapView();
                }
            });
            updateShownMapView();
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
        drawBottomLeft("Controls:\nTab: Switch 2D/3D\nShift+Tab: Things viewer\nZoom: Mouse wheel (shift for faster zoom)\nPan: Drag with mouse\nChange level: + and -", this.canvas.width, this.canvas.height);
    }
}
/// <reference path="UserFileInput.ts" />
// We only ever want a single client area sized canvas, and we want it to destroy and recreate
// because we may switch the context type.
class GlobalCanvas {
    static canvases = new Map();
    element;
    get isActive() { return this.element.hidden == false; }
    get width() { return this._width; }
    get height() { return this._height; }
    _width;
    _height;
    constructor(name, onResize) {
        this.element = document.createElement("canvas");
        this.element.setAttribute("data-canvas-name", name);
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
    static get(name, onResize) {
        const existing = GlobalCanvas.canvases.get(name);
        if (existing != null)
            return existing;
        const instance = new GlobalCanvas(name, onResize);
        GlobalCanvas.canvases.set(name, instance);
        return instance;
    }
    getContext(contextId, options) {
        return this.element.getContext(contextId, options);
    }
    activate() {
        for (let [_, canvas] of GlobalCanvas.canvases) {
            canvas.element.hidden = canvas != this;
        }
    }
}
class MapView {
    name;
    wad;
    canvas;
    isMouseDown = false;
    currentMap;
    levelIndex = -1;
    awaitingRender = false;
    constructor(name, wad) {
        this.name = name;
        this.wad = wad;
        this.canvas = GlobalCanvas.get(name);
        this.currentMap = this.wad.maps[0];
        document.addEventListener("wheel", (e) => {
            if (!this.canvas.isActive)
                return;
            this.onWheel(e);
        });
        window.addEventListener("resize", (e) => {
            if (!this.canvas.isActive)
                return;
            this.onResize(e);
        });
        this.canvas.element.addEventListener("mousedown", (e) => {
            if (!this.canvas.isActive)
                return;
            this.isMouseDown = true;
            this.onMouseDown(e);
        });
        this.canvas.element.addEventListener("mouseup", (e) => {
            if (!this.canvas.isActive)
                return;
            this.isMouseDown = false;
            this.onMouseUp(e);
        });
        this.canvas.element.addEventListener("mousemove", (e) => {
            if (!this.canvas.isActive)
                return;
            this.onMouseMove(e);
        });
        this.canvas.element.addEventListener("dblclick", (e) => {
            if (!this.canvas.isActive)
                return;
            this.onDoubleClick(e);
        });
        document.addEventListener("keyup", (e) => {
            if (!this.canvas.isActive)
                return;
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
const _fileinput = new UserFileInputUI((wad) => [new MapView2D(wad), new MapView3D(wad)]);
/// <reference path="ui.ts" />
class MapView2D extends MapView {
    viewMatrix = new DOMMatrix([1, 0, 0, -1, 0, 0]);
    thingHitTester = new HitTester();
    highlightedThingIndex = -1;
    dashedStrokeOffset = 0;
    constructor(wad) {
        super("MapView2D", wad);
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
    onDoubleClick(_event) { }
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
            // TODO: Are the thing's x/y actually the centers?
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
            const thingImage = this.wad.getImageData(thing.description?.sprite);
            if (thingImage.length > 0) {
                context.putImageData(thingImage[0], boxX + 5, boxY + 25);
            }
            context.stroke();
        }
        context.setTransform(undefined);
        context.font = "12pt serif";
        context.fillStyle = "Black";
        context.textBaseline = "top";
        context.fillText(this.currentMap.displayName ?? "Unknown", 0, 0, 300);
    }
    async displayLevel(index) {
        this.levelIndex = index;
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
    activate() {
        this.canvas.activate();
        UIOverlay.setLowerLeftText("Tab: Switch to 3D\n" +
            "Pan: Mouse drag\n" +
            "Zoom: Mouse wheel\n" +
            "Change level: +/-");
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
/// <reference path="ui.ts" />
// TODO:
// - Use the prefix for the sprites. IE, blood pool is currently showing a space marine.
class VertexProgramInputs {
    aVertexPosition;
    aBrightness;
    aTexCoord;
    aSpriteOffset;
    uProjectionMatrix;
    uModelViewMatrix;
    uTexture;
    uCameraRight;
    uDiscard;
    constructor(gl, program) {
        function getAttribute(name) {
            const location = gl.getAttribLocation(program, name);
            if (location === -1)
                throw new Error(`Unable to find attribute "${name}".`);
            return location;
        }
        function getUniform(name) {
            const location = gl.getUniformLocation(program, name);
            if (location == null)
                throw new Error(`Unable to find uniform "${name}".`);
            return location;
        }
        this.aVertexPosition = getAttribute("aVertexPosition");
        this.aBrightness = getAttribute("aBrightness");
        this.aTexCoord = getAttribute("aTexCoord");
        this.aSpriteOffset = getAttribute("aSpriteOffset");
        this.uProjectionMatrix = getUniform("uProjectionMatrix");
        this.uModelViewMatrix = getUniform("uModelViewMatrix");
        this.uTexture = getUniform("uTexture");
        this.uCameraRight = getUniform("uCameraRight");
        this.uDiscard = getUniform("uDiscard");
    }
}
class MapView3D extends MapView {
    gl;
    shaderProgram;
    positionBuffer;
    colorBuffer;
    textureCoordBuffer;
    spriteOffsetBuffer;
    inputs;
    whiteTexture;
    textureCache = new Map();
    drawGroups = [];
    cameraPosition = { x: 0, y: 0, z: 0 };
    cameraYaw = 0;
    cameraPitch = 0;
    keysDown = new Set();
    constructor(wad) {
        super("MapView3D", wad);
        const gl = this.canvas.getContext("webgl2", { alpha: false });
        if (gl == null)
            throw new Error("WebGL2 not available.");
        this.gl = gl;
        const vsSource = `#version 300 es

            in vec3 aVertexPosition;
            in float aBrightness;
            in vec2 aTexCoord;
            in vec2 aSpriteOffset;

            uniform mat4 uProjectionMatrix;
            uniform mat4 uModelViewMatrix;
            uniform vec3 uCameraRight;

            out lowp vec3 vColor;
            out highp vec2 vTexCoord;

            void main() {
                vec3 up = vec3(0.0, 1.0, 0.0);
                vec3 worldPos = aVertexPosition
                    + uCameraRight * aSpriteOffset.x
                    + up * aSpriteOffset.y;
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(worldPos, 1.0);
                vColor = vec3(aBrightness / 255.0);
                vTexCoord = aTexCoord;
            }
        `;
        const fsSource = `#version 300 es
            precision lowp float;
            precision highp sampler2D;

            in lowp vec3 vColor;
            in highp vec2 vTexCoord;

            uniform sampler2D uTexture;
            uniform bool uDiscard;

            out vec4 fragColor;

            void main() {
                vec4 texColor = texture(uTexture, vTexCoord);
                // Apparently we can get a benefit by having 2 programs, one without discord, allowing for early z-culling.
                if (uDiscard && texColor.a < 0.5) discard;
                fragColor = vec4(vColor * texColor.rgb, texColor.a);
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
        this.inputs = new VertexProgramInputs(gl, program);
        function createBuffer() {
            const buffer = gl.createBuffer();
            if (buffer == null)
                throw new Error("Unable to create buffer.");
            return buffer;
        }
        this.positionBuffer = createBuffer();
        this.colorBuffer = createBuffer();
        this.textureCoordBuffer = createBuffer();
        this.spriteOffsetBuffer = createBuffer();
        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // 1x1 white texture used for untextured (flat-shaded) geometry.
        const whiteTexture = gl.createTexture();
        if (whiteTexture == null)
            throw new Error("Unable to create white texture.");
        gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        this.whiteTexture = whiteTexture;
        document.addEventListener("keydown", (e) => this.keysDown.add(e.key.toLowerCase()));
        document.addEventListener("keyup", (e) => this.keysDown.delete(e.key.toLowerCase()));
        setInterval(() => this.tick(), 1000 / 60);
        this.redraw();
    }
    async displayLevel(index) {
        this.levelIndex = index;
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
    activate() {
        this.canvas.activate();
        UIOverlay.setLowerLeftText("Tab: Switch to 2D\n" +
            "Move: WASD\n" +
            "Look: Mouse drag\n" +
            "Up/down: Space/Z or mouse wheel\n" +
            "Change level: +/-");
    }
    buildGeometry() {
        const gl = this.gl;
        const positions = [];
        const colors = [];
        const textureCoords = [];
        const sprites = [];
        const spriteOffsets = [];
        console.time("Rectangles");
        const rectangles = Triangulation.getRectangles(this.currentMap);
        console.timeEnd("Rectangles");
        // Separate walls (untextured) from textured flats, grouped by texture name.
        const texturedGroups = new Map();
        const middleGroups = new Map();
        function addToGroup(surface, groups) {
            if (surface.textureName == null)
                throw new Error();
            let group = groups.get(surface.textureName);
            if (group == null) {
                group = [];
                groups.set(surface.textureName, group);
            }
            group.push(surface);
        }
        for (const surface of rectangles) {
            if (surface.textureName == null || surface.textureName == "-")
                continue;
            switch (surface.type) {
                case SurfaceType.Sprite:
                    sprites.push(surface);
                    continue;
                case SurfaceType.MiddleWall:
                    addToGroup(surface, middleGroups);
                    continue;
                default:
                    addToGroup(surface, texturedGroups);
                    continue;
            }
        }
        const drawGroups = [];
        this.drawGroups = drawGroups;
        let vertexCount = 0;
        // Emit textured groups (floors/ceilings/walls).
        for (const group of [texturedGroups, middleGroups]) {
            for (const [textureName, surfaces] of group) {
                const groupStart = vertexCount;
                for (const surface of surfaces) {
                    vertexCount += this.emit(surface, positions, colors, textureCoords, spriteOffsets);
                }
                drawGroups.push({
                    textureName,
                    start: groupStart,
                    count: vertexCount - groupStart,
                    isSprite: false,
                    isMiddleWall: group == middleGroups,
                });
            }
        }
        for (const surface of sprites) {
            const groupStart = vertexCount;
            vertexCount += this.emit(surface, positions, colors, textureCoords, spriteOffsets);
            drawGroups.push({
                textureName: surface.textureName ?? null,
                start: groupStart,
                count: 6,
                isSprite: true,
                isMiddleWall: false,
            });
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteOffsetBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spriteOffsets), gl.STATIC_DRAW);
    }
    emit(surface, positions, colors, textureCoords, spriteOffsets) {
        switch (surface.shape) {
            case SurfaceShape.Triangle:
                this.emitTriangle(surface, positions, colors, textureCoords, spriteOffsets);
                return 3;
            case SurfaceShape.Rectangle:
                this.emitRectangle(surface, positions, colors, textureCoords, spriteOffsets);
                return 6;
        }
    }
    emitTriangle(surface, positions, colors, textureCoords, spriteOffsets) {
        // TODO: Hard exception for things that aren't wall/ceiling.
        if (surface.type != SurfaceType.Floor && surface.type != SurfaceType.Ceiling) {
            throw new Error();
        }
        colors.push(surface.lightLevel, surface.lightLevel, surface.lightLevel);
        positions.push(surface.v1.x, surface.v1.z, -surface.v1.y, surface.v2.x, surface.v2.z, -surface.v2.y, surface.v3.x, surface.v3.z, -surface.v3.y);
        textureCoords.push(surface.v1.x / 64, surface.v1.y / 64, surface.v2.x / 64, surface.v2.y / 64, surface.v3.x / 64, surface.v3.y / 64);
        spriteOffsets.push(0, 0, 0, 0, 0, 0);
    }
    emitRectangle(surface, positions, colors, textureCoords, spriteOffsets) {
        // Each rect has 6 vertices (2 triangles), which means a lot of things happen in multiples of 6.
        colors.push(surface.lightLevel, surface.lightLevel, surface.lightLevel, surface.lightLevel, surface.lightLevel, surface.lightLevel);
        if (surface.type == SurfaceType.Sprite) {
            // All 6 vertices share the sprite's anchor (bottom-center on the floor).
            const anchorX = (surface.x.x + surface.x2.x) / 2;
            const anchorY = surface.x.z; // floor height
            const anchorZ = -surface.x.y; // doom y -> gl z
            const halfWidth = (surface.x2.x - surface.x.x) / 2;
            const height = surface.y.z - surface.x.z;
            positions.push(anchorX, anchorY, anchorZ, anchorX, anchorY, anchorZ, anchorX, anchorY, anchorZ, anchorX, anchorY, anchorZ, anchorX, anchorY, anchorZ, anchorX, anchorY, anchorZ);
            spriteOffsets.push(-halfWidth, 0, // v0: bottom-left
            halfWidth, 0, // v2: bottom-right
            -halfWidth, height, // v1: top-left
            halfWidth, 0, // v2: bottom-right
            halfWidth, height, // v3: top-right
            -halfWidth, height);
            textureCoords.push(0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0);
            return;
        }
        // Remap: doom(x, y, z) -> gl(x, z, -y). Y is negated to convert Doom's left-handed coordinates
        // to GL's right-handed coordinates. Otherwise left-facing hallways become right-facing.
        const v0x = surface.x.x, v0y = surface.x.z, v0z = -surface.x.y;
        const v1x = surface.y.x, v1y = surface.y.z, v1z = -surface.y.y;
        const v2x = surface.x2.x, v2y = surface.x2.z, v2z = -surface.x2.y;
        const v3x = surface.y2.x, v3y = surface.y2.z, v3z = -surface.y2.y;
        positions.push(v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z, v2x, v2y, v2z, v1x, v1y, v1z, v3x, v3y, v3z);
        spriteOffsets.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        const isWall = surface.textureOffsetX != null;
        if (isWall) {
            // Wall UVs: U = distance along linedef, V = height position.
            // TODO: Is this really needed?
            const linedefLength = Math.sqrt((surface.x2.x - surface.x.x) ** 2 + (surface.x2.y - surface.x.y) ** 2);
            const wallHeight = surface.y.z - surface.x.z;
            const graphic = this.wad.getImage(surface.textureName);
            const textureWidth = graphic.width || 64;
            const textureHeight = graphic.height || 64;
            const offsetU = surface.textureOffsetX / textureWidth;
            const offsetV = surface.textureOffsetY / textureHeight;
            const uLeft = offsetU + linedefLength / textureWidth;
            const uRight = offsetU;
            let vTop;
            let vBottom;
            if (surface.bottomPegged) {
                vBottom = 1 + offsetV;
                vTop = vBottom - wallHeight / textureHeight;
            }
            else {
                vTop = offsetV;
                vBottom = vTop + wallHeight / textureHeight;
            }
            // x=A floor, y=A ceiling, x2=B floor, y2=B ceiling
            textureCoords.push(uLeft, vBottom, // v0: A floor
            uLeft, vTop, // v1: A ceiling
            uRight, vBottom, // v2: B floor
            uRight, vBottom, // v2: B floor
            uLeft, vTop, // v1: A ceiling
            uRight, vTop);
        }
        else {
            // Floors/ceilings.
            // Flat UVs: tile at 64 world units using original DOOM x/y coords.
            const u0 = surface.x.x / 64, w0 = surface.x.y / 64;
            const u1 = surface.y.x / 64, w1 = surface.y.y / 64;
            const u2 = surface.x2.x / 64, w2 = surface.x2.y / 64;
            const u3 = surface.y2.x / 64, w3 = surface.y2.y / 64;
            textureCoords.push(u0, w0, u1, w1, u2, w2, u2, w2, u1, w1, u3, w3);
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
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.useProgram(this.shaderProgram);
        const projectionMatrix = mat4.create();
        const aspect = gl.canvas.width / gl.canvas.height;
        mat4.perspective(projectionMatrix, Math.PI / 4, aspect, 1, 50000);
        gl.uniformMatrix4fv(this.inputs.uProjectionMatrix, false, projectionMatrix);
        const viewMatrix = mat4.create();
        mat4.rotateX(viewMatrix, viewMatrix, this.cameraPitch);
        mat4.rotateY(viewMatrix, viewMatrix, this.cameraYaw);
        mat4.translate(viewMatrix, viewMatrix, [
            -this.cameraPosition.x,
            -this.cameraPosition.y,
            -this.cameraPosition.z
        ]);
        gl.uniformMatrix4fv(this.inputs.uModelViewMatrix, false, viewMatrix);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(this.inputs.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.inputs.aVertexPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.vertexAttribPointer(this.inputs.aBrightness, 1, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.inputs.aBrightness);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
        gl.vertexAttribPointer(this.inputs.aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.inputs.aTexCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteOffsetBuffer);
        gl.vertexAttribPointer(this.inputs.aSpriteOffset, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.inputs.aSpriteOffset);
        gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(this.inputs.uTexture, 0);
        function getTexture(viewer, name, clampToEdge) {
            if (name == null || name == "-")
                return viewer.whiteTexture;
            let texture = viewer.textureCache.get(name);
            if (texture != null)
                return texture;
            const gl = viewer.gl;
            const flat = viewer.wad.getImage(name, FlatEntry.default);
            texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, flat.width, flat.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, flat.pixels);
            const wrap = clampToEdge ? gl.CLAMP_TO_EDGE : gl.REPEAT;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            viewer.textureCache.set(name, texture);
            return texture;
        }
        const rightX = Math.cos(this.cameraYaw);
        const rightZ = Math.sin(this.cameraYaw);
        gl.uniform3f(this.inputs.uCameraRight, rightX, 0, rightZ);
        for (const group of this.drawGroups) {
            if (group.isMiddleWall || group.isSprite) {
                gl.disable(gl.CULL_FACE);
                gl.uniform1i(this.inputs.uDiscard, 1);
            }
            else {
                gl.enable(gl.CULL_FACE);
                gl.uniform1i(this.inputs.uDiscard, 0);
            }
            gl.bindTexture(gl.TEXTURE_2D, getTexture(this, group.textureName, group.isSprite || group.isMiddleWall));
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
    onKeyUp(_event) { }
}
class ThingsViewerElements {
    thingSelect;
    closeButton;
    spritesSelect;
    spriteDisplay;
    description;
    constructor(dialog) {
        function find(query) {
            const element = dialog.querySelector(query);
            if (element == null)
                throw new Error(`Unable to find "${query}".`);
            return element;
        }
        this.thingSelect = find("select[name=thing]");
        this.closeButton = find("button[name=close]");
        this.spritesSelect = find("select[name=sprites]");
        this.spriteDisplay = find("canvas[name=spriteDisplay]");
        this.description = find("div.description");
    }
}
class ThingsViewerUI {
    wad;
    dialog;
    elements;
    constructor(wad) {
        this.wad = wad;
        const things = Object.entries(Things.descriptions)
            .map(([id, description]) => ({
            name: description.description,
            index: id
        }))
            .sort((a, b) => a.name.localeCompare(b.name));
        this.dialog = document.createElement("dialog");
        this.dialog.classList.add("thingsViewerDialog");
        this.dialog.innerHTML = `
                <label>Thing:</label>
                <select name="thing">
                    ${things.map((thing) => `<option value="${thing.index}">${Html.escape(thing.name)}</option>`).join("")}
                </select>
                <label>Sprites:</label>
                <select name="sprites"></select>
                <button name="close">Close</button>
                <div class="description"></div>
                <canvas name="spriteDisplay"></select>
            </form>
        `;
        this.elements = new ThingsViewerElements(this.dialog);
        this.elements.closeButton.addEventListener("click", _ => this.dialog.close());
        this.elements.thingSelect.addEventListener("change", (e) => this.onThingChanged(e));
        this.elements.spritesSelect.addEventListener("change", (e) => this.onSpriteChanged(e));
        this.dialog.addEventListener("keydown", (e) => { if (e.key === "Escape")
            this.dialog.close(); });
        this.elements.thingSelect.dispatchEvent(new Event("change", { bubbles: true }));
        document.body.appendChild(this.dialog);
    }
    onThingChanged(event) {
        const select = event.target;
        const thingIndex = parseInt(select.value);
        const thingDescription = Things.descriptions[thingIndex];
        console.log("thingDescription", thingDescription);
        this.elements.description.textContent = JSON.stringify(thingDescription, undefined, 2);
        this.elements.spritesSelect.innerHTML = "";
        const images = this.wad.getImageData(thingDescription.sprite);
        for (const image of images) {
            const option = new Option(image.name, image.name);
            this.elements.spritesSelect.appendChild(option);
        }
        this.elements.spritesSelect.dispatchEvent(new Event("change", { bubbles: true }));
    }
    onSpriteChanged(event) {
        const select = event.target;
        const spriteName = select.value;
        const context = this.elements.spriteDisplay.getContext("2d");
        const image = this.wad.getImageData(spriteName)[0];
        if (image == null) {
            console.error(`Unable to find image data for "${spriteName}".`);
            return;
        }
        this.elements.spriteDisplay.width = image.width;
        this.elements.spriteDisplay.height = image.height;
        context.putImageData(image, 0, 0);
    }
    show() {
        this.dialog.show();
    }
}
class Html {
    static escapeElement = document.createElement("div");
    static escape(text) {
        Html.escapeElement.textContent = text;
        return Html.escapeElement.innerHTML;
    }
}
var SurfaceType;
(function (SurfaceType) {
    SurfaceType[SurfaceType["Floor"] = 0] = "Floor";
    SurfaceType[SurfaceType["Ceiling"] = 1] = "Ceiling";
    SurfaceType[SurfaceType["Wall"] = 2] = "Wall";
    SurfaceType[SurfaceType["MiddleWall"] = 3] = "MiddleWall";
    SurfaceType[SurfaceType["Sprite"] = 4] = "Sprite";
})(SurfaceType || (SurfaceType = {}));
var SurfaceShape;
(function (SurfaceShape) {
    SurfaceShape[SurfaceShape["Rectangle"] = 0] = "Rectangle";
    SurfaceShape[SurfaceShape["Triangle"] = 1] = "Triangle";
})(SurfaceShape || (SurfaceShape = {}));
class Triangulation {
    static findSidedefTexture(right, left, getter) {
        const rightName = getter(right);
        if (rightName != "-")
            return { textureName: rightName, sidedef: right };
        if (left != null) {
            const leftName = getter(left);
            if (leftName != "-")
                return { textureName: leftName, sidedef: left };
        }
        return null;
    }
    // This should ultimately return triangles, but for simplicity, it currently returns rectangles.
    static getRectangles(map) {
        let shapes = [];
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
                if (sector == null || sidedef == null)
                    continue;
                shapes.push({
                    shape: SurfaceShape.Rectangle,
                    x: { x: a.x, y: a.y, z: sector.floorHeight },
                    y: { x: a.x, y: a.y, z: sector.ceilingHeight },
                    x2: { x: b.x, y: b.y, z: sector.floorHeight },
                    y2: { x: b.x, y: b.y, z: sector.ceilingHeight },
                    textureName: sidedef.textureNameMiddle,
                    lightLevel: sector.lightLevel,
                    textureOffsetX: sidedef.textureXOffset,
                    textureOffsetY: sidedef.textureYOffset,
                    type: SurfaceType.Wall,
                    bottomPegged: linedef.hasFlag(16 /* LinedefFlags.DONTPEGBOTTOM */),
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
                        x: { x: a.x, y: a.y, z: lowerZ },
                        y: { x: a.x, y: a.y, z: upperZ },
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
                        x: { x: a.x, y: a.y, z: lowerZ },
                        y: { x: a.x, y: a.y, z: upperZ },
                        x2: { x: b.x, y: b.y, z: lowerZ },
                        y2: { x: b.x, y: b.y, z: upperZ },
                        textureName: sidedef.textureName,
                        lightLevel: sidedef.sidedef.sector.lightLevel,
                        textureOffsetX: sidedef.sidedef.textureXOffset,
                        textureOffsetY: sidedef.sidedef.textureYOffset,
                        type: SurfaceType.Wall,
                        bottomPegged: !linedef.hasFlag(8 /* LinedefFlags.DONTPEGTOP */),
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
                        x: { x: a.x, y: a.y, z: lowerZ },
                        y: { x: a.x, y: a.y, z: upperZ },
                        x2: { x: b.x, y: b.y, z: lowerZ },
                        y2: { x: b.x, y: b.y, z: upperZ },
                        textureName: middleSidedef.textureName,
                        lightLevel: middleSidedef.sidedef.sector.lightLevel,
                        textureOffsetX: middleSidedef.sidedef.textureXOffset,
                        textureOffsetY: middleSidedef.sidedef.textureYOffset,
                        type: SurfaceType.MiddleWall,
                        bottomPegged: linedef.hasFlag(16 /* LinedefFlags.DONTPEGBOTTOM */),
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
            const searchPile = [];
            for (const linedef of linedefs) {
                const front = linedef.sidedefFont.sectorIndex;
                const back = linedef.sidedefBack?.sectorIndex;
                // Self referencing linedefs are skippable. For example, Doom 2, Map 1, Sector 1, has a sound blocking
                // linedef that is fully contained inside the sector.
                if (front == back) {
                    console.info("Skipped inclusive linedef", linedef);
                    continue;
                }
                if (front == sectorIndex)
                    searchPile.push(linedef);
                if (back == sectorIndex)
                    searchPile.push(linedef.tryReverse());
            }
            // Now order the vertices from the linedefs into the hull polygons.
            // Sectors can have multiple hulls -- some are donut holes, but they can also be unconnected unique rooms.
            // Donut holes have the opposite winding.
            const loops = [];
            const searchPileDebug = [...searchPile];
            while (searchPile.length > 0) {
                const top = searchPile.pop();
                const loop = [top.vertexA, top.vertexB];
                loops.push(loop);
                const hullStart = loop[0];
                continueSearch: while (true) {
                    // Loop until we have completed a full ring.
                    const last = loop[loop.length - 1];
                    for (let i = 0; i < searchPile.length; ++i) {
                        const searchTarget = searchPile[i];
                        // The `last` is always a vertexB, so it must connect to a vertexA.
                        if (!Vertex.areEqual(last, searchTarget.vertexA))
                            continue;
                        // Since order is not important, do the removal from the end so it's always O(1).
                        searchPile[i] = searchPile[searchPile.length - 1];
                        searchPile.pop();
                        // Loop until we have completed a full ring.
                        if (Vertex.areEqual(searchTarget.vertexB, hullStart))
                            break continueSearch;
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
                    if ((a.x == b.x && a.x == c.x) ||
                        (a.y == b.y && a.y == c.y)) {
                        // Since they're in a row, slice out the redundant middle index.
                        loop.splice(bIndex, 1);
                        ++indexesCut;
                        // Loop until there's no more mutations.
                        i = 0;
                        continue hullAgain;
                    }
                }
            }
            function isConvex(a, b, c) {
                // For clockwise winding (interior on right in Y-up Doom coords), a right turn (convex) gives a negative cross product.
                return b.subtract(a).cross(c.subtract(b)) < 0;
            }
            function isClockwise(vertices) {
                let area = 0;
                for (let i = 0; i < vertices.length; i++) {
                    const a = vertices[i];
                    const b = vertices[(i + 1) % vertices.length];
                    area += (b.x - a.x) * (b.y + a.y);
                }
                return area < 0;
            }
            function doesTriangleContainPoint(a, b, c, point) {
                var crossAC = a.subtract(c).cross(point.subtract(c));
                var crossBA = b.subtract(a).cross(point.subtract(a));
                if ((crossAC < 0) != (crossBA < 0) && crossAC != 0 && crossBA != 0)
                    return false;
                var crossCB = c.subtract(b).cross(point.subtract(b));
                return crossCB == 0 || (crossCB < 0) == (crossAC + crossBA <= 0);
            }
            function isTriangleHullContained(a, b, c, hull) {
                for (const point of hull) {
                    if (point == a || point == b || point == c)
                        continue;
                    if (doesTriangleContainPoint(a, b, c, point))
                        return false;
                }
                return true;
            }
            function isPointInsideLoop(loop, point) {
                // Raycast and return if odd number of intersections.
                let inside = false;
                for (let i = 0; i < loop.length; i++) {
                    const a = loop[i];
                    const b = loop[(i + 1) % loop.length];
                    if ((a.y > point.y) == (b.y > point.y))
                        continue;
                    if (point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) {
                        inside = !inside;
                    }
                }
                return inside;
            }
            function isContainedByLoop(loop, points) {
                for (const point of points) {
                    if (isPointInsideLoop(loop, point))
                        return true;
                }
                return false;
            }
            console.log("hulls", sectorIndex, loops, indexesCut);
            // Find the loops that are holes (reversed winding order).
            const holes = [];
            for (let i = loops.length - 1; i >= 0; --i) {
                const loop = loops[i];
                if (isClockwise(loop)) {
                    loops.splice(i, 1);
                    holes.push(loop);
                }
            }
            // Find which loops contain the holes.
            const hulls = [];
            for (let loop of loops) {
                const containedHoles = [];
                for (let i = holes.length - 1; i >= 0; --i) {
                    const hole = holes[i];
                    if (isContainedByLoop(loop, hole)) {
                        containedHoles.push(hole);
                        holes.splice(i, 1);
                    }
                }
                hulls.push({ outer: loop, holes });
            }
            if (holes.length > 0) {
                console.info(sectorIndex, "Sector contains holes that are not contained by an outer loop.", holes);
            }
            // Triangulate each loop.
            for (const hull of hulls) {
                const cloned = [...hull.outer];
                const shapesStart = shapes.length;
                for (let i = 0; i < cloned.length && cloned.length > 2;) {
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
            if (graphic == null)
                continue;
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
                x: { x: thing.x - halfWidth, y: thing.y, z: floorZ },
                y: { x: thing.x - halfWidth, y: thing.y, z: floorZ + height },
                x2: { x: thing.x + halfWidth, y: thing.y, z: floorZ },
                y2: { x: thing.x + halfWidth, y: thing.y, z: floorZ + height },
                textureName: graphic.name,
                lightLevel: 255,
                type: SurfaceType.Sprite,
            });
        }
        return shapes;
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
class Matrix {
    static vectexMultiply(m, v) {
        return {
            x: m.a * v.x + m.c * v.y + m.e,
            y: m.b * v.x + m.d * v.y + m.f
        };
    }
}
class BinaryFileReader {
    position = 0;
    u8;
    u16;
    u32;
    i16;
    storedPositions = [];
    static textDecoder = new TextDecoder("us-ascii"); // Correct encoding?
    constructor(file) {
        // Doing this might be pretty silly... the idea is it'll work for unaligned access, but I do not believe
        // unaligned access exists.
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
    // There's no great way to case-insensitive compare in JavaScript and the cases are mixed between definitions
    // and references, so just read them as uppercase to be safe.
    readFixedLengthStringUppercase(length) {
        return this.readFixedLengthString(length).toUpperCase();
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
    patchNameDirectory;
    mapTextures;
    imageDataCache = new Map();
    reader;
    decodeImagesCache = new Map();
    directoryMap;
    constructor(file) {
        this.reader = new BinaryFileReader(file);
        this.wadInfo = new WadHeader(this.reader);
        this.reader.seek(this.wadInfo.infotableofs);
        this.directory = DirectoryEntry.read(this.reader, this.wadInfo.numlumps);
        this.directoryMap = new Map(this.directory.map((entry) => [entry.name, entry]));
        this.maps = MapEntry.readAll(this, this.reader, this.directory);
        this.patches = PatchEntry.readAll(this, this.reader);
        this.palette = PaletteEntry.read(this, this.reader);
        this.flats = FlatEntry.readAll(this, this.reader);
        this.patchNameDirectory = PatchNamesEntry.read(this, this.reader);
        this.mapTextures = MapTextureEntry.readAll(this, this.reader);
    }
    tryGetDirectoryEntry(name) {
        return this.directoryMap.get(name);
    }
    getDirectoryEntry(name) {
        const lump = this.directoryMap.get(name);
        if (lump == null)
            throw new Error(`Lump "${name}" not found.`);
        return lump;
    }
    tryGetImage(name) {
        const fromCache = this.decodeImagesCache.get(name);
        if (fromCache != null)
            return fromCache;
        const fromFlats = this.flats.get(name);
        if (fromFlats != null) {
            const data = fromFlats.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }
        const fromPatches = this.patches.get(name);
        if (fromPatches != null) {
            const data = fromPatches.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }
        const fromDirectoryMap = this.directoryMap.get(name);
        if (fromDirectoryMap != null) {
            const patch = new PatchEntry(this.reader, fromDirectoryMap);
            const data = patch.decode(this.palette);
            this.decodeImagesCache.set(name, data);
            return data;
        }
        const fromMapTexture = this.mapTextures.get(name);
        if (fromMapTexture != null) {
            const data = fromMapTexture.decode(this);
            this.decodeImagesCache.set(name, data);
            return data;
        }
        return undefined;
    }
    getImage(name, defaultImage) {
        const fromCache = this.tryGetImage(name);
        if (fromCache != null)
            return fromCache;
        // Cache unfound images so we don't spam the console with errors.
        console.error(`Image "${name}" not found`);
        const def = defaultImage ?? new DecodedImage(0, 0, new Uint8Array());
        this.decodeImagesCache.set(name, def);
        return def;
    }
    getImageData(name) {
        if (name == null)
            return [];
        const cached = this.imageDataCache.get(name);
        if (cached != null)
            return cached;
        const images = [];
        for (const patch of this.patches) {
            const patchName = patch[0];
            if (!patchName.startsWith(name))
                continue;
            const image = this.getImage(patchName);
            const uint8 = new Uint8ClampedArray(image.pixels);
            const imageData = new ImageData(uint8, image.width, image.height);
            imageData.name = patchName;
            images.push(imageData);
        }
        this.imageDataCache.set(name, images);
        return images;
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
    LumpName["PNAMES"] = "PNAMES";
    LumpName["TEXTURE1"] = "TEXTURE1";
    LumpName["TEXTURE2"] = "TEXTURE2";
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
        this.name = reader.readFixedLengthStringUppercase(8);
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static read(reader) {
        return new Vertex(reader.readI16(), reader.readI16());
    }
    static readAll(entry, reader) {
        return entry.readAll(reader, (reader) => Vertex.read(reader));
    }
    static areEqual(a, b) {
        return a.x == b.x && a.y == b.y;
    }
    subtract(other) {
        return new Vertex(this.x - other.x, this.y - other.y);
    }
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
    cross(other) {
        return this.x * other.y - this.y * other.x;
    }
    toString() {
        return `(${this.x},${this.y})`;
    }
    pack() {
        // Mask a to avoid sign bleed.
        return (this.x & 0xFFFF) | (this.y << 16);
    }
    static unpack(packed) {
        const x = (packed << 16) >> 16;
        const y = packed >> 16;
        return new Vertex(x, y);
    }
}
class SkillLevel {
    constructor() { }
    static getDescrption(level) {
        switch (level) {
            case 1: return "I'm too young to die.";
            case 2: return "Hey, not too rough";
            case 3: return "Hurt me plenty.";
            case 4: return "Ultra-Violence";
            case 5: return "Nightmare!";
        }
        throw new Error(`Unknown skill level ${level}.`);
    }
}
var SpawnFlags;
(function (SpawnFlags) {
    SpawnFlags[SpawnFlags["SkillLevels1And2"] = 1] = "SkillLevels1And2";
    SpawnFlags[SpawnFlags["SkillLevel3"] = 2] = "SkillLevel3";
    SpawnFlags[SpawnFlags["SkillLevel4and5"] = 4] = "SkillLevel4and5";
    SpawnFlags[SpawnFlags["Deaf"] = 8] = "Deaf";
    SpawnFlags[SpawnFlags["MultiplayerOnly"] = 16] = "MultiplayerOnly";
    SpawnFlags[SpawnFlags["NotInDeathmatch"] = 32] = "NotInDeathmatch";
    SpawnFlags[SpawnFlags["NotInCooperative"] = 64] = "NotInCooperative";
    SpawnFlags[SpawnFlags["FriendlyMonster"] = 128] = "FriendlyMonster";
})(SpawnFlags || (SpawnFlags = {}));
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
    hasFlag(spawnFlag) {
        return (this.spawnFlags & spawnFlag) == spawnFlag;
    }
}
// https://doomwiki.org/wiki/Linedef
class LinedefEntry {
    map;
    vertexAIndex;
    vertexBIndex;
    flags;
    linetype;
    tag;
    sidedefFrontIndex;
    sidedefBackIndex;
    static invalidSideDefIndex = 0xFFFF;
    get hasSidedefBack() { return this.sidedefBackIndex != LinedefEntry.invalidSideDefIndex; }
    get vertexA() { return this.map.vertexes[this.vertexAIndex]; }
    get vertexB() { return this.map.vertexes[this.vertexBIndex]; }
    get sidedefFont() { return this.map.sidedefs[this.sidedefFrontIndex]; }
    get sidedefBack() { return this.hasSidedefBack ? this.map.sidedefs[this.sidedefBackIndex] : undefined; }
    constructor(map, vertexAIndex, vertexBIndex, flags, // u16
    linetype, tag, sidedefFrontIndex, sidedefBackIndex) {
        this.map = map;
        this.vertexAIndex = vertexAIndex;
        this.vertexBIndex = vertexBIndex;
        this.flags = flags;
        this.linetype = linetype;
        this.tag = tag;
        this.sidedefFrontIndex = sidedefFrontIndex;
        this.sidedefBackIndex = sidedefBackIndex;
    }
    static read(map, reader) {
        return new LinedefEntry(map, reader.readU16(), reader.readU16(), reader.readU16(), reader.readU16(), reader.readU16(), reader.readU16(), reader.readU16());
    }
    hasFlag(flag) {
        return (this.flags & flag) == flag;
    }
    tryReverse() {
        if (!this.hasSidedefBack)
            return undefined;
        return new LinedefEntry(this.map, this.vertexBIndex, this.vertexAIndex, this.flags, this.linetype, this.tag, this.sidedefBackIndex, this.sidedefFrontIndex);
    }
    toString() {
        return `${this.vertexA}->${this.vertexB}`;
    }
    static readAll(map, entry, reader) {
        return entry.readAll(reader, (reader) => LinedefEntry.read(map, reader));
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
    get textureUpper() { return this.map.wadFile.getImage(this.textureNameUpper); }
    get textureLower() { return this.map.wadFile.getImage(this.textureNameLower); }
    get textureMiddle() { return this.map.wadFile.getImage(this.textureNameMiddle); }
    get sector() { return this.map.sectors[this.sectorIndex]; }
    constructor(map, reader) {
        this.map = map;
        this.textureXOffset = reader.readI16();
        this.textureYOffset = reader.readI16();
        this.textureNameUpper = reader.readFixedLengthStringUppercase(8);
        this.textureNameLower = reader.readFixedLengthStringUppercase(8);
        this.textureNameMiddle = reader.readFixedLengthStringUppercase(8);
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
    get textureFloor() { return this.map.wadFile.getImage(this.textureNameFloor); }
    get textureCeiling() { return this.map.wadFile.getImage(this.textureNameCeiling); }
    constructor(map, reader) {
        this.map = map;
        this.floorHeight = reader.readI16();
        this.ceilingHeight = reader.readI16();
        this.textureNameFloor = reader.readFixedLengthStringUppercase(8);
        this.textureNameCeiling = reader.readFixedLengthStringUppercase(8);
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
        this.linedefsPerSector = MapEntry.getLinedefsPerSector(this.linedefs);
    }
    static getLinedefsPerSector(linedefs) {
        const linedefsPerSector = {};
        for (const linedef of linedefs) {
            if (linedef.vertexB.x == 448 && linedef.vertexB.y == 960) {
                console.log("found", linedef);
            }
            for (const sidedef of [linedef.sidedefBack, linedef.sidedefFont]) {
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
    findSector(x, y) {
        for (const [sectorIndex, linedefs] of Object.entries(this.linedefsPerSector)) {
            let crossings = 0;
            for (const linedef of linedefs) {
                const ax = linedef.vertexA.x;
                const ay = linedef.vertexA.y;
                const bx = linedef.vertexB.x;
                const by = linedef.vertexB.y;
                if ((ay > y) != (by > y)) {
                    const xIntersect = ax + (y - ay) * (bx - ax) / (by - ay);
                    if (x < xIntersect)
                        crossings++;
                }
            }
            if (crossings % 2 == 1) {
                const sector = this.sectors[parseInt(sectorIndex)];
                return sector;
            }
        }
        return undefined;
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
        return maps.sort((a, b) => a.name.localeCompare(b.name));
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
        const decodedPixels = new Uint32Array(buffer);
        for (let i = 0; i < FlatEntry.width * FlatEntry.height; ++i) {
            decodedPixels[i] = palette.palette[this.pixels[i]];
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
    columns;
    constructor(reader, directoryEntry) {
        reader.position = directoryEntry.filepos;
        const relative = reader.position;
        this.width = reader.readU16();
        this.height = reader.readU16();
        this.leftOffset = reader.readI16();
        this.topOffset = reader.readI16();
        this.columnofs = reader.readU32Array(this.width);
        reader.pushPosition();
        const columns = [];
        for (const offset of this.columnofs) {
            reader.position = offset + relative;
            // Each column is a list of posts terminated by a 0xFF topdelta.
            const posts = [];
            while (true) {
                const topdelta = reader.readU8();
                if (topdelta == 0xFF)
                    break;
                const length = reader.readU8();
                reader.readU8(); // unused padding
                const data = reader.readArray(length);
                reader.readU8(); // unused padding
                posts.push(new PatchPostEntry(topdelta, length, data));
            }
            columns.push(new PatchColumn(posts));
        }
        this.columns = columns;
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
        const buffer = new ArrayBuffer(this.width * this.height * 4);
        const pixels = new Uint32Array(buffer);
        for (let x = 0; x < this.width; ++x) {
            const column = this.columns[x];
            for (const post of column.posts) {
                let destY = post.topdelta * this.width + x;
                for (let y = 0; y < post.length; ++y, destY += this.width) {
                    pixels[destY] = palette.palette[post.data[y]];
                }
            }
        }
        return new DecodedImage(this.width, this.height, new Uint8Array(buffer));
    }
}
class PatchColumn {
    posts;
    constructor(posts) {
        this.posts = posts;
    }
}
class PatchPostEntry {
    topdelta;
    length;
    data;
    constructor(topdelta, length, data) {
        this.topdelta = topdelta;
        this.length = length;
        this.data = data;
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
            const a = 255;
            this.palette[i] = (a << 24) | (b << 16) | (g << 8) | r;
        }
    }
    static read(file, reader) {
        return new PaletteEntry(reader, file.getDirectoryEntry(LumpName.PLAYPAL));
    }
}
// https://doomwiki.org/wiki/PNAMES
class PatchNamesEntry {
    names;
    constructor(reader, directoryEntry) {
        reader.position = directoryEntry.filepos;
        const count = reader.readU32();
        const names = new Array(count);
        for (let i = 0; i < count; ++i) {
            names[i] = reader.readFixedLengthStringUppercase(8);
        }
        this.names = names;
    }
    static read(file, reader) {
        const entry = file.getDirectoryEntry(LumpName.PNAMES);
        const patchNamesEntry = new PatchNamesEntry(reader, entry);
        // Build a lookup from the full directory using the FIRST match per name,
        // since directoryMap can clobber patches with later same-named map lumps.
        const firstByName = new Map();
        for (const dirEntry of file.directory) {
            if (!firstByName.has(dirEntry.name)) {
                firstByName.set(dirEntry.name, dirEntry);
            }
        }
        const map = new Map();
        for (let i = 0; i < patchNamesEntry.names.length; ++i) {
            const name = patchNamesEntry.names[i];
            const dirEntry = firstByName.get(name);
            if (dirEntry == null) {
                console.warn(`PNAMES[${i}]: patch "${name}" not found in directory`);
                continue;
            }
            map.set(i, dirEntry);
        }
        return map;
    }
}
class TextureEntry {
    count;
    offsets;
    textures;
    constructor(reader, directoryEntry) {
        reader.position = directoryEntry.filepos;
        this.count = reader.readU32();
        this.offsets = reader.readU32Array(this.count);
        const textures = new Array(this.count);
        for (let i = 0; i < this.count; ++i) {
            reader.position = this.offsets[i] + directoryEntry.filepos;
            textures[i] = new MapTextureEntry(reader);
        }
        this.textures = textures;
    }
}
// https://doomwiki.org/wiki/TEXTURE1_and_TEXTURE2
class MapTextureEntry {
    name;
    masked;
    width;
    height;
    patchCount;
    patches;
    constructor(reader) {
        this.name = reader.readFixedLengthStringUppercase(8);
        this.masked = reader.readU32() != 0;
        this.width = reader.readU16();
        this.height = reader.readU16();
        reader.readU32(); // unused
        this.patchCount = reader.readU16();
        const patches = new Array(this.patchCount);
        for (let i = 0; i < this.patchCount; ++i) {
            patches[i] = new MapTexturePatchEntry(reader);
        }
        this.patches = patches;
    }
    static readAll(file, reader) {
        const map = new Map();
        for (const lumpName of [LumpName.TEXTURE1, LumpName.TEXTURE2]) {
            const entry = file.tryGetDirectoryEntry(lumpName);
            if (entry == null)
                continue;
            const textureEntry = new TextureEntry(reader, entry);
            for (const texture of textureEntry.textures) {
                map.set(texture.name, texture);
            }
        }
        return map;
    }
    decode(wadFile) {
        const buffer = new ArrayBuffer(this.width * this.height * 4);
        const pixels = new Uint32Array(buffer);
        for (const patch of this.patches) {
            const pname = wadFile.patchNameDirectory.get(patch.patchNameIndex);
            if (pname == null) {
                console.error(`Missing patch name for index ${patch.patchNameIndex}.`);
                continue;
            }
            const source = wadFile.getImage(pname.name, FlatEntry.default);
            const sourceU32 = new Uint32Array(source.pixels.buffer);
            let sourceIndex = 0;
            for (let y = 0; y < source.height; ++y) {
                const destY = patch.originY + y;
                if (destY < 0 || destY >= this.height) {
                    sourceIndex += source.width;
                    continue;
                }
                let destIndex = destY * this.width + patch.originX;
                for (let x = 0; x < source.width; ++x, ++destIndex, ++sourceIndex) {
                    const destX = patch.originX + x;
                    if (destX < 0 || destX >= this.width)
                        continue;
                    const pixel = sourceU32[sourceIndex];
                    if ((pixel & 0xFF000000) == 0)
                        continue; // transparent
                    pixels[destIndex] = pixel;
                }
            }
        }
        return new DecodedImage(this.width, this.height, new Uint8Array(buffer));
    }
}
class MapTexturePatchEntry {
    originX;
    originY;
    patchNameIndex;
    stepdir; // unused
    colormap; // unused
    constructor(reader) {
        this.originX = reader.readI16();
        this.originY = reader.readI16();
        this.patchNameIndex = reader.readU16();
        this.stepdir = reader.readI16();
        this.colormap = reader.readI16();
    }
}
//# sourceMappingURL=out.js.map