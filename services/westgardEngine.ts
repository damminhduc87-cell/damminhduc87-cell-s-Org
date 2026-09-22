import { QCLevel, QCConfig, QCResult, WestgardEvaluation, WestgardRuleType, WestgardStatusType } from '../types';

/**
 * Thuật toán Đa quy tắc Westgard (Westgard Multirule Algorithm) chuẩn y khoa
 * Áp dụng cho kiểm soát chất lượng nội kiểm phòng xét nghiệm y học (ISO 15189 / QĐ 2429)
 */

export interface WestgardEngineOptions {
  enable10x?: boolean; // Mặc định true
  enable41s?: boolean; // Mặc định true
  enableR4s?: boolean; // Mặc định true
  enable22s?: boolean; // Mặc định true
}

/**
 * Tính Z-score (SD Index)
 */
export function calculateZScore(value: number, mean: number, sd: number): number {
  if (!sd || sd <= 0) return 0;
  return Number(((value - mean) / sd).toFixed(2));
}

/**
 * Đánh giá một kết quả đo mới trong mối tương quan với lịch sử chuỗi
 * @param currentRes Kết quả đo cần đánh giá
 * @param historyToDate Danh sách các kết quả đo trước đó (đã sắp xếp tăng dần theo thời gian)
 * @param configs Cấu hình Mean/SD của tất cả các mức
 */
