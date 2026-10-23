import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { World, Country, EspacoModo, SistemaEstelar, Planeta } from '../engine/types';
import { distSistema, sistemasRevelados, PROGRAMA_TIPOS, capacidadeEspacial, TIPO_LABEL, espacoResumo, espacoRecomendado, ESCOPO_INFO } from '../engine/space';
import { fmtNum, fmtMes } from '../engine/util';
import { SEMENTES } from '../engine/data/countries';
import { FEATURAS, porIso, ll2v, aneisDoPais, anelPolilinha, lobosPorPais, v2ll, paisNoPonto, pintarGlobo, TEX_URLS, type L2 } from './globoTerra';
import type { Position } from 'geojson';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { Bandeira } from './components';

const SYS_COLORS: Record<string, string> = {
  amarela: '#ffd27f',
  vermelha: '#ff6b4a',
  azul: '#7fc4ff',
  nebulosa: '#b98aff',
  buraco: '#663a8a',
  gemini: '#4affd0',
};

const PLANETA_COR: Record<string, string> = {
  rochoso: '#b4766a',
  gelado: '#c8e0f0',
  gasoso: '#e8b27a',
  oceano: '#3f8efc',
  deserto: '#d9b382',
  vulcanico: '#ff6a3a',
  anomalo: '#ff5fe0',
};

const PALETA_PAISES = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#64748b'];
const corDe = (id: string) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return PALETA_PAISES[(h >>> 0) % PALETA_PAISES.length];
};

type NivelVisao = 'globo' | 'sistema' | 'quadrante';
type DestinoCam = { get: () => THREE.Object3D | null; pos: THREE.Vector3 | null; dist: number };

const IMG_CACHE = new Map<string, HTMLImageElement>();

function texPlaneta(url: string): THREE.Texture {
  const placeholder = document.createElement('canvas');
  placeholder.width = 16;
  placeholder.height = 8;
  const ctx = placeholder.getContext('2d')!;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 16, 8);
  const tex = new THREE.Texture<HTMLImageElement | HTMLCanvasElement>(placeholder);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  let img = IMG_CACHE.get(url);
  if (!img) {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    IMG_CACHE.set(url, img);
  }
  const apply = () => {
    if (img.complete && img.naturalWidth > 0) {
      tex.image = img;
      tex.needsUpdate = true;
    }
  };
  if (!img.complete || img.naturalWidth === 0) img.addEventListener('load', apply);
  else apply();
  return tex;
}

function spriteTextura(cor: string, raio = 64): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = cv.height = raio * 2;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(raio, raio, 0, raio, raio, raio);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, cor);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, raio * 2, raio * 2);
  return new THREE.CanvasTexture(cv);
}

