import React from 'react';
import { Icon } from './Icon';

interface CreativesLandingPageProps {
  onSelectCategory: (category: string) => void;
  T: any;
}

export const CreativesLandingPage: React.FC<CreativesLandingPageProps> = ({ onSelectCategory, T }) => {
  const categories = [
    {
      title: T.creativesCat1Title,
      icon: "sparkles",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      items: [
        { name: T.creativesCat1Item1, desc: T.creativesCat1Item1Desc },
        { name: T.creativesCat1Item2, desc: T.creativesCat1Item2Desc },
        { name: T.creativesCat1Item3, desc: T.creativesCat1Item3Desc }
      ]
    },
    {
      title: T.creativesCat2Title,
      icon: "film",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      items: [
        { name: T.creativesCat2Item1, desc: T.creativesCat2Item1Desc },
        { name: T.creativesCat2Item2, desc: T.creativesCat2Item2Desc },
        { name: T.creativesCat2Item3, desc: T.creativesCat2Item3Desc },
        { name: T.creativesCat2Item4, desc: T.creativesCat2Item4Desc }
      ]
    },
    {
      title: T.creativesCat3Title,
      icon: "image",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      items: [
        { name: T.creativesCat3Item1, desc: T.creativesCat3Item1Desc },
        { name: T.creativesCat3Item2, desc: T.creativesCat3Item2Desc },
        { name: T.creativesCat3Item3, desc: T.creativesCat3Item3Desc }
      ]
    },
    {
      title: T.creativesCat4Title,
      icon: "copy",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      items: [
        { name: T.creativesCat4Item1, desc: T.creativesCat4Item1Desc },
        { name: T.creativesCat4Item2, desc: T.creativesCat4Item2Desc },
        { name: T.creativesCat4Item3, desc: T.creativesCat4Item3Desc }
      ]
    }
  ];

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto pt-4 md:pt-8 flex-1 w-full overflow-y-auto custom-scrollbar pb-24 md:pb-20">
      <div className="text-center mb-10 md:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-brand-text tracking-tighter uppercase mb-4 md:mb-6">
          {T.creativesLandingTitle}
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-brand-text-secondary max-w-2xl mx-auto font-light px-4">
          {T.creativesLandingSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 px-2 sm:px-0">
        {categories.map((category, idx) => (
          <div key={idx} className="bg-brand-surface border border-brand-secondary/20 rounded-3xl md:rounded-[2rem] p-5 sm:p-6 md:p-8 hover:shadow-2xl hover:shadow-brand-primary/5 transition-all duration-500">
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center ${category.bg} ${category.color}`}>
                <Icon name={category.icon as any} className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-brand-text">{category.title}</h2>
            </div>
            
            <div className="space-y-3 md:space-y-4">
              {category.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={() => onSelectCategory(item.name)}
                  className="w-full text-left group bg-brand-bg/50 hover:bg-brand-primary/5 border border-brand-secondary/10 hover:border-brand-primary/30 rounded-xl p-4 md:p-5 transition-all duration-300 flex items-start gap-3 md:gap-4"
                >
                  <div className="flex-1">
                    <h3 className="text-sm md:text-base font-bold text-brand-text group-hover:text-brand-primary transition-colors mb-1">{item.name}</h3>
                    <p className="text-xs md:text-sm text-brand-text-secondary leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-brand-surface flex items-center justify-center text-brand-text/30 group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-all mt-0.5 md:mt-1 flex-shrink-0">
                    <Icon name="plus" className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