export function evaluateWestgardResult(
  currentRes: QCResult,
  historyToDate: QCResult[],
  configs: Record<QCLevel, QCConfig>,
  options: WestgardEngineOptions = { enable10x: true, enable41s: true, enableR4s: true, enable22s: true }
): WestgardEvaluation {
  const currentConfig = configs[currentRes.level];
  if (!currentConfig || currentConfig.sd <= 0) {
    return {
      status: 'passed',
      rule: 'none',
      errorType: 'none',
      description: 'Chưa thiết lập giá trị Mean và SD hợp lệ cho mức QC này.',
      recommendedAction: 'Cấu hình Mean và SD trước khi phân tích.',
      zScore: 0,
      isRunRejected: false
    };
  }

  const currentZ = calculateZScore(currentRes.value, currentConfig.mean, currentConfig.sd);
  const absZ = Math.abs(currentZ);

  // Lọc lịch sử của cùng 1 mức nồng độ (sắp xếp tăng dần theo thời gian)
  const sameLevelHistory = historyToDate
    .filter(r => r.level === currentRes.level && r.timestamp <= currentRes.timestamp && r.id !== currentRes.id)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Chuỗi gồm các điểm cũ + điểm hiện tại
  const fullSameLevelChain = [...sameLevelHistory, currentRes];
  const fullZScores = fullSameLevelChain.map(r => 
    calculateZScore(r.value, currentConfig.mean, currentConfig.sd)
  );

  // 1. QUY TẮC 1-3s (Rejection Rule - Lỗi ngẫu nhiên hoặc hệ thống nặng)
  if (absZ >= 3.0) {
    return {
      status: 'violation',
      rule: '1-3s',
      errorType: 'random',
      description: `Vi phạm 1_3s: Giá trị đo vượt quá giới hạn 3SD (${currentZ > 0 ? '+' : ''}${currentZ.toFixed(2)} SD). Dấu hiệu sai số ngẫu nhiên nghiêm trọng hoặc sai số hệ thống lớn.`,
      recommendedAction: 'TỪ CHỐI LÔ XÉT NGHIỆM! Dừng trả kết quả bệnh nhân. Kiểm tra bọt khí, kim hút, hóa chất, hiệu chuẩn và chạy lại mẫu mới.',
      zScore: currentZ,
      isRunRejected: true
    };
  }

  // 2. QUY TẮC 2-2s (Rejection Rule - Lỗi hệ thống)
  if (options.enable22s) {
    // 2a. Kiểm tra chuỗi 2 điểm liên tiếp trên cùng 1 mức
    if (fullZScores.length >= 2) {
      const lastZ = fullZScores[fullZScores.length - 1];
      const prevZ = fullZScores[fullZScores.length - 2];
      
      const bothAbove2 = lastZ >= 2.0 && prevZ >= 2.0;
      const bothBelow2 = lastZ <= -2.0 && prevZ <= -2.0;

      if (bothAbove2 || bothBelow2) {
        return {
          status: 'violation',
          rule: '2-2s',
          errorType: 'systematic',
          description: `Vi phạm 2_2s (Cùng mức): 2 giá trị đo liên tiếp cùng vượt ngưỡng 2SD về phía ${bothAbove2 ? 'Dương (+2SD)' : 'Âm (-2SD)'}.`,
          recommendedAction: 'TỪ CHỐI LÔ XÉT NGHIỆM! Dấu hiệu sai số hệ thống (Systematic Error). Kiểm tra thuốc thử, hiệu chuẩn lại máy (Calibration) hoặc nhiệt độ buồng ủ.',
          zScore: currentZ,
          isRunRejected: true
        };
      }
    }

    // 2b. Kiểm tra xuyên mức (Across levels) trong cùng một lượt chạy (trong vòng 2 giờ)
    const recentOtherLevels = historyToDate.filter(r => 
      r.level !== currentRes.level && 
      Math.abs(r.timestamp - currentRes.timestamp) <= 2 * 60 * 60 * 1000
    );

    for (const otherRes of recentOtherLevels) {
      const otherConfig = configs[otherRes.level];
      if (otherConfig && otherConfig.sd > 0) {
        const otherZ = calculateZScore(otherRes.value, otherConfig.mean, otherConfig.sd);
        if ((currentZ >= 2.0 && otherZ >= 2.0) || (currentZ <= -2.0 && otherZ <= -2.0)) {
          return {
            status: 'violation',
            rule: '2-2s',
            errorType: 'systematic',
            description: `Vi phạm 2_2s (Xuyên mức): Cả mức ${currentRes.level} (${currentZ > 0 ? '+' : ''}${currentZ.toFixed(2)}SD) và mức ${otherRes.level} (${otherZ > 0 ? '+' : ''}${otherZ.toFixed(2)}SD) cùng vượt 2SD trong một lượt chạy.`,
            recommendedAction: 'TỪ CHỐI LÔ XÉT NGHIỆM! Lỗi hệ thống ảnh hưởng toàn bộ các mức nồng độ. Kiểm tra bóng đèn đo quang, bộ lọc bước sóng, hoặc nguồn hóa chất chung.',
            zScore: currentZ,
            isRunRejected: true
          };
        }
      }
    }
  }

  // 3. QUY TẮC R-4s (Rejection Rule - Lỗi ngẫu nhiên lớn)
  if (options.enableR4s) {
    // 3a. Kiểm tra giữa các mức trong cùng 1 lần chạy (hoặc cách nhau <= 2 giờ)
    const recentOtherLevels = historyToDate.filter(r => 
      r.level !== currentRes.level && 
      Math.abs(r.timestamp - currentRes.timestamp) <= 2 * 60 * 60 * 1000
    );

    for (const otherRes of recentOtherLevels) {
      const otherConfig = configs[otherRes.level];
      if (otherConfig && otherConfig.sd > 0) {
        const otherZ = calculateZScore(otherRes.value, otherConfig.mean, otherConfig.sd);
        const range = Math.abs(currentZ - otherZ);
        if (range >= 4.0) {
          return {
            status: 'violation',
            rule: 'R-4s',
            errorType: 'random',
            description: `Vi phạm R_4s: Chênh lệch giữa mức ${currentRes.level} (${currentZ.toFixed(2)}SD) và mức ${otherRes.level} (${otherZ.toFixed(2)}SD) là ${range.toFixed(2)}SD (vượt quá 4SD).`,
            recommendedAction: 'TỪ CHỐI LÔ XÉT NGHIỆM! Dấu hiệu sai số ngẫu nhiên lớn (Random Error). Kiểm tra bọt khí, kim hút mẫu, trộn mẫu không đều hoặc điện áp không ổn định.',
            zScore: currentZ,
            isRunRejected: true
          };
        }
      }
    }

    // 3b. Kiểm tra trên cùng mức giữa 2 lần chạy liền kề
    if (fullZScores.length >= 2) {
      const lastZ = fullZScores[fullZScores.length - 1];
      const prevZ = fullZScores[fullZScores.length - 2];
      const range = Math.abs(lastZ - prevZ);
      if (range >= 4.0 && (Math.abs(lastZ) >= 2.0 || Math.abs(prevZ) >= 2.0)) {
        return {
          status: 'violation',
          rule: 'R-4s',
          errorType: 'random',
          description: `Vi phạm R_4s: Chênh lệch biên độ giữa 2 lần chạy liên tiếp đạt ${range.toFixed(2)}SD (vượt quá 4SD).`,
          recommendedAction: 'TỪ CHỐI LÔ XÉT NGHIỆM! Kiểm tra độ ổn định tức thời của hệ thống máy.',
          zScore: currentZ,
          isRunRejected: true
        };
      }
    }
  }

  // 4. QUY TẮC 4-1s (Rejection Rule - Lỗi hệ thống tiến triển)
  if (options.enable41s && fullZScores.length >= 4) {
    const last4 = fullZScores.slice(-4);
    const allAbove1 = last4.every(z => z >= 1.0);
    const allBelow1 = last4.every(z => z <= -1.0);

    if (allAbove1 || allBelow1) {
      return {
        status: 'violation',
        rule: '4-1s',
        errorType: 'systematic',
        description: `Vi phạm 4_1s: 4 điểm đo liên tiếp đều vượt ngưỡng 1SD về phía ${allAbove1 ? 'Dương (+1SD)' : 'Âm (-1SD)'}.`,
        recommendedAction: 'TỪ CHỐI LÔ XÉT NGHIỆM! Sai số hệ thống đang tích lũy. Cần bảo trì bảo dưỡng, thay thuốc thử hoặc kiểm tra lại đường chuẩn (Calib curve).',
        zScore: currentZ,
        isRunRejected: true
      };
    }
  }

  // 5. QUY TẮC 10-x (Rejection Rule - Trôi dạt hệ thống / Systematic Shift)
  if (options.enable10x && fullZScores.length >= 10) {
    const last10 = fullZScores.slice(-10);
    const allAboveMean = last10.every(z => z > 0);
    const allBelowMean = last10.every(z => z < 0);

    if (allAboveMean || allBelowMean) {
      return {
        status: 'violation',
        rule: '10-x',
        errorType: 'systematic',
        description: `Vi phạm 10_x: 10 lần đo liên tiếp đều nằm lệch về một phía của đường Mean (${allAboveMean ? 'phía trên' : 'phía dưới'}). Dấu hiệu trôi dạt hệ thống rõ rệt.`,
        recommendedAction: 'TỪ CHỐI LÔ XÉT NGHIỆM! Hiệu chuẩn lại thiết bị (Recalibration), kiểm tra lô thuốc thử có bị thoái hóa hoặc bóng đèn đo quang giảm cường độ sáng.',
        zScore: currentZ,
        isRunRejected: true
      };
    }
  }

  // 6. QUY TẮC 1-2s (Warning Rule - Cảnh báo kiểm tra)
  if (absZ >= 2.0) {
    return {
      status: 'warning',
      rule: '1-2s',
      errorType: 'warning',
      description: `Cảnh báo 1_2s: Giá trị đo vượt ngưỡng 2SD (${currentZ > 0 ? '+' : ''}${currentZ.toFixed(2)} SD). Các quy tắc loại trừ (1-3s, 2-2s, R-4s, 4-1s, 10-x) không vi phạm.`,
      recommendedAction: 'LƯU Ý CẢNH BÁO: Được phép tiếp tục chạy mẫu bệnh nhân nhưng cần theo dõi sát các lượt chạy tiếp theo. Chưa cần dừng máy.',
      zScore: currentZ,
      isRunRejected: false
    };
  }

  // 7. HỢP LỆ (Trong giới hạn kiểm soát)
  return {
    status: 'passed',
    rule: 'none',
    errorType: 'none',
    description: `Kết quả hợp lệ: Nằm trong giới hạn kiểm soát an toàn (${currentZ > 0 ? '+' : ''}${currentZ.toFixed(2)} SD).`,
    recommendedAction: 'Hệ thống vận hành ổn định. Đủ điều kiện xét nghiệm mẫu bệnh nhân.',
    zScore: currentZ,
    isRunRejected: false
  };
}

