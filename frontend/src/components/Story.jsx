import React from "react";

const STATS = [
  {
    value: "دستی",
    label: "بسته‌بندی سفارشی",
  },
  {
    value: "تازه",
    label: "تفت هفتگی",
  },
  {
    value: "+۶",
    label: "مبدأ قهوه",
  },
];

export default function Story() {
  return (
    <section
      id="story"
      className="relative overflow-hidden bg-[#0e332b] px-5 py-16 lg:px-8"
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#2f8566]/20 blur-3xl" />

      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-[#06251e]/40 blur-3xl" />

      {/* Container */}
      <div className="relative mx-auto max-w-[1290px]">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-24">

          {/* =======================
              LEFT CARD
          ======================= */}
          <div className="order-2 w-full lg:order-1 lg:flex-[1]">
            <div className="relative mx-auto w-full max-w-[590px]">

              {/* Card */}
              <div
                className="
                  relative
                  aspect-[1.42]
                  overflow-hidden
                  rounded-[2rem]
                  border border-white/10
                  bg-gradient-to-br
                  from-[#2d8062]
                  via-[#1b5844]
                  to-[#091614]
                  shadow-[0_35px_80px_-40px_rgba(0,0,0,.9)]
                "
              >
                {/* Inner frame */}
                <div
                  className="
                    absolute
                    inset-[7%]
                    rounded-[1.6rem]
                    border
                    border-white/10
                    bg-[#0e332b]/70
                  "
                />

                {/* Top-left circle */}
                <div
                  className="
                    absolute
                    left-[7%]
                    top-[7%]
                    h-[40%]
                    w-[29%]
                    rounded-full
                    border
                    border-[#8bc7ac]/20
                  "
                />

                {/* Bottom-left circle */}
                <div
                  className="
                    absolute
                    -bottom-[15%]
                    -left-[8%]
                    h-[60%]
                    w-[42%]
                    rounded-full
                    border
                    border-[#8bc7ac]/20
                  "
                />

                {/* Top-right circle */}
                <div
                  className="
                    absolute
                    -right-[9%]
                    -top-[14%]
                    h-[73%]
                    w-[45%]
                    rounded-full
                    border
                    border-[#d4ad73]/20
                  "
                />

                {/* Logo */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="
                      text-7xl
                      font-black
                      tracking-[-.08em]
                      text-[#c0a56d]/30
                    "
                  >
                    Z
                  </span>

                  <span
                    className="
                      mt-3
                      text-[10px]
                      font-medium
                      tracking-[7px]
                      text-[#d9ddd8]/50
                    "
                  >
                    ROAST WITH INTENT
                  </span>
                </div>
              </div>

              {/* Shadow */}
              <div
                className="
                  pointer-events-none
                  absolute
                  -bottom-5
                  left-1/2
                  h-16
                  w-[72%]
                  -translate-x-1/2
                  rounded-full
                  bg-black/30
                  blur-2xl
                "
              />
            </div>
          </div>

          {/* =======================
              RIGHT CONTENT
          ======================= */}
          <div className="order-1 w-full text-right lg:order-2 lg:flex-[1.08]">

            {/* Label */}
            <span className="text-xs font-medium text-[#d6ae71]">
              درباره ما
            </span>

            {/* Title */}
            <h2
              className="
                mt-4
                max-w-[680px]
                text-4xl
                font-extrabold
                leading-[1.18]
                tracking-[-.04em]
                text-[#f3eada]
                sm:text-5xl
                lg:text-[4rem]
              "
            >
              از دل شیراز، به رنگ زَمرد
            </h2>

            {/* Description */}
            <div
              className="
                mt-6
                max-w-[690px]
                space-y-4
                text-sm
                leading-8
                text-[#9eb5a8]
                sm:text-[15px]
              "
            >
              <p>
                زندیه با الهام از حال‌وهوای دوره زند شکل گرفت؛ همان‌جایی که
                دیوارهای سبز زمرّدی زیر سقفی مشکی، فضای گرم و اصیل می‌سازند.
                ما همین حس را در فنجان قهوه دنبال می‌کنیم.
              </p>

              <p>
                هر برگ از دانه‌ها با دقت انتخاب و در مقیاس کوچک تفت داده می‌شود
                تا طعم مبدأ هر مزرعه دست‌نخورده به دست شما برسد.
              </p>
            </div>

            {/* =======================
                STATS
            ======================= */}
   <div className="mt-8 flex gap-3">
  {STATS.map(({ value, label }) => (
    <div
      key={value}
      className="
        flex
        min-h-[72px]
        flex-1
        items-center
        rounded-xl
        border
        border-white/10
        bg-white/[.015]
        px-4
        py-3
      "
    >
      <div>
        <div className="text-lg font-bold text-[#e3c081]">
          {value}
        </div>

        <div className="mt-1 text-[11px] text-[#93aa9c]">
          {label}
        </div>
      </div>
    </div>
  ))}
</div>
          </div>
        </div>
      </div>
    </section>
  );
}