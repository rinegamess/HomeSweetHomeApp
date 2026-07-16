import React, { useState } from 'react';
import { ChefHat, Search, Plus, Trash2, Edit3, ShoppingCart, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { KitchenItem, KitchenCategory } from '../types';
import { Language, translations } from '../lib/translations';

interface KitchenViewProps {
  language: Language;
  kitchenStock: KitchenItem[];
  onAddKitchenItem: (item: Omit<KitchenItem, 'id'>) => void;
  onUpdateKitchenItem: (id: string, updates: Partial<KitchenItem>) => void;
  onDeleteKitchenItem: (id: string) => void;
}

export default function KitchenView({
  language,
  kitchenStock,
  onAddKitchenItem,
  onUpdateKitchenItem,
  onDeleteKitchenItem
}: KitchenViewProps) {
  const t = translations[language];

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<KitchenCategory | 'All'>('All');
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<KitchenCategory>('Kahvaltılık');
  const [formQuantity, setFormQuantity] = useState('');
  const [formIsMissing, setFormIsMissing] = useState(false);

  const categories: KitchenCategory[] = [
    'Temizlik',
    'Bakliyat',
    'İçecek',
    'Kahvaltılık',
    'Et',
    'Sebze',
    'Meyve',
    'Dondurulmuş',
    'Atıştırmalık'
  ];

  // Filter Items
  const filteredItems = kitchenStock.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesMissing = !showMissingOnly || item.isMissing;
    return matchesSearch && matchesCategory && matchesMissing;
  });

  // Derived AI insights list
  const missingItems = kitchenStock.filter(item => item.isMissing);

  const handleOpenAdd = () => {
    setIsEditing(true);
    setEditId(null);
    setFormName('');
    setFormCategory('Kahvaltılık');
    setFormQuantity('');
    setFormIsMissing(false);
  };

  const handleOpenEdit = (item: KitchenItem) => {
    setIsEditing(true);
    setEditId(item.id);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormQuantity(item.quantity || '');
    setFormIsMissing(item.isMissing);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editId) {
      onUpdateKitchenItem(editId, {
        name: formName,
        category: formCategory,
        quantity: formQuantity || undefined,
        isMissing: formIsMissing
      });
    } else {
      onAddKitchenItem({
        name: formName,
        category: formCategory,
        quantity: formQuantity || undefined,
        isMissing: formIsMissing
      });
    }

    setIsEditing(false);
    setEditId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Inventory Management */}
      <div className="lg:col-span-8 space-y-6">
        
        {/* Toolbar & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-polish-dark-card border border-slate-200/60 dark:border-slate-800/80 p-4 rounded-2xl shadow-xs">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchProduct}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-polish-dark-header border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Missing only filter button */}
            <button
              onClick={() => setShowMissingOnly(!showMissingOnly)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                showMissingOnly
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                  : 'bg-white dark:bg-polish-dark-header border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-300'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{t.missingOnly}</span>
            </button>

            {/* Add button */}
            {!isEditing && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addProductBtn}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Add / Edit Panel */}
        {isEditing && (
          <form
            onSubmit={handleSave}
            className="p-5 rounded-2xl bg-slate-50 dark:bg-polish-dark-header/60 border border-slate-200 dark:border-slate-800/80 space-y-4 animate-slideDown"
          >
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">
              {editId ? (language === 'tr' ? 'Ürünü Düzenle' : 'Edit Product') : t.addProductBtn}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.productName}</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Süt, Ekmek"
                  className="w-full px-3 py-1.5 bg-white dark:bg-polish-dark-card border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.category}</label>
                <select
                  value={formCategory}
                  onChange={(e: any) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-polish-dark-card border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.quantity}</label>
                <input
                  type="text"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="e.g. 2 Paket, 500g (opsiyonel)"
                  className="w-full px-3 py-1.5 bg-white dark:bg-polish-dark-card border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsMissing}
                  onChange={(e) => setFormIsMissing(e.target.checked)}
                  className="rounded-sm accent-indigo-600 text-indigo-600"
                />
                <span>{t.isMissingLabel}</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-200/50 cursor-pointer"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {t.saveProduct}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Categories Capsules filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
              selectedCategory === 'All'
                ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-polish-dark-card text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800/50'
            }`}
          >
            {language === 'tr' ? 'Tümü' : 'All'}
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-polish-dark-card text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Inventory List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                item.isMissing
                  ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-100 dark:border-rose-950/40'
                  : 'bg-white dark:bg-polish-dark-card border-slate-200/60 dark:border-slate-800/80 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Visual Category Badge Icon */}
                <div className={`p-2.5 rounded-xl ${
                  item.isMissing
                    ? 'bg-rose-100/60 dark:bg-rose-900/30 text-rose-500'
                    : 'bg-slate-50 dark:bg-polish-dark-header text-slate-500'
                }`}>
                  <ChefHat className="w-4.5 h-4.5" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-display">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-sans">{item.category}</span>
                    {item.quantity && (
                      <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-polish-dark-header font-mono text-[9px] font-bold text-slate-500">
                        {item.quantity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Toggle Missing check */}
                <button
                  onClick={() => onUpdateKitchenItem(item.id, { isMissing: !item.isMissing })}
                  className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
                    item.isMissing
                      ? 'bg-rose-100 border-rose-200 text-rose-600 hover:bg-rose-200'
                      : 'bg-slate-50 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600'
                  }`}
                  title={item.isMissing ? 'Mevcut Olarak İşaretle' : 'Eksik Olarak İşaretle'}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-50 dark:hover:bg-polish-dark-header transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteKitchenItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 dark:hover:bg-polish-dark-header transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* RIGHT: AI Shopping Suggestions panel */}
      <div className="lg:col-span-4 p-6 rounded-3xl bg-linear-to-b from-indigo-50 to-indigo-100/30 dark:from-polish-dark-card dark:to-indigo-950/15 border border-indigo-100/60 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse shrink-0" />
          <h3 className="text-sm font-bold font-display text-slate-800 dark:text-slate-100">
            {t.aiShoppingTitle}
          </h3>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 mb-5">
          {t.aiShoppingDesc}
        </p>

        {missingItems.length === 0 ? (
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-polish-dark-header/40 text-center py-6 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800">
            <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2 animate-bounce" />
            <p className="text-xs font-semibold">{language === 'tr' ? 'Tüm Stoklar Tamam!' : 'All Stocks Filled!'}</p>
            <p className="text-[10px] mt-0.5">{language === 'tr' ? 'Şu an eksik ürün bulunmuyor.' : 'No missing items right now.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/15 border border-rose-100/40 dark:border-rose-900/10 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{language === 'tr' ? 'Eksik Envanter Uyarısı' : 'Low Stock Warning'}</p>
                <p className="text-[10px] leading-relaxed mt-0.5">
                  {language === 'tr'
                    ? `Listenizde ${missingItems.length} adet alınacak ürün bulunuyor. Market alışverişine çıkmanız önerilir.`
                    : `You have ${missingItems.length} missing items. A grocery trip is highly suggested.`}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-polish-dark-header border border-slate-100 dark:border-slate-800/80 space-y-2 max-h-72 overflow-y-auto">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-sans block mb-1">
                {language === 'tr' ? 'AI Market Alışveriş Listesi' : 'AI Shopping Checklist'}
              </span>
              {missingItems.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-polish-dark-card border border-slate-200/40 dark:border-slate-800/40 text-[10px] text-slate-500 font-mono">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
