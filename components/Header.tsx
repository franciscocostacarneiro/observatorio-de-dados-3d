
import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, Filter, Grid, Boxes, PlusCircle, X } from 'lucide-react';
import { ViewMode } from '../types';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  onSearch: (q: string) => void;
  onVoiceSearch: (transcript: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, setViewMode, onSearch, onVoiceSearch }) => {
  const [searchValue, setSearchValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchValue(transcript);
        onVoiceSearch(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onVoiceSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch(e.target.value);
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch('');
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20 bg-black/80 backdrop-blur-xl border-b border-[#0670fa]/20 flex items-center px-3 sm:px-4 md:px-8 justify-between gap-2 md:gap-4">
      <div className="flex items-center flex-shrink-0">
        <div className="flex flex-col leading-[1.05] select-none">
          <span className="text-[12px] sm:text-[14px] md:text-[19px] font-black tracking-tighter text-white">Observatório</span>
          <span className="text-[12px] sm:text-[14px] md:text-[19px] font-black tracking-tighter text-[#0670fa]">Nacional</span>
          <span className="text-[12px] sm:text-[14px] md:text-[19px] font-black tracking-tighter text-[#0670fa] hidden sm:block">da Indústria</span>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-2 sm:mx-4 md:mx-12">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-8 sm:pl-11 pr-14 sm:pr-20 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-xs sm:text-sm placeholder-gray-500 text-white"
            placeholder={isListening ? "Ouvindo..." : "Buscar..."}
            value={searchValue}
            onChange={handleSearchChange}
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-4">
            {searchValue && (
              <button 
                onClick={handleClear}
                className="text-gray-500 hover:text-red-500 transition-colors p-1"
                title="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button 
              onClick={toggleVoice}
              className={`flex items-center transition-colors ${isListening ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}
            >
              <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
        <div className="flex bg-white/5 p-0.5 sm:p-1 rounded-xl md:rounded-2xl border border-white/5">
          <button
            onClick={() => setViewMode(ViewMode.GRID)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg md:rounded-xl text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all ${viewMode === ViewMode.GRID ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Grid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode(ViewMode.UNIVERSE)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg md:rounded-xl text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all ${viewMode === ViewMode.UNIVERSE ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Boxes className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">3D</span>
          </button>
          <button
            onClick={() => setViewMode(ViewMode.ADMIN)}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg md:rounded-xl text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all ${viewMode === ViewMode.ADMIN ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <PlusCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden md:inline">Painéis</span>
          </button>
        </div>
      </div>
    </header>
  );
};
