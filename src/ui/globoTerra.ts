import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import world from 'world-atlas/countries-50m.json';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry, Position } from 'geojson';
import { SEMENTES, COORDS } from '../engine/data/countries';

type Topo = {
  objects: {
    countries: { type: string; geometries: { type: string; id?: number | string; arcs?: number[][] }[] };
  };
  arcs: unknown[];
};

export type L2 = { lon: number; lat: number };

const topo = world as unknown as Topo;
const mundo = feature(topo as never, topo.objects.countries as never) as unknown as FeatureCollection<Geometry>;
export const FEATURAS = mundo.features.filter((f) => String(f.id ?? '') !== '010');

export const porIso = new Map<number, string>();
for (const s of SEMENTES) {
  const iso = s.iso ?? COORDS[s.id]?.[2];
  if (iso && iso > 0) porIso.set(iso, s.id);
}

export const R = 1;

export const ll2v = (lon: number, lat: number, r: number): [number, number, number] => {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
};

const dividirAnéis = (rings: Position[][]): L2[][][] => {
  const out: L2[][][] = [];
  for (const ring of rings) {
    let atual: L2[] = [];
    const splits: L2[][] = [];
    for (let i = 0; i < ring.length; i++) {
      const b: L2 = { lon: ring[i][0], lat: ring[i][1] };
      if (atual.length > 0 && Math.abs(atual[atual.length - 1].lon - b.lon) > 180) {
        splits.push(atual);
        atual = [];
      }
      atual.push(b);
    }
    if (atual.length) splits.push(atual);
    for (const s of splits) if (s.length >= 3) out.push([s]);
  }
  return out;
};

export const aneisDoPais = (tipo: string, coords: Position[][] | Position[][][]): L2[][][] => {
  const grupos: L2[][][] = [];
  if (tipo === 'MultiPolygon') {
    for (const polygon of coords as Position[][][]) grupos.push(...dividirAnéis(polygon));
  } else {
    grupos.push(...dividirAnéis(coords as Position[][]));
  }
  return grupos;
};

type Lobo = { minLon: number; maxLon: number; minLat: number; maxLat: number; pontos: L2[] };
export const lobosPorPais = new Map<string, Lobo[]>();
for (const f of FEATURAS) {
  if (f.id === undefined || f.id === null) continue;
  const idPais = porIso.get(Number(f.id));
  if (!idPais) continue;
  const geom = f.geometry as { type: string; coordinates: unknown } | null;
  if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
  const grupos = aneisDoPais(geom.type, geom.coordinates as Position[][] | Position[][][]);
  for (const grupo of grupos) {
    for (const ring of grupo) {
      const lb: Lobo = { minLon: 360, maxLon: -360, minLat: 90, maxLat: -90, pontos: ring };
      for (const p of ring) {
        if (p.lon < lb.minLon) lb.minLon = p.lon;
        if (p.lon > lb.maxLon) lb.maxLon = p.lon;
        if (p.lat < lb.minLat) lb.minLat = p.lat;
        if (p.lat > lb.maxLat) lb.maxLat = p.lat;
      }
      const arr = lobosPorPais.get(idPais);
      if (arr) arr.push(lb);
      else lobosPorPais.set(idPais, [lb]);
    }
  }
}

export const v2ll = (v: THREE.Vector3): L2 => {
  const r = v.length() || 1;
  const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, v.y / r))) * 180) / Math.PI;
  let lon = (Math.atan2(v.z, -v.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lon, lat };
};

const pontoNoLobo = (lobo: Lobo, lon: number, lat: number): boolean => {
  if (lon < lobo.minLon || lon > lobo.maxLon || lat < lobo.minLat || lat > lobo.maxLat) return false;
  const p = lobo.pontos;
  let dentro = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const xi = p[i].lon, yi = p[i].lat, xj = p[j].lon, yj = p[j].lat;
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
};

export const paisNoPonto = (lon: number, lat: number): string | null => {
  for (const [id, lobos] of lobosPorPais) {
    for (const lobo of lobos) {
      if (pontoNoLobo(lobo, lon, lat)) return id;
    }
  }
  return null;
};

export const geometriaDoPais = (tipo: string, coords: Position[][] | Position[][][]): THREE.BufferGeometry | null => {
  const pecas: THREE.BufferGeometry[] = [];
  for (const grupo of aneisDoPais(tipo, coords)) {
    for (const pts of grupo) {
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].lon, -pts[0].lat);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].lon, -pts[i].lat);
      shape.closePath();
      const g = new THREE.ShapeGeometry(shape);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const norm = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const lon = arr[i * 3];
        const lat = -arr[i * 3 + 1];
        const v = ll2v(lon, lat, R * 1.002);
        arr[i * 3] = v[0];
        arr[i * 3 + 1] = v[1];
        arr[i * 3 + 2] = v[2];
        const inv = 1 / Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        norm[i * 3] = v[0] * inv;
        norm[i * 3 + 1] = v[1] * inv;
        norm[i * 3 + 2] = v[2] * inv;
      }
      g.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      g.computeBoundingSphere();
      pecas.push(g);
    }
  }
  if (pecas.length === 1) return pecas[0];
  if (pecas.length === 0) return null;
  const uniao = mergeGeometries(pecas, false);
  for (const g of pecas) g.dispose();
  return uniao;
};

