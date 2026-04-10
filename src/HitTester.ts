const enum PointIndex {
    x = 0,
    y = 1,
    radius = 2,
    NumberOfEntries = 3
}

interface HitTestResult<TInfo> {
    readonly info: TInfo;
    readonly index: number;
}

class HitTester<TInfo> {
    // Storing in Int16Array to (hopefully...) improve memory locality and speed.
    // If desired, these could be in some sort of binary tree (stored in a flat array) of rects for faster hit testing.
    private points: Int16Array | null = null;
    private index: number = 0;
    private infos: TInfo[] = [];
    private count: number = 0;

    constructor() {}

    public startUpdate(count: number): void {
        if (this.count < count) {
            this.points = new Int16Array(count * PointIndex.NumberOfEntries);
            this.infos = new Array(count);
        }

        this.index = 0;
        this.count = count;
    }

    public addPoint(x: i16, y: i16, radius: i16, info: TInfo): void {
        if (this.points == null) throw new Error("Object not initialized.");

        const pointsIndex = this.index * 3;

        this.points[pointsIndex + PointIndex.x] = x;
        this.points[pointsIndex + PointIndex.y] = y;
        this.points[pointsIndex + PointIndex.radius] = radius;
        this.infos[this.index] = info;

        ++this.index;
    }

    public hitTest(matrix: DOMMatrix, x: i16, y: i16): HitTestResult<TInfo> | null {
        const points = this.points;
        if (points == null) return null;

        // Lots of allocations: .inverse(), new DOMPointReadOnly, and matrixTransform.
        const translated = new DOMPointReadOnly(x, y).matrixTransform(matrix.inverse());

        let pointIndex = 0;
        for (let i = 0; i < this.count; ++i) {
            const pointX = points[pointIndex + PointIndex.x];
            const pointY = points[pointIndex + PointIndex.y];
            const pointRadius = points[pointIndex + PointIndex.radius];
            pointIndex += PointIndex.NumberOfEntries;

            const dx = Math.abs(pointX - translated.x);
            if (dx > pointRadius) continue;

            const dy = Math.abs(pointY - translated.y);
            if (dy > pointRadius) continue;

            if (Math.pow(dx, 2) + Math.pow(dy, 2) > Math.pow(pointRadius, 2)) continue;

            return { info: this.infos[i], index: i };
        }

        return null;
    }
}
