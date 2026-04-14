import { ScrollView, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '../lib/theme';

export default function Privacy() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>나솔팬즈 개인정보처리방침</Text>
      <Text style={styles.date}>시행일: 2026년 3월 28일</Text>

      <Text style={styles.heading}>1. 수집하는 개인정보 항목</Text>
      <Text style={styles.body}>
        회사는 다음의 최소 정보만 수집합니다.{'\n'}
        - 필수: 토스 유저키(CI), 닉네임, 이름, 이메일 주소, 성별, 생년월일{'\n'}
        - 자동 수집: 서비스 이용 기록, 접속 로그, 기기 정보(OS/버전){'\n\n'}
        회사는 주민등록번호, 계좌번호 등 민감정보 및 고유식별정보를 수집하지 않습니다.
      </Text>

      <Text style={styles.heading}>2. 개인정보의 수집 및 이용 목적</Text>
      <Text style={styles.body}>
        ① 회원 가입 및 관리 (토스 로그인 기반 본인 확인){'\n'}
        ② 서비스 제공 (채팅, 게시판, 투표, 랭킹, 푸시 알림){'\n'}
        ③ 이용자 보호 및 부정 이용 방지{'\n'}
        ④ 법령상 의무 이행 및 분쟁 대응
      </Text>

      <Text style={styles.heading}>3. 개인정보의 보유 및 이용 기간</Text>
      <Text style={styles.body}>
        ① 회원 탈퇴 시: 닉네임, 토스 유저키 등 개인 식별 정보를 지체 없이 파기합니다.{'\n'}
        ② 채팅 로그: 이용자 보호 및 법적 대응 목적으로 90일간 보관 후 삭제합니다.{'\n'}
        ③ 관련 법령에 따른 의무 보관 기간이 정해진 경우 해당 기간 동안 보관합니다.
      </Text>

      <Text style={styles.heading}>4. 개인정보의 제3자 제공</Text>
      <Text style={styles.body}>
        회사는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 단, 다음의 경우는 예외입니다.{'\n'}
        ① 이용자가 사전에 동의한 경우{'\n'}
        ② 법령에 따라 요구되는 경우{'\n'}
        ③ 수사기관의 적법한 영장·요청이 있는 경우
      </Text>

      <Text style={styles.heading}>5. 처리 위탁</Text>
      <Text style={styles.body}>
        회사는 서비스 운영을 위해 다음 업체에 개인정보 처리를 위탁합니다.{'\n'}
        - Supabase Inc.: 데이터베이스 및 인증 인프라{'\n'}
        - 비바리퍼블리카(토스): 로그인 및 푸시 알림 중계
      </Text>

      <Text style={styles.heading}>6. 이용자의 권리와 행사 방법</Text>
      <Text style={styles.body}>
        이용자는 언제든지 다음 권리를 행사할 수 있습니다.{'\n'}
        ① 개인정보 열람 요구{'\n'}
        ② 개인정보 정정·삭제 요구{'\n'}
        ③ 개인정보 처리 정지 요구{'\n'}
        ④ 회원 탈퇴 (앱 내 탈퇴 기능 또는 고객문의 이메일)
      </Text>

      <Text style={styles.heading}>7. 개인정보의 안전성 확보 조치</Text>
      <Text style={styles.body}>
        ① 전송 구간 암호화(HTTPS/TLS) 및 저장 데이터 암호화{'\n'}
        ② 접근 권한 최소화 및 접근 기록 관리{'\n'}
        ③ 토스 API 호출 시 mTLS 상호 인증 적용
      </Text>

      <Text style={styles.heading}>8. 포인트 및 투표에 관한 고지</Text>
      <Text style={styles.body}>
        ① 포인트는 현금 또는 현금성 자산으로 교환·환급·출금되지 않으며, 외부로 이전할 수 없습니다. 랭킹 집계 및 뱃지 등급 산정 전용으로만 사용됩니다.{'\n\n'}
        ② 투표는 무료로 참여 가능하며, 참여에 따른 금전적 보상은 일절 없습니다. 포인트 지급은 앱 내 활동 지표일 뿐이며, 사행성 요소가 없습니다.
      </Text>

      <Text style={styles.heading}>9. 개인정보 보호책임자</Text>
      <Text style={styles.body}>
        개인정보 관련 문의, 불만 처리, 피해 구제는 아래 연락처로 문의해주세요.{'\n'}
        이메일: nasolfans@gmail.com
      </Text>

      <Text style={[styles.body, { marginTop: 24 }]}>
        고객문의: nasolfans@gmail.com
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  date: { fontSize: fontSize.meta, color: colors.textSecondary, marginBottom: 24 },
  heading: { fontSize: fontSize.sectionTitle, fontWeight: '600', color: colors.textPrimary, marginTop: 24, marginBottom: 8 },
  body: { fontSize: fontSize.body, color: colors.textPrimary, lineHeight: 20 },
});
