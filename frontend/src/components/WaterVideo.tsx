"use client";
import { useEffect, useRef } from "react";

const MAX = 32;

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes, uVid;
uniform float uTime, uDpr;
uniform vec4 uR[${MAX}]; // x, y, t0, amp
uniform vec4 uP[${MAX}]; // wavelength, speed, decay, width
void main(){
  vec2 px = gl_FragCoord.xy, g = vec2(0.);
  for(int i=0;i<${MAX};i++){
    vec4 r = uR[i];
    if(r.w <= 0.) continue;
    float age = uTime - r.z;
    if(age < 0.) continue;
    vec4 q = uP[i];
    vec2 dv = px - r.xy;
    float d = length(dv) + 0.001;
    float x = d - age*q.y;
    float wl = q.x*(1.+age*0.5);          // волны растягиваются
    float k = 6.2831/wl;
    float wd = q.w*(1.+age*0.8);          // пакет расплывается
    float env = exp(-x*x/(wd*wd)) * exp(-age*q.z) / sqrt(1.+d/(q.x*2.));
    float dh = r.w*env*(k*cos(k*x) - 2.*x/(wd*wd)*sin(k*x));
    g += dv/d*dh;
  }
  float s = max(uRes.x/uVid.x, uRes.y/uVid.y);
  vec2 uv = (px - g*60.*uDpr - uRes*0.5)/(uVid*s) + 0.5;
  vec3 c = texture2D(uTex, clamp(uv, 0.001, 0.999)).rgb;
  vec3 n = normalize(vec3(-g*1.5, 1.));
  vec3 L = normalize(vec3(-0.5, 0.7, 1.));
  float diff = dot(n, L) - L.z;
  float spec = pow(max(dot(reflect(-L, n), vec3(0.,0.,1.)), 0.), 60.);
  c += diff*0.35 + spec*0.5;
  gl_FragColor = vec4(c, 1.);
}`;


export default function WaterVideo({ src, mobileSrc, poster }: { src: string; mobileSrc?: string; poster?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = wrap.current!, video = vid.current!, canvas = cvs.current!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl", { antialias: false });
    if (!gl) return;

    const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("uRes"), uVid = U("uVid"), uTime = U("uTime"), uDpr = U("uDpr"), uR = U("uR"), uP = U("uP");
    const R = new Float32Array(MAX * 4), P = new Float32Array(MAX * 4);
    let head = 0, dpr = 1, raf = 0, visible = true, shown = false;
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;

    const add = (cx: number, cy: number, amp: number, wl: number, speed: number, decay: number, width: number, delay = 0) => {
      const r = box.getBoundingClientRect();
      const i = head * 4; head = (head + 1) % MAX;
      R.set([(cx - r.left) * dpr, (r.bottom - cy) * dpr, now() + delay, amp * dpr], i);
      P.set([wl * dpr, speed * dpr, decay, width * dpr], i);
    };

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = box.clientWidth * dpr;
      canvas.height = box.clientHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize); ro.observe(box); resize();
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting)); io.observe(box);

    // след катера
    let lx = -1e4, ly = -1e4;
    const onMove = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      if (Math.hypot(e.clientX - lx, e.clientY - ly) < 14) return;
      lx = e.clientX; ly = e.clientY;
      add(e.clientX, e.clientY, 0.18, 18, 90, 1.8, 14);
    };


    window.addEventListener("pointermove", onMove);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!visible || video.readyState < 2) return;
      const t = now();
      for (let i = 0; i < MAX; i++) if (R[i * 4 + 3] > 0 && t - R[i * 4 + 2] > 4 / P[i * 4 + 2]) R[i * 4 + 3] = 0;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uVid, video.videoWidth, video.videoHeight);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uDpr, dpr);
      gl.uniform4fv(uR, R);
      gl.uniform4fv(uP, P);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!shown) { canvas.style.opacity = "1"; shown = true; }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  const fill = { position: "absolute", inset: 0, width: "100%", height: "100%" } as const;
  return (
    <div ref={wrap} style={{ ...fill, overflow: "hidden" }}>
      <video ref={vid} crossOrigin="anonymous" poster={poster} autoPlay muted loop playsInline style={{ ...fill, objectFit: "cover" }}>
        {/* браузер берёт первый подходящий source: на узких экранах — лёгкая версия */}
        {mobileSrc && <source src={mobileSrc} media="(max-width: 900px)" />}
        <source src={src} />
      </video>
      <canvas ref={cvs} style={{ ...fill, pointerEvents: "none", opacity: 0, transition: "opacity .4s" }} />
    </div>
  );
}
