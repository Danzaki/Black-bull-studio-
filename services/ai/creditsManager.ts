let credits = 100;

export function getCredits() {
  return credits;
}

export function useCredit() {
  if (credits <= 0) return false;

  credits -= 1;
  return true;
}

export function addCredits(amount: number) {
  credits += amount;
}
