const CHAVE = 'axioma_device_id';

function geraId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function deviceId(): string {
  try {
    const atual = localStorage.getItem(CHAVE);
    if (atual) return atual;
    const novo = geraId();
    localStorage.setItem(CHAVE, novo);
    return novo;
  } catch {
    return geraId();
  }
}