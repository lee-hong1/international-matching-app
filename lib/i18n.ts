export type Locale = 'ko' | 'en' | 'zh' | 'ja'

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
}

export const LOCALE_FLAG: Record<Locale, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
  zh: '🇨🇳',
  ja: '🇯🇵',
}

export type TranslationKeys = {
  loading: string; error: string; back: string; save: string; cancel: string
  confirm: string; close: string; next: string; free: string
  error_not_found: string; error_generic: string; error_go_home: string
  nav_home: string; nav_explore: string; nav_events: string; nav_match: string; nav_profile: string
  events_title: string; events_all: string; events_drink: string; events_meal: string; events_party: string
  events_create: string; events_empty: string; events_empty_sub: string; events_full: string
  events_closed: string; events_free: string; events_persons: string; events_partner_venue: string; events_featured: string
  create_title: string; create_type: string; create_name: string; create_name_placeholder: string
  create_desc: string; create_desc_placeholder: string; create_venue: string; create_venue_partner: string
  create_venue_custom: string; create_venue_custom_placeholder: string; create_datetime: string
  create_max_persons: string; create_fee: string; create_fee_desc: string; create_submit: string
  create_submitting: string; create_premium_only: string; create_premium_desc: string; create_premium_btn: string
  create_no_venues: string
  detail_host: string; detail_apply: string; detail_applying: string; detail_pay_apply: string
  detail_my_status: string; detail_pending: string; detail_approved: string; detail_rejected: string
  detail_cancelled: string; detail_participants: string; detail_no_participants: string
  detail_approve: string; detail_reject: string; detail_back_list: string; detail_partner_discount: string
  share_title: string; share_copy: string; share_copied: string; share_text_label: string
  share_kakao: string; share_line: string; share_twitter: string; share_facebook: string
  share_wechat: string; share_wechat_copy: string; share_instagram: string; share_generating: string
  share_boost: string; share_boost_desc: string; share_boost_btn: string; share_featured_badge: string
  payment_success: string; payment_success_desc: string; payment_fail: string; payment_fail_desc: string
  payment_back: string; payment_confirming: string
  detail_apply_failed: string; detail_payment_module_failed: string; detail_payment_failed: string
  // error namespace
  'error.generic': string; 'error.network': string; 'error.retry': string; 'error.go_home': string
  // auth namespace
  'auth.email_label': string; 'auth.password_label': string; 'auth.login_title': string
  'auth.have_account': string; 'auth.no_account': string; 'auth.login_button': string
  'auth.login_loading': string; 'auth.forgot_password': string; 'auth.or_social': string
  'auth.signup_link': string; 'auth.error_empty_fields': string; 'auth.error_invalid_credentials': string
  'auth.error_email_not_confirmed': string; 'auth.error_login_failed': string
  'auth.error_login_error': string; 'auth.error_social_failed': string; 'auth.error_social_error': string
  // signup namespace
  'signup.step_account': string; 'signup.step_personal': string; 'signup.step_profile': string
  'signup.label_email': string; 'signup.label_password': string; 'signup.label_confirm_password': string
  'signup.confirm_password': string; 'signup.password_placeholder': string; 'signup.password_strength': string
  'signup.strength_weak': string; 'signup.strength_fair': string; 'signup.strength_strong': string
  'signup.strength_very_strong': string; 'signup.terms_agree': string; 'signup.terms_link': string
  'signup.terms_and': string; 'signup.privacy_link': string; 'signup.next_step': string
  'signup.label_name': string; 'signup.name_placeholder': string; 'signup.label_gender': string
  'signup.label_gender_female': string; 'signup.label_gender_male': string
  'signup.label_birthdate': string; 'signup.label_birthdate_hint': string
  'signup.label_country': string; 'signup.label_country_placeholder': string
  'signup.previous': string; 'signup.next': string; 'signup.label_photo': string
  'signup.label_photo_optional': string; 'signup.label_bio': string; 'signup.label_bio_optional': string
  'signup.bio_placeholder': string; 'signup.label_interests': string; 'signup.label_interests_max': string
  'signup.submit': string; 'signup.submitting': string; 'signup.already_account': string
  'signup.login_link': string; 'signup.err_email_required': string; 'signup.err_email_invalid': string
  'signup.err_password_required': string; 'signup.err_password_short': string
  'signup.err_password_weak': string; 'signup.err_password_mismatch': string
  'signup.err_terms': string; 'signup.err_name_required': string; 'signup.err_birthdate_required': string
  'signup.err_country_required': string; 'signup.err_duplicate': string; 'signup.err_generic': string
  'signup.err_server': string
  // discover namespace
  'discover.matching_tab': string; 'discover.services_tab': string; 'discover.all_seen': string
  'discover.check_later': string; 'discover.reload': string; 'discover.swipe_hint': string
  'discover.all_categories': string; 'discover.empty_services': string; 'discover.match_success': string
  'discover.match_message': string; 'discover.keep_exploring': string
  // book namespace
  'book.slot_taken': string; 'book.success_title': string; 'book.success_body': string
  'book.back_to_profile': string; 'book.loading': string; 'book.select_datetime': string
  'book.available_days': string; 'book.date': string; 'book.time': string
  'book.notes': string; 'book.notes_placeholder': string; 'book.submitting': string
  'book.confirm': string; 'book.cancel': string
  // services namespace
  'services.duration_min': string; 'services.inactive': string; 'services.book_now': string
  'services.login_to_book': string; 'services.host_info': string; 'services.view_host': string
  'services.reviews_title': string
  // profile namespace
  'profile.host_since': string; 'profile.book_now': string; 'profile.reviews': string
  'profile.send_message': string
  // review namespace
  'review.empty': string; 'review.comment': string; 'review.error': string; 'review.rating': string
  'review.submit': string; 'review.success': string; 'review.write': string
  // bookings namespace
  'bookings.title': string; 'bookings.tab_upcoming': string; 'bookings.tab_completed': string
  'bookings.tab_cancelled': string; 'bookings.empty': string; 'bookings.load_error': string
  'bookings.load_more': string; 'bookings.status_pending': string; 'bookings.status_confirmed': string
  'bookings.status_completed': string; 'bookings.status_cancelled': string
  'bookings.review_btn': string; 'bookings.cancel_btn': string; 'bookings.cancel_confirm': string
  'bookings.cancel_error': string
  // host namespace
  'host.dashboard_title': string; 'host.services_title': string; 'host.services_desc': string
  'host.services_add': string; 'host.services_empty': string; 'host.services_edit': string
  'host.services_deactivate': string; 'host.services_deactivate_confirm': string
  'host.services_inactive': string; 'host.services_save': string
  'host.services_field_title': string; 'host.services_field_desc': string
  'host.services_field_price': string; 'host.services_field_currency': string
  'host.services_field_duration': string; 'host.services_field_category': string
  'host.bookings_title': string; 'host.bookings_desc': string; 'host.bookings.empty': string
  'host.bookings.load_error': string; 'host.bookings.load_more': string
  'host.bookings.user_info': string; 'host.bookings.notes': string
  'host.bookings.confirm_btn': string; 'host.bookings.complete_btn': string
  'host.bookings.cancel_btn': string; 'host.bookings.status_error': string
  // availability namespace
  'availability.title': string; 'availability.add_slot': string; 'availability.empty': string
  'availability.no_slots': string; 'availability.day_of_week': string
  'availability.start_time': string; 'availability.end_time': string
  'availability.timezone': string; 'availability.toggle_on': string; 'availability.toggle_off': string
  'availability.inactive_badge': string; 'availability.delete': string
  'availability.save_success': string; 'availability.save_error': string
  // commission namespace
  'commission.earnings_title': string; 'commission.total_completed': string; 'commission.platform_fee': string
  // notification namespace (email templates)
  'notification.new_booking.title': string; 'notification.new_booking.body': string
  'notification.confirmed.title': string; 'notification.confirmed.body': string
  'notification.cancelled.title': string; 'notification.cancelled.body': string
}

