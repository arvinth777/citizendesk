import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { Globe, Moon, Sun, Monitor } from 'lucide-react';
import { motion } from "motion/react";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem('i18nextLng', lng);
    } catch (e) {
      console.warn('localStorage not accessible', e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="max-w-4xl mx-auto mt-6 space-y-8"
    >
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t('Application Settings')}</h1>
        <p className="text-slate-600 dark:text-slate-400">{t('Manage your preferences and accessibility settings.')}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 p-8 space-y-8">
        
        {/* Language Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#E5F0FF] dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#66B2FF] rounded-full flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('Interface Language')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('Select your preferred language for the application interface.')}</p>
            </div>
          </div>
          <div className="sm:w-64 pl-14 sm:pl-0">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-colors cursor-pointer appearance-none"
            >
              <option value="en">{t('English')}</option>
              <option value="ta">{t('Tamil')}</option>
              <option value="hi">{t('Hindi')}</option>
            </select>
          </div>
        </div>

        <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

        {/* Theme Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
              {theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('Dark Mode')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('Toggle between light, dark, and system themes.')}</p>
            </div>
          </div>
          <div className="sm:w-64 pl-14 sm:pl-0 flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 py-3 px-4 rounded-xl border transition-colors flex justify-center items-center ${theme === 'light' ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              title="Light"
            >
              <Sun className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 py-3 px-4 rounded-xl border transition-colors flex justify-center items-center ${theme === 'dark' ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              title="Dark"
            >
              <Moon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 py-3 px-4 rounded-xl border transition-colors flex justify-center items-center ${theme === 'system' ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              title="System"
            >
              <Monitor className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
