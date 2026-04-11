/// <reference path="../wad.ts" />

(function runTests() {
    let assertCalls = 0;

    function assert(condition: boolean, message: string, ...data: any[]): asserts condition {
        assertCalls += 1;
        console.assert(condition, ...[message, ...data]);
        if (!condition) throw new Error(message);
    }

    (function vertexTests() {
        (function survivesPackingRoundTrip() {
            for (let vertex of [
                new Vertex(0, 0),
                new Vertex(-1, -1),
                new Vertex(2, -5),
                new Vertex(32767, 32767),
                new Vertex(-32768, -32768),
            ]) {
                const packed = vertex.pack();
                const unpacked = Vertex.unpack(packed);
                assert(Vertex.areEqual(vertex, unpacked), "Vertex's servive round trip.", vertex, packed, unpacked);
            }
        })();
    })();

    console.log(`All ${assertCalls} asserts passed.`);
})();
