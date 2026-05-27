import { Human } from '@vladmandic/human';

// Configuração centralizada da IA Human
const humanConfig = {
  modelBasePath: '/models',
  face: {
    enabled: true,
    detector: { 
      return: true, 
      rotation: true,
      maxDetected: 1, // Queremos identificar uma pessoa por vez
      iouThreshold: 0.1,
      minConfidence: 0.5,
      skipFrames: 5 // PERFORMANCE HACK: Pula frames para economizar CPU em celulares fracos
    },
    mesh: { enabled: true }, // Necessário para descritores
    attention: { enabled: false },
    iris: { enabled: false },
    description: { enabled: true }, // Extrai o "embedding" (matriz do rosto)
    emotion: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false }
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  filter: { enabled: true, equalization: true },
  debug: false
};

// Singleton para não carregar várias vezes
export const human = new Human(humanConfig);

// Função utilitária para calcular similaridade (se precisar manual, mas human.match faz isso)
export const initHuman = async () => {
  await human.load();
  // Warmup para carregar para a GPU
  await human.warmup();
  return human;
};
