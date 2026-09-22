import React, { useState } from 'react';
import { QCConfig, LabTest } from '../types';

interface KpiCardsProps {
  test: LabTest;
  config: QCConfig;
  totalSamples: number;
}

interface CardItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  subtext: string;
  badge?: {
    text: string;
    color: string;
  };
  icon: string;
  iconBg: string;
  tooltip: string;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ test, config, totalSamples }) => {
  const { mean, sd } = config;
  const cv = mean > 0 ? Number(((sd / mean) * 100).toFixed(2)) : 0;

  // Đánh giá chất lượng CV% theo khuyến cáo CLIA / ISO 15189
  const cvQuality = cv <= 3.0
    ? { text: 'Độ chụm Rất Cao ⭐⭐⭐', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : cv <= 5.0
    ? { text: 'Độ chụm Đạt Chuẩn ⭐⭐', color: 'bg-blue-50 text-blue-700 border-blue-200' }
    : { text: 'Cần Lưu Ý ⚠️', color: 'bg-amber-50 text-amber-700 border-amber-200' };

  // Danh sách thẻ khởi tạo
  const initialCards: CardItem[] = [
    {
      id: 'mean',
      label: 'MEAN MỤC TIÊU',
      value: mean,
      unit: test.unit,
      subtext: 'Giá trị kỳ vọng trung tâm',
      icon: 'fa-bullseye',
      iconBg: 'bg-blue-50 text-blue-600',
      tooltip: 'Giá trị trung bình ấn định của mẫu chứng QC (Target Mean)'
    },
    {
      id: 'sd',
      label: 'ĐỘ LỆCH CHUẨN (SD)',
      value: sd,
      subtext: `Giới hạn ±2SD: [${(mean - 2 * sd).toFixed(2)} - ${(mean + 2 * sd).toFixed(2)}]`,
      icon: 'fa-ruler-combined',
      iconBg: 'bg-indigo-50 text-indigo-600',
      tooltip: 'Độ tản mạn thống kê của phương pháp đo (Standard Deviation)'
    },
    {
      id: 'cv',
      label: 'HỆ SỐ BIẾN THIÊN (CV%)',
      value: `${cv}%`,
      subtext: cv <= 3.0 ? 'Vận hành tối ưu' : 'Vận hành trong chuẩn',
      badge: cvQuality,
      icon: 'fa-chart-pie',
      iconBg: 'bg-emerald-50 text-emerald-600',
      tooltip: 'Hệ số phân tán tương đối: CV% = (SD / Mean) * 100'
    },
    {
      id: 'machine',
      label: 'MÁY PHÂN TÍCH',
      value: test.analyzerName || 'Máy Hóa sinh',
      subtext: `${totalSamples} kết quả đo nội kiểm`,
      icon: 'fa-microchip',
      iconBg: 'bg-slate-100 text-slate-700',
      tooltip: 'Dòng thiết bị y tế thực hiện đo và số mẫu nội kiểm đã tích lũy'
    }
  ];

  const [cardsOrder, setCardsOrder] = useState<string[]>(['mean', 'sd', 'cv', 'machine']);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const newOrder = [...cardsOrder];
    const fromIndex = newOrder.indexOf(draggedId);
    const toIndex = newOrder.indexOf(targetId);
    newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, draggedId);

    setCardsOrder(newOrder);
    setDraggedId(null);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cardsOrder.map(cardId => {
        const card = initialCards.find(c => c.id === cardId);
        if (!card) return null;

        const isDragging = draggedId === card.id;

        return (
          <div
            key={card.id}
            draggable
            onDragStart={e => handleDragStart(e, card.id)}
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, card.id)}
            className={`bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing relative group ${
              isDragging ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''
            }`}
            title={`${card.tooltip} (Có thể kéo thả để sắp xếp vị trí)`}
          >
            {/* Top row: Label + Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                {card.label}
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${card.iconBg} transition-transform group-hover:scale-105`}>
                <i className={`fas ${card.icon}`}></i>
              </div>
            </div>

            {/* Value display */}
            <div className="mt-3 flex items-baseline gap-1.5 overflow-hidden">
              <span className="text-2xl font-black text-[#0F1F3D] tracking-tight truncate leading-tight">
                {card.value}
              </span>
              {card.unit && (
                <span className="text-xs font-bold text-slate-400 shrink-0">
                  {card.unit}
                </span>
              )}
            </div>

            {/* Subtext or Badge */}
            <div className="mt-2 flex items-center justify-between gap-2 flex-wrap min-h-[22px]">
              <span className="text-[11px] text-slate-500 font-medium truncate">
                {card.subtext}
              </span>
              {card.badge && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${card.badge.color} shrink-0`}>
                  {card.badge.text}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
