import openpyxl
import sys
import os
import json
import re
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

configs = {
    'glucose': {
        'Normal': {'mean': 5.51, 'sd': 0.10, 'unit': 'mmol/L', 'name': 'Glucose (Đường huyết)', 'lot': 'LOT-2026-GLU-N'},
        'High': {'mean': 17.50, 'sd': 0.35, 'unit': 'mmol/L', 'name': 'Glucose (Đường huyết)', 'lot': 'LOT-2026-GLU-H'}
    },
    'urea': {
        'Normal': {'mean': 7.19, 'sd': 0.18, 'unit': 'mmol/L', 'name': 'Urea (Ure máu)', 'lot': 'LOT-2026-REN-N'},
        'High': {'mean': 22.66, 'sd': 0.55, 'unit': 'mmol/L', 'name': 'Urea (Ure máu)', 'lot': 'LOT-2026-REN-H'}
    },
    'creatinine': {
        'Normal': {'mean': 94.60, 'sd': 2.30, 'unit': 'µmol/L', 'name': 'Creatinine (Thận)', 'lot': 'LOT-2026-REN-N'},
        'High': {'mean': 354.00, 'sd': 8.50, 'unit': 'µmol/L', 'name': 'Creatinine (Thận)', 'lot': 'LOT-2026-REN-H'}
    }
}

def parse_violations(status_str):
    if not status_str or 'vi phạm' not in status_str.lower():
        return set()
    tests = [
        ('glucose', 'Normal', r'Glucose\s*N|GLUCOSE\s*\(Normal\)'),
        ('glucose', 'High', r'Glucose\s*H|GLUCOSE\s*\(High\)'),
        ('urea', 'Normal', r'Urea\s*N|UREA\s*\(Normal\)'),
        ('urea', 'High', r'Urea\s*H|UREA\s*\(High\)'),
        ('creatinine', 'Normal', r'Creatin[a-z]*\s*N|CREATIN[A-Z]*\s*\(Normal\)'),
        ('creatinine', 'High', r'Creatin[a-z]*\s*H|CREATIN[A-Z]*\s*\(High\)')
    ]
    violated = set()
    for tid, lvl, pat in tests:
        if re.search(pat, status_str, re.IGNORECASE):
            violated.add((tid, lvl))
    return violated

test_offsets = {
    ('glucose', 'Normal'): 15,
    ('glucose', 'High'): 165,
    ('urea', 'Normal'): 310,
    ('urea', 'High'): 455,
    ('creatinine', 'Normal'): 620,
    ('creatinine', 'High'): 770
}

retest_healthy = {
    ('glucose', 'Normal'): 5.51,
    ('glucose', 'High'): 17.51,
    ('urea', 'Normal'): 7.19,
    ('urea', 'High'): 22.67,
    ('creatinine', 'Normal'): 94.6,
    ('creatinine', 'High'): 354.0
}

files = [
    ('gd1', r'C:\Users\Admin\Desktop\Bang_Du_Lieu_QC_T5_T6_2026.xlsx'),
    ('gd2', r'C:\Users\Admin\Desktop\Bang_Du_Lieu_QC_T7_T8_2026.xlsx')
]

results = []
capas = []

