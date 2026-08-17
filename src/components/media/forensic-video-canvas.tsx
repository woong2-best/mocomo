"use client";

import { useEffect, useRef } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import {
  embedRegionPixels,
  forensicFrameRegions,
} from "@/lib/watermark/encoder/spread-spectrum";

type Props = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  active: boolean;
  config: ForensicRenderConfig | null;
  className?: string;
};

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

type GlState = {
  gl: WebGLRenderingContext;
  videoTex: WebGLTexture;
  overlayTex: WebGLTexture;
  program: WebGLProgram;
  loc: {
    video: WebGLUniformLocation | null;
    overlay: WebGLUniformLocation | null;
    overlayRect: WebGLUniformLocation | null;
    canvasSize: WebGLUniformLocation | null;
  };
};

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initGl(canvas: HTMLCanvasElement): GlState | null {
  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: false,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) return null;

  const vs = compile(
    gl,
    gl.VERTEX_SHADER,
    `attribute vec2 a_pos;
     varying vec2 v_uv;
     void main() {
       v_uv = vec2((a_pos.x + 1.0) * 0.5, 1.0 - (a_pos.y + 1.0) * 0.5);
       gl_Position = vec4(a_pos, 0.0, 1.0);
     }`
  );
  const fs = compile(
    gl,
    gl.FRAGMENT_SHADER,
    `precision mediump float;
     varying vec2 v_uv;
     uniform sampler2D u_video;
     uniform sampler2D u_overlay;
     uniform vec4 u_overlayRect;
     uniform vec2 u_canvasSize;
     void main() {
       vec4 video = texture2D(u_video, v_uv);
       vec2 px = v_uv * u_canvasSize;
       vec2 local = (px - u_overlayRect.xy) / max(u_overlayRect.zw, vec2(1.0));
       float inside = step(0.0, local.x) * step(0.0, local.y) * step(local.x, 1.0) * step(local.y, 1.0);
       vec4 ov = texture2D(u_overlay, clamp(local, 0.0, 1.0));
       vec3 delta = ov.rgb - vec3(128.0 / 255.0);
       gl_FragColor = vec4(clamp(video.rgb + delta * inside, 0.0, 1.0), 1.0);
     }`
  );
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "a_pos");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const videoTex = gl.createTexture();
  const overlayTex = gl.createTexture();
  if (!videoTex || !overlayTex) return null;
  for (const tex of [videoTex, overlayTex]) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  return {
    gl,
    videoTex,
    overlayTex,
    program,
    loc: {
      video: gl.getUniformLocation(program, "u_video"),
      overlay: gl.getUniformLocation(program, "u_overlay"),
      overlayRect: gl.getUniformLocation(program, "u_overlayRect"),
      canvasSize: gl.getUniformLocation(program, "u_canvasSize"),
    },
  };
}

function fillNeutral(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 255;
  }
}

function renderGl(
  state: GlState,
  video: HTMLVideoElement,
  config: ForensicRenderConfig,
  frameIndex: number
) {
  const { gl } = state;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  gl.viewport(0, 0, vw, vh);
  gl.useProgram(state.program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, state.videoTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  gl.uniform1i(state.loc.video, 0);

  const { temporalShift, regions } = forensicFrameRegions(vw, vh, frameIndex, config.temporalPeriod);

  // Composite region overlays into one full-frame overlay so a single pass
  // applies every carrier. Neutral 128 means "no change".
  const overlay = new ImageData(vw, vh);
  fillNeutral(overlay.data);
  for (const plan of regions) {
    const { x, y, w, h } = plan.region;
    const patch = new ImageData(w, h);
    fillNeutral(patch.data);
    embedRegionPixels(patch, plan, config, temporalShift);
    for (let row = 0; row < h; row++) {
      const src = row * w * 4;
      const dst = ((y + row) * vw + x) * 4;
      overlay.data.set(patch.data.subarray(src, src + w * 4), dst);
    }
  }

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, state.overlayTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, vw, vh, 0, gl.RGBA, gl.UNSIGNED_BYTE, overlay.data);
  gl.uniform1i(state.loc.overlay, 1);
  gl.uniform4f(state.loc.overlayRect, 0, 0, vw, vh);
  gl.uniform2f(state.loc.canvasSize, vw, vh);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function render2d(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  config: ForensicRenderConfig,
  frameIndex: number
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  ctx.drawImage(video, 0, 0, vw, vh);
  const { temporalShift, regions } = forensicFrameRegions(vw, vh, frameIndex, config.temporalPeriod);
  for (const plan of regions) {
    const { x, y, w, h } = plan.region;
    const imageData = ctx.getImageData(x, y, w, h);
    embedRegionPixels({ width: w, height: h, data: imageData.data }, plan, config, temporalShift);
    ctx.putImageData(imageData, x, y);
  }
}

/** Draws playback through a canvas so each frame carries invisible forensic modulation. */
export function ForensicVideoCanvas({ videoRef, active, config, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const glRef = useRef<GlState | null>(null);

  useEffect(() => {
    if (!active || !config) return;

    let running = true;
    let rafHandle = 0;
    let frameHandle = 0;

    const video = videoRef.current as FrameCallbackVideo | null;
    const useFrameCallback = Boolean(video?.requestVideoFrameCallback);

    const schedule = (tick: () => void) => {
      if (!running) return;
      if (useFrameCallback && video?.requestVideoFrameCallback) {
        frameHandle = video.requestVideoFrameCallback(tick);
      } else {
        rafHandle = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      if (!running) return;
      const source = videoRef.current;
      const canvas = canvasRef.current;
      if (!source || !canvas || source.readyState < 2) {
        schedule(tick);
        return;
      }

      const vw = source.videoWidth;
      const vh = source.videoHeight;
      if (!vw || !vh) {
        schedule(tick);
        return;
      }

      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
        glRef.current = null;
      }

      if (!glRef.current) glRef.current = initGl(canvas);

      if (glRef.current) {
        try {
          renderGl(glRef.current, source, config, frameRef.current);
        } catch {
          glRef.current = null;
          render2d(canvas, source, config, frameRef.current);
        }
      } else {
        render2d(canvas, source, config, frameRef.current);
      }

      frameRef.current += 1;
      schedule(tick);
    };

    schedule(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafHandle);
      if (frameHandle && video?.cancelVideoFrameCallback) {
        video.cancelVideoFrameCallback(frameHandle);
      }
    };
  }, [active, config, videoRef]);

  if (!active || !config) return null;

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
