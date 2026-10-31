import React from 'react';
import { ShoppingBag, MessageSquare, Video, Settings, Sparkles } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, hasProduct }) {
  const tabs = [
    { id: 'product', label: 'สินค้า', icon: ShoppingBag },
    { id: 'script', label: 'บท AI', icon: MessageSquare, badge: hasProduct },
    { id: 'video', label: 'วิดีโอ 8s', icon: Video },
    { id: 'settings', label: 'ตั้งค่า', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-shopee-primary to-orange-400 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            SA
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-800 leading-tight flex items-center gap-1">
              Shopee Affiliate <span className="text-shopee-primary text-xs bg-orange-50 px-1.5 py-0.5 rounded font-semibold">AI Studio</span>
            </h1>
            <p className="text-[10px] text-slate-500">คิดบท & สร้างวิดีโอ 8 วินาที</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] text-amber-800 font-medium">
          <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
          <span>8s Viral Mode</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex border-t border-slate-100 bg-slate-50/70 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors relative ${
                isActive
                  ? 'text-shopee-primary border-b-2 border-shopee-primary bg-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-1.5 h-1.5 rounded-full bg-shopee-primary absolute top-1.5 right-2" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