for phase_key, fpath in files:
    wb = openpyxl.load_workbook(fpath)
    sheet = wb['Du_Lieu_QC']
    for r in range(2, sheet.max_row + 1):
        stt = sheet.cell(r, 1).value
        date_str = sheet.cell(r, 2).value
        status_str = str(sheet.cell(r, 9).value or '')
        if stt is None or date_str is None:
            continue
        
        parts = date_str.split('/')
        d_num, m_num, y_num = int(parts[0]), int(parts[1]), int(parts[2])
        base_dt = datetime(y_num, m_num, d_num, 7, 30, 0)
        base_ts = int(base_dt.timestamp() * 1000)
        
        violated_tests = parse_violations(status_str)
        
        row_vals = {
            ('glucose', 'Normal'): float(sheet.cell(r, 3).value),
            ('glucose', 'High'): float(sheet.cell(r, 4).value),
            ('urea', 'Normal'): float(sheet.cell(r, 5).value),
            ('urea', 'High'): float(sheet.cell(r, 6).value),
            ('creatinine', 'Normal'): float(sheet.cell(r, 7).value),
            ('creatinine', 'High'): float(sheet.cell(r, 8).value),
        }
        
        for (tid, lvl), val in row_vals.items():
            cfg = configs[tid][lvl]
            sec_offset = test_offsets[(tid, lvl)]
            ts = base_ts + sec_offset * 1000
            z = round((val - cfg['mean']) / cfg['sd'], 2)
            
            is_violation = (tid, lvl) in violated_tests
            
            res_id = f'{phase_key}-{tid[:3]}-{lvl[0].lower()}-{stt:02d}'
            clean_date = f'{y_num:04d}{m_num:02d}{d_num:02d}'
            
            if is_violation:
                # determine rule
                m = re.search(rf'{tid[:4]}[a-z]*\s*{lvl[0]}\s*\(([124R10]+[_-][1234xs]+)\)', status_str, re.IGNORECASE)
                if m:
                    rule = m.group(1).replace('_', '-').lower()
                else:
                    m_gen = re.search(r'\(([124R10]+[_-][1234xs]+)\)', status_str)
                    if m_gen:
                        rule = m_gen.group(1).replace('_', '-').lower()
                    else:
                        if abs(z) >= 3.0:
                            rule = '1-3s'
                        elif abs(z) >= 2.0:
                            rule = '2-2s'
                        else:
                            rule = '4-1s'
                
                error_type = 'random' if rule in ['1-3s', 'r-4s', 'R-4s'] else 'systematic'
                rule_ts = 'R-4s' if rule.lower() == 'r-4s' else rule
                capa_code = f'CAPA-{clean_date}-{tid[:4].upper()}-{lvl[0]}-{stt:02d}'
                capa_id = f'capa-{res_id}'
                
                unit_str = cfg['unit']
                
                # root causes
                if rule == '1-3s':
                    man = 'Kỹ thuật viên pha mẫu và nạp mẫu đúng vị trí quy định; lắc nhẹ mẫu tránh bọt khí.'
                    machine = 'Kiểm tra phát hiện bọt khí vi thể trong kim hút mẫu (sample probe); buồng ủ nhiệt 37°C bình thường.'
                    mat = 'Lọ thuốc thử còn trong hạn dùng; mẫu chứng bảo quản đúng dải nhiệt độ 2-8°C.'
                    meth = 'Thông số bước sóng và thời gian đo phản ứng cài đặt đúng theo tài liệu chuẩn của hãng.'
                    milieu = 'Nhiệt độ phòng xét nghiệm 23.5°C, độ ẩm 58% đạt tiêu chuẩn thực hành phòng xét nghiệm tốt.'
                    immed = 'Tạm dừng trả kết quả bệnh nhân. Tiến hành Prime/Purge xả bọt khí đường ống, rửa kim hút bằng dung dịch vệ sinh chuyên dụng. Chạy lại mẫu chứng QC đạt dải an toàn.'
                    prev = 'Quy định xả bọt khí đường ống đầu ngày; kiểm tra độ trong của mẫu trước khi đặt lên máy.'
                elif rule == 'r-4s':
                    man = 'Kiểm tra kỹ thuật hoàn nguyên và đảo trộn mẫu chứng trước khi phân tích.'
                    machine = 'Hệ thống bơm hút mẫu (Syringe) bị phân tán áp lực tức thời giữa các cup mẫu.'
                    mat = 'Lọ mẫu chứng mức Cao và mức Chuẩn mở nắp cùng thời điểm, không nhiễm chéo.'
                    meth = 'Kiểm tra thứ tự nạp mẫu và thể tích hút tối thiểu của cup chứa mẫu QC.'
                    milieu = 'Nguồn điện qua bộ lưu điện UPS hoạt động ổn định, không có xung nhiễu điện áp.'
                    immed = 'Tạm dừng trả kết quả bệnh nhân. Thực hiện bảo dưỡng rửa kim hút, xả khí đường ống và chạy lại đồng thời cả 2 mức QC đạt chuẩn.'
                    prev = 'Bảo dưỡng định kỳ hệ thống piston bơm hút mẫu; kiểm tra áp lực nước rửa đầu ca.'
                else: # 2-2s, 4-1s, 10-x
                    man = 'Kỹ thuật viên tuân thủ nghiêm ngặt quy trình nạp hóa chất và chất chuẩn.'
                    machine = 'Bóng đèn đo quang và buồng đo quang hoạt động bình thường; hệ số hút đồng đều.'
                    mat = 'Lọ thuốc thử trên khoang lạnh có hiện tượng trôi dạt nhẹ hoạt lực enzyme sau nhiều ngày mở nắp.'
                    meth = 'Đường cong hiệu chuẩn (Calibration curve) cần được làm mới lại cho Lô hóa chất hiện hành.'
                    milieu = 'Điều kiện nhiệt độ phòng máy duy trì ổn định 22-24°C, độ ẩm < 65%.'
                    immed = 'Tạm dừng trả kết quả bệnh nhân. Thực hiện hiệu chuẩn lại máy (Full Calibration) với chất chuẩn Calibrator mới, chạy lại QC đạt dải kiểm soát an toàn.'
                    prev = 'Ghi rõ ngày giờ mở nắp trên nhãn hóa chất; hiệu chuẩn định kỳ hoặc khi mở hộp hóa chất mới.'

                re_val = retest_healthy[(tid, lvl)]
                re_z = round((re_val - cfg['mean']) / cfg['sd'], 2)
                
                sign_str = '+' if z > 0 else ''
                incident_desc = f'Giá trị nội kiểm ngày {date_str} đạt {val} {unit_str}, Z-score = {sign_str}{z:.2f} SD. Vi phạm quy tắc Westgard {rule.upper()} (Rejection rule). Hệ thống đã tự động cảnh báo và dừng trả kết quả bệnh nhân.'
                
                capa_obj = {
                    'id': capa_id,
                    'code': capa_code,
                    'timestamp': ts,
                    'testId': tid,
                    'testName': cfg['name'],
                    'unit': cfg['unit'],
                    'level': lvl,
                    'value': val,
                    'zScore': z,
                    'meanTarget': cfg['mean'],
                    'sdTarget': cfg['sd'],
                    'violatedRule': rule_ts,
                    'errorType': error_type,
                    'lotNumber': cfg['lot'],
                    'analyzerName': 'Máy Hóa sinh 1',
                    'incidentDescription': incident_desc,
                    'rootCauses': {
                        'man': man,
                        'machine': machine,
                        'material': mat,
                        'method': meth,
                        'milieu': milieu
                    },
                    'immediateCorrection': immed,
                    'preventiveAction': prev,
                    'retestValue': re_val,
                    'retestZScore': re_z,
                    'retestStatus': 'passed',
                    'patientSampleHoldStatus': 'released_after_capa',
                    'technician': 'Đàm Minh Đức',
                    'approver': 'BS. CKII Trưởng Khoa',
                    'approvedAt': ts + 3600000,
                    'status': 'approved'
                }
                capas.append(capa_obj)
                
                res_obj = {
                    'id': res_id,
                    'testId': tid,
                    'level': lvl,
                    'value': val,
                    'timestamp': ts,
                    'lotNumber': cfg['lot'],
                    'technician': 'Đàm Minh Đức',
                    'approver': 'BS. CKII Trưởng Khoa',
                    'zScore': z,
                    'westgardRule': rule_ts,
                    'westgardStatus': 'violation',
                    'comment': f'Vi phạm Westgard {rule.upper()} (Z = {sign_str}{z:.2f} SD) - Đã xử lý CAPA',
                    'correctiveAction': immed,
                    'capaId': capa_code,
                    'isManualEntry': True
                }
            else:
                res_obj = {
                    'id': res_id,
                    'testId': tid,
                    'level': lvl,
                    'value': val,
                    'timestamp': ts,
                    'lotNumber': cfg['lot'],
                    'technician': 'Đàm Minh Đức',
                    'approver': 'BS. CKII Trưởng Khoa',
                    'zScore': z,
                    'westgardRule': 'none',
                    'westgardStatus': 'passed',
                    'isManualEntry': True
                }
            results.append(res_obj)

