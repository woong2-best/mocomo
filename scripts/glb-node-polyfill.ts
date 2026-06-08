/** Node.js — GLTFExporter가 FileReader/Blob.arrayBuffer 사용 */
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    result: ArrayBuffer | string | null = null;
    onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
    readAsArrayBuffer(blob: Blob) {
      void blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onload?.({} as ProgressEvent<FileReader>);
        })
        .catch(() => this.onerror?.({} as ProgressEvent<FileReader>));
    }
    readAsDataURL() {}
    abort() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  } as unknown as typeof FileReader;
}

export {};
