import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Position } from 'geojson';
import { SEMENTES } from '../engine/data/countries';
import {
  FEATURAS,
  porIso,
  R,
  ll2v,
  aneisDoPais,
  anelPolilinha,
  v2ll,
  paisNoPonto,
  geometriaDoPais,
  COR_REGIME,
  TEX_URLS,
  pintarGlobo,
  type L2,
} from './globoTerra';

export const Globo = ({ onSelecionar, selecionado, destacado }: {
  onSelecionar: (id: string) => void;
  selecionado: string | null;
  destacado?: string | null;
}) => {
  const mont = useRef<HTMLDivElement>(null);
  const aplicarRef = useRef<((id: string | null) => void) | null>(null);
  const destaqueRef = useRef<((id: string | null) => void) | null>(null);
  const controlesRef = useRef<OrbitControls | null>(null);

  const aprox = () => controlesRef.current?.dollyIn(0.7);
  const afastar = () => controlesRef.current?.dollyOut(0.7);

  useEffect(() => {
    aplicarRef.current?.(selecionado);
  }, [selecionado]);

  useEffect(() => {
    destaqueRef.current?.(destacado ?? null);
  }, [destacado]);

  useEffect(() => {
    const el = mont.current;
    if (!el) return;
    let ok = true;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      el.innerHTML = '<p style="color:#8b96a9;padding:40px">Seu navegador não suporta WebGL. Use a lista de países ao lado.</p>';
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    camera.position.set(0, 0.6, 2.9);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    cena.add(amb);
    const sol = new THREE.DirectionalLight(0xfff4e0, 1.25);
    sol.position.set(5, 3, 6);
    cena.add(sol);

    const globo = new THREE.Group();
    globo.rotation.y = THREE.MathUtils.degToRad(-47);
    cena.add(globo);

    const base = pintarGlobo();
    const materialTerra = new THREE.MeshPhongMaterial({ map: base, specular: 0x222233, shininess: 14 });
    const esfera = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 48), materialTerra);
    globo.add(esfera);

    const atmosfera = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.045, 96, 48),
      new THREE.MeshBasicMaterial({ color: 0x3fa9ff, transparent: true, opacity: 0.1, side: THREE.BackSide }),
    );
    globo.add(atmosfera);

    const malhas = new Map<string, THREE.Mesh>();
    const bordaLinhas = new Map<string, THREE.LineLoop[]>();
    const aneis2Borda = new Map<string, L2[][][]>();
    const bordaSel: THREE.LineLoop[] = [];

    const materialBorda = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const materialBordaSel = new THREE.LineBasicMaterial({ color: 0x2bff8f, transparent: true, opacity: 1 });

    for (const f of FEATURAS) {
      try {
        if (f.id === undefined || f.id === null) continue;
        const geom = f.geometry as { type: string; coordinates: unknown } | null;
        if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
        const coords = geom.coordinates as Position[][] | Position[][][];
        const g = geometriaDoPais(geom.type, coords);
        if (!g) continue;
        const idPais = porIso.get(Number(f.id));
        if (!idPais) continue;
        const seed = SEMENTES.find((s) => s.id === idPais);
        const cor = seed ? COR_REGIME[seed.regime] ?? COR_REGIME['híbrido'] : COR_REGIME['híbrido'];
        const casca = new THREE.Mesh(g, new THREE.MeshPhongMaterial({
          color: cor,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          shininess: 4,
          specular: 0x000000,
        }));
        casca.userData.id = idPais;
        globo.add(casca);
        malhas.set(idPais, casca);

        const linhas: THREE.LineLoop[] = [];
        const aneis = aneisDoPais(geom.type, coords);
        aneis2Borda.set(idPais, aneis);
        for (const grupo of aneis) {
          for (const ring of grupo) {
            const linha = new THREE.LineLoop(anelPolilinha(ring, R * 1.004), materialBorda);
            globo.add(linha);
            linhas.push(linha);
          }
        }
        if (linhas.length) bordaLinhas.set(idPais, linhas);
      } catch (e) {
        console.error('pais', f.id, e);
      }
    }

    const pontos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
      const v = ll2v(Math.random() * 360 - 180, Math.random() * 180 - 90, 14 + Math.random() * 30);
      pontos[i * 3] = v[0];
      pontos[i * 3 + 1] = v[1];
      pontos[i * 3 + 2] = v[2];
    }
    const estrelasGeo = new THREE.BufferGeometry();
    estrelasGeo.setAttribute('position', new THREE.BufferAttribute(pontos, 3));
    const estrelas = new THREE.Points(estrelasGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.35, sizeAttenuation: false, transparent: true, opacity: 0.7, depthWrite: false,
    }));
    cena.add(estrelas);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.enablePan = false;
    controls.minDistance = 1.55;
    controls.maxDistance = 6;
    controls.enableZoom = true;
    controlesRef.current = controls;

    const focoAlvo = new THREE.Vector3();
    const origem = new THREE.Vector3();
    let focoAtivo = false;
    let voltarCentro = false;

    const aplicarSelecao = (id: string | null) => {
      for (const l of bordaSel) {
        globo.remove(l);
        l.geometry.dispose();
      }
      bordaSel.length = 0;
      focoAtivo = false;
      voltarCentro = false;
      if (!id) {
        controls.autoRotate = false;
        focoAlvo.copy(origem);
        focoAtivo = true;
        voltarCentro = true;
        return;
      }
      controls.autoRotate = false;
      const linhas = bordaLinhas.get(id);
      if (linhas) {
        for (const grupo of aneis2Borda.get(id) ?? []) {
          for (const g of grupo) {
            const l = new THREE.LineLoop(anelPolilinha(g, R * 1.009), materialBordaSel);
            globo.add(l);
            bordaSel.push(l);
          }
        }
      }
      const mesh = malhas.get(id);
      if (mesh?.geometry.boundingSphere) {
        const c = mesh.geometry.boundingSphere.center.clone().normalize().multiplyScalar(0.85);
        focoAlvo.copy(c);
        focoAtivo = true;
      }
    };
    aplicarRef.current = aplicarSelecao;

    const bordaDestaque: THREE.LineLoop[] = [];
    const materialDestaque = new THREE.LineBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 1 });

    const aplicarDestaque = (id: string | null) => {
      for (const l of bordaDestaque) {
        globo.remove(l);
        l.geometry.dispose();
      }
      bordaDestaque.length = 0;
      if (!id) return;
      const aneis = aneis2Borda.get(id);
      if (!aneis) return;
      for (const grupo of aneis) {
        for (const g of grupo) {
          const l = new THREE.LineLoop(anelPolilinha(g, R * 1.011), materialDestaque);
          globo.add(l);
          bordaDestaque.push(l);
        }
      }
    };
    destaqueRef.current = aplicarDestaque;

    const ray = new THREE.Raycaster();
    const pv = new THREE.Vector2();

    const atualizarQt = () => {
      const a = el.clientWidth;
      const b = el.clientHeight;
      renderer.setSize(a, b, true);
      camera.aspect = a / Math.max(1, b);
      camera.updateProjectionMatrix();
    };
    atualizarQt();

    const apontador = new ResizeObserver(atualizarQt);
    apontador.observe(el);

    const mover = (e: PointerEvent) => {
      if (e.buttons > 0 && Math.hypot(e.clientX - arrastoIni.x, e.clientY - arrastoIni.y) > 5) {
        arrastou = true;
        focoAtivo = false;
      }
      const rct = renderer.domElement.getBoundingClientRect();
      pv.x = ((e.clientX - rct.left) / rct.width) * 2 - 1;
      pv.y = -((e.clientY - rct.top) / rct.height) * 2 + 1;
      ray.setFromCamera(pv, camera);
      const pts = ray.intersectObject(esfera, false);
      const ll = pts.length ? v2ll(esfera.worldToLocal(pts[0].point.clone())) : null;
      const id = ll ? paisNoPonto(ll.lon, ll.lat) : null;
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    };

    const arrastoIni = { x: 0, y: 0 };
    let arrastou = false;

    const apertar = (e: PointerEvent) => {
      arrastoIni.x = e.clientX;
      arrastoIni.y = e.clientY;
      arrastou = false;
      focoAtivo = false;
      voltarCentro = false;
      controls.target.copy(origem);
    };

    const soltar = (e: PointerEvent) => {
      if (arrastou) return;
      const rct = renderer.domElement.getBoundingClientRect();
      pv.x = ((e.clientX - rct.left) / rct.width) * 2 - 1;
      pv.y = -((e.clientY - rct.top) / rct.height) * 2 + 1;
      ray.setFromCamera(pv, camera);
      const pts = ray.intersectObject(esfera, false);
      if (!pts.length) return;
      const ll = v2ll(esfera.worldToLocal(pts[0].point.clone()));
      const id = paisNoPonto(ll.lon, ll.lat);
      if (id) onSelecionar(id);
    };

    renderer.domElement.addEventListener('pointermove', mover as EventListener);
    renderer.domElement.addEventListener('pointerdown', apertar as EventListener);
    renderer.domElement.addEventListener('pointerup', soltar as EventListener);

    const tentarTex = (i: number) => {
      if (!ok || i >= TEX_URLS.length) return;
      new THREE.TextureLoader().load(
        TEX_URLS[i],
        (t) => {
          if (!ok) return;
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
          materialTerra.map = t;
          materialTerra.needsUpdate = true;
          base.dispose();
        },
        undefined,
        () => tentarTex(i + 1),
      );
    };
    tentarTex(0);

    let raf = 0;
    const animar = () => {
      if (!ok) return;
      raf = requestAnimationFrame(animar);
      if (focoAtivo) {
        controls.target.lerp(focoAlvo, 0.08);
        controls.autoRotate = false;
        if (controls.target.distanceTo(focoAlvo) < 0.002) {
          focoAtivo = false;
          if (voltarCentro) controls.autoRotate = true;
        }
      }
      controls.update();
      renderer.render(cena, camera);
    };
    animar();

    return () => {
      ok = false;
      cancelAnimationFrame(raf);
      apontador.disconnect();
      aplicarRef.current = null;
      destaqueRef.current = null;
      renderer.domElement.removeEventListener('pointermove', mover as EventListener);
      renderer.domElement.removeEventListener('pointerdown', apertar as EventListener);
      renderer.domElement.removeEventListener('pointerup', soltar as EventListener);
      controls.dispose();
      controlesRef.current = null;
      for (const m of malhas.values()) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      for (const ls of bordaLinhas.values()) {
        for (const l of ls) {
          l.geometry.dispose();
        }
      }
      for (const l of bordaSel) l.geometry.dispose();
      for (const l of bordaDestaque) l.geometry.dispose();
      materialBorda.dispose();
      materialBordaSel.dispose();
      materialDestaque.dispose();
      esfera.geometry.dispose();
      (esfera.material as THREE.Material).dispose();
      atmosfera.geometry.dispose();
      (atmosfera.material as THREE.Material).dispose();
      estrelasGeo.dispose();
      (estrelas.material as THREE.Material).dispose();
      base.dispose();
      renderer.dispose();
      el.innerHTML = '';
    };
  }, [onSelecionar]);

  return (
    <>
      <div className="globo" ref={mont} />
      <div className="globo-zoom">
        <button className="btn" onClick={aprox} title="Aproximar">➕</button>
        <button className="btn" onClick={afastar} title="Afastar">➖</button>
      </div>
    </>
  );
};