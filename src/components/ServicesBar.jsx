import React from "react";
import { Clock3, MapPin, Send } from "lucide-react";

export default function ServicesBar() {
  return (
    <div className="hero-services border-t border-white/[.06] bg-[#070809]/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-y-2 px-5 sm:grid-cols-3 sm:gap-x-4">
        <div className="hero-service flex items-center justify-center gap-4 px-5 py-5 text-center sm:py-6">
          <Send size={21} strokeWidth={1.8} className="shrink-0 text-[#c9a26a]" aria-hidden="true" />
          <div>
            <div className="text-sm font-extrabold text-[#f3eada] sm:text-base">ارسال سریع</div>
            <div className="mt-1 text-[11px] leading-6 text-[#84988d] sm:text-xs">ارسال به سراسر کشور در کمتر از ۴۸ ساعت</div>
          </div>
        </div>

        <div className="hero-service flex items-center justify-center gap-4 px-5 py-5 text-center sm:py-6">
          <Clock3 size={21} strokeWidth={1.8} className="shrink-0 text-[#c9a26a]" aria-hidden="true" />
          <div>
            <div className="text-sm font-extrabold text-[#f3eada] sm:text-base">تفت تازه</div>
            <div className="mt-1 text-[11px] leading-6 text-[#84988d] sm:text-xs">دانه‌ها همان هفته سفارش تفت داده می‌شوند</div>
          </div>
        </div>

        <div className="className=hero-service flex items-center justify-center gap-4 px-5 py-5 text-center sm:py-6">
          <MapPin size={21} strokeWidth={1.8} className="shrink-0 text-[#c9a26a]" aria-hidden="true" />
          <div>
            <div className="text-sm font-extrabold text-[#f3eada] sm:text-base">انتخاب مبدأ</div>
            <div className="mt-1 text-[11px] leading-6 text-[#84988d] sm:text-xs">ارتباط مستقیم با مزارع منتخب</div>
          </div>
        </div>
      </div>
    </div>
  );
}