/**
 * Đánh giá toàn bộ danh sách kết quả (tính Z-score và quy tắc cho từng điểm theo dòng thời gian)
 */
export function evaluateAllResults(
  results: QCResult[],
  configs: Record<QCLevel, QCConfig>
): (QCResult & { evaluation: WestgardEvaluation })[] {
  const sorted = [...results].sort((a, b) => a.timestamp - b.timestamp);
  
  return sorted.map((res, index) => {
    const historyToPoint = sorted.slice(0, index);
    const evaluation = evaluateWestgardResult(res, historyToPoint, configs);
    return {
      ...res,
      zScore: evaluation.zScore,
      westgardRule: evaluation.rule,
      westgardStatus: evaluation.status,
      evaluation
    };
  });
}

/**
 * Lấy kiểu dáng màu sắc cho từng trạng thái Westgard
 */
export function getWestgardStyle(status: WestgardStatusType, rule: WestgardRuleType) {
  if (status === 'violation') {
    return {
      badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
      dotClass: 'bg-red-500 shadow-red-200',
      textClass: 'text-red-600 font-bold',
      label: `Vi phạm (${rule})`,
      isError: true
    };
  }
  if (status === 'warning') {
    return {
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      dotClass: 'bg-amber-500 shadow-amber-200',
      textClass: 'text-amber-600 font-bold',
      label: `Cảnh báo (${rule})`,
      isError: false
    };
  }
  return {
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500 shadow-emerald-200',
    textClass: 'text-emerald-600',
    label: 'Hợp lệ',
    isError: false
  };
}
