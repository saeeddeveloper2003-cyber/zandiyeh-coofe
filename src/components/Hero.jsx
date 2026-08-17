import React from "react";
import { ArrowDownLeft } from "lucide-react";

export default function Hero() {
  const scrollTo = (id) =>
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 pb-16 pt-28 text-center sm:pt-32"
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(35,112,85,.55)_0%,rgba(14,51,43,.24)_35%,transparent_72%)] blur-3xl" />

      <div className="pointer-events-none absolute -bottom-48 -left-20 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(201,162,106,.22)_0%,transparent_68%)] blur-3xl" />

      <div className="pointer-events-none absolute inset-x-0 top-[15%] mx-auto h-[24rem] w-[54rem] rounded-full bg-[radial-gradient(ellipse,rgba(255,255,255,.035),transparent_68%)] blur-3xl" />

      {/* Fine grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[.15] [background-image:linear-gradient(rgba(243,234,218,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(243,234,218,.045)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_80%_72%_at_50%_36%,black,transparent_88%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center">

        {/* Badge */}
        <div className="hero-reveal hero-badge inline-flex items-center gap-2 rounded-full border border-[#c9a26a]/35 bg-[#8f6b35]/10 px-5 py-2 text-xs font-semibold text-[#e3c081] shadow-[0_0_35px_rgba(201,162,106,.06)] sm:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e3c081] shadow-[0_0_12px_rgba(227,192,129,.9)]" />
          قهوه تخصصی · تفت‌شده هر هفته
        </div>

        {/* Title */}
        <h1
          className="
            hero-reveal hero-title
            mt-8
            text-[4.8rem]
            font-black
            leading-none
            tracking-[-0.06em]
            text-[#eee4d3]
            sm:mt-9
            sm:text-[6.5rem]
            md:text-[7.5rem]
            lg:text-[8rem]
            xl:text-[8.5rem]
          "
        >
          زندیه
        </h1>

        {/* Description */}
        <p className="hero-reveal hero-description mx-auto mt-8 max-w-[41rem] text-sm leading-8 text-[#98aa9f] sm:text-base md:text-lg">
          دانه‌های قهوه‌ای که با دقت انتخاب، تفت داده و برای شما فنجان‌فنجان
          روایت می‌شوند.
        </p>

        {/* Buttons */}
        <div className="hero-reveal hero-buttons mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">

          {/* Primary Button */}
          <button
            type="button"
            onClick={() => scrollTo("#products")}
            className="hero-button hero-button-primary
              rounded-full
              border border-[#d4ad73]
              bg-[#d4ad73]
              px-7 py-3.5
              font-bold
              text-[#0a0a0b]
              transition-all
              duration-200
              hover:-translate-y-1
              hover:border-[#e3c081]
              hover:bg-[#e3c081]
              hover:shadow-[0_8px_25px_rgba(212,173,115,0.35)]
              sm:px-8
            "
          >
            مشاهده محصولات
          </button>

          {/* Secondary Button */}
          <button
            type="button"
            onClick={() => scrollTo("#story")}
            className="hero-button hero-button-secondary
              rounded-full
              border border-white/20
              bg-transparent
              px-7 py-3.5
              font-semibold
              text-[#f3eada]
              transition-all
              duration-200
              hover:-translate-y-1
              hover:border-[#c9a26a]
              hover:bg-[#c9a26a]/10
              hover:shadow-[0_8px_25px_rgba(201,162,106,0.22)]
              sm:px-8
            "
          >
            داستان زندیه
          </button>

        </div>

        {/* Scroll Button */}
        <button
          type="button"
          onClick={() => scrollTo("#story")}
          className="hero-reveal hero-scroll
            mt-20
            inline-flex
            items-center
            gap-2
            text-sm
            text-[#84988d]
            transition-all
            duration-200
            hover:-translate-y-1
            hover:text-[#e3c081]
          "
        >
          <ArrowDownLeft size={15} aria-hidden="true" />
          کشف داستان
        </button>

      </div>
    </section>
  );
}