function disposeObj(o: THREE.Object3D) {
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

const v3 = (s: SistemaEstelar) => new THREE.Vector3(s.x, s.y * 0.7, s.z);

/** Sala Orbital — comando estratégico heliocêntrico em tela cheia. */
export const OrbitalStage = ({ w, c }: { w: World; c: Country }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sistemaGroupRef = useRef<THREE.Group | null>(null);
  const spritesRef = useRef<THREE.Sprite[]>([]);
  const orbitsRef = useRef<{ o: THREE.Group; a: number; v: number }[]>([]);
  const terraRef = useRef<THREE.Object3D | null>(null);
  const destinoRef = useRef<DestinoCam | null>(null);
  const anguloRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const terraBordasRef = useRef<{ porPais: Map<string, THREE.LineLoop[]>; aneisPorPais: Map<string, L2[][][]> } | null>(null);
  const terraCamDirRef = useRef<Map<string, THREE.Vector3> | null>(null);
  const selGrupoRef = useRef<THREE.Group | null>(null);
  const selMatRef = useRef<THREE.LineBasicMaterial | null>(null);
  const terraTexsRef = useRef<THREE.Texture[]>([]);
  const planetasRef = useRef<{ mesh: THREE.Mesh; spin: number }[]>([]);
  const nivelRef = useRef<NivelVisao>('globo');
  const raioTerraRef = useRef(0.8);

  const [erro, setErro] = useState(false);
  const [foco, setFoco] = useState<SistemaEstelar | null>(null);
  const [nivel, setNivel] = useState<NivelVisao>('globo');
  const [livre, setLivre] = useState(false);
  const [paisSel, setPaisSel] = useState<string | null>(null);
  const paisSelRef = useRef<string | null>(null);

  const modo = useUi((s) => s.modoEspaco);
  const setModoEspaco = useUi((s) => s.setModoEspaco);
  const fecharOrbital = useUi((s) => s.fecharOrbital);
  const objetivoOrbital = useUi((s) => s.objetivoOrbital);

  const vel = useGame((s) => s.vel);
  const rodando = useGame((s) => s.rodando);
  const setVel = useGame((s) => s.setVel);
  const setRodando = useGame((s) => s.setRodando);
  const avancar = useGame((s) => s.avancar);
  const salvar = useGame((s) => s.salvar);
  const reiniciar = useGame((s) => s.reiniciar);
  const resolverDecisao = useGame((s) => s.resolverDecisao);
  const lancarExploracao = useGame((s) => s.lancarExploracao);
  const sondarPlaneta = useGame((s) => s.sondarPlaneta);
  const colonizarPlaneta = useGame((s) => s.colonizarPlaneta);

  const scope = w.espaco;
  const sol = useMemo(() => scope.sistemas.find((s) => s.id === 'system_sol') ?? null, [scope]);
  const revelados = useMemo(() => sistemasRevelados(scope), [scope]);
  const resumo = useMemo(() => espacoResumo(w, modo), [w, modo]);
  const recomendado = espacoRecomendado(w);
  const cap = capacidadeEspacial(c);

  nivelRef.current = nivel;

  const selecionarPais = (id: string | null) => {
    paisSelRef.current = id;
    setPaisSel(id);
    const sel = selGrupoRef.current;
    if (!sel) return;
    while (sel.children.length) {
      const ch = sel.children[0];
      sel.remove(ch);
      const g = (ch as THREE.Line).geometry;
      if (g) g.dispose();
    }
    if (!id) return;
    const aneis = terraBordasRef.current?.aneisPorPais.get(id);
    const mat = selMatRef.current;
    if (!aneis || !mat) return;
    const rad = raioTerraRef.current * 1.014;
    for (const grupo of aneis) {
      for (const ring of grupo) {
        sel.add(new THREE.LineLoop(anelPolilinha(ring, rad), mat));
      }
    }
  };

  const irGlobo = () => {
    setNivel('globo');
    setFoco(sol);
    setLivre(false);
    destinoRef.current = { get: () => terraRef.current, pos: null, dist: 2.6 };
  };

  const irSistema = () => {
    const s = foco ?? sol;
    if (!s) return;
    setNivel('sistema');
    setFoco(s);
    setLivre(false);
    selecionarPais(null);
    destinoRef.current = { get: () => null, pos: v3(s), dist: s.id === 'system_sol' ? 17 : 12 };
  };

  const irQuadrante = () => {
    setNivel('quadrante');
    setFoco(null);
    setLivre(false);
    selecionarPais(null);
    destinoRef.current = { get: () => null, pos: new THREE.Vector3(0, 0.8, 0), dist: 34 };
  };

  const viajarPara = (s: SistemaEstelar) => {
    setFoco(s);
    setNivel('sistema');
    destinoRef.current = { get: () => null, pos: v3(s), dist: 12 };
    setLivre(false);
    selecionarPais(null);
  };

  // Inicializa a cena uma única vez
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setErro(true);
      return;
    }
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#04070f');
    scene.fog = new THREE.Fog('#04070f', 60, 160);

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 400);
    camera.position.set(2.4, 1.6, 5);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.3;
    controls.maxDistance = 90;
    controls.addEventListener('start', () => {
      destinoRef.current = null;
      setLivre(true);
    });
    controlsRef.current = controls;

    const estrelas = new Float32Array(3600 * 3);
    for (let i = 0; i < estrelas.length; i++) estrelas[i] = (Math.random() - 0.5) * 260;
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute('position', new THREE.BufferAttribute(estrelas, 3));
    const ptsMat = new THREE.PointsMaterial({ color: '#9db4d0', size: 0.16, sizeAttenuation: true, transparent: true, opacity: 0.8 });
    scene.add(new THREE.Points(ptsGeo, ptsMat));

    const luz = new THREE.DirectionalLight('#ffffff', 1.6);
    luz.position.set(6, 8, 12);
    scene.add(luz);
    scene.add(new THREE.AmbientLight('#334155', 0.9));

    const sistemaGroup = new THREE.Group();
    scene.add(sistemaGroup);
    sistemaGroupRef.current = sistemaGroup;

    const alvoVec = new THREE.Vector3();
    const dirVec = new THREE.Vector3();
    const offVec = new THREE.Vector3();
    let disposed = false;
    const animar = () => {
      if (disposed) return;
      for (const q of planetasRef.current) q.mesh.rotation.y += q.spin;
      for (const orb of orbitsRef.current) {
        orb.o.rotation.y += 0.01 * orb.v + (orb.a === 2 ? 0.0006 : 0);
      }
      const dest = destinoRef.current;
      if (camera && controls && dest) {
        const alvoObj = dest.get ? dest.get() : null;
        let alvo = alvoObj ? alvoObj.getWorldPosition(alvoVec) : dest.pos;
        if (alvoObj) {
          const dirSel = paisSelRef.current ? terraCamDirRef.current?.get(paisSelRef.current) : null;
          if (dirSel) {
            alvoObj.updateWorldMatrix(true, false);
            dirVec.copy(dirSel).applyMatrix4(alvoObj.matrixWorld);
            alvo = dirVec;
          }
        }
        if (alvo) {
          controls.target.lerp(alvo, 0.08);
          if (alvoObj) anguloRef.current += 0.0016;
          offVec
            .set(Math.sin(anguloRef.current) * 0.55, 0.34, Math.cos(anguloRef.current))
            .normalize()
            .multiplyScalar(dest.dist);
          const desejo = alvo.clone().add(offVec);
          camera.position.lerp(desejo, 0.08);
          controls.update();
          if (!alvoObj && camera.position.distanceTo(desejo) < 0.08) {
            anguloRef.current = Math.atan2(camera.position.x - alvo.x, camera.position.z - alvo.z);
            destinoRef.current = null;
            if (!disposed) setLivre(false);
          }
        } else {
          controls.update();
        }
      } else {
        controls.update();
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animar);
    };
    animar();

    const onResize = () => {
      const m = mountRef.current;
      if (!m) return;
      renderer.setSize(m.clientWidth, m.clientHeight);
      camera.aspect = m.clientWidth / m.clientHeight;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    window.addEventListener('resize', onResize);

    let apertarX = 0;
    let apertarY = 0;
    const aoApertarGlobo = (ev: PointerEvent) => {
      apertarX = ev.clientX;
      apertarY = ev.clientY;
    };

    const aoClicar = (ev: MouseEvent) => {
      const dx = ev.clientX - apertarX;
      const dy = ev.clientY - apertarY;
      if (dx * dx + dy * dy > 36) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycasterRef.current.setFromCamera(ndc, camera);
      const terra = terraRef.current as THREE.Mesh | null;
      if (nivelRef.current === 'globo' && terra) {
        const pts = raycasterRef.current.intersectObject(terra, false);
        if (pts.length) {
          const ll = v2ll(terra.worldToLocal(pts[0].point.clone()));
          selecionarPais(paisNoPonto(ll.lon, ll.lat));
          return;
        }
      }
      const acertados = raycasterRef.current.intersectObjects(spritesRef.current, false);
      if (acertados.length) {
        const s = (acertados[0].object as THREE.Sprite).userData.sistema as SistemaEstelar;
        if (s) {
          setFoco(s);
          setNivel('sistema');
          setLivre(false);
          destinoRef.current = { get: () => null, pos: v3(s), dist: 12 };
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', aoApertarGlobo as EventListener);
    renderer.domElement.addEventListener('click', aoClicar);

    return () => {
      disposed = true;
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', aoApertarGlobo as EventListener);
      renderer.domElement.removeEventListener('click', aoClicar);
      controls.dispose();
      disposeObj(sistemaGroup);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Define o foco inicial (globo da Terra, ou sistema alvo solicitado)
  useEffect(() => {
    const alvo = objetivoOrbital ? scope.sistemas.find((s) => s.id === objetivoOrbital) ?? null : null;
    const id = setTimeout(() => {
      if (alvo) viajarPara(alvo);
      else irGlobo();
    }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconstrói o mapa quando o foco / escopo muda
  useEffect(() => {
    const g = sistemaGroupRef.current;
    if (!g) return;
    while (g.children.length) {
      const ch = g.children[0];
      g.remove(ch);
      disposeObj(ch);
    }
    spritesRef.current = [];
    orbitsRef.current = [];
    planetasRef.current = [];
    terraRef.current = null;
    terraBordasRef.current = null;
    terraCamDirRef.current = null;
    selGrupoRef.current = null;
    selMatRef.current = null;
    raioTerraRef.current = 0.8;
    for (const t of terraTexsRef.current) t.dispose();
    terraTexsRef.current = [];

    for (const s of scope.sistemas) {
      const tex = spriteTextura(s.cor, s.revelado ? 56 : 26);
      const spriteMat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: s.revelado ? 1 : 0.26,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      const sf = s.id === 'system_sol' ? 0.85 : 0.3 + s.raio;
      sprite.scale.set(sf, sf, 1);
      sprite.position.copy(v3(s));
      sprite.userData.sistema = s;
      g.add(sprite);
      if (s.revelado) spritesRef.current.push(sprite);
    }

    const alvo = foco;
    if (!alvo) return;

    const sunTex = spriteTextura(alvo.cor, 80);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, opacity: 0.9, depthWrite: false }));
    glow.scale.set(3.2, 3.2, 1);
    glow.position.copy(v3(alvo));
    g.add(glow);
    const sunMat = new THREE.MeshBasicMaterial({ color: alvo.cor });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(alvo.id === 'system_sol' ? 0.85 : 0.5, 32, 24), sunMat);
    sun.position.copy(v3(alvo));
    g.add(sun);

    const local = new THREE.Group();
    local.position.copy(v3(alvo));
    g.add(local);

    const raioBase = alvo.id === 'system_sol' ? 3 : 2.2;
    alvo.planetas.forEach((p, i) => {
      const r = raioBase + i * 1.8;
      const orb = new THREE.Group();
      orb.rotation.y = i * 2.1 + 1.3;

      const pts: THREE.Vector3[] = [];
      for (let a = 0; a <= 96; a++) {
        const t = (a / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r));
      }
      const orbLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: '#263247', transparent: true, opacity: 0.55 }),
      );
      local.add(orbLine);

      const raioMesh = alvo.id === 'system_sol'
        ? p.tipo === 'gasoso' ? 1.5 : 0.45 + p.raio * 0.35
        : 0.22 + p.raio * 0.24;
      let mat: THREE.Material;
      let mesh: THREE.Mesh;
      if (p.id === 'sol-terra') {
        const base = pintarGlobo();
        terraTexsRef.current.push(base);
        mat = new THREE.MeshStandardMaterial({
          map: base,
          metalness: 0.05,
          roughness: 0.92,
          emissive: new THREE.Color('#000000'),
          emissiveIntensity: 0,
        });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(raioMesh, 64, 40), mat);
        raioTerraRef.current = raioMesh;
        let ti = 0;
        const tentarFoto = () => {
          if (ti >= TEX_URLS.length) return;
          new THREE.TextureLoader().load(
            TEX_URLS[ti],
            (t) => {
              t.colorSpace = THREE.SRGBColorSpace;
              t.anisotropy = 8;
              (mat as THREE.MeshStandardMaterial).map = t;
              (mat as THREE.MeshStandardMaterial).needsUpdate = true;
              terraTexsRef.current.push(t);
            },
            undefined,
            () => {
              ti++;
              tentarFoto();
            },
          );
        };
        tentarFoto();

        const bordas = new THREE.Group();
        const matBorda = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
        const porPais = new Map<string, THREE.LineLoop[]>();
        const aneisPor = new Map<string, L2[][][]>();
        for (const f of FEATURAS) {
          if (f.id === undefined || f.id === null) continue;
          const idPais = porIso.get(Number(f.id));
          if (!idPais) continue;
          const geom = f.geometry as { type: string; coordinates: unknown } | null;
          if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;
          const coords = geom.coordinates as Position[][] | Position[][][];
          const aneis = aneisDoPais(geom.type, coords);
          aneisPor.set(idPais, aneis);
          const linhas: THREE.LineLoop[] = [];
          for (const grupo of aneis) {
            for (const ring of grupo) {
              const l = new THREE.LineLoop(anelPolilinha(ring, raioMesh * 1.006), matBorda);
              bordas.add(l);
              linhas.push(l);
            }
          }
          if (linhas.length) porPais.set(idPais, linhas);
        }
        mesh.add(bordas);
        terraBordasRef.current = { porPais, aneisPorPais: aneisPor };

        const dirs = new Map<string, THREE.Vector3>();
        for (const [id, lobos] of lobosPorPais) {
          const acc = new THREE.Vector3();
          let n = 0;
          for (const lb of lobos) {
            const vv = ll2v((lb.minLon + lb.maxLon) / 2, (lb.minLat + lb.maxLat) / 2, 1);
            acc.x += vv[0];
            acc.y += vv[1];
            acc.z += vv[2];
            n++;
          }
          if (n) dirs.set(id, acc.normalize().multiplyScalar(0.85));
        }
        terraCamDirRef.current = dirs;

        const selGrupo = new THREE.Group();
        mesh.add(selGrupo);
        selGrupoRef.current = selGrupo;
        selMatRef.current = new THREE.LineBasicMaterial({ color: 0x2bff8f, transparent: true, opacity: 1 });
      } else {
        mat = new THREE.MeshStandardMaterial({
          map: texPlaneta(p.textura),
          metalness: 0.05,
          roughness: 0.95,
          emissive: p.tipo === 'anomalo' ? new THREE.Color('#7c3aed') : new THREE.Color('#000000'),
          emissiveIntensity: p.tipo === 'anomalo' ? 0.7 : 0,
        });
        mesh = new THREE.Mesh(new THREE.SphereGeometry(raioMesh, 48, 32), mat);
      }
      mesh.position.x = r;
      if (p.id === 'sol-terra') terraRef.current = mesh;
      orb.add(mesh);
      planetasRef.current.push({ mesh, spin: p.id === 'sol-terra' ? 0.0018 : 0.001 + i * 0.0003 });

      if (p.aneis) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(raioMesh * 0.85, raioMesh * 0.28, 12, 64),
          new THREE.MeshBasicMaterial({ color: p.id === 'sol-saturno' ? '#d9c39a' : '#b5a68c', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
        );
        ring.rotation.x = Math.PI / 2.25;
        mesh.add(ring);
      }

      if (p.coloniaId) {
        const col = scope.colonias.find((x) => x.id === p.coloniaId);
        const dono = col?.dono ?? c.id;
        const visivel = modo === 'terra' || (modo === 'bloco' ? resumo.membros.some((m) => m.id === dono) : dono === c.id);
        const marc = new THREE.Mesh(
          new THREE.CircleGeometry(raioMesh * 0.5, 24),
          new THREE.MeshBasicMaterial({
            color: corDe(dono),
            transparent: true,
            opacity: visivel ? 0.95 : 0.12,
            side: THREE.DoubleSide,
          }),
        );
        marc.rotation.x = -Math.PI / 2;
        marc.position.y = raioMesh * 1.15;
        mesh.add(marc);
      }

      local.add(orb);
      orbitsRef.current.push({ o: orb, a: i, v: 0.5 + i * 0.12 });
    });

    if (paisSelRef.current && terraRef.current) selecionarPais(paisSelRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, foco, modo, c.id]);

  const emSondagem = (p: Planeta) => scope.sondando.some((x) => x.planetaId === p.id);
  const emExploracao = (s: SistemaEstelar) => scope.explorando.some((x) => x.sistemaId === s.id);
  const alcance = resumo.alcance;
  const aDescobrir = scope.sistemas.filter((s) => !s.revelado && distSistema(s) <= alcance).sort((a, b) => distSistema(a) - distSistema(b)).slice(0, 10);
  const foraDeAlcance = scope.sistemas.filter((s) => !s.revelado && distSistema(s) > alcance).length;

  const statusTxt = livre
    ? '🛰️ Voo livre — arraste para explorar. Volte à Terra, a um sistema ou ao quadrante.'
    : nivel === 'globo'
      ? paisSel
        ? `🌍 Órbita da Terra — ${SEMENTES.find((s) => s.id === paisSel)?.nome ?? paisSel} selecionado (clique no mar para centralizar)`
        : '🌍 Órbita da Terra'
      : nivel === 'sistema'
        ? `☀️ Sistema ${foco?.nome ?? sol?.nome ?? ''}`
        : '🧭 Quadrante local';

  const recom = ESCOPO_INFO[recomendado];
  const dec = w.decisao;

  return (
    <div className={`orbital ${rodando ? 'rodando' : ''}`}>
      <header className="orbital-bar">
        <div className="orbital-id">
          <span className="pais-flag"><Bandeira e={c.flag} /></span>
          <div>
            <b className="orbital-pais">{c.name}</b>
            <small className="orbital-sub">Comando Estratégico Heliocêntrico</small>
          </div>
        </div>

        <div className="orbital-datas">
          <span className="orbital-mes">{fmtMes(w.ano, w.mes)}</span>
          <span className="orbital-kpis">
            <i className="k k-ap">Aprov. {fmtNum(c.aprovacao, 0)}%</i>
            <i className="k k-dp">Dívida {fmtNum(c.dividaPct, 0)}%</i>
            <i className="k k-rc">Rec. {fmtNum(c.receitaPct, 1)}</i>
            <i className="k k-esp">📍Pesq. espacial {fmtNum(resumo.espacial, 1)}</i>
            <i className="k k-alc">Orbita {alcance.toFixed(1)} ua</i>
          </span>
        </div>

        <div className="orbital-time">
          <button className="btn" onClick={() => setRodando(false)}>⏸</button>
          <button className={`btn ${!rodando && vel === 1 ? 'ativo' : ''}`} onClick={() => { setRodando(false); setVel(1); }}>1×</button>
          <button className={`btn ${rodando && vel === 3 ? 'ativo' : ''}`} onClick={() => { setRodando(true); setVel(3); }}>3×</button>
          <button className={`btn ${rodando && vel === 10 ? 'ativo' : ''}`} onClick={() => { setRodando(true); setVel(10); }}>10×</button>
          <button className="btn btn-avancar" onClick={avancar}>Mês ▸</button>
        </div>

        <div className="orbital-fim">
          <button className="btn" onClick={salvar} title="Salvar partida">💾</button>
          <button className="orbital-sair" onClick={fecharOrbital}>⏻ Voltar ao Gabinete</button>
        </div>
      </header>

      <div className="orbital-corpo">
        <aside className="orbital-esq">
          <h4 className="orbital-sec">🛰️ Missões em trânsito</h4>
          <div className="orbital-lista">
            {scope.explorando.length === 0 && <small className="dim">Nenhuma sonda em voo. Envie uma pelo levantamento abaixo.</small>}
            {scope.explorando.map((x) => {
              const s = scope.sistemas.find((r) => r.id === x.sistemaId);
              return <small key={x.sistemaId} className="orbital-li">🚀 {s?.nome ?? x.sistemaId} — ~{x.fimTurno} meses</small>;
            })}
            {scope.sondando.map((x) => {
              const p = scope.sistemas.flatMap((r) => r.planetas).find((r) => r.id === x.planetaId);
              return <small key={x.planetaId} className="orbital-li">🔬 {p?.nome ?? x.planetaId} — ~{x.fimTurno} meses</small>;
            })}
          </div>

          <h4 className="orbital-sec">🪐 Sistemas</h4>
          <div className="orbital-lista">
            {revelados.map((s) => (
              <button key={s.id} className={`orbital-li ${foco?.id === s.id ? 'ativo' : ''}`} onClick={() => viajarPara(s)}>
                <i className="dot" style={{ background: s.cor }} /> {s.nome}
                <small>{distSistema(s).toFixed(1)} ua{emExploracao(s) ? ' · 🔭' : ''}</small>
              </button>
            ))}
          </div>

          <h4 className="orbital-sec">📡 Levantamento distante</h4>
          <div className="orbital-lista">
            {aDescobrir.length === 0 && <small className="dim">Nenhum alvo no alcance ({alcance.toFixed(1)} ua).</small>}
            {aDescobrir.map((s) => (
              <button key={s.id} className="orbital-li fraca" disabled={emExploracao(s)} onClick={() => lancarExploracao(s.id)}>
                <i className="dot" style={{ background: SYS_COLORS[s.tipo], opacity: 0.6 }} /> {s.nome}
                <small>{distSistema(s).toFixed(1)} ua{emExploracao(s) ? ' · 🔭' : ' · enviar sonda'}</small>
              </button>
            ))}
            {foraDeAlcance > 0 && <small className="dim">+{foraDeAlcance} além do alcance</small>}
          </div>

          <h4 className="orbital-sec">🌱 Colônias</h4>
          <div className="orbital-lista">
            {resumo.colonias.length === 0 && <small className="dim">Sem colônias no consórcio.</small>}
            {resumo.colonias.map((col) => {
              const s = scope.sistemas.find((x) => x.id === col.sistemaId);
              const dono = w.paises[col.dono];
              return (
                <div key={col.id} className="orbital-li">
                  <i className="dot" style={{ background: corDe(col.dono) }} /> {dono?.flag} {col.nome}
                  <small>{s?.nome} · {fmtNum(col.populacao, 0)}k · {col.fase}</small>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="orbital-centro">
          <div ref={mountRef} className="orbital-mapa">
            <div className="espaco-niv">
              <button className={nivel === 'globo' && !livre ? 'ativo' : ''} onClick={irGlobo}>🌍 Terra</button>
              <button className={nivel === 'sistema' && !livre ? 'ativo' : ''} onClick={irSistema}>☀️ Sistema</button>
              <button className={nivel === 'quadrante' && !livre ? 'ativo' : ''} onClick={irQuadrante}>🧭 Quadrante</button>
            </div>
            <div className="espaco-status">{statusTxt}</div>
            <div className="espaco-zoom">
              <button className="btn" onClick={() => controlsRef.current?.dollyIn(0.7)} title="Aproximar">➕</button>
              <button className="btn" onClick={() => controlsRef.current?.dollyOut(0.7)} title="Afastar">➖</button>
            </div>
            <div className="espaco-niv-txt">clique numa estrela para focar · clique num país da Terra para detalhar fronteiras · roda para zoom · arraste para voo livre</div>
            {erro && <div className="espaco-erro">🌌 O mapa orbital requer WebGL. Ative a aceleração gráfica.</div>}
          </div>

          <div className="orbital-ticker">
            <b>📰 Telegrama orbital</b>
            <div className="orbital-feed">
              {w.noticias.slice(-18).map((n, i) => (
                <span key={i} className={`feed ${n.tom ?? 'neutro'}`}>[{n.mes}] {n.texto}</span>
              ))}
            </div>
          </div>
        </main>

        <aside className="orbital-dir">
          <h4 className="orbital-sec">🌐 Escopo do consórcio</h4>
          <div className="espaco-toggle">
            {(Object.keys(ESCOPO_INFO) as EspacoModo[]).map((k) => (
              <button key={k} className={`et-btn ${modo === k ? 'ativo' : ''} ${k === 'bloco' ? 'bloco' : ''} ${k === 'terra' ? 'terra' : ''}`} onClick={() => setModoEspaco(k)} title={ESCOPO_INFO[k].desc}>
                {ESCOPO_INFO[k].icon} {ESCOPO_INFO[k].curto}
              </button>
            ))}
          </div>
          <span className="et-recom">
            {modo === recomendado ? `${recom.icon} ${recom.desc}` : `${recom.icon} Sugerido: ${recom.curto} (${recom.desc})`}
          </span>
          <div className="membros-chips">
            {resumo.membros.map((m) => (
              <span key={m.id} className="membro-chip" title="Membro do consórcio">
                <i className="dot" style={{ background: corDe(m.id) }} /> {m.flag} {m.name}
              </span>
            ))}
          </div>

          <h4 className="orbital-sec">📊 Desempenho do consórcio</h4>
          <div className="orbital-kpis-v">
            <div className="ok"><span>Pesquisa espacial média</span><b>{fmtNum(resumo.espacial, 1)}</b></div>
            <div className="ok"><span>Investimento no setor</span><b>{fmtNum(resumo.investTotal, 1)}% PIB</b></div>
            <div className="ok"><span>Alcance combinado</span><b>{alcance.toFixed(1)} ua</b></div>
            <div className="ok"><span>Sistemas descub.</span><b>{fmtNum(scope.descobrimentos, 0)}</b></div>
            <div className="ok"><span>Faixa cartografada</span><b>{scope.faixa.toFixed(1)} ua</b></div>
          </div>

          {foco && (
            <>
              <h4 className="orbital-sec">☀️ {foco.nome}</h4>
              <div className="orbital-lista">
                {foco.planetas.map((p) => {
                  const habit = p.habitabilidade;
                  const podeSondar = p.explorado && !p.sondado && !emSondagem(p) && cap.podeSondar;
                  const podeColonizar = p.sondado && !p.coloniaId && cap.podeColonizar && habit > 0;
                  return (
                    <div key={p.id} className="orbital-li planeta">
                      <i className="dot" style={{ background: PLANETA_COR[p.tipo], width: 12, height: 12 }} />
                      <b>{p.nome}</b>
                      <small>{TIPO_LABEL[p.tipo]} · Hab {habit > 0 ? '+' : ''}{fmtNum(habit, 0)} · {p.luas} luas{p.aneis ? ' · anéis' : ''}</small>
                      <small className="dim">Metais {fmtNum(p.recursos.metais, 0)} · Cristais {fmtNum(p.recursos.cristais, 0)} · Água {fmtNum(p.recursos.agua, 0)} · Gases {fmtNum(p.recursos.gases, 0)} · Energia {fmtNum(p.recursos.energia, 0)}</small>
                      {p.anomalia && <small style={{ color: '#facc15' }}>⚠️ {p.anomalia}</small>}
                      {p.sondado && p.coloniaId ? (
                        <small className="txt-bom">🌱 Colônia estabelecida</small>
                      ) : (
                        <div className="enc-grid">
                          {p.explorado && !p.sondado && (
                            <button className="btn" disabled={!podeSondar} onClick={() => sondarPlaneta(p.id)}>
                              {emSondagem(p) ? '🔬 Sondando…' : '🔬 Sondar'}
                            </button>
                          )}
                          {p.sondado && !p.coloniaId && (
                            <button className="btn" disabled={!podeColonizar} title={podeColonizar ? '' : 'Requer programa orbital/lunar/interplanetário'} onClick={() => colonizarPlaneta(foco.id, p.id)}>
                              🏕️ Colonizar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <h4 className="orbital-sec">🚩 Programas em curso</h4>
          <div className="orbital-lista">
            {resumo.programas.length === 0 && <small className="dim">Sem programas. Crie-os na aba Pesquisa do Gabinete.</small>}
            {resumo.programas.map(({ prog, dono }) => {
              const spec = PROGRAMA_TIPOS[prog.tipo];
              return (
                <div key={`${dono.id}-${prog.id}`} className="orbital-li">
                  <b>{spec.emoji} {dono.flag} {prog.nome}</b>
                  <small>{spec.nome} · {fmtNum(prog.investido, 1)}/{prog.custo}% PIB</small>
                  <div className="gauge-track">
                    <div className="gauge-fill" style={{ width: `${prog.progresso}%`, background: prog.concluido ? '#4ade80' : '#a78bfa' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {dec && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>📢 {dec.titulo}</h2>
            <p>{dec.texto}</p>
            <div className="modal-opcoes">
              {dec.opcoes.map((o, i) => (
                <button key={i} className="btn btn-escolha" onClick={() => resolverDecisao(i)}>{o.label}</button>
              ))}
            </div>
            <p className="dim">A simulação fica pausada até você decidir.</p>
          </div>
        </div>
      )}

      {w.gameOver && (
        <div className="overlay">
          <div className="overlay-card">
            <h1>🔚 Fim do Governo</h1>
            <p>{w.motivoFim}</p>
            <button className="btn btn-grande" onClick={reiniciar}>Começar novo governo</button>
          </div>
        </div>
      )}
    </div>
  );
};