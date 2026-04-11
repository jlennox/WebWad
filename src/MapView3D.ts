/// <reference path="ui.ts" />

class VertexProgramInputs {
    public readonly aVertexPosition: number;
    public readonly aBrightness: number;
    public readonly aTexCoord: number;
    public readonly aSpriteOffset: number;
    public readonly uProjectionMatrix: WebGLUniformLocation;
    public readonly uModelViewMatrix: WebGLUniformLocation;
    public readonly uTexture: WebGLUniformLocation;
    public readonly uCameraRight: WebGLUniformLocation;
    public readonly uDiscard: WebGLUniformLocation;

    constructor(gl: WebGLRenderingContext, program: WebGLProgram) {
        function getAttribute(name: string): number {
            const location = gl.getAttribLocation(program, name);
            if (location === -1) throw new Error(`Unable to find attribute "${name}".`);
            return location;
        }

        function getUniform(name: string): WebGLUniformLocation {
            const location = gl.getUniformLocation(program, name);
            if (location == null) throw new Error(`Unable to find uniform "${name}".`);
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

interface DrawGroup {
    textureName: string | null;
    start: number;
    count: number;
    isSprite: boolean;
    isMiddleWall: boolean;
}

class MapView3D extends MapView {
    private readonly gl: WebGLRenderingContext;
    private readonly shaderProgram: WebGLProgram;
    private readonly positionBuffer: WebGLBuffer;
    private readonly colorBuffer: WebGLBuffer;
    private readonly textureCoordBuffer: WebGLBuffer;
    private readonly spriteOffsetBuffer: WebGLBuffer;
    private readonly inputs: VertexProgramInputs;
    private readonly whiteTexture: WebGLTexture;
    private readonly textureCache: Map<string, WebGLTexture> = new Map();

    private drawGroups: readonly DrawGroup[] = [];
    private readonly cameraPosition = { x: 0, y: 0, z: 0 };
    private cameraYaw: number = 0;
    private cameraPitch: number = 0;
    private readonly keysDown: Set<string> = new Set<string>();

    constructor(wad: WadFile) {
        super("MapView3D", wad);
        const gl = this.canvas.getContext("webgl2", { alpha: false });
        if (gl == null) throw new Error("WebGL2 not available.");
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

        function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
            const shader = gl.createShader(type);
            if (shader == null) throw new Error("Unable to create shader");
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
        if (program == null) throw new Error("Unable to create shader program");
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(`Unable to initialize the shader program: ${gl.getProgramInfoLog(program)}`);
        }

        this.shaderProgram = program;
        this.inputs = new VertexProgramInputs(gl, program);

        function createBuffer(): WebGLBuffer {
            const buffer = gl!.createBuffer();
            if (buffer == null) throw new Error("Unable to create buffer.");
            return buffer;
        }

        this.positionBuffer = createBuffer();
        this.colorBuffer = createBuffer();
        this.textureCoordBuffer = createBuffer();
        this.spriteOffsetBuffer = createBuffer();

        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        // 1x1 white texture used for untextured (flat-shaded) geometry.
        const whiteTexture = gl.createTexture();
        if (whiteTexture == null) throw new Error("Unable to create white texture.");
        gl.bindTexture(gl.TEXTURE_2D, whiteTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        this.whiteTexture = whiteTexture;

        document.addEventListener("keydown", (e) => this.keysDown.add(e.key.toLowerCase()));
        document.addEventListener("keyup", (e) => this.keysDown.delete(e.key.toLowerCase()));

        setInterval(() => this.tick(), 1000 / 60);

        this.redraw();
    }

    public override async displayLevel(index: number): Promise<void> {
        this.levelIndex = index;
        this.currentMap = this.wad.maps[index] ?? this.wad.maps[0];
        this.buildGeometry();

        const playerStart = this.currentMap.things.find((t) => t.type == ThingsType.PlayerOneStart);
        if (playerStart != undefined) {
            this.cameraPosition.x = playerStart.x;
            this.cameraPosition.y = 41;
            this.cameraPosition.z = -playerStart.y;
            const radians = (playerStart.angle / 256) * (Math.PI * 2);
            this.cameraYaw = -radians + Math.PI;
        } else {
            this.cameraPosition.x = 0;
            this.cameraPosition.y = 41;
            this.cameraPosition.z = 0;
            this.cameraYaw = 0;
        }
        this.cameraPitch = 0;

        this.redraw();
    }

    public override activate(): void {
        this.canvas.activate();
        UIOverlay.setLowerLeftText(
            "Tab: Switch to 2D\n" +
            "Move: WASD\n" +
            "Look: Mouse drag\n" +
            "Up/down: Space/Z or mouse wheel\n" +
            "Change level: +/-"
        );
    }

    private buildGeometry(): void {
        const gl = this.gl;
        const positions: number[] = [];
        const colors: number[] = [];
        const textureCoords: number[] = [];
        const rectangles = Triangulation.getRectangles(this.currentMap);
        const sprites: ISurface[] = [];
        const spriteOffsets: number[] = [];

        // Separate walls (untextured) from textured flats, grouped by texture name.
        const texturedGroups: Map<string, ISurface[]> = new Map();
        const middleGroups: Map<string, ISurface[]> = new Map();

        function addToGroup(surface: ISurface, groups: Map<string, ISurface[]>): void {
            if (surface.textureName == null) throw new Error();

            let group = groups.get(surface.textureName);
            if (group == null) {
                group = [];
                groups.set(surface.textureName, group);
            }
            group.push(surface);
        }

        for (const surface of rectangles) {
            if (surface.textureName == null || surface.textureName == "-") continue;

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

        const drawGroups: DrawGroup[] = [];
        this.drawGroups = drawGroups;
        let vertexCount = 0;

        // Emit textured groups (floors/ceilings/walls).
        for (const group of [texturedGroups, middleGroups]) {
            for (const [textureName, surfaces] of group) {
                const groupStart = vertexCount;
                for (const rect of surfaces) {
                    this.emitRect(rect, positions, colors, textureCoords, spriteOffsets);
                }
                vertexCount += surfaces.length * 6;
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
            this.emitRect(surface, positions, colors, textureCoords, spriteOffsets);
            vertexCount += 6;
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

    private emitRect(
        rect: ISurface,
        positions: number[],
        colors: number[],
        textureCoords: number[],
        spriteOffsets: number[],
    ): void {
        // Each rect has 6 vertices (2 triangles), which means a lot of things happen in multiples of 6.

        const brightness = rect.lightLevel ?? 128;
        colors.push(
            brightness,
            brightness,
            brightness,
            brightness,
            brightness,
            brightness,
        );

        if (rect.type == SurfaceType.Sprite) {
            // All 6 vertices share the sprite's anchor (bottom-center on the floor).
            const anchorX = (rect.x.x + rect.x2.x) / 2;
            const anchorY = rect.x.z;            // floor height
            const anchorZ = -rect.x.y;           // doom y -> gl z
            const halfWidth = (rect.x2.x - rect.x.x) / 2;
            const height = rect.y.z - rect.x.z;

            positions.push(
                anchorX, anchorY, anchorZ,
                anchorX, anchorY, anchorZ,
                anchorX, anchorY, anchorZ,
                anchorX, anchorY, anchorZ,
                anchorX, anchorY, anchorZ,
                anchorX, anchorY, anchorZ,
            );

            spriteOffsets.push(
                -halfWidth, 0,           // v0: bottom-left
                 halfWidth, 0,           // v2: bottom-right
                -halfWidth, height,      // v1: top-left
                 halfWidth, 0,           // v2: bottom-right
                 halfWidth, height,      // v3: top-right
                -halfWidth, height,      // v1: top-left
            );

            textureCoords.push(0, 1,  1, 1,  0, 0,  1, 1,  1, 0,  0, 0);
            return;
        }

        // Remap: doom(x, y, z) -> gl(x, z, -y). Y is negated to convert Doom's left-handed coordinates
        // to GL's right-handed coordinates. Otherwise left-facing hallways become right-facing.
        const v0x = rect.x.x, v0y = rect.x.z, v0z = -rect.x.y;
        const v1x = rect.y.x, v1y = rect.y.z, v1z = -rect.y.y;
        const v2x = rect.x2.x, v2y = rect.x2.z, v2z = -rect.x2.y;
        const v3x = rect.y2.x, v3y = rect.y2.z, v3z = -rect.y2.y;
        positions.push(
            v0x, v0y, v0z,
            v1x, v1y, v1z,
            v2x, v2y, v2z,
            v2x, v2y, v2z,
            v1x, v1y, v1z,
            v3x, v3y, v3z,
        );

        spriteOffsets.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

        const isWall = rect.textureOffsetX != null;

        if (isWall) {
            // Wall UVs: U = distance along linedef, V = height position.
            const linedefLength = Math.sqrt(
                (rect.x2.x - rect.x.x) ** 2 + (rect.x2.y - rect.x.y) ** 2
            );
            const wallHeight = rect.y.z - rect.x.z;
            const graphic = this.wad.getImage(rect.textureName!);
            const textureWidth = graphic.width || 64;
            const textureHeight = graphic.height || 64;
            const offsetU = rect.textureOffsetX! / textureWidth;
            const offsetV = rect.textureOffsetY! / textureHeight;

            const uLeft = offsetU + linedefLength / textureWidth;
            const uRight = offsetU;
            const vTop = offsetV;
            const vBottom = offsetV + wallHeight / textureHeight;

            // x=A floor, y=A ceiling, x2=B floor, y2=B ceiling
            textureCoords.push(
                uLeft, vBottom,   // v0: A floor
                uLeft, vTop,      // v1: A ceiling
                uRight, vBottom,  // v2: B floor
                uRight, vBottom,  // v2: B floor
                uLeft, vTop,      // v1: A ceiling
                uRight, vTop,     // v3: B ceiling
            );
        } else {
            // Flat UVs: tile at 64 world units using original DOOM x/y coords.
            const u0 = rect.x.x / 64, w0 = rect.x.y / 64;
            const u1 = rect.y.x / 64, w1 = rect.y.y / 64;
            const u2 = rect.x2.x / 64, w2 = rect.x2.y / 64;
            const u3 = rect.y2.x / 64, w3 = rect.y2.y / 64;
            textureCoords.push(u0, w0, u1, w1, u2, w2, u2, w2, u1, w1, u3, w3);
        }
    }

    private tick(): void {
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

        if (moved) this.redraw();
    }

    protected override draw(): void {
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

        function getTexture(viewer: MapView3D, name: string | null, clampToEdge: boolean): WebGLTexture {
            if (name == null || name == "-") return viewer.whiteTexture;

            let texture = viewer.textureCache.get(name);
            if (texture != null) return texture;

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
            } else {
                gl.enable(gl.CULL_FACE);
                gl.uniform1i(this.inputs.uDiscard, 0);
            }

            gl.bindTexture(gl.TEXTURE_2D, getTexture(this, group.textureName, group.isSprite || group.isMiddleWall));
            gl.drawArrays(gl.TRIANGLES, group.start, group.count);
        }
    }

    protected override onMouseMove(event: MouseEvent): void {
        if (!this.isMouseDown) return;

        const sensitivity = 0.003;
        this.cameraYaw += event.movementX * sensitivity;
        this.cameraPitch += event.movementY * sensitivity;

        // Clamp pitch to avoid flipping.
        const maxPitch = Math.PI / 2 - 0.01;
        if (this.cameraPitch > maxPitch) this.cameraPitch = maxPitch;
        if (this.cameraPitch < -maxPitch) this.cameraPitch = -maxPitch;

        this.redraw();
    }

    protected override onWheel(event: WheelEvent): void {
        const moveSpeed = event.shiftKey ? 100 : 30;
        const direction = event.deltaY < 0 ? -1 : 1;
        this.cameraPosition.y += moveSpeed * direction;
        this.redraw();
    }

    protected override onResize(_event: UIEvent): void { this.redraw(); }
    protected override onMouseDown(_event: MouseEvent): void {}
    protected override onMouseUp(_event: MouseEvent): void {}
    protected override onDoubleClick(_event: MouseEvent): void {}
    protected override onKeyUp(_event: KeyboardEvent): void {}
}