const ko: TranslationKeys = {
  loading: '로딩 중...', error: '오류가 발생했습니다', back: '뒤로', save: '저장', cancel: '취소',
  confirm: '확인', close: '닫기', next: '다음', free: '무료',
  error_not_found: '페이지를 찾을 수 없습니다', error_generic: '오류가 발생했습니다.', error_go_home: '홈으로 돌아가기',
  nav_home: '홈', nav_explore: '탐색', nav_events: '모임', nav_match: '매칭', nav_profile: '프로필',
  events_title: '오프라인 모임', events_all: '전체', events_drink: '술 친구', events_meal: '밥 친구',
  events_party: '파티원 모집', events_create: '모임 만들기', events_empty: '아직 모집 중인 모임이 없습니다',
  events_empty_sub: '새로운 모임을 만들어보세요!', events_full: '마감', events_closed: '종료',
  events_free: '무료', events_persons: '명', events_partner_venue: '제휴 매장', events_featured: '추천',
  create_title: '모임 만들기', create_type: '모임 유형', create_name: '제목',
  create_name_placeholder: '예) 강남에서 가볍게 한잔 하실 분!', create_desc: '설명 (선택)',
  create_desc_placeholder: '모임에 대한 설명을 적어주세요', create_venue: '모임 장소',
  create_venue_partner: '제휴 매장', create_venue_custom: '직접 입력',
  create_venue_custom_placeholder: '예) 강남역 11번 출구 OO카페', create_datetime: '모임 일시',
  create_max_persons: '모집 인원', create_fee: '참가비 (원, 무료는 0)',
  create_fee_desc: '참가비에서 플랫폼 수수료가 차감된 금액이 호스트에게 정산됩니다.',
  create_submit: '모임 만들기', create_submitting: '생성 중...',
  create_premium_only: '유료 회원만 이용 가능합니다',
  create_premium_desc: '모임 만들기는 프리미엄 멤버십 가입 후 이용할 수 있어요.',
  create_premium_btn: '프리미엄 알아보기', create_no_venues: '이용 가능한 제휴 매장이 없습니다',
  detail_host: '호스트', detail_apply: '참가 신청하기', detail_applying: '처리 중...',
  detail_pay_apply: '원 결제하고 참가 신청', detail_my_status: '신청 상태',
  detail_pending: '승인 대기', detail_approved: '승인됨', detail_rejected: '거절됨', detail_cancelled: '취소됨',
  detail_participants: '참가 신청', detail_no_participants: '아직 신청자가 없습니다',
  detail_approve: '승인', detail_reject: '거절', detail_back_list: '목록으로 돌아가기',
  detail_partner_discount: '제휴 매장 할인 적용가',
  share_title: 'SNS 홍보', share_copy: '텍스트 복사', share_copied: '복사됨!', share_text_label: '홍보 문구',
  share_kakao: '카카오톡', share_line: 'LINE', share_twitter: 'X(트위터)', share_facebook: '페이스북',
  share_wechat: '위챗 공유', share_wechat_copy: '링크 복사 (위챗)', share_instagram: '인스타그램 복사',
  share_generating: '홍보 문구 생성 중...', share_boost: '상단 노출 부스트',
  share_boost_desc: '내 모임을 목록 최상단에 노출시킵니다 (24시간)', share_boost_btn: '부스트 신청',
  share_featured_badge: '추천',
  payment_success: '결제가 완료되었습니다', payment_success_desc: '참가 신청이 승인되었습니다.',
  payment_fail: '결제가 취소되었습니다', payment_fail_desc: '결제가 진행되지 않았습니다.',
  payment_back: '모임으로 돌아가기', payment_confirming: '결제를 확인하고 있습니다...',
  detail_apply_failed: '신청에 실패했습니다. 다시 시도해 주세요.', detail_payment_module_failed: '결제 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.', detail_payment_failed: '결제에 실패했습니다. 다시 시도해 주세요.',
  'error.generic': '오류가 발생했습니다.', 'error.network': '네트워크 오류가 발생했습니다.', 'error.retry': '다시 시도', 'error.go_home': '홈으로',
  'auth.email_label': '이메일', 'auth.password_label': '비밀번호', 'auth.login_title': '다시 오셨군요',
  'auth.have_account': '이미 계정이 있으신가요?', 'auth.no_account': '계정이 없으신가요?',
  'auth.login_button': '로그인', 'auth.login_loading': '로그인 중...', 'auth.forgot_password': '비밀번호를 잊으셨나요?',
  'auth.or_social': '또는 소셜로 계속하기', 'auth.signup_link': '회원가입',
  'auth.error_empty_fields': '이메일과 비밀번호를 입력해 주세요.', 'auth.error_invalid_credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth.error_email_not_confirmed': '이메일 인증을 완료해 주세요.', 'auth.error_login_failed': '로그인에 실패했습니다.',
  'auth.error_login_error': '로그인 중 오류가 발생했습니다.', 'auth.error_social_failed': '소셜 로그인에 실패했습니다.',
  'auth.error_social_error': '소셜 로그인 중 오류가 발생했습니다.',
  'signup.step_account': '계정 정보', 'signup.step_personal': '개인 정보', 'signup.step_profile': '프로필',
  'signup.label_email': '이메일', 'signup.label_password': '비밀번호', 'signup.label_confirm_password': '비밀번호 확인',
  'signup.confirm_password': '비밀번호를 다시 입력하세요', 'signup.password_placeholder': '8자 이상 입력하세요',
  'signup.password_strength': '비밀번호 강도:', 'signup.strength_weak': '약함', 'signup.strength_fair': '보통',
  'signup.strength_strong': '강함', 'signup.strength_very_strong': '매우 강함',
  'signup.terms_agree': '에 동의합니다', 'signup.terms_link': '이용약관', 'signup.terms_and': '및',
  'signup.privacy_link': '개인정보처리방침', 'signup.next_step': '다음',
  'signup.label_name': '이름', 'signup.name_placeholder': '실명을 입력하세요',
  'signup.label_gender': '성별', 'signup.label_gender_female': '여성', 'signup.label_gender_male': '남성',
  'signup.label_birthdate': '생년월일', 'signup.label_birthdate_hint': '만 18세 이상만 가입할 수 있습니다.',
  'signup.label_country': '국가', 'signup.label_country_placeholder': '국가를 선택하세요',
  'signup.previous': '이전', 'signup.next': '다음',
  'signup.label_photo': '프로필 사진', 'signup.label_photo_optional': '(선택)',
  'signup.label_bio': '자기소개', 'signup.label_bio_optional': '(선택)',
  'signup.bio_placeholder': '간단히 자신을 소개해 주세요',
  'signup.label_interests': '관심사', 'signup.label_interests_max': '(최대 5개)',
  'signup.submit': '가입 완료', 'signup.submitting': '처리 중...',
  'signup.already_account': '이미 계정이 있으신가요?', 'signup.login_link': '로그인',
  'signup.err_email_required': '이메일을 입력해 주세요.', 'signup.err_email_invalid': '올바른 이메일 형식이 아닙니다.',
  'signup.err_password_required': '비밀번호를 입력해 주세요.', 'signup.err_password_short': '비밀번호는 8자 이상이어야 합니다.',
  'signup.err_password_weak': '더 강한 비밀번호를 사용해 주세요.', 'signup.err_password_mismatch': '비밀번호가 일치하지 않습니다.',
  'signup.err_terms': '이용약관에 동의해 주세요.', 'signup.err_name_required': '이름을 입력해 주세요.',
  'signup.err_birthdate_required': '만 18세 이상이어야 합니다.', 'signup.err_country_required': '국가를 선택해 주세요.',
  'signup.err_duplicate': '이미 사용 중인 이메일입니다.', 'signup.err_generic': '오류가 발생했습니다. 다시 시도해 주세요.',
  'signup.err_server': '서버 오류가 발생했습니다.',
  'discover.matching_tab': '매칭', 'discover.services_tab': '서비스',
  'discover.all_seen': '모든 프로필을 보셨습니다!', 'discover.check_later': '새 프로필이 정기적으로 추가됩니다. 나중에 다시 확인하세요!',
  'discover.reload': '새로 고침', 'discover.swipe_hint': '오른쪽으로 스와이프하면 좋아요, 왼쪽은 패스',
  'discover.all_categories': '전체', 'discover.empty_services': '서비스를 찾을 수 없습니다',
  'discover.match_success': '매칭 성공!', 'discover.match_message': '님도 나를 좋아합니다!', 'discover.keep_exploring': '계속 탐색하기',
  'book.slot_taken': '이미 예약된 시간입니다.', 'book.success_title': '예약 완료!', 'book.success_body': '예약이 확정되었습니다.',
  'book.back_to_profile': '프로필로 돌아가기', 'book.loading': '예약 가능 시간 로딩 중...',
  'book.select_datetime': '날짜 및 시간 선택', 'book.available_days': '예약 가능 요일',
  'book.date': '날짜', 'book.time': '시간', 'book.notes': '메모 (선택)', 'book.notes_placeholder': '특별 요청사항...',
  'book.submitting': '예약 중...', 'book.confirm': '예약 확정', 'book.cancel': '취소',
  'services.duration_min': '{n}분', 'services.inactive': '현재 이용 불가한 서비스입니다.',
  'services.book_now': '지금 예약', 'services.login_to_book': '로그인하고 예약하기',
  'services.host_info': '호스트 소개', 'services.view_host': '전체 프로필 보기', 'services.reviews_title': '최근 리뷰',
  'profile.host_since': '호스트', 'profile.book_now': '예약하기', 'profile.reviews': '리뷰',
  'profile.send_message': '메시지 보내기',
  'review.empty': '아직 리뷰가 없습니다', 'review.comment': '댓글', 'review.error': '리뷰 제출에 실패했습니다.',
  'review.rating': '평점', 'review.submit': '리뷰 제출', 'review.success': '리뷰가 제출되었습니다!', 'review.write': '리뷰 쓰기',
  'bookings.title': '내 예약', 'bookings.tab_upcoming': '예정', 'bookings.tab_completed': '완료', 'bookings.tab_cancelled': '취소',
  'bookings.empty': '예약 내역이 없습니다', 'bookings.load_error': '예약을 불러오는 데 실패했습니다.',
  'bookings.load_more': '더 보기', 'bookings.status_pending': '대기 중', 'bookings.status_confirmed': '확정됨',
  'bookings.status_completed': '완료됨', 'bookings.status_cancelled': '취소됨',
  'bookings.review_btn': '리뷰 쓰기', 'bookings.cancel_btn': '예약 취소', 'bookings.cancel_confirm': '이 예약을 취소하시겠습니까?',
  'bookings.cancel_error': '취소에 실패했습니다.',
  'host.dashboard_title': '호스트 대시보드', 'host.services_title': '내 서비스', 'host.services_desc': '서비스를 관리하세요',
  'host.services_add': '서비스 추가', 'host.services_empty': '아직 서비스가 없습니다', 'host.services_edit': '수정',
  'host.services_deactivate': '비활성화', 'host.services_deactivate_confirm': '이 서비스를 비활성화하시겠습니까?',
  'host.services_inactive': '비활성', 'host.services_save': '저장',
  'host.services_field_title': '제목', 'host.services_field_desc': '설명', 'host.services_field_price': '가격',
  'host.services_field_currency': '통화', 'host.services_field_duration': '시간 (분)', 'host.services_field_category': '카테고리',
  'host.bookings_title': '예약 관리', 'host.bookings_desc': '예약을 관리하세요',
  'host.bookings.empty': '예약이 없습니다', 'host.bookings.load_error': '불러오기 실패', 'host.bookings.load_more': '더 보기',
  'host.bookings.user_info': '고객', 'host.bookings.notes': '메모', 'host.bookings.confirm_btn': '확정',
  'host.bookings.complete_btn': '완료 처리', 'host.bookings.cancel_btn': '취소', 'host.bookings.status_error': '상태 변경 실패',
  'availability.title': '예약 가능 시간', 'availability.add_slot': '슬롯 추가', 'availability.empty': '예약 가능 시간이 없습니다',
  'availability.no_slots': '슬롯 없음', 'availability.day_of_week': '요일', 'availability.start_time': '시작 시간',
  'availability.end_time': '종료 시간', 'availability.timezone': '시간대', 'availability.toggle_on': '예약 가능으로 설정',
  'availability.toggle_off': '예약 불가로 설정', 'availability.inactive_badge': '비활성', 'availability.delete': '삭제',
  'availability.save_success': '저장되었습니다!', 'availability.save_error': '저장에 실패했습니다.',
  'commission.earnings_title': '수익', 'commission.total_completed': '완료 합계', 'commission.platform_fee': '플랫폼 수수료',
  'notification.new_booking.title': '새 예약이 도착했습니다', 'notification.new_booking.body': '예약 #{booking_id}이(가) 접수되었습니다.',
  'notification.confirmed.title': '예약이 확정되었습니다', 'notification.confirmed.body': '예약 #{booking_id}이(가) 확정되었습니다.',
  'notification.cancelled.title': '예약이 취소되었습니다', 'notification.cancelled.body': '예약 #{booking_id}이(가) 취소되었습니다.',
}

