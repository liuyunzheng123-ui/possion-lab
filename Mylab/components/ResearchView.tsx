import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Search, BookOpen, ExternalLink, Loader2 } from 'lucide-react';
import { searchResearchTopic } from '../services/geminiService';
import { ResearchResult } from '../types';

const PRESET_QUERY = "Poisson ARCH(1) 模型大偏差指导下的重要性采样研究现状";

const ResearchView: React.FC = () => {
  const [query, setQuery] = useState(PRESET_QUERY);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    const data = await searchResearchTopic(query);
    setResult(data);
    setLoading(false);
  };

  // Auto-trigger search on mount if it's the specific question
  useEffect(() => {
    // Optional: could auto-search. Let's let the user click to feel in control, 
    // or just run it if they navigate here? Let's wait for user interaction to avoid burning quota immediately.
  }, []);

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">科研文献助手</h2>
        <p className="text-slate-600 mb-6">
           本工具利用 Gemini 和 Google 搜索为您查找关于特定随机模型主题的当前国际研究现状。
        </p>
        
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="请输入研究课题..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : "搜索文献"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 className="animate-spin mb-4 text-blue-500" size={48} />
          <p>正在分析学术资源...</p>
        </div>
      )}

      {!loading && result && (
        <div className="flex-1 flex flex-col gap-6 animate-fade-in">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <BookOpen className="text-blue-600" size={24} />
                <h3 className="text-xl font-bold text-slate-800">研究综述</h3>
             </div>
             
             <div className="prose prose-slate max-w-none">
               <ReactMarkdown>{result.markdown}</ReactMarkdown>
             </div>
          </div>

          {result.sources.length > 0 && (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">参考来源</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.sources.map((source, idx) => (
                  <a 
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="mt-1 text-slate-400 group-hover:text-blue-500">
                      <ExternalLink size={16} />
                    </div>
                    <div className="text-sm text-slate-700 font-medium group-hover:text-blue-700 line-clamp-2">
                      {source.title}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {!loading && !hasSearched && (
        <div className="flex-1 flex items-center justify-center text-slate-400 italic">
          在上方输入查询以探索前沿研究。
        </div>
      )}
    </div>
  );
};

export default ResearchView;