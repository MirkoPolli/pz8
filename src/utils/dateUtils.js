// Date utility functions for IPTV Manager

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateItalian(dateString) {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

export function getDaysDifference(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function isExpired(dateString) {
  const days = getDaysDifference(dateString);
  return days !== null && days < 0;
}

export function isExpiringToday(dateString) {
  const days = getDaysDifference(dateString);
  return days === 0;
}

export function isExpiringSoon(dateString, daysThreshold = 3) {
  const days = getDaysDifference(dateString);
  return days !== null && days >= 0 && days <= daysThreshold;
}

export function addMonthsToDate(currentDateString, monthsToAdd) {
  let baseDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!currentDateString) {
    baseDate = today;
  } else {
    const cur = new Date(currentDateString);
    cur.setHours(0, 0, 0, 0);
    // Se la data attuale è già scaduta, il rinnovo parte da oggi
    if (cur.getTime() < today.getTime()) {
      baseDate = today;
    } else {
      baseDate = cur;
    }
  }

  const resultDate = new Date(baseDate.getTime());
  resultDate.setMonth(resultDate.getMonth() + monthsToAdd);

  const year = resultDate.getFullYear();
  const month = String(resultDate.getMonth() + 1).padStart(2, '0');
  const day = String(resultDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