const en: TranslationKeys = {
  loading: 'Loading...', error: 'An error occurred', back: 'Back', save: 'Save', cancel: 'Cancel',
  confirm: 'Confirm', close: 'Close', next: 'Next', free: 'Free',
  error_not_found: 'Page Not Found', error_generic: 'Something went wrong.', error_go_home: 'Go Home',
  nav_home: 'Home', nav_explore: 'Explore', nav_events: 'Events', nav_match: 'Match', nav_profile: 'Profile',
  events_title: 'Offline Events', events_all: 'All', events_drink: 'Drinks', events_meal: 'Meals',
  events_party: 'Party', events_create: 'Create Event', events_empty: 'No events available yet',
  events_empty_sub: 'Be the first to create one!', events_full: 'Full', events_closed: 'Closed',
  events_free: 'Free', events_persons: 'persons', events_partner_venue: 'Partner Venue', events_featured: 'Featured',
  create_title: 'Create Event', create_type: 'Event Type', create_name: 'Title',
  create_name_placeholder: 'e.g. Looking for someone to grab drinks in Gangnam!',
  create_desc: 'Description (optional)', create_desc_placeholder: 'Tell people about this event',
  create_venue: 'Venue', create_venue_partner: 'Partner Venue', create_venue_custom: 'Custom Location',
  create_venue_custom_placeholder: 'e.g. OO Cafe near Gangnam Station exit 11',
  create_datetime: 'Date & Time', create_max_persons: 'Max Participants',
  create_fee: 'Fee per person (KRW, 0 for free)',
  create_fee_desc: 'Platform fee is deducted from the participation fee.',
  create_submit: 'Create Event', create_submitting: 'Creating...',
  create_premium_only: 'Premium members only',
  create_premium_desc: 'Please upgrade to Premium to create events.',
  create_premium_btn: 'Learn about Premium', create_no_venues: 'No partner venues available',
  detail_host: 'Host', detail_apply: 'Apply to Join', detail_applying: 'Processing...',
  detail_pay_apply: 'Pay & Apply', detail_my_status: 'Application Status',
  detail_pending: 'Pending', detail_approved: 'Approved', detail_rejected: 'Rejected', detail_cancelled: 'Cancelled',
  detail_participants: 'Applicants', detail_no_participants: 'No applicants yet',
  detail_approve: 'Approve', detail_reject: 'Reject', detail_back_list: 'Back to list',
  detail_partner_discount: 'Partner discount price',
  share_title: 'Share & Promote', share_copy: 'Copy Text', share_copied: 'Copied!', share_text_label: 'Promo Text',
  share_kakao: 'KakaoTalk', share_line: 'LINE', share_twitter: 'X (Twitter)', share_facebook: 'Facebook',
  share_wechat: 'WeChat Share', share_wechat_copy: 'Copy Link (WeChat)', share_instagram: 'Copy for Instagram',
  share_generating: 'Generating promo text...', share_boost: 'Featured Boost',
  share_boost_desc: 'Pin your event to the top of the list (24 hours)', share_boost_btn: 'Get Boost',
  share_featured_badge: 'Featured',
  payment_success: 'Payment Completed', payment_success_desc: 'Your application has been approved.',
  payment_fail: 'Payment Cancelled', payment_fail_desc: 'Payment was not completed.',
  payment_back: 'Back to Event', payment_confirming: 'Confirming payment...',
  detail_apply_failed: 'Application failed. Please try again.', detail_payment_module_failed: 'Payment module failed to load. Please refresh and try again.', detail_payment_failed: 'Payment failed. Please try again.',
  'error.generic': 'Something went wrong.', 'error.network': 'Network error. Please check your connection.', 'error.retry': 'Try Again', 'error.go_home': 'Go Home',
  'auth.email_label': 'Email', 'auth.password_label': 'Password', 'auth.login_title': 'Welcome Back',
  'auth.have_account': 'Already have an account?', 'auth.no_account': "Don't have an account?",
  'auth.login_button': 'Log In', 'auth.login_loading': 'Logging in...', 'auth.forgot_password': 'Forgot password?',
  'auth.or_social': 'Or continue with', 'auth.signup_link': 'Sign Up',
  'auth.error_empty_fields': 'Please enter your email and password.', 'auth.error_invalid_credentials': 'Invalid email or password.',
  'auth.error_email_not_confirmed': 'Please confirm your email address.', 'auth.error_login_failed': 'Login failed.',
  'auth.error_login_error': 'An error occurred during login.', 'auth.error_social_failed': 'Social login failed.',
  'auth.error_social_error': 'An error occurred during social login.',
  'signup.step_account': 'Account', 'signup.step_personal': 'Personal Info', 'signup.step_profile': 'Profile',
  'signup.label_email': 'Email', 'signup.label_password': 'Password', 'signup.label_confirm_password': 'Confirm Password',
  'signup.confirm_password': 'Re-enter your password', 'signup.password_placeholder': 'At least 8 characters',
  'signup.password_strength': 'Password strength:', 'signup.strength_weak': 'Weak', 'signup.strength_fair': 'Fair',
  'signup.strength_strong': 'Strong', 'signup.strength_very_strong': 'Very Strong',
  'signup.terms_agree': 'I agree to the', 'signup.terms_link': 'Terms of Service', 'signup.terms_and': 'and',
  'signup.privacy_link': 'Privacy Policy', 'signup.next_step': 'Next',
  'signup.label_name': 'Name', 'signup.name_placeholder': 'Enter your real name',
  'signup.label_gender': 'Gender', 'signup.label_gender_female': 'Female', 'signup.label_gender_male': 'Male',
  'signup.label_birthdate': 'Date of Birth', 'signup.label_birthdate_hint': 'You must be at least 18 years old.',
  'signup.label_country': 'Country', 'signup.label_country_placeholder': 'Select your country',
  'signup.previous': 'Previous', 'signup.next': 'Next',
  'signup.label_photo': 'Profile Photo', 'signup.label_photo_optional': '(optional)',
  'signup.label_bio': 'Bio', 'signup.label_bio_optional': '(optional)',
  'signup.bio_placeholder': 'Tell us a little about yourself',
  'signup.label_interests': 'Interests', 'signup.label_interests_max': '(up to 5)',
  'signup.submit': 'Create Account', 'signup.submitting': 'Processing...',
  'signup.already_account': 'Already have an account?', 'signup.login_link': 'Log In',
  'signup.err_email_required': 'Email is required.', 'signup.err_email_invalid': 'Please enter a valid email address.',
  'signup.err_password_required': 'Password is required.', 'signup.err_password_short': 'Password must be at least 8 characters.',
  'signup.err_password_weak': 'Please choose a stronger password.', 'signup.err_password_mismatch': 'Passwords do not match.',
  'signup.err_terms': 'Please agree to the terms.', 'signup.err_name_required': 'Name is required.',
  'signup.err_birthdate_required': 'You must be at least 18 years old.', 'signup.err_country_required': 'Please select your country.',
  'signup.err_duplicate': 'An account with this email already exists.', 'signup.err_generic': 'An error occurred. Please try again.',
  'signup.err_server': 'Server error. Please try again later.',
  'discover.matching_tab': 'Matching', 'discover.services_tab': 'Services',
  "discover.all_seen": "You've seen everyone!", 'discover.check_later': 'New profiles are added regularly. Check back soon!',
  'discover.reload': 'Reload', 'discover.swipe_hint': 'Swipe right to like, left to pass',
  'discover.all_categories': 'All', 'discover.empty_services': 'No services found',
  "discover.match_success": "It's a Match!", 'discover.match_message': 'likes you back!', 'discover.keep_exploring': 'Keep Exploring',
  'book.slot_taken': 'This time slot is already taken.', 'book.success_title': 'Booking Confirmed!', 'book.success_body': 'Your booking has been confirmed.',
  'book.back_to_profile': 'Back to Profile', 'book.loading': 'Loading available slots...',
  'book.select_datetime': 'Select Date & Time', 'book.available_days': 'Available days',
  'book.date': 'Date', 'book.time': 'Time', 'book.notes': 'Notes (optional)', 'book.notes_placeholder': 'Any special requests...',
  'book.submitting': 'Booking...', 'book.confirm': 'Confirm Booking', 'book.cancel': 'Cancel',
  'services.duration_min': '{n} min', 'services.inactive': 'This service is currently unavailable.',
  'services.book_now': 'Book Now', 'services.login_to_book': 'Log In to Book',
  'services.host_info': 'About the Host', 'services.view_host': 'View full profile', 'services.reviews_title': 'Recent Reviews',
  'profile.host_since': 'Host', 'profile.book_now': 'Book', 'profile.reviews': 'Reviews',
  'profile.send_message': 'Send Message',
  'review.empty': 'No reviews yet', 'review.comment': 'Comment', 'review.error': 'Failed to submit review.',
  'review.rating': 'Rating', 'review.submit': 'Submit Review', 'review.success': 'Review submitted!', 'review.write': 'Write a Review',
  'bookings.title': 'My Bookings', 'bookings.tab_upcoming': 'Upcoming', 'bookings.tab_completed': 'Completed', 'bookings.tab_cancelled': 'Cancelled',
  'bookings.empty': 'No bookings yet', 'bookings.load_error': 'Failed to load bookings.',
  'bookings.load_more': 'Load more', 'bookings.status_pending': 'Pending', 'bookings.status_confirmed': 'Confirmed',
  'bookings.status_completed': 'Completed', 'bookings.status_cancelled': 'Cancelled',
  'bookings.review_btn': 'Write Review', 'bookings.cancel_btn': 'Cancel Booking', 'bookings.cancel_confirm': 'Cancel this booking?',
  'bookings.cancel_error': 'Failed to cancel.',
  'host.dashboard_title': 'Host Dashboard', 'host.services_title': 'My Services', 'host.services_desc': 'Manage your services',
  'host.services_add': 'Add Service', 'host.services_empty': 'No services yet', 'host.services_edit': 'Edit',
  'host.services_deactivate': 'Deactivate', 'host.services_deactivate_confirm': 'Deactivate this service?',
  'host.services_inactive': 'Inactive', 'host.services_save': 'Save',
  'host.services_field_title': 'Title', 'host.services_field_desc': 'Description', 'host.services_field_price': 'Price',
  'host.services_field_currency': 'Currency', 'host.services_field_duration': 'Duration (min)', 'host.services_field_category': 'Category',
  'host.bookings_title': 'Bookings', 'host.bookings_desc': 'Manage your bookings',
  'host.bookings.empty': 'No bookings', 'host.bookings.load_error': 'Failed to load', 'host.bookings.load_more': 'Load more',
  'host.bookings.user_info': 'Client', 'host.bookings.notes': 'Notes', 'host.bookings.confirm_btn': 'Confirm',
  'host.bookings.complete_btn': 'Mark Complete', 'host.bookings.cancel_btn': 'Cancel', 'host.bookings.status_error': 'Failed to update status',
  'availability.title': 'Availability', 'availability.add_slot': 'Add Slot', 'availability.empty': 'No availability set',
  'availability.no_slots': 'No slots', 'availability.day_of_week': 'Day', 'availability.start_time': 'Start Time',
  'availability.end_time': 'End Time', 'availability.timezone': 'Timezone', 'availability.toggle_on': 'Set Available',
  'availability.toggle_off': 'Set Unavailable', 'availability.inactive_badge': 'Inactive', 'availability.delete': 'Delete',
  'availability.save_success': 'Saved!', 'availability.save_error': 'Failed to save.',
  'commission.earnings_title': 'Earnings', 'commission.total_completed': 'Total Completed', 'commission.platform_fee': 'Platform Fee',
  'notification.new_booking.title': 'New Booking Received', 'notification.new_booking.body': 'Booking #{booking_id} has been submitted.',
  'notification.confirmed.title': 'Booking Confirmed', 'notification.confirmed.body': 'Booking #{booking_id} has been confirmed.',
  'notification.cancelled.title': 'Booking Cancelled', 'notification.cancelled.body': 'Booking #{booking_id} has been cancelled.',
}

