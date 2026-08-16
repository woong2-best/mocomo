declare module "reedsolomon" {
  export class GenericGF {
    static DATA_MATRIX_FIELD_256: () => GenericGF;
  }
  export class ReedSolomonEncoder {
    constructor(field: GenericGF);
    encode(toEncode: Int32Array, ecBytes: number): void;
  }
  export class ReedSolomonDecoder {
    constructor(field: GenericGF);
    decode(received: Int32Array, twoS: number): void;
  }
}
