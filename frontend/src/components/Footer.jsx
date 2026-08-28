import React from "react";

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/8 bg-[#080809] px-5 py-14 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <div className="text-2xl font-extrabold text-[#e3c081]">زندیه</div>
          <div className="mt-1 text-[10px] tracking-[3px] text-[#93aa9c]">ZANDIEH COFFEE ROASTERS</div>
          <p className="mt-5 max-w-md text-sm leading-7 text-[#93aa9c]">
            قهوه‌فروشی زندیه؛ دانه‌های منتخب، تفت‌شده با دقت، برای فنجانی که ارزش وقفه دارد.
          </p>
        </div>

        <div>
          <h5 className="font-bold">دسترسی سریع</h5>
          <div className="mt-4 space-y-3 text-sm text-[#93aa9c]">
            <a className="block hover:text-[#e3c081]" href="#story">داستان ما</a>
            <a className="block hover:text-[#e3c081]" href="#products">محصولات</a>
            <a className="block hover:text-[#e3c081]" href="#blend">میکس اختصاصی</a>
          </div>
        </div>

        <div>
          <h5 className="font-bold">تماس با ما</h5>
          <div className="mt-4 space-y-3 text-sm text-[#93aa9c]">
            <span className="block">شیراز، ایران</span>
            <span className="block">۰۹۱۲-۰۰۰-۰۰۰۰</span>
            <span className="block">اینستاگرام @zandieh</span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col justify-between gap-2 border-t border-white/8 pt-5 text-xs text-[#93aa9c] sm:flex-row">
        <span>© ۱۴۰۵ زندیه. تمامی حقوق محفوظ است.</span>
        <span>طراحی شده برای دوستداران قهوه ☕</span>
      </div>
    </footer>
  );
}
