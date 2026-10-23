import { create } from 'zustand';
import type { EspacoModo } from '../engine/types';

export type AbaId =
  | 'visao'
  | 'governo'
  | 'politica'
  | 'reformas'
  | 'obras'
  | 'pesquisa'
  | 'espaco'
  | 'economia'
  | 'financas'
  | 'mercado'
  | 'indicadores'
  | 'sociedade'
  | 'diplomacia'
  | 'militar'
  | 'mundo';

interface UiState {
  abertas: Record<string, boolean>;
  foco: string | null;
  modoEspaco: EspacoModo;
  telaOrbital: boolean;
  objetivoOrbital: string | null;
  plenario: 'legislativo' | 'judiciario' | null;
  abrir: (id: AbaId | string) => void;
  fechar: (id: AbaId | string) => void;
  alternar: (id: AbaId | string) => void;
  focar: (id: AbaId | string) => void;
  setModoEspaco: (m: EspacoModo) => void;
  abrirOrbital: (sistemaId?: string) => void;
  fecharOrbital: () => void;
  abrirPlenario: (foco: 'legislativo' | 'judiciario') => void;
  fecharPlenario: () => void;
}

export const useUi = create<UiState>((set) => ({
  abertas: {},
  foco: null,
  modoEspaco: 'nacional',
  telaOrbital: false,
  objetivoOrbital: null,
  plenario: null,
  abrir: (id) => set((s) => ({ abertas: { ...s.abertas, [id]: true }, foco: id })),
  fechar: (id) => set((s) => ({ abertas: { ...s.abertas, [id]: false } })),
  alternar: (id) =>
    set((s) => {
      const novo = !s.abertas[id];
      return { abertas: { ...s.abertas, [id]: novo }, foco: novo ? id : s.foco };
    }),
  focar: (id) => set({ foco: id }),
  setModoEspaco: (m) => set({ modoEspaco: m }),
  abrirOrbital: (sistemaId) => set({ telaOrbital: true, objetivoOrbital: sistemaId ?? null }),
  fecharOrbital: () => set({ telaOrbital: false }),
  abrirPlenario: (foco) => set({ plenario: foco }),
  fecharPlenario: () => set({ plenario: null }),
}));