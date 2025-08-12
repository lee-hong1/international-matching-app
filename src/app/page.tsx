import Link from "next/link";

export default function Home() {
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
              로그인
            </Link>
            <Link href="/signup" className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              회원가입
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            전 세계의 <span className="text-purple-600">특별한 인연</span>을 만나보세요
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            유럽, 러시아, 남미, 북미의 여성들과 한국 남성을 연결하는 신뢰할 수 있는 국제 매칭 플랫폼입니다.
          </p>
          
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            <Link href="/signup" className="w-full sm:w-auto bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors block sm:inline-block">
              무료로 시작하기
            </Link>
            <Link href="/how-it-works" className="w-full sm:w-auto border-2 border-purple-600 text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-50 transition-colors block sm:inline-block">
              서비스 소개
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold mb-3">전 세계 네트워크</h3>
            <p className="text-gray-600">
              유럽, 러시아, 남미, 북미의 검증된 여성 회원들과 만나보세요
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-3">안전한 환경</h3>
            <p className="text-gray-600">
              신원 확인과 보안 시스템으로 안전하고 신뢰할 수 있는 만남
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-xl shadow-lg">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-3">실시간 소통</h3>
            <p className="text-gray-600">
              번역 기능과 화상 통화로 언어 장벽 없는 자연스러운 대화
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-24 bg-white rounded-2xl p-8 shadow-lg">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-purple-600">1,000+</div>
              <div className="text-gray-600">활성 여성 회원</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">50+</div>
              <div className="text-gray-600">국가</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">500+</div>
              <div className="text-gray-600">성공적인 매칭</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">24/7</div>
              <div className="text-gray-600">고객 지원</div>
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
                신뢰할 수 있는 국제 매칭 서비스
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">서비스</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/matching" className="hover:text-white">매칭 서비스</Link></li>
                <li><Link href="/premium" className="hover:text-white">프리미엄 플랜</Link></li>
                <li><Link href="/safety" className="hover:text-white">안전 가이드</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">고객지원</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">도움말</Link></li>
                <li><Link href="/contact" className="hover:text-white">문의하기</Link></li>
                <li><Link href="/faq" className="hover:text-white">자주 묻는 질문</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">회사 소개</Link></li>
                <li><Link href="/privacy" className="hover:text-white">개인정보처리방침</Link></li>
                <li><Link href="/terms" className="hover:text-white">이용약관</Link></li>
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
