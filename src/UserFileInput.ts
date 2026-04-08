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

class UserFileInputUI {
    private readonly canvas: GlobalCanvas = GlobalCanvas.get("UserFileInputUI", (() => this.draw()));

    constructor(ctor: (wad: WadFile) => readonly MapView[]) {
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
            for (const canvas of document.querySelectorAll("canvas")) canvas.remove();

            let mapViewIndex = 0;
            const mapViews = ctor(wad);

            let previousMapView = mapViews[0];

            function updateShownMapView(): void {
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

                    mapViewIndex = (mapViewIndex + 1) % mapViews.length;
                    updateShownMapView();
                }
            });

            updateShownMapView();
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
