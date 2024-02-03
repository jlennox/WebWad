class Matrix {
    public static vectexMultiply(m: DOMMatrix, v: IVertex2D): IVertex2D {
        return {
            x: m.a * v.x + m.c * v.y + m.e,
            y: m.b * v.x + m.d * v.y + m.f
        };
    }
}