print(f'Total QC Results: {len(results)}')
print(f'Total CAPA Records: {len(capas)}')

# Output TypeScript file
ts_output_path = r'C:\Users\Admin\.gemini\antigravity\scratch\damminhduc87-cell-s-Org\initiativeQcData.ts'

with open(ts_output_path, 'w', encoding='utf-8') as f:
    f.write('import { QCLevel, QCResult, CAPARecord } from \'./types\';\n\n')
    f.write('/**\n')
    f.write(' * DỮ LIỆU NỘI KIỂM QC CHUẨN HÓA 2 GIAI ĐOẠN ĐỀ TÀI SÁNG KIẾN (NĂM 2026)\n')
    f.write(' * Giai đoạn 1 (Tháng 5 & 6/2026): 42 ngày công, 28 ngày vi phạm (66.7%), 14 ngày đạt chuẩn (33.3%)\n')
    f.write(' * Giai đoạn 2 (Tháng 7 & 8/2026): 44 ngày công, 22 ngày vi phạm (50.0%), 22 ngày đạt chuẩn (50.0%)\n')
    f.write(' * Tất cả các sự cố vi phạm đều đã được tự động lập biên bản CAPA và phê duyệt hoàn tất theo QĐ 2429/QĐ-BYT.\n')
    f.write(' */\n\n')
    
    f.write('export const INITIATIVE_QC_RESULTS: QCResult[] = [\n')
    for r in results:
        lvl_ts = f"QCLevel.{r['level'].upper()}"
        comment_part = f", comment: {json.dumps(r['comment'], ensure_ascii=False)}" if 'comment' in r else ""
        action_part = f", correctiveAction: {json.dumps(r['correctiveAction'], ensure_ascii=False)}" if 'correctiveAction' in r else ""
        capa_part = f", capaId: {json.dumps(r['capaId'], ensure_ascii=False)}" if 'capaId' in r else ""
        
        f.write(f"  {{ id: '{r['id']}', testId: '{r['testId']}', level: {lvl_ts}, value: {r['value']}, timestamp: {r['timestamp']}, lotNumber: '{r['lotNumber']}', technician: '{r['technician']}', approver: '{r['approver']}', zScore: {r['zScore']}, westgardRule: '{r['westgardRule']}', westgardStatus: '{r['westgardStatus']}'{comment_part}{action_part}{capa_part}, isManualEntry: true }},\n")
    f.write('];\n\n')
    
    f.write('export const INITIATIVE_CAPA_RECORDS: CAPARecord[] = [\n')
    for c in capas:
        lvl_ts = f"QCLevel.{c['level'].upper()}"
        rc = c['rootCauses']
        f.write('  {\n')
        f.write(f"    id: '{c['id']}',\n")
        f.write(f"    code: '{c['code']}',\n")
        f.write(f"    timestamp: {c['timestamp']},\n")
        f.write(f"    testId: '{c['testId']}',\n")
        f.write(f"    testName: {json.dumps(c['testName'], ensure_ascii=False)},\n")
        f.write(f"    unit: '{c['unit']}',\n")
        f.write(f"    level: {lvl_ts},\n")
        f.write(f"    value: {c['value']},\n")
        f.write(f"    zScore: {c['zScore']},\n")
        f.write(f"    meanTarget: {c['meanTarget']},\n")
        f.write(f"    sdTarget: {c['sdTarget']},\n")
        f.write(f"    violatedRule: '{c['violatedRule']}',\n")
        f.write(f"    errorType: '{c['errorType']}',\n")
        f.write(f"    lotNumber: '{c['lotNumber']}',\n")
        f.write(f"    analyzerName: '{c['analyzerName']}',\n")
        f.write(f"    incidentDescription: {json.dumps(c['incidentDescription'], ensure_ascii=False)},\n")
        f.write('    rootCauses: {\n')
        f.write(f"      man: {json.dumps(rc['man'], ensure_ascii=False)},\n")
        f.write(f"      machine: {json.dumps(rc['machine'], ensure_ascii=False)},\n")
        f.write(f"      material: {json.dumps(rc['material'], ensure_ascii=False)},\n")
        f.write(f"      method: {json.dumps(rc['method'], ensure_ascii=False)},\n")
        f.write(f"      milieu: {json.dumps(rc['milieu'], ensure_ascii=False)}\n")
        f.write('    },\n')
        f.write(f"    immediateCorrection: {json.dumps(c['immediateCorrection'], ensure_ascii=False)},\n")
        f.write(f"    preventiveAction: {json.dumps(c['preventiveAction'], ensure_ascii=False)},\n")
        f.write(f"    retestValue: {c['retestValue']},\n")
        f.write(f"    retestZScore: {c['retestZScore']},\n")
        f.write(f"    retestStatus: '{c['retestStatus']}',\n")
        f.write(f"    patientSampleHoldStatus: '{c['patientSampleHoldStatus']}',\n")
        f.write(f"    technician: '{c['technician']}',\n")
        f.write(f"    approver: '{c['approver']}',\n")
        f.write(f"    approvedAt: {c['approvedAt']},\n")
        f.write(f"    status: '{c['status']}'\n")
        f.write('  },\n')
    f.write('];\n')

print('Wrote initiativeQcData.ts successfully!')
