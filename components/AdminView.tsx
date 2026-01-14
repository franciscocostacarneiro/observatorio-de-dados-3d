
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
    <div className="absolute inset-0 pt-28 px-8 pb-8 overflow-hidden">
      <div className="max-w-[1550px] mx-auto flex flex-col lg:flex-row gap-8 h-full">
        
        {/* Sidebar: Lista de Painéis Atuais com Scroll Independente */}
        <div className="w-full lg:w-[400px] bg-zinc-900/40 border border-white/5 rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl backdrop-blur-3xl h-full">
          <div className="p-10 border-b border-white/5 bg-white/5 flex items-center justify-between flex-shrink-0">
             <h3 className="font-orbitron text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
               <List className="w-5 h-5 text-blue-500" />
               Matriz Ativa
             </h3>
             <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] px-3 py-1 rounded-full font-black">
               {panels.length}
             </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-5 custom-scrollbar">
            {panels.map(p => (
              <div key={p.id} className={`group p-6 rounded-[2.5rem] border transition-all duration-500 ${editingPanel?.id === p.id ? 'bg-blue-600/20 border-blue-500/50 scale-[1.02] shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-5">
                    <div className="relative flex-shrink-0">
                      <img src={p.thumbnail} className="w-14 h-14 rounded-2xl object-cover border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity" alt="" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900" style={{ backgroundColor: CLUSTER_COLORS[p.group || 'Outros'] }}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-[11px] font-black truncate uppercase tracking-tight">{p.title}</h4>
                      <p className="text-gray-500 text-[9px] mt-1.5 font-bold tracking-widest uppercase">{p.source}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => onEdit(p)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(p.id)} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário Principal com Scroll Independente */}
        <div className="flex-1 bg-zinc-900/40 border border-white/5 rounded-[4rem] shadow-2xl backdrop-blur-3xl flex flex-col h-full overflow-hidden">
          <div className="bg-blue-600/5 px-14 py-10 border-b border-white/10 flex items-center justify-between flex-shrink-0 z-10 backdrop-blur-3xl">
            <div className="flex items-center gap-8">
              <div className="w-16 h-16 rounded-[2rem] bg-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] flex-shrink-0">
                  {editingPanel ? <Sparkles className="w-8 h-8 text-white" /> : <Database className="w-8 h-8 text-white" />}
              </div>
              <div>
                <h2 className="text-3xl font-orbitron font-black text-white uppercase tracking-tighter">
                  {editingPanel ? 'Atualizar Nodo' : 'Sincronizar Novo Nodo'}
                </h2>
                <p className="text-[10px] text-blue-400/60 mt-2 font-black uppercase tracking-[0.5em]">Central de Inteligência Geo-Espacial</p>
              </div>
            </div>
            <Layout className="w-12 h-12 text-blue-500 opacity-10" />
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-14 space-y-12 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3"><FileText className="w-4 h-4 text-blue-500" /> Título do Painel</label>
                <input required className="w-full bg-black/50 border border-white/10 rounded-3xl px-7 py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Monitoramento de Safra 2024" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3"><Layout className="w-4 h-4 text-blue-500" /> Fonte de Dados</label>
                <input required className="w-full bg-black/50 border border-white/10 rounded-3xl px-7 py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} placeholder="Ex: IBGE / ANM" />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3"><LinkIcon className="w-4 h-4 text-blue-500" /> URL de Destino (Power BI / Link)</label>
                  <input required className="w-full bg-black/50 border border-white/10 rounded-3xl px-7 py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} placeholder="https://app.powerbi.com/view?..." />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] flex items-center gap-3"><ImageIcon className="w-4 h-4 text-blue-500" /> Identidade Visual (URL Thumbnail)</label>
                  <div className="flex gap-4">
                    <input className="flex-1 bg-black/50 border border-white/10 rounded-3xl px-7 py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.thumbnail} onChange={e => { setFormData({...formData, thumbnail: e.target.value}); setImgError(false); }} placeholder="https://picsum.photos/seed/..." />
                    <button type="button" onClick={handleDownloadThumbnail} className="px-7 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl text-white transition-all shadow-xl group flex-shrink-0">
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Visualização no Universo</label>
                <div className="w-full aspect-video bg-black/80 rounded-[3.5rem] border border-white/10 overflow-hidden relative flex items-center justify-center group">
                  {formData.thumbnail && !imgError ? (
                    <img src={formData.thumbnail} onError={() => setImgError(true)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100" alt="Preview" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 opacity-10">
                      <ImageIcon className="w-16 h-16" />
                      <span className="text-[10px] font-black uppercase tracking-[1em] ml-4">Aguardando Data</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-10">
                     <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full">Sistema Ativo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Cluster Gravitacional</label>
                <div className="relative">
                  <select className="w-full bg-black/50 border border-white/10 rounded-3xl px-7 py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs cursor-pointer appearance-none font-bold tracking-widest" value={formData.group} onChange={e => setFormData({...formData, group: e.target.value})}>
                    <option value="" className="bg-zinc-900">Selecione o Eixo...</option>
                    {Object.keys(CLUSTER_COLORS).map(cat => <option key={cat} value={cat} className="bg-zinc-900">{cat.toUpperCase()}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-7 flex items-center pointer-events-none text-gray-500">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Tags de Relacionamento (SEO/IA)</label>
                <input className="w-full bg-black/50 border border-white/10 rounded-3xl px-7 py-5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs transition-all font-medium" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="Indústria, Varejo, Inovação..." />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Meta-Descrição para IA Semântica</label>
              <textarea rows={4} className="w-full bg-black/50 border border-white/10 rounded-[2.5rem] px-7 py-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-white text-xs resize-none font-medium leading-relaxed" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descreva os indicadores e objetivos deste painel para que a busca neural possa correlacioná-lo..." />
            </div>

            <div className="pt-12 flex justify-end border-t border-white/5 flex-shrink-0">
              <button type="submit" className="px-12 md:px-20 py-7 bg-blue-600 hover:bg-blue-500 text-white rounded-[3rem] shadow-[0_20px_60px_rgba(37,99,235,0.3)] transition-all flex items-center gap-6 font-black text-[14px] uppercase tracking-[0.2em] group mb-4">
                <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {editingPanel ? 'Salvar Alterações' : 'Integrar ao Universo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
