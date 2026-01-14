
import { Panel } from './types';

export const CLUSTER_COLORS: Record<string, string> = {
  'Educação': '#3b82f6',
  'Setor Mineral': '#f59e0b',
  'Segurança': '#ef4444',
  'Transporte': '#10b981',
  'Economia': '#8b5cf6',
  'IA & Inovação': '#06b6d4',
  'Saúde': '#ec4899',
  'Meio Ambiente': '#22c55e',
  'Energia': '#eab308'
};

const createExemplars = () => {
  const categories = Object.keys(CLUSTER_COLORS);
  const panels: Panel[] = [];
  
  // Base fixed panels
  panels.push(
    {
      id: '1',
      title: 'Plataforma Nilo Peçanha',
      source: 'Rede Federal',
      description: 'Indicadores de desempenho e estatísticas da Rede Federal de Educação.',
      longDescription: 'A Plataforma Nilo Peçanha é um ambiente virtual de disseminação de dados das instituições da Rede Federal.',
      url: 'https://app.powerbi.com/view?r=eyJrIjoiZTc4MDMwOGItMjYwNC00NTUzLTk3OTQtNjYzMWFhZjY1YjBmIiwidCI6IjZkNmJjYzNmLWJkYTEtNGY1NC1hZjFkLTg2ZDRiN2Q0ZTZiOCJ9',
      thumbnail: 'https://picsum.photos/seed/pnp/400/225',
      tags: ['Educação', 'Rede Federal'],
      status: 'Publicado',
      createdAt: '2023-10-01',
      group: 'Educação'
    },
    {
      id: '2',
      title: 'Anuário Mineral Brasileiro',
      source: 'ANM',
      description: 'Dados consolidados sobre a produção mineral brasileira.',
      longDescription: 'O Anuário Mineral Brasileiro apresenta os principais dados do setor mineral nacional.',
      url: 'https://app.powerbi.com/view?r=eyJrIjoiZTI4MjE2NTEtN2RjYi00ZDA1LWJjMmUtZGQ5NWQxY2YyZDgwIiwidCI6IjZkNmJjYzNmLWJkYTEtNGY1NC1hZjFkLTg2ZDRiN2Q0ZTZiOCJ9',
      thumbnail: 'https://picsum.photos/seed/mineral/400/225',
      tags: ['Setor Mineral', 'Economia'],
      status: 'Publicado',
      createdAt: '2023-11-15',
      group: 'Setor Mineral'
    }
  );

  // Generate 24 exemplar nodes (4 per category average)
  categories.forEach((cat, catIdx) => {
    for (let i = 0; i < 4; i++) {
      const id = `node-${catIdx}-${i}`;
      if (panels.find(p => p.id === id)) continue;
      panels.push({
        id,
        title: `${cat} Intelligence Node ${i + 1}`,
        source: 'Intelligence Hub',
        description: `Monitoramento avançado e correlação de dados para o setor de ${cat}.`,
        longDescription: `Análise multidimensional de dados estruturados para o eixo temático ${cat}.`,
        url: '#',
        thumbnail: `https://picsum.photos/seed/${id}/400/225`,
        tags: [cat, 'Real-time', 'IA'],
        status: 'Publicado',
        createdAt: new Date().toISOString(),
        group: cat
      });
    }
  });

  return panels;
};

export const INITIAL_PANELS: Panel[] = createExemplars();

export const TOPICS = Object.keys(CLUSTER_COLORS);