const zh: TranslationKeys = {
  loading: '加载中...', error: '发生错误', back: '返回', save: '保存', cancel: '取消',
  confirm: '确认', close: '关闭', next: '下一步', free: '免费',
  error_not_found: '找不到页面', error_generic: '发生错误。', error_go_home: '返回首页',
  nav_home: '首页', nav_explore: '探索', nav_events: '活动', nav_match: '匹配', nav_profile: '个人',
  events_title: '线下活动', events_all: '全部', events_drink: '喝酒伙伴', events_meal: '吃饭伙伴',
  events_party: '派对招募', events_create: '创建活动', events_empty: '暂无招募中的活动',
  events_empty_sub: '快来创建新活动吧！', events_full: '已满', events_closed: '已结束',
  events_free: '免费', events_persons: '人', events_partner_venue: '合作场所', events_featured: '推荐',
  create_title: '创建活动', create_type: '活动类型', create_name: '标题',
  create_name_placeholder: '例: 在江南区想找人一起喝酒的来！',
  create_desc: '描述（选填）', create_desc_placeholder: '请填写活动描述',
  create_venue: '活动地点', create_venue_partner: '合作场所', create_venue_custom: '自定义地点',
  create_venue_custom_placeholder: '例: 江南站11号出口OO咖啡馆',
  create_datetime: '活动时间', create_max_persons: '招募人数',
  create_fee: '参加费（韩元，0为免费）',
  create_fee_desc: '参加费扣除平台手续费后结算给主办方。',
  create_submit: '创建活动', create_submitting: '创建中...',
  create_premium_only: '仅限付费会员',
  create_premium_desc: '请升级至高级会员后创建活动。',
  create_premium_btn: '了解高级会员', create_no_venues: '暂无可用合作场所',
  detail_host: '主办人', detail_apply: '申请参加', detail_applying: '处理中...',
  detail_pay_apply: '韩元 付款并申请', detail_my_status: '申请状态',
  detail_pending: '待审核', detail_approved: '已通过', detail_rejected: '已拒绝', detail_cancelled: '已取消',
  detail_participants: '参加申请', detail_no_participants: '暂无申请者',
  detail_approve: '通过', detail_reject: '拒绝', detail_back_list: '返回列表',
  detail_partner_discount: '合作优惠价',
  share_title: 'SNS 推广', share_copy: '复制文字', share_copied: '已复制！', share_text_label: '推广文案',
  share_kakao: 'KakaoTalk', share_line: 'LINE', share_twitter: 'X（推特）', share_facebook: 'Facebook',
  share_wechat: '微信分享', share_wechat_copy: '复制链接（微信）', share_instagram: '复制到Instagram',
  share_generating: '推广文案生成中...', share_boost: '置顶推广',
  share_boost_desc: '将您的活动置顶显示（24小时）', share_boost_btn: '申请置顶',
  share_featured_badge: '推荐',
  payment_success: '付款成功', payment_success_desc: '您的申请已获批准。',
  payment_fail: '付款已取消', payment_fail_desc: '付款未完成。',
  payment_back: '返回活动', payment_confirming: '确认付款中...',
  detail_apply_failed: '申请失败，请重试。', detail_payment_module_failed: '支付模块加载失败，请刷新页面后重试。', detail_payment_failed: '付款失败，请重试。',
  'error.generic': '发生错误。', 'error.network': '网络错误，请检查连接。', 'error.retry': '重试', 'error.go_home': '返回首页',
  'auth.email_label': '邮箱', 'auth.password_label': '密码', 'auth.login_title': '欢迎回来',
  'auth.have_account': '已有账号？', 'auth.no_account': '没有账号？',
  'auth.login_button': '登录', 'auth.login_loading': '登录中...', 'auth.forgot_password': '忘记密码？',
  'auth.or_social': '或通过社交账号继续', 'auth.signup_link': '注册',
  'auth.error_empty_fields': '请输入邮箱和密码。', 'auth.error_invalid_credentials': '邮箱或密码不正确。',
  'auth.error_email_not_confirmed': '请验证您的邮箱。', 'auth.error_login_failed': '登录失败。',
  'auth.error_login_error': '登录时发生错误。', 'auth.error_social_failed': '社交登录失败。',
  'auth.error_social_error': '社交登录时发生错误。',
  'signup.step_account': '账号信息', 'signup.step_personal': '个人信息', 'signup.step_profile': '个人资料',
  'signup.label_email': '邮箱', 'signup.label_password': '密码', 'signup.label_confirm_password': '确认密码',
  'signup.confirm_password': '再次输入密码', 'signup.password_placeholder': '至少8个字符',
  'signup.password_strength': '密码强度：', 'signup.strength_weak': '弱', 'signup.strength_fair': '一般',
  'signup.strength_strong': '强', 'signup.strength_very_strong': '非常强',
  'signup.terms_agree': '我同意', 'signup.terms_link': '服务条款', 'signup.terms_and': '和',
  'signup.privacy_link': '隐私政策', 'signup.next_step': '下一步',
  'signup.label_name': '姓名', 'signup.name_placeholder': '请输入真实姓名',
  'signup.label_gender': '性别', 'signup.label_gender_female': '女', 'signup.label_gender_male': '男',
  'signup.label_birthdate': '出生日期', 'signup.label_birthdate_hint': '必须年满18岁。',
  'signup.label_country': '国家', 'signup.label_country_placeholder': '请选择国家',
  'signup.previous': '上一步', 'signup.next': '下一步',
  'signup.label_photo': '头像', 'signup.label_photo_optional': '（可选）',
  'signup.label_bio': '自我介绍', 'signup.label_bio_optional': '（可选）',
  'signup.bio_placeholder': '简单介绍一下自己',
  'signup.label_interests': '兴趣爱好', 'signup.label_interests_max': '（最多5个）',
  'signup.submit': '完成注册', 'signup.submitting': '处理中...',
  'signup.already_account': '已有账号？', 'signup.login_link': '登录',
  'signup.err_email_required': '请输入邮箱。', 'signup.err_email_invalid': '请输入有效的邮箱地址。',
  'signup.err_password_required': '请输入密码。', 'signup.err_password_short': '密码至少8个字符。',
  'signup.err_password_weak': '请选择更强的密码。', 'signup.err_password_mismatch': '两次密码不一致。',
  'signup.err_terms': '请同意服务条款。', 'signup.err_name_required': '请输入姓名。',
  'signup.err_birthdate_required': '必须年满18岁。', 'signup.err_country_required': '请选择国家。',
  'signup.err_duplicate': '该邮箱已被使用。', 'signup.err_generic': '发生错误，请重试。',
  'signup.err_server': '服务器错误，请稍后重试。',
  'discover.matching_tab': '匹配', 'discover.services_tab': '服务',
  'discover.all_seen': '您已看过所有人！', 'discover.check_later': '新用户会定期加入，请稍后再来看看！',
  'discover.reload': '刷新', 'discover.swipe_hint': '向右滑动表示喜欢，向左表示跳过',
  'discover.all_categories': '全部', 'discover.empty_services': '未找到服务',
  'discover.match_success': '配对成功！', 'discover.match_message': '也喜欢您！', 'discover.keep_exploring': '继续探索',
  'book.slot_taken': '该时间段已被预约。', 'book.success_title': '预约成功！', 'book.success_body': '您的预约已确认。',
  'book.back_to_profile': '返回个人资料', 'book.loading': '加载可预约时间...',
  'book.select_datetime': '选择日期和时间', 'book.available_days': '可预约日期',
  'book.date': '日期', 'book.time': '时间', 'book.notes': '备注（可选）', 'book.notes_placeholder': '特殊要求...',
  'book.submitting': '预约中...', 'book.confirm': '确认预约', 'book.cancel': '取消',
  'services.duration_min': '{n}分钟', 'services.inactive': '此服务暂时不可用。',
  'services.book_now': '立即预约', 'services.login_to_book': '登录后预约',
  'services.host_info': '关于主办人', 'services.view_host': '查看完整资料', 'services.reviews_title': '最近评价',
  'profile.host_since': '主办人', 'profile.book_now': '预约', 'profile.reviews': '评价',
  'profile.send_message': '发送消息',
  'review.empty': '暂无评价', 'review.comment': '评论', 'review.error': '提交评价失败。',
  'review.rating': '评分', 'review.submit': '提交评价', 'review.success': '评价已提交！', 'review.write': '写评价',
  'bookings.title': '我的预约', 'bookings.tab_upcoming': '即将到来', 'bookings.tab_completed': '已完成', 'bookings.tab_cancelled': '已取消',
  'bookings.empty': '暂无预约', 'bookings.load_error': '加载预约失败。',
  'bookings.load_more': '加载更多', 'bookings.status_pending': '待处理', 'bookings.status_confirmed': '已确认',
  'bookings.status_completed': '已完成', 'bookings.status_cancelled': '已取消',
  'bookings.review_btn': '写评价', 'bookings.cancel_btn': '取消预约', 'bookings.cancel_confirm': '取消此预约？',
  'bookings.cancel_error': '取消失败。',
  'host.dashboard_title': '主办人控制台', 'host.services_title': '我的服务', 'host.services_desc': '管理您的服务',
  'host.services_add': '添加服务', 'host.services_empty': '暂无服务', 'host.services_edit': '编辑',
  'host.services_deactivate': '停用', 'host.services_deactivate_confirm': '停用此服务？',
  'host.services_inactive': '已停用', 'host.services_save': '保存',
  'host.services_field_title': '标题', 'host.services_field_desc': '描述', 'host.services_field_price': '价格',
  'host.services_field_currency': '货币', 'host.services_field_duration': '时长（分钟）', 'host.services_field_category': '类别',
  'host.bookings_title': '预约管理', 'host.bookings_desc': '管理您的预约',
  'host.bookings.empty': '暂无预约', 'host.bookings.load_error': '加载失败', 'host.bookings.load_more': '加载更多',
  'host.bookings.user_info': '客户', 'host.bookings.notes': '备注', 'host.bookings.confirm_btn': '确认',
  'host.bookings.complete_btn': '标记完成', 'host.bookings.cancel_btn': '取消', 'host.bookings.status_error': '状态更新失败',
  'availability.title': '可预约时间', 'availability.add_slot': '添加时段', 'availability.empty': '未设置可预约时间',
  'availability.no_slots': '无时段', 'availability.day_of_week': '星期', 'availability.start_time': '开始时间',
  'availability.end_time': '结束时间', 'availability.timezone': '时区', 'availability.toggle_on': '设为可预约',
  'availability.toggle_off': '设为不可预约', 'availability.inactive_badge': '已停用', 'availability.delete': '删除',
  'availability.save_success': '已保存！', 'availability.save_error': '保存失败。',
  'commission.earnings_title': '收益', 'commission.total_completed': '完成总计', 'commission.platform_fee': '平台手续费',
  'notification.new_booking.title': '收到新预约', 'notification.new_booking.body': '预约 #{booking_id} 已提交。',
  'notification.confirmed.title': '预约已确认', 'notification.confirmed.body': '预约 #{booking_id} 已确认。',
  'notification.cancelled.title': '预约已取消', 'notification.cancelled.body': '预约 #{booking_id} 已取消。',
}

