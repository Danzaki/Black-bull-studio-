export interface HistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}

const history: HistoryItem[] = [];

export function saveHistory(item: HistoryItem) {
  history.unshift(item);
}

export function getHistory() {
  return history;
}

export function clearHistory() {
  history.length = 0;
}
