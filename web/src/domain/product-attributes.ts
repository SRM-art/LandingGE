export const tones = { claro:'Claro', medio:'Medio', oscuro:'Oscuro' } as const;
export const environments = { seco:'Seco', humedo:'Húmedo', ambos:'Seco y húmedo' } as const;
export const wallFinishes = { mate:'Mate', satinado:'Satinado', brillante:'Brillante', mixto:'Mixto' } as const;
export const wallSurfaces = { lisa:'Lisa', relieve:'Con relieve' } as const;
export const profileUses = { zocalo:'Zócalo', transicion:'Transición', remate:'Remate de borde' } as const;
export const adhesiveMaterials = { ceramica:'Cerámica', porcelanato:'Porcelanato', piedra:'Piedra natural' } as const;

export const specializedSelects = [
  { key:'wall_finish', label:'Acabado', options:wallFinishes },
  { key:'wall_surface', label:'Superficie', options:wallSurfaces },
  { key:'profile_use', label:'Función de la pieza', options:profileUses },
] as const;
