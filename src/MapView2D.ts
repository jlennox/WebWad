/// <reference path="ui.ts" />

class MapView2D extends MapView {
    private readonly viewMatrix = new DOMMatrix([1, 0, 0, -1, 0, 0]);
    private readonly thingHitTester = new HitTester<ThingEntry>();

    private highlightedThingIndex: number = -1;
    private dashedStrokeOffset: number = 0;

    constructor(wad: WadFile) {
        super("MapView2D", wad);
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

    public override async displayLevel(index: number): Promise<void> {
        this.levelIndex = index;
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

    public override activate(): void {
        this.canvas.activate();

        UIOverlay.setLowerLeftText(
            "Tab: Switch to 3D\n" +
            "Pan: Mouse drag\n" +
            "Zoom: Mouse wheel\n" +
            "Change level: +/-"
        );
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