const ja: TranslationKeys = {
  loading: '読み込み中...', error: 'エラーが発生しました', back: '戻る', save: '保存', cancel: 'キャンセル',
  confirm: '確認', close: '閉じる', next: '次へ', free: '無料',
  error_not_found: 'ページが見つかりません', error_generic: 'エラーが発生しました。', error_go_home: 'ホームへ戻る',
  nav_home: 'ホーム', nav_explore: '探索', nav_events: 'イベント', nav_match: 'マッチング', nav_profile: 'プロフィール',
  events_title: 'オフラインイベント', events_all: 'すべて', events_drink: '飲み友達', events_meal: 'ご飯友達',
  events_party: 'パーティー募集', events_create: 'イベント作成', events_empty: '現在募集中のイベントはありません',
  events_empty_sub: '新しいイベントを作成しましょう！', events_full: '満員', events_closed: '終了',
  events_free: '無料', events_persons: '名', events_partner_venue: '提携店舗', events_featured: 'おすすめ',
  create_title: 'イベント作成', create_type: 'イベント種類', create_name: 'タイトル',
  create_name_placeholder: '例）江南で気軽に一杯やりませんか！',
  create_desc: '説明（任意）', create_desc_placeholder: 'イベントの説明を書いてください',
  create_venue: '会場', create_venue_partner: '提携店舗', create_venue_custom: '自由入力',
  create_venue_custom_placeholder: '例）江南駅11番出口〇〇カフェ',
  create_datetime: '開催日時', create_max_persons: '募集人数',
  create_fee: '参加費（ウォン、無料は0）',
  create_fee_desc: '参加費からプラットフォーム手数料を差し引いた金額がホストに支払われます。',
  create_submit: 'イベントを作成', create_submitting: '作成中...',
  create_premium_only: '有料会員のみ利用可能',
  create_premium_desc: 'イベント作成はプレミアム会員登録後にご利用いただけます。',
  create_premium_btn: 'プレミアムを見る', create_no_venues: '利用可能な提携店舗がありません',
  detail_host: 'ホスト', detail_apply: '参加申し込み', detail_applying: '処理中...',
  detail_pay_apply: 'ウォン 支払って申し込む', detail_my_status: '申し込み状況',
  detail_pending: '審査待ち', detail_approved: '承認済み', detail_rejected: '却下', detail_cancelled: 'キャンセル',
  detail_participants: '参加申し込み', detail_no_participants: 'まだ申し込みがありません',
  detail_approve: '承認', detail_reject: '却下', detail_back_list: 'リストに戻る',
  detail_partner_discount: '提携割引価格',
  share_title: 'SNSでシェア・宣伝', share_copy: 'テキストをコピー', share_copied: 'コピーしました！',
  share_text_label: '宣伝文', share_kakao: 'KakaoTalk', share_line: 'LINE',
  share_twitter: 'X（ツイッター）', share_facebook: 'Facebook',
  share_wechat: 'WeChat シェア', share_wechat_copy: 'リンクをコピー（WeChat）',
  share_instagram: 'Instagramにコピー', share_generating: '宣伝文を生成中...',
  share_boost: '上位表示ブースト', share_boost_desc: 'イベントをリスト最上位に表示します（24時間）',
  share_boost_btn: 'ブーストを申し込む', share_featured_badge: 'おすすめ',
  payment_success: '決済が完了しました', payment_success_desc: '参加申し込みが承認されました。',
  payment_fail: '決済がキャンセルされました', payment_fail_desc: '決済は完了しませんでした。',
  payment_back: 'イベントに戻る', payment_confirming: '決済を確認しています...',
  detail_apply_failed: '申し込みに失敗しました。もう一度お試しください。', detail_payment_module_failed: '決済モジュールの読み込みに失敗しました。ページを更新して再度お試しください。', detail_payment_failed: '決済に失敗しました。もう一度お試しください。',
  'error.generic': 'エラーが発生しました。', 'error.network': 'ネットワークエラーが発生しました。', 'error.retry': 'やり直す', 'error.go_home': 'ホームへ',
  'auth.email_label': 'メールアドレス', 'auth.password_label': 'パスワード', 'auth.login_title': 'おかえりなさい',
  'auth.have_account': 'すでにアカウントをお持ちですか？', 'auth.no_account': 'アカウントをお持ちでないですか？',
  'auth.login_button': 'ログイン', 'auth.login_loading': 'ログイン中...', 'auth.forgot_password': 'パスワードをお忘れですか？',
  'auth.or_social': 'またはソーシャルアカウントで続ける', 'auth.signup_link': '新規登録',
  'auth.error_empty_fields': 'メールアドレスとパスワードを入力してください。', 'auth.error_invalid_credentials': 'メールアドレスまたはパスワードが正しくありません。',
  'auth.error_email_not_confirmed': 'メールアドレスを確認してください。', 'auth.error_login_failed': 'ログインに失敗しました。',
  'auth.error_login_error': 'ログイン中にエラーが発生しました。', 'auth.error_social_failed': 'ソーシャルログインに失敗しました。',
  'auth.error_social_error': 'ソーシャルログイン中にエラーが発生しました。',
  'signup.step_account': 'アカウント情報', 'signup.step_personal': '個人情報', 'signup.step_profile': 'プロフィール',
  'signup.label_email': 'メールアドレス', 'signup.label_password': 'パスワード', 'signup.label_confirm_password': 'パスワード確認',
  'signup.confirm_password': 'パスワードを再入力', 'signup.password_placeholder': '8文字以上で入力',
  'signup.password_strength': 'パスワード強度：', 'signup.strength_weak': '弱い', 'signup.strength_fair': '普通',
  'signup.strength_strong': '強い', 'signup.strength_very_strong': 'とても強い',
  'signup.terms_agree': 'に同意します', 'signup.terms_link': '利用規約', 'signup.terms_and': 'および',
  'signup.privacy_link': 'プライバシーポリシー', 'signup.next_step': '次へ',
  'signup.label_name': '氏名', 'signup.name_placeholder': '本名を入力してください',
  'signup.label_gender': '性別', 'signup.label_gender_female': '女性', 'signup.label_gender_male': '男性',
  'signup.label_birthdate': '生年月日', 'signup.label_birthdate_hint': '18歳以上の方のみご登録いただけます。',
  'signup.label_country': '国', 'signup.label_country_placeholder': '国を選択してください',
  'signup.previous': '戻る', 'signup.next': '次へ',
  'signup.label_photo': 'プロフィール写真', 'signup.label_photo_optional': '（任意）',
  'signup.label_bio': '自己紹介', 'signup.label_bio_optional': '（任意）',
  'signup.bio_placeholder': '簡単に自己紹介してください',
  'signup.label_interests': '興味・関心', 'signup.label_interests_max': '（最大5個）',
  'signup.submit': 'アカウント作成', 'signup.submitting': '処理中...',
  'signup.already_account': 'すでにアカウントをお持ちですか？', 'signup.login_link': 'ログイン',
  'signup.err_email_required': 'メールアドレスを入力してください。', 'signup.err_email_invalid': '有効なメールアドレスを入力してください。',
  'signup.err_password_required': 'パスワードを入力してください。', 'signup.err_password_short': 'パスワードは8文字以上必要です。',
  'signup.err_password_weak': 'より強いパスワードを選択してください。', 'signup.err_password_mismatch': 'パスワードが一致しません。',
  'signup.err_terms': '利用規約に同意してください。', 'signup.err_name_required': '氏名を入力してください。',
  'signup.err_birthdate_required': '18歳以上である必要があります。', 'signup.err_country_required': '国を選択してください。',
  'signup.err_duplicate': 'このメールアドレスは既に使用されています。', 'signup.err_generic': 'エラーが発生しました。もう一度お試しください。',
  'signup.err_server': 'サーバーエラーが発生しました。',
  'discover.matching_tab': 'マッチング', 'discover.services_tab': 'サービス',
  'discover.all_seen': '全員のプロフィールを見ました！', 'discover.check_later': '新しいプロフィールが定期的に追加されます。後でまた確認してください！',
  'discover.reload': '更新', 'discover.swipe_hint': '右スワイプでいいね、左スワイプでパス',
  'discover.all_categories': 'すべて', 'discover.empty_services': 'サービスが見つかりません',
  'discover.match_success': 'マッチング成功！', 'discover.match_message': 'もあなたを気に入っています！', 'discover.keep_exploring': '探索を続ける',
  'book.slot_taken': 'この時間帯はすでに予約済みです。', 'book.success_title': '予約完了！', 'book.success_body': '予約が確定しました。',
  'book.back_to_profile': 'プロフィールに戻る', 'book.loading': '予約可能な時間を読み込み中...',
  'book.select_datetime': '日時を選択', 'book.available_days': '予約可能な曜日',
  'book.date': '日付', 'book.time': '時間', 'book.notes': 'メモ（任意）', 'book.notes_placeholder': '特別なご要望...',
  'book.submitting': '予約中...', 'book.confirm': '予約を確定', 'book.cancel': 'キャンセル',
  'services.duration_min': '{n}分', 'services.inactive': 'このサービスは現在利用できません。',
  'services.book_now': '今すぐ予約', 'services.login_to_book': 'ログインして予約',
  'services.host_info': 'ホストについて', 'services.view_host': 'プロフィールを見る', 'services.reviews_title': '最近のレビュー',
  'profile.host_since': 'ホスト', 'profile.book_now': '予約', 'profile.reviews': 'レビュー',
  'profile.send_message': 'メッセージを送る',
  'review.empty': 'まだレビューがありません', 'review.comment': 'コメント', 'review.error': 'レビューの送信に失敗しました。',
  'review.rating': '評価', 'review.submit': 'レビューを送信', 'review.success': 'レビューを送信しました！', 'review.write': 'レビューを書く',
  'bookings.title': '予約一覧', 'bookings.tab_upcoming': '予定', 'bookings.tab_completed': '完了', 'bookings.tab_cancelled': 'キャンセル',
  'bookings.empty': '予約はありません', 'bookings.load_error': '予約の読み込みに失敗しました。',
  'bookings.load_more': 'もっと見る', 'bookings.status_pending': '保留中', 'bookings.status_confirmed': '確定済み',
  'bookings.status_completed': '完了', 'bookings.status_cancelled': 'キャンセル済み',
  'bookings.review_btn': 'レビューを書く', 'bookings.cancel_btn': '予約をキャンセル', 'bookings.cancel_confirm': 'この予約をキャンセルしますか？',
  'bookings.cancel_error': 'キャンセルに失敗しました。',
  'host.dashboard_title': 'ホストダッシュボード', 'host.services_title': 'マイサービス', 'host.services_desc': 'サービスを管理する',
  'host.services_add': 'サービスを追加', 'host.services_empty': 'まだサービスがありません', 'host.services_edit': '編集',
  'host.services_deactivate': '無効化', 'host.services_deactivate_confirm': 'このサービスを無効化しますか？',
  'host.services_inactive': '無効', 'host.services_save': '保存',
  'host.services_field_title': 'タイトル', 'host.services_field_desc': '説明', 'host.services_field_price': '価格',
  'host.services_field_currency': '通貨', 'host.services_field_duration': '時間（分）', 'host.services_field_category': 'カテゴリ',
  'host.bookings_title': '予約管理', 'host.bookings_desc': '予約を管理する',
  'host.bookings.empty': '予約はありません', 'host.bookings.load_error': '読み込み失敗', 'host.bookings.load_more': 'もっと見る',
  'host.bookings.user_info': 'お客様', 'host.bookings.notes': 'メモ', 'host.bookings.confirm_btn': '確定',
  'host.bookings.complete_btn': '完了にする', 'host.bookings.cancel_btn': 'キャンセル', 'host.bookings.status_error': 'ステータス更新に失敗しました',
  'availability.title': '予約可能時間', 'availability.add_slot': 'スロットを追加', 'availability.empty': '予約可能時間が設定されていません',
  'availability.no_slots': 'スロットなし', 'availability.day_of_week': '曜日', 'availability.start_time': '開始時間',
  'availability.end_time': '終了時間', 'availability.timezone': 'タイムゾーン', 'availability.toggle_on': '予約可能に設定',
  'availability.toggle_off': '予約不可に設定', 'availability.inactive_badge': '無効', 'availability.delete': '削除',
  'availability.save_success': '保存しました！', 'availability.save_error': '保存に失敗しました。',
  'commission.earnings_title': '収益', 'commission.total_completed': '完了合計', 'commission.platform_fee': 'プラットフォーム手数料',
  'notification.new_booking.title': '新しい予約が届きました', 'notification.new_booking.body': '予約 #{booking_id} が受付されました。',
  'notification.confirmed.title': '予約が確定しました', 'notification.confirmed.body': '予約 #{booking_id} が確定されました。',
  'notification.cancelled.title': '予約がキャンセルされました', 'notification.cancelled.body': '予約 #{booking_id} がキャンセルされました。',
}

