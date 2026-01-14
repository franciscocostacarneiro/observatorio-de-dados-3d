
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ViewMode, Panel } from './types';
import { INITIAL_PANELS } from './constants';
import { Header } from './components/Header';
import { GridView } from './components/GridView';
import { UniverseView } from './components/UniverseView';
import { AdminView } from './components/AdminView';
import { semanticSearch } from './services/gemini';
import { X, Layout, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.UNIVERSE);
  const [panels, setPanels] = useState<Panel[]>(INITIAL_PANELS);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);
  const [filteredPanelIds, setFilteredPanelIds] = useState<string[] | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');

  const displayedPanels = useMemo(() => {
    if (!filteredPanelIds) return panels;
    return panels.filter(p => filteredPanelIds.includes(p.id));
  }, [panels, filteredPanelIds]);

  const handleSearch = useCallback((query: string) => {
    lastQueryRef.current = query;
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query || query.trim() === '') {
      setFilteredPanelIds(null);
      setIsSearching(false);
      return;
    }

    const q = query.toLowerCase();
    
    // 1. FILTRO LOCAL INSTANTÂNEO (Alta Performance)
    const localMatches = panels.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      p.group?.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    ).map(p => p.id);

    // Atualiza imediatamente a UI com o que temos localmente
    setFilteredPanelIds(localMatches);
    setIsSearching(true);
    
    // 2. ENRIQUECIMENTO SEMÂNTICO (IA - Debounced)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const currentQuery = lastQueryRef.current;
        if (!currentQuery) return;

        const aiIds = await semanticSearch(currentQuery, panels);
        
        if (lastQueryRef.current === currentQuery) {
          // Merge dos resultados locais com os da IA (evitando duplicatas)
          setFilteredPanelIds(prev => {
            const combined = new Set([...(prev || []), ...aiIds]);
            return Array.from(combined);
          });
          setIsSearching(false);
        }
      } catch (err) {
        console.error(err);
        setIsSearching(false);
      }
    }, 400); // Reduzido para 400ms para parecer mais ágil
  }, [panels]);

  const handleAddOrUpdatePanel = (panelData: Panel) => {
    if (editingPanel) {
      setPanels(prev => prev.map(p => p.id === panelData.id ? panelData : p));
    } else {
      setPanels(prev => [panelData, ...prev]);
    }
    setEditingPanel(null);
    setViewMode(ViewMode.UNIVERSE);
  };

  const handleDeletePanel = (id: string) => {
    if(confirm('Deseja realmente excluir este painel do sistema?')) {
      setPanels(prev => prev.filter(p => p.id !== id));
      if (filteredPanelIds) {
        setFilteredPanelIds(prev => prev ? prev.filter(fid => fid !== id) : null);
      }
    }
  };

  const startEdit = (panel: Panel) => {
    setEditingPanel(panel);
    setViewMode(ViewMode.ADMIN);
  };

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden relative text-white">
      <Header 
        viewMode={viewMode} 
        setViewMode={(v) => {
          if (v !== ViewMode.ADMIN) setEditingPanel(null);
          setViewMode(v);
        }} 
        onSearch={handleSearch}
        onVoiceSearch={handleSearch}
      />

      <main className="flex-1 relative">
        {viewMode === ViewMode.GRID && (
          <GridView 
            panels={displayedPanels} 
            onSelect={setSelectedPanel} 
            onEdit={startEdit}
            onDelete={handleDeletePanel}
          />
        )}
        
        {viewMode === ViewMode.UNIVERSE && (
          <UniverseView panels={displayedPanels} onNodeClick={setSelectedPanel} />
        )}

        {viewMode === ViewMode.ADMIN && (
          <AdminView 
            onAddPanel={handleAddOrUpdatePanel} 
            editingPanel={editingPanel}
            panels={panels}
            onEdit={setEditingPanel}
            onDelete={handleDeletePanel}
          />
        )}

        {isSearching && (
          <div className="absolute left-1/2 top-24 -translate-x-1/2 z-50 bg-blue-600/10 backdrop-blur-md border border-blue-500/20 px-8 py-3 rounded-full flex items-center gap-4 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
             <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
             <span className="text-[10px] font-black text-blue-200 uppercase tracking-[0.4em]">Sincronizando Rede Neural...</span>
          </div>
        )}
      </main>

      {/* Modal de Visualização de Dados */}
      {selectedPanel && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-zinc-900 border border-white/10 rounded-[3rem] w-full max-w-[90vw] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="h-20 px-10 flex items-center justify-between border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                    <Layout className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-orbitron font-black text-lg uppercase tracking-tight">{selectedPanel.title}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em]">{selectedPanel.source}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{selectedPanel.group}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedPanel(null); setIsIframeLoading(true); }} 
                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-red-600 rounded-2xl transition-all text-gray-400 hover:text-white"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
            
            <div className="flex-1 relative bg-black">
              {isIframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10 bg-black/80 backdrop-blur-md">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                    <div className="absolute inset-0 blur-xl bg-blue-500/20 animate-pulse"></div>
                  </div>
                  <p className="text-xs font-orbitron text-gray-500 animate-pulse uppercase tracking-[0.5em]">Acessando Fluxo de Dados Seguro...</p>
                </div>
              )}
              <iframe 
                title={selectedPanel.title}
                className="w-full h-full border-none"
                src={selectedPanel.url}
                allowFullScreen
                onLoad={() => setIsIframeLoading(false)}
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
