import { useState } from "react";
import { Hero } from "@/components/Hero";
import { UrlIngestion } from "@/components/UrlIngestion";
import { FileIngestion } from "@/components/FileIngestion";
import { Dashboard } from "@/components/Dashboard";
import { motion } from "framer-motion";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'url' | 'file'>('url');

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pt-10">
        <Hero />

        <div className="max-w-2xl mx-auto w-full -mt-4 relative z-20">
          <div className="bg-card/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl mb-8">
            <div className="flex p-1 bg-black/20 rounded-2xl mb-6">
              <button
                onClick={() => setActiveTab('url')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'url' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Paste Public URL
              </button>
              <button
                onClick={() => setActiveTab('file')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === 'file' 
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Upload File
              </button>
            </div>

            <div className="p-2 md:p-4">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'url' ? <UrlIngestion /> : <FileIngestion />}
              </motion.div>
            </div>
          </div>
        </div>

        <Dashboard />
      </main>
    </div>
  );
}
