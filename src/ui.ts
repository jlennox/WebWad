/// <reference path="UserFileInput.ts" />

// We only ever want a single client area sized canvas, and we want it to destroy and recreate
// because we may switch the context type.
class GlobalCanvas {
    private static readonly canvases: Map<string, GlobalCanvas> = new Map();

    public readonly element: HTMLCanvasElement;

    public get isActive(): boolean { return this.element.hidden == false; }

    public get width(): number { return this._width; }
    public get height(): number { return this._height; }

    private _width: number;
    private _height: number;

    private constructor(name: string, onResize?: (event: UIEvent) => void) {
        this.element = document.createElement("canvas");
        this.element.setAttribute("data-canvas-name", name)
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

    public static get(name: string, onResize?: (event: UIEvent) => void): GlobalCanvas {
        const existing = GlobalCanvas.canvases.get(name);
        if (existing != null) return existing;

        const instance = new GlobalCanvas(name, onResize);
        GlobalCanvas.canvases.set(name, instance);
        return instance;
    }

    public getContext(contextId: "2d", options?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D | null;
    public getContext(contextId: "bitmaprenderer", options?: ImageBitmapRenderingContextSettings): ImageBitmapRenderingContext | null;
    public getContext(contextId: "webgl", options?: WebGLContextAttributes): WebGLRenderingContext | null;
    public getContext(contextId: "webgl2", options?: WebGLContextAttributes): WebGL2RenderingContext | null;
    public getContext(contextId: string, options?: any): RenderingContext | null {
        return this.element.getContext(contextId, options);
    }

    public activate(): void {
        for (let [_, canvas] of GlobalCanvas.canvases) {
            canvas.element.hidden = canvas != this;
        }
    }
}

abstract class MapView {
    protected readonly canvas: GlobalCanvas;
    protected isMouseDown: boolean = false;
    protected currentMap: MapEntry;

    public levelIndex: number = -1;
    private awaitingRender: boolean = false;

    protected constructor(
        public readonly name: string,
        protected readonly wad: WadFile)
    {
        this.canvas = GlobalCanvas.get(name);
        this.currentMap = this.wad.maps[0];

        document.addEventListener("wheel", (e) => {
            if (!this.canvas.isActive) return;
            this.onWheel(e);
        });

        window.addEventListener("resize", (e) => {
            if (!this.canvas.isActive) return;
            this.onResize(e);
        });

        this.canvas.element.addEventListener("mousedown", (e) => {
            if (!this.canvas.isActive) return;
            this.isMouseDown = true;
            this.onMouseDown(e);
        });

        this.canvas.element.addEventListener("mouseup", (e) => {
            if (!this.canvas.isActive) return;
            this.isMouseDown = false;
            this.onMouseUp(e);
        });

        this.canvas.element.addEventListener("mousemove", (e) => {
            if (!this.canvas.isActive) return;
            this.onMouseMove(e);
        });

        this.canvas.element.addEventListener("dblclick", (e) => {
            if (!this.canvas.isActive) return;
            this.onDoubleClick(e);
        });

        document.addEventListener("keyup", (e) => {
            if (!this.canvas.isActive) return;
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

    public abstract activate(): void;

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

class UIOverlay {
    public static readonly instance = new UIOverlay();

    private readonly lowerleftElement: HTMLDivElement;

    constructor() {
        this.lowerleftElement = document.querySelector<HTMLDivElement>(".overlay .lowerleft")!;
        if (this.lowerleftElement == null) throw new Error("Unable to find overlay element.");
    }

    public static setLowerLeftText(text: string): void {
        UIOverlay.instance.lowerleftElement.textContent = text;
    }
}

const _fileinput = new UserFileInputUI((wad) => [new MapView2D(wad), new MapView3D(wad)]);
