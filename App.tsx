
import React, { useState, useCallback } from 'react';
import { GeminiService } from './services/geminiService';
import { ColoringBook, Resolution, ColoringPage } from './types';
import { ChatBot } from './components/ChatBot';
import { jsPDF } from 'jspdf';

const App: React.FC = () => {
  const [childName, setChildName] = useState('');
  const [theme, setTheme] = useState('');
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [generatedBook, setGeneratedBook] = useState<ColoringBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateBook = async () => {
    if (!childName.trim() || !theme.trim()) {
      setError("We need a name and a theme for the magic to work!");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratedBook(null);

    try {
      // 1. Ensure API Key is available
      const hasKey = await GeminiService.checkApiKey();
      if (!hasKey) {
        await GeminiService.requestApiKey();
        // Proceeding assuming user selected a key (mitigate race condition)
      }

      // 2. Planning the adventure
      setCurrentStep("Sparking some creative ideas...");
      const pageDescriptions = await GeminiService.getPagePrompts(theme, childName);

      // 3. Crafting the cover
      setCurrentStep("Designing a beautiful cover...");
      const coverUrl = await GeminiService.generateColoringImage(
        `A high-quality coloring book cover. Large centered text area. Large friendly characters themed as ${theme}. Include elements like stars and sparkles. Focus on ${childName}'s Adventure.`,
        resolution
      );

      // 4. Drawing the pages one by one
      const pages: ColoringPage[] = [];
      for (let i = 0; i < pageDescriptions.length; i++) {
        setCurrentStep(`Drawing magical page ${i + 1} of 5...`);
        const url = await GeminiService.generateColoringImage(
          `Coloring book scene: ${pageDescriptions[i]}`,
          resolution
        );
        pages.push({
          id: `page-${i}`,
          url,
          description: pageDescriptions[i]
        });
      }

      setGeneratedBook({
        theme,
        childName,
        resolution,
        pages,
        coverUrl
      });
      setCurrentStep("Ta-da! Your book is ready.");
    } catch (err: any) {
      setError(err.message || "Oh no! A spell went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = useCallback(async () => {
    if (!generatedBook) return;

    // Use standard 1024px square for PDF pages to match images
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: [1024, 1024]
    });

    // Add Cover
    pdf.addImage(generatedBook.coverUrl, 'PNG', 0, 0, 1024, 1024);
    
    // Add Pages
    for (const page of generatedBook.pages) {
      pdf.addPage([1024, 1024], 'p');
      pdf.addImage(page.url, 'PNG', 0, 0, 1024, 1024);
    }

    pdf.save(`${generatedBook.childName}_${generatedBook.theme.replace(/\s+/g, '_')}_MagicBook.pdf`);
  }, [generatedBook]);

  return (
    <div className="min-h-screen bg-[#f8fbff] text-slate-800">
      {/* Playful Navbar */}
      <nav className="bg-white border-b-4 border-purple-100 py-6 px-6 sticky top-0 z-40 backdrop-blur-sm bg-white/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-gradient-to-tr from-purple-500 to-blue-500 p-3 rounded-2xl shadow-lg group-hover:rotate-12 transition-transform duration-300">
              <span className="text-3xl">🖍️</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">Magic Color Creator</h1>
              <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">AI-Powered Coloring Books</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-10 px-4">
        {!generatedBook && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-2 border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">✨</div>
              
              <div className="space-y-8 relative z-10">
                <div className="text-center">
                  <h2 className="text-3xl font-black text-slate-800 mb-2">Create Your Adventure!</h2>
                  <p className="text-slate-500 font-medium">Type a name and a theme to get started.</p>
                </div>

                <div className="grid gap-6">
                  <div className="group">
                    <label className="block text-sm font-black text-slate-400 mb-2 uppercase ml-4">Child's Name</label>
                    <input
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="e.g. Leo, Mia"
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-purple-300 focus:outline-none text-xl font-bold transition-all placeholder:text-slate-300"
                    />
                  </div>

                  <div className="group">
                    <label className="block text-sm font-black text-slate-400 mb-2 uppercase ml-4">Magic Theme</label>
                    <textarea
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="e.g. Astronaut cats, Fairy garden, Super robot tea party..."
                      rows={3}
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-blue-300 focus:outline-none text-xl font-bold transition-all resize-none placeholder:text-slate-300"
                    />
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[32px] border-2 border-slate-100/50">
                    <label className="block text-sm font-black text-slate-400 mb-4 uppercase text-center">Drawing Precision</label>
                    <div className="flex gap-3">
                      {(['1K', '2K', '4K'] as Resolution[]).map((res) => (
                        <button
                          key={res}
                          onClick={() => setResolution(res)}
                          className={`flex-1 py-4 rounded-2xl font-black transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                            resolution === res 
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-xl shadow-purple-200' 
                              : 'bg-white text-slate-400 hover:text-slate-600 border-2 border-transparent hover:border-slate-200 shadow-sm'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-6">
                      <div className="relative">
                        <div className="w-24 h-24 border-[10px] border-slate-100 border-t-purple-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl">🎨</div>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-black text-purple-600 animate-pulse">{currentStep}</p>
                        <p className="text-slate-400 text-sm font-medium mt-1">Our AI is busy with its crayons...</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateBook}
                      className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-[24px] text-2xl font-black shadow-2xl transition-all hover:-translate-y-1 active:translate-y-0 group"
                    >
                      Spark the Magic! <span className="inline-block group-hover:animate-bounce ml-2">🪄</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-8 p-6 bg-rose-50 border-2 border-rose-100 rounded-[32px] text-rose-600 font-bold text-center animate-in fade-in slide-in-from-top-2">
                <span className="mr-2">💡</span> {error}
              </div>
            )}
          </div>
        )}

        {/* Success View */}
        {generatedBook && (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-2xl border-2 border-emerald-50">
              <div>
                <h2 className="text-3xl font-black text-slate-800">Your Magic Book is Ready!</h2>
                <p className="text-emerald-600 font-bold mt-1">Theme: {generatedBook.theme} • For: {generatedBook.childName}</p>
              </div>
              <div className="flex gap-4">
                 <button
                  onClick={() => setGeneratedBook(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 px-8 rounded-2xl transition-all"
                >
                  Create New
                </button>
                <button
                  onClick={downloadPDF}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-10 rounded-2xl shadow-xl shadow-emerald-200 flex items-center gap-3 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                  <span className="text-xl">📥</span> Download PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Cover Card */}
              <div className="bg-white p-6 rounded-[36px] shadow-lg border-2 border-purple-50 group transition-all hover:shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-purple-400 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full">Book Cover</span>
                  <span className="text-xl">📚</span>
                </div>
                <div className="aspect-square bg-slate-50 rounded-[28px] overflow-hidden mb-5 border-4 border-slate-50">
                  <img 
                    src={generatedBook.coverUrl} 
                    alt="Cover" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                </div>
                <h3 className="text-lg font-black text-slate-800 leading-tight">The Grand Opening</h3>
              </div>

              {/* Page Cards */}
              {generatedBook.pages.map((page, idx) => (
                <div key={page.id} className="bg-white p-6 rounded-[36px] shadow-lg border-2 border-slate-50 group transition-all hover:shadow-2xl">
                   <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Page {idx + 1}</span>
                    <span className="text-xl">✨</span>
                  </div>
                  <div className="aspect-square bg-slate-50 rounded-[28px] overflow-hidden mb-5 border-4 border-slate-50">
                    <img 
                      src={page.url} 
                      alt={`Page ${idx + 1}`} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  </div>
                  <p className="text-sm font-bold text-slate-600 line-clamp-2 leading-snug">{page.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Persistent Assistant */}
      <ChatBot />

      {/* Decorative footer stripe */}
      <div className="fixed bottom-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 z-50"></div>
    </div>
  );
};

export default App;