export const translations: Record<Locale, TranslationKeys> = { ko, en, zh, ja }

const LOCALES: readonly string[] = ['ko', 'en', 'zh', 'ja']

export function t(localeOrKey: string, keyOrLocale: string, vars?: Record<string, string>): string {
  let locale: Locale
  let key: keyof TranslationKeys
  if (LOCALES.includes(localeOrKey)) {
    locale = localeOrKey as Locale
    key = keyOrLocale as keyof TranslationKeys
  } else {
    locale = keyOrLocale as Locale
    key = localeOrKey as keyof TranslationKeys
  }
  const dict = translations[locale] ?? translations.ko
  let result = (dict[key] ?? translations.ko[key] ?? key) as string
  if (vars) {
    result = result.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`)
  }
  return result
}

export function detectLangFromHeader(acceptLanguage: string): Locale {
  const primary = acceptLanguage.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? ''
  if (primary.startsWith('ko')) return 'ko'
  if (primary.startsWith('zh')) return 'zh'
  if (primary.startsWith('ja')) return 'ja'
  return 'en'
}

export type Lang = Locale

export function normalizeLang(lang: string | null | undefined): Lang {
  if (!lang) return 'en'
  const l = lang.toLowerCase()
  if (l.startsWith('ko')) return 'ko'
  if (l.startsWith('zh')) return 'zh'
  if (l.startsWith('ja')) return 'ja'
  return 'en'
}
