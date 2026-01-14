
import React from 'react';
import { Panel } from '../types';
import { ExternalLink, Edit3, Trash2, Calendar } from 'lucide-react';

interface GridViewProps {
  panels: Panel[];
  onSelect: (p: Panel) => void;
  onEdit: (p: Panel) => void;
  onDelete: (id: string) => void;
}

export const GridView: React.FC<GridViewProps> = ({ panels, onSelect, onEdit, onDelete }) => {
  return (
    <div className="absolute inset-0 pt-24 px-8 pb-12 overflow-y-auto scroll-smooth">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto">
        {panels.map((panel) => (
          <div 
            key={panel.id}
            className="group relative bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/40 transition-all hover:shadow-[0_0_40px_rgba(37,99,235,0.1)] flex flex-col"
          >
            <div className="relative h-44 overflow-hidden">
              <img 
                src={panel.thumbnail} 
                alt={panel.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>
              
              <div className="absolute top-4 left-4 flex gap-2">
                <button 
                  onClick={() => onEdit(panel)}
                  className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-white hover:bg-blue-600 transition-colors shadow-lg"
                  title="Editar painel"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => onDelete(panel.id)}
                  className="p-2 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-white hover:bg-red-600 transition-colors shadow-lg"
                  title="Excluir painel"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute bottom-4 right-4 bg-blue-600/20 backdrop-blur-md border border-blue-500/30 text-[9px] px-2 py-1 rounded-lg text-blue-300 uppercase tracking-[0.2em] font-bold">
                {panel.source}
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-orbitron text-sm font-bold text-white mb-3 leading-snug group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                {panel.title}
              </h3>
              
              <p className="text-gray-500 text-[11px] line-clamp-2 mb-4 flex-1 font-medium leading-relaxed">
                {panel.description}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span className="text-[9px] font-bold">{new Date(panel.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <button 
                  onClick={() => onSelect(panel)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest"
                >
                  Visualizar
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
