import Link from "next/link";
import { headers } from "next/headers";
import { t, detectLangFromHeader } from "@src/lib/i18n";

export default async function Home() {
  const headersList = await headers();
  const lang = detectLangFromHeader(headersList.get("accept-language"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-purple-600">
            💕 GlobalMatch
          </div>
          <div className="space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-purple-600">
              {t("landing.login", lang)}
            </Link>
            <Link href="/signup" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              {t("landing.signup", lang)}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            {t("landing.hero_title", lang).split(" ").slice(0, 2).join(" ")}{" "}
            <span className="text-purple-600">
              {t("landing.hero_title", lang).split(" ").slice(2).join(" ")}
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {t("landing.hero_subtitle", lang)}
          </p>

          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link href="/signup" className="w-full sm:w-auto bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors block sm:inline-block">
              {t("landing.cta_start", lang)}
            </Link>
            <Link href="/how-it-works" className="w-full sm:w-auto border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-50 transition-colors block sm:inline-block">
              {t("landing.cta_learn", lang)}
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold mb-3">{t("landing.feature_network", lang)}</h3>
            <p className="text-gray-600">
              {t("landing.feature_network_desc", lang)}
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-3">{t("landing.feature_safe", lang)}</h3>
            <p className="text-gray-600">
              {t("landing.feature_safe_desc", lang)}
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-3">{t("landing.feature_realtime", lang)}</h3>
            <p className="text-gray-600">
              {t("landing.feature_realtime_desc", lang)}
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 bg-white rounded-2xl p-8 shadow-lg">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-purple-600">1,000+</div>
              <div className="text-gray-600">{t("landing.stat_members", lang)}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">50+</div>
              <div className="text-gray-600">{t("landing.stat_countries", lang)}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">500+</div>
              <div className="text-gray-600">{t("landing.stat_matches", lang)}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">24/7</div>
              <div className="text-gray-600">{t("landing.stat_support", lang)}</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-purple-400 mb-4">
                💕 GlobalMatch
              </div>
              <p className="text-gray-400">
                {t("landing.footer_tagline", lang)}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer_service", lang)}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/matching" className="hover:text-white">{t("landing.footer_matching", lang)}</Link></li>
                <li><Link href="/premium" className="hover:text-white">{t("landing.footer_premium", lang)}</Link></li>
                <li><Link href="/safety" className="hover:text-white">{t("landing.footer_safety", lang)}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer_support", lang)}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">{t("landing.footer_help", lang)}</Link></li>
                <li><Link href="/contact" className="hover:text-white">{t("landing.footer_contact", lang)}</Link></li>
                <li><Link href="/faq" className="hover:text-white">{t("landing.footer_faq", lang)}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{t("landing.footer_company", lang)}</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">{t("landing.footer_about", lang)}</Link></li>
                <li><Link href="/privacy" className="hover:text-white">{t("landing.footer_privacy", lang)}</Link></li>
                <li><Link href="/terms" className="hover:text-white">{t("landing.footer_terms", lang)}</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 GlobalMatch. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
