
import React, { useState, useEffect } from 'react';
import { Panel } from '../types';
import { Save, Layout, List, FileText, Link as LinkIcon, Tag as TagIcon, ArrowRight, Trash2, Edit, Image as ImageIcon, Download, Loader2, Sparkles, Database } from 'lucide-react';
import { CLUSTER_COLORS } from '../constants';

interface AdminViewProps {
  onAddPanel: (p: Panel) => void;
  editingPanel: Panel | null;
  panels: Panel[];
  onEdit: (p: Panel) => void;
  onDelete: (id: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onAddPanel, editingPanel, panels, onEdit, onDelete }) => {
  const [formData, setFormData] = useState({
    title: '',
    source: '',
    description: '',
    longDescription: '',
    url: '',
    thumbnail: '',
    tags: '',
    group: '',
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (editingPanel) {
      setFormData({
        title: editingPanel.title,
        source: editingPanel.source,
        description: editingPanel.description,
        longDescription: editingPanel.longDescription,
        url: editingPanel.url,
        thumbnail: editingPanel.thumbnail,
        tags: editingPanel.tags.join(', '),
        group: editingPanel.group || '',
      });
    } else {
      setFormData({ title: '', source: '', description: '', longDescription: '', url: '', thumbnail: '', tags: '', group: '' });
    }
    setImgError(false);
  }, [editingPanel]);

  const handleDownloadThumbnail = async () => {
    if (!formData.thumbnail) return;
    setIsDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = formData.thumbnail;
      a.download = 'thumbnail-observatorio.png';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro no download:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const panel: Panel = {
      id: editingPanel ? editingPanel.id : Math.random().toString(36).substr(2, 9),
      title: formData.title,
      source: formData.source,
      description: formData.description,
      longDescription: formData.longDescription,
      url: formData.url,
      thumbnail: formData.thumbnail || `https://picsum.photos/seed/${Math.random()}/400/225`,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== ''),
      status: 'Publicado',
      createdAt: editingPanel?.createdAt || new Date().toISOString(),
      group: formData.group || 'Outros'
    };
    onAddPanel(panel);
  };

  return (
    <div className="absolute inset-0 pt-20 md:pt-28 px-2 sm:px-4 md:px-8 pb-4 md:pb-8 overflow-hidden">
      <div className="max-w-[1550px] mx-auto flex flex-col lg:flex-row gap-4 md:gap-8 h-full">
        
        {/* Sidebar: Lista de Painéis Atuais com Scroll Independente */}
        <div className="w-full lg:w-[400px] bg-zinc-900/40 border border-white/5 rounded-2xl sm:rounded-3xl md:rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-3xl h-48 sm:h-64 lg:h-full">
          <div className="p-4 sm:p-6 md:p-10 border-b border-white/5 bg-white/5 flex items-center justify-between flex-shrink-0">
             <h3 className="font-orbitron text-[8px] sm:text-[9px] md:text-[10px] font-black text-white uppercase tracking-wide md:tracking-[0.3em] flex items-center gap-2 md:gap-4">
               <List className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
               Matriz Ativa
             </h3>
             <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[9px] md:text-[10px] px-2 md:px-3 py-1 rounded-full font-black">
               {panels.length}
             </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 space-y-3 md:space-y-5 custom-scrollbar">
            {panels.map(p => (
              <div key={p.id} className={`group p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] border transition-all duration-500 ${editingPanel?.id === p.id ? 'bg-blue-600/20 border-blue-500/50 scale-[1.02] shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                <div className="flex justify-between items-start gap-2 md:gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 md:gap-5">
                    <div className="relative flex-shrink-0">
                      <img src={p.thumbnail} className="w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-2xl object-cover border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-zinc-900" style={{ backgroundColor: CLUSTER_COLORS[p.group || 'Outros'] }}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-[10px] md:text-[11px] font-black truncate uppercase tracking-tight">{p.title}</h4>
                      <p className="text-gray-500 text-[8px] md:text-[9px] mt-1 md:mt-1.5 font-bold tracking-widest uppercase">{p.source}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 md:gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => onEdit(p)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg md:rounded-xl text-gray-400 hover:text-white transition-colors"><Edit className="w-3 h-3 md:w-4 md:h-4" /></button>
                    <button onClick={() => onDelete(p.id)} className="p-1.5 md:p-2 hover:bg-white/10 rounded-lg md:rounded-xl text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3 md:w-4 md:h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário Principal com Scroll Independente */}
        <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-2xl sm:rounded-3xl md:rounded-[4rem] shadow-2xl backdrop-blur-3xl flex flex-col h-full overflow-hidden">
          <div className="bg-blue-600/5 px-4 sm:px-8 md:px-14 py-4 sm:py-6 md:py-10 border-b border-white/10 flex items-center justify-between flex-shrink-0 z-10 backdrop-blur-3xl">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl sm:rounded-2xl md:rounded-[2rem] bg-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] flex-shrink-0">
                  {editingPanel ? <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" /> : <Database className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />}
              </div>
              <div>
                <h2 className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-orbitron font-black text-white uppercase tracking-tight md:tracking-tighter">
                  {editingPanel ? 'Atualizar Nodo' : 'Novo Nodo'}
                </h2>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-400/60 mt-1 md:mt-2 font-black uppercase tracking-wide md:tracking-[0.5em] hidden sm:block">Central de Inteligência Geo-Espacial</p>
              </div>
            </div>
            <Layout className="w-8 h-8 md:w-12 md:h-12 text-blue-500 opacity-10 hidden sm:block" />
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-14 space-y-6 sm:space-y-8 md:space-y-12 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-12">
              <div className="space-y-2 md:space-y-4">
                <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em] flex items-center gap-2 md:gap-3"><FileText className="w-3 h-3 md:w-4 md:h-4 text-blue-500" /> Título do Painel</label>
                <input required className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Monitoramento de Safra 2024" />
              </div>
              <div className="space-y-2 md:space-y-4">
                <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em] flex items-center gap-2 md:gap-3"><Layout className="w-3 h-3 md:w-4 md:h-4 text-blue-500" /> Fonte de Dados</label>
                <input required className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} placeholder="Ex: IBGE / ANM" />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 md:gap-12">
              <div className="space-y-4 sm:space-y-6 md:space-y-10">
                <div className="space-y-2 md:space-y-4">
                  <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em] flex items-center gap-2 md:gap-3"><LinkIcon className="w-3 h-3 md:w-4 md:h-4 text-blue-500" /> URL de Destino</label>
                  <input required className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://app.powerbi.com/view?..." />
                </div>
                <div className="space-y-2 md:space-y-4">
                  <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em] flex items-center gap-2 md:gap-3"><ImageIcon className="w-3 h-3 md:w-4 md:h-4 text-blue-500" /> Thumbnail (URL)</label>
                  <div className="flex gap-2 md:gap-4">
                    <input className="flex-1 bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.thumbnail} onChange={e => { setFormData({...formData, thumbnail: e.target.value}); setImgError(false); }} placeholder="https://picsum.photos/seed/..." />
                    <button type="button" onClick={handleDownloadThumbnail} className="px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl text-white transition-all shadow-xl group flex-shrink-0">
                      {isDownloading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Download className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-y-1 transition-transform" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-2 md:space-y-4">
                <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em]">Visualização</label>
                <div className="w-full aspect-video bg-black/80 rounded-xl sm:rounded-2xl md:rounded-[3.5rem] border border-white/10 overflow-hidden relative flex items-center justify-center group">
                  {formData.thumbnail && !imgError ? (
                    <img src={formData.thumbnail} onError={() => setImgError(true)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 md:gap-4 opacity-10">
                      <ImageIcon className="w-10 h-10 md:w-16 md:h-16" />
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wide md:tracking-[1em]">Aguardando</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  <div className="absolute bottom-3 md:bottom-6 left-4 md:left-10">
                     <span className="text-[7px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2 md:px-4 py-1 md:py-2 rounded-full">Sistema Ativo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-12">
              <div className="space-y-2 md:space-y-4">
                <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em]">Cluster Gravitacional</label>
                <div className="relative">
                  <select className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs cursor-pointer appearance-none font-bold tracking-widest" value={formData.group} onChange={e => setFormData({...formData, group: e.target.value})}>
                    <option value="" className="bg-zinc-900">Selecione o Eixo...</option>
                    {Object.keys(CLUSTER_COLORS).map(cat => <option key={cat} value={cat} className="bg-zinc-900">{cat.toUpperCase()}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-4 md:right-7 flex items-center pointer-events-none text-gray-500">
                    <ArrowRight className="w-3 h-3 md:w-4 md:h-4 rotate-90" />
                  </div>
                </div>
              </div>
              <div className="space-y-2 md:space-y-4">
                <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em]">Tags (SEO/IA)</label>
                <input className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="Indústria, Varejo, Inovação..." />
              </div>
            </div>

            <div className="space-y-2 md:space-y-4">
              <label className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-wide md:tracking-[0.4em]">Descrição para IA</label>
              <textarea rows={3} className="w-full bg-black/50 border border-white/10 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] px-4 sm:px-5 md:px-7 py-3 sm:py-4 md:py-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs resize-none font-medium leading-relaxed" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descreva os indicadores e objetivos deste painel..." />
            </div>

            <div className="pt-6 md:pt-12 flex justify-end border-t border-white/5 flex-shrink-0">
              <button type="submit" className="px-6 sm:px-10 md:px-20 py-4 sm:py-5 md:py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-xl sm:rounded-2xl md:rounded-[3rem] shadow-[0_20px_60px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2 sm:gap-4 md:gap-6 font-black text-[10px] sm:text-[12px] md:text-[14px] uppercase tracking-wide md:tracking-[0.2em] group mb-2 md:mb-4">
                <Save className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">{editingPanel ? 'Salvar Alterações' : 'Integrar ao Universo'}</span>
                <span className="sm:hidden">Salvar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
