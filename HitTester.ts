class HitTester<TInfo> {
    // Storing in Int16Array to (hopefully...) improve memory locality and speed.
    private points: Int16Array | null = null;
    private index: number = 0;
    private infos: TInfo[] = [];
    private count: number = 0;

    public startUpdate(count: number): void {
        if (this.count < count) {
            this.points = new Int16Array(count * 3);
            this.infos = new Array(count);
        }

        this.index = 0;
        this.count = count;
    }

    public addPoint(x: i16, y: i16, radius: i16, info: TInfo): void {
        if (this.points == null) throw new Error("Object not initialized.");

        const pointsIndex = this.index * 3;

        this.points[pointsIndex] = x;
        this.points[pointsIndex + 1] = y;
        this.points[pointsIndex + 2] = radius;
        this.infos[this.index] = info;

        ++this.index;
    }

    public hitTest(x: i16, y: i16): {
        info: TInfo,
        index: number
    } | null {
        const points = this.points;
        if (points == null) return null;

        let pointIndex = 0;
        for (let i = 0; i < this.count; ++i) {
            const pointX = points[pointIndex++];
            const pointY = points[pointIndex++];
            const pointRadius = points[pointIndex++];

            const dx = Math.abs(pointX - x);
            if (dx > pointRadius) continue;

            const dy = Math.abs(pointY - y);
            if (dy > pointRadius) continue;

            if (Math.pow(dx, 2) + Math.pow(dy, 2) > Math.pow(pointRadius, 2)) continue;

            return { info: this.infos[i], index: i };
        }

        return null;
    }
}