export const anelPolilinha = (pts: L2[], r: number): THREE.BufferGeometry => {
  const arr = new Float32Array(pts.length * 3);
  for (let i = 0; i < pts.length; i++) {
    const v = ll2v(pts[i].lon, pts[i].lat, r);
    arr[i * 3] = v[0];
    arr[i * 3 + 1] = v[1];
    arr[i * 3 + 2] = v[2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.computeBoundingSphere();
  return g;
};

const TERRENO = [
  '#4a7f3e', '#6f9b4c', '#88aa57', '#5f8a3f', '#97ae63',
  '#7aa056', '#8fa55d', '#5c7a3d', '#a3a865', '#6c9250',
  '#b39055', '#9c8a4f', '#c0a260', '#8ba05e', '#54793e',
];

const semear = (iso: number): number => {
  let h = Math.imul(iso, 2654435761) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  return h >>> 0;
};

export const COR_REGIME: Record<string, number> = {
  democracia: 0x3fca6a,
  'híbrido': 0xeab23a,
  'autoritário': 0xe04f4f,
};

export const TEX_URLS = [
  'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r156/examples/textures/planets/earth_atmos_2048.jpg',
  'https://unpkg.com/three-globe@2.31.0/example/img/earth-dark.jpg',
];

export const pintarGlobo = (): THREE.CanvasTexture => {
  const cv = document.createElement('canvas');
  cv.width = 2048;
  cv.height = 1024;
  const ctx = cv.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#1c3c6e');
  grad.addColorStop(0.25, '#24528f');
  grad.addColorStop(0.5, '#2f6aa8');
  grad.addColorStop(0.75, '#24528f');
  grad.addColorStop(1, '#1c3c6e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);

  ctx.strokeStyle = 'rgba(120, 170, 220, .10)';
  ctx.lineWidth = 1;
  for (let lon = -180; lon < 180; lon += 30) {
    const x = ((lon + 180) / 360) * 2048;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = ((90 - lat) / 180) * 1024;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }

  const mapaX = (lon: number) => ((lon + 180) / 360) * 2048;
  const mapaY = (lat: number) => ((90 - lat) / 180) * 1024;

  try {
    for (const f of FEATURAS) {
      if (f.id === undefined || f.id === null) continue;
      const geom = f.geometry as { type: string; coordinates: unknown } | null;
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
      const cor = TERRENO[semear(Number(f.id)) % TERRENO.length];
      for (const grupo of aneisDoPais(geom.type, geom.coordinates as Position[][] | Position[][][])) {
        for (const pts of grupo) {
          ctx.fillStyle = cor;
          ctx.beginPath();
          ctx.moveTo(mapaX(pts[0].lon), mapaY(pts[0].lat));
          for (let i = 1; i < pts.length; i++) ctx.lineTo(mapaX(pts[i].lon), mapaY(pts[i].lat));
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = 'rgba(35, 50, 25, .55)';
    ctx.lineWidth = 1.5;
    for (const f of FEATURAS) {
      if (f.id === undefined || f.id === null) continue;
      const geom = f.geometry as { type: string; coordinates: unknown } | null;
      if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
      for (const grupo of aneisDoPais(geom.type, geom.coordinates as Position[][] | Position[][][])) {
        for (const pts of grupo) {
          ctx.beginPath();
          ctx.moveTo(mapaX(pts[0].lon), mapaY(pts[0].lat));
          for (let i = 1; i < pts.length; i++) ctx.lineTo(mapaX(pts[i].lon), mapaY(pts[i].lat));
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
  } catch (e) {
    console.error('pintarGlobo', e);
  }

  const capa = ctx.createLinearGradient(0, 0, 0, 70);
  capa.addColorStop(0, '#eef6f6');
  capa.addColorStop(1, 'rgba(230, 240, 240, 0)');
  ctx.fillStyle = capa;
  ctx.fillRect(0, 0, 2048, 70);
  const capb = ctx.createLinearGradient(0, 1024, 0, 954);
  capb.addColorStop(0, '#eef6f6');
  capb.addColorStop(1, 'rgba(230, 240, 240, 0)');
  ctx.fillStyle = capb;
  ctx.fillRect(0, 954, 2048, 70);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
};