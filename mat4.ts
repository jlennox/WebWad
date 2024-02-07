type matrix = Float32Array;
type vec3 = Float32Array;

class mat4 {
    public static create(): matrix {
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
    public static perspective(out: matrix, fovy: number, aspect: number, near: number, far: number): matrix {
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
        } else {
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
    public static translate(out: matrix, a: matrix, v: number[]): matrix {
        let x = v[0],
        y = v[1],
        z = v[2];
        let a00, a01, a02, a03;
        let a10, a11, a12, a13;
        let a20, a21, a22, a23;

        if (a === out) {
            out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
            out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
            out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
            out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        } else {
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
public static rotateX(out, a, rad) {
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
  public static rotateY(out, a, rad) {
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
