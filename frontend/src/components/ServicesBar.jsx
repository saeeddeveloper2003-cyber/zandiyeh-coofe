import React from "react";
import { Clock3, MapPin, Send } from "lucide-react";

export default function ServicesBar() {
  const itemClass =
    "hero-service group flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-transparent px-5 py-5 text-right transition-all duration-300 hover:border-[#c9a26a]/25 hover:bg-white/[.035] hover:shadow-lg sm:py-6";

  const iconClass =
    "mt-4 shrink-0 text-[#c9a26a] transition-transform duration-300 group-hover:scale-110 group-hover:text-[#e3c081]";

  const titleClass =
    "text-sm font-extrabold leading-6 text-[#f3eada] transition-colors duration-300 group-hover:text-[#e3c081] sm:text-base";

  return (
    <div className="hero-services border-t border-white/[.06] bg-[#070809]/95 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-y-2 px-5 sm:grid-cols-3 sm:gap-x-4">

        {/* ارسال سریع */}
        <div className={itemClass}>
          <Send
            size={21}
            strokeWidth={1.8}
            className={iconClass}
            aria-hidden="true"
          />

          <div className="min-w-0">
            <div className={titleClass}>ارسال سریع</div>

            <div className="mt-1 text-[11px] leading-6 text-[#84988d] transition-colors duration-300 group-hover:text-[#a9bdb1] sm:text-xs">
              ارسال به سراسر کشور در کمتر از ۴۸ ساعت
            </div>
          </div>
        </div>

        {/* تفت تازه */}
        <div className={itemClass}>
          <Clock3
            size={21}
            strokeWidth={1.8}
            className={iconClass}
            aria-hidden="true"
          />

          <div className="min-w-0">
            <div className={titleClass}>تفت تازه</div>

            <div className="mt-1 text-[11px] leading-6 text-[#84988d] transition-colors duration-300 group-hover:text-[#a9bdb1] sm:text-xs">
              دانه‌ها همان هفته سفارش تفت داده می‌شوند
            </div>
          </div>
        </div>

        {/* انتخاب مبدأ */}
        <div className={itemClass}>
          <MapPin
            size={21}
            strokeWidth={1.8}
            className={iconClass}
            aria-hidden="true"
          />

          <div className="min-w-0">
            <div className={titleClass}>انتخاب مبدأ</div>

            <div className="mt-1 text-[11px] leading-6 text-[#84988d] transition-colors duration-300 group-hover:text-[#a9bdb1] sm:text-xs">
              ارتباط مستقیم با مزارع منتخب
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